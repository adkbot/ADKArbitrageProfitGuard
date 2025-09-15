import express from 'express';
import { AuthManager, authMiddleware } from './auth.js';
import { UserManager } from './user-manager.js';
import { ArbitrageBot } from './arbitrage-bot.js';

const router = express.Router();
const auth = AuthManager.getInstance();
const userManager = UserManager.getInstance();

// 🌍 Endpoints PÚBLICOS (sem autenticação)

// 📊 Status geral do sistema
router.get('/public/status', (req, res) => {
  try {
    const globalStats = userManager.getGlobalStats();
    const authStats = auth.getStats();
    
    res.json({
      success: true,
      system: {
        running: true,
        uptime: process.uptime(),
        timestamp: new Date(),
        version: '2.0.0-multiuser'
      },
      stats: {
        ...globalStats,
        ...authStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔐 Login/Registro de usuário
router.post('/public/auth', async (req, res) => {
  try {
    const { userId, password, userData = {} } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId é obrigatório',
        example: { userId: 'meu_usuario_123', password: 'opcional' }
      });
    }

    // Criar hash simples do userId + password para identificador único
    const identifier = password ? `${userId}_${password}` : userId;
    
    const result = await auth.createOrLoginUser(identifier, userData);
    
    // Inicializar estado do usuário
    userManager.initializeUser(identifier, result.user);
    
    res.json({
      success: true,
      message: 'Autenticação realizada com sucesso',
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        createdAt: result.user.createdAt,
        lastAccess: result.user.lastAccess
      },
      instructions: {
        'Como usar': 'Adicione o token no header: Authorization: Bearer YOUR_TOKEN',
        'Endpoints disponíveis': '/user/status, /user/start, /user/stop, /user/config'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📖 Documentação da API
router.get('/public/docs', (req, res) => {
  res.json({
    title: 'ADK Arbitragem - API Multiusuário',
    version: '2.0.0',
    description: 'Sistema de arbitragem spot-futures com suporte a múltiplos usuários',
    endpoints: {
      'Públicos': {
        'GET /api/public/status': 'Status geral do sistema',
        'POST /api/public/auth': 'Login/registro de usuário',
        'GET /api/public/docs': 'Esta documentação'
      },
      'Autenticados': {
        'GET /api/user/status': 'Status do usuário',
        'POST /api/user/start': 'Iniciar bot',
        'POST /api/user/stop': 'Parar bot', 
        'POST /api/user/config': 'Configurar API keys',
        'GET /api/user/trades': 'Histórico de trades',
        'GET /api/user/opportunities': 'Oportunidades atuais'
      }
    },
    authentication: {
      type: 'Bearer Token (JWT)',
      howTo: 'Faça POST /api/public/auth para obter token',
      usage: 'Header: Authorization: Bearer YOUR_TOKEN'
    },
    examples: {
      login: {
        url: 'POST /api/public/auth',
        body: {
          userId: 'meu_usuario',
          password: 'senha_opcional',
          userData: {
            name: 'João Silva',
            email: 'joao@email.com',
            maxTradeAmount: 500,
            riskLevel: 'medium'
          }
        }
      }
    }
  });
});

// 🔐 Endpoints AUTENTICADOS (requerem token)

// 📊 Status do usuário
router.get('/user/status', authMiddleware, (req: any, res) => {
  try {
    const state = userManager.getUserState(req.userId);
    if (!state) {
      return res.status(404).json({ success: false, error: 'Estado do usuário não encontrado' });
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        lastAccess: req.user.lastAccess
      },
      bot: {
        enabled: state.isEnabled,
        executing: state.isExecutingTrade,
        lastAnalysis: state.lastAnalysis
      },
      trades: {
        today: state.todayTrades,
        total: state.totalTrades,
        active: state.activeTrades.length,
        profitToday: state.todayProfit,
        profitTotal: state.totalProfit
      },
      limits: {
        maxTradeAmount: state.riskSettings.maxTradeAmount,
        maxDailyTrades: state.riskSettings.maxDailyTrades,
        remainingToday: state.riskSettings.maxDailyTrades - state.todayTrades
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ▶️ Iniciar bot do usuário
router.post('/user/start', authMiddleware, (req: any, res) => {
  try {
    const canTrade = userManager.canUserTrade(req.userId);
    if (!canTrade.canTrade) {
      return res.status(400).json({ 
        success: false, 
        error: 'Não é possível iniciar bot',
        reason: canTrade.reason 
      });
    }

    const success = userManager.setUserBotStatus(req.userId, true);
    if (success) {
      res.json({
        success: true,
        message: `Bot ativado para usuário ${req.user.name}`,
        timestamp: new Date()
      });
    } else {
      res.status(500).json({ success: false, error: 'Falha ao ativar bot' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ⏹️ Parar bot do usuário
router.post('/user/stop', authMiddleware, (req: any, res) => {
  try {
    const success = userManager.setUserBotStatus(req.userId, false);
    if (success) {
      res.json({
        success: true,
        message: `Bot desativado para usuário ${req.user.name}`,
        timestamp: new Date()
      });
    } else {
      res.status(500).json({ success: false, error: 'Falha ao desativar bot' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔧 Configurar API keys
router.post('/user/config', authMiddleware, async (req: any, res) => {
  try {
    const { binanceApiKey, binanceSecretKey, maxTradeAmount, riskLevel } = req.body;
    
    if (!binanceApiKey || !binanceSecretKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'binanceApiKey e binanceSecretKey são obrigatórios' 
      });
    }

    console.log(`🔑 Salvando credenciais REAIS para BINANCE via multiusuário...`);

    // 🚨 SALVAR NO STORAGE PRINCIPAL PARA QUE O EXCHANGEAPI POSSA ACESSAR
    const { storage } = require('./storage');
    
    // Buscar configuração atual
    let config = await storage.getBotConfig();
    if (!config) {
      // Criar config padrão se não existir
      config = await storage.updateBotConfig({
        pairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
        basisEntry: 0.004,
        basisExit: 0.0015,
        maxNotionalUsdt: maxTradeAmount || 1000,
        maxDailyTrades: 10,
        slippageK: 0.002,
        fundingLookaheadH: 8,
        wyckoffN: 100,
        gexRefreshSec: 300,
        arbitrageEnabled: true
      });
    }

    // Atualizar com as API keys do usuário no storage principal
    const updateData = {
      ...config,
      selectedExchange: 'binance',
      binanceApiKey: binanceApiKey,
      binanceApiSecret: binanceSecretKey,
      maxNotionalUsdt: maxTradeAmount || config.maxNotionalUsdt
    };

    // Salvar configuração atualizada no storage principal
    await storage.updateBotConfig(updateData);

    // 🔧 CONFIGURAR TAMBÉM NO SISTEMA MULTIUSUÁRIO (COMPATIBILIDADE)
    const exchangeSuccess = userManager.setUserExchange(req.userId, binanceApiKey, binanceSecretKey);
    
    // Atualizar perfil do usuário
    const user = req.user;
    user.binanceApiKey = binanceApiKey;
    user.binanceSecretKey = binanceSecretKey;
    if (maxTradeAmount) user.maxTradeAmount = maxTradeAmount;
    if (riskLevel) user.riskLevel = riskLevel;

    // Atualizar configurações de risco
    const state = userManager.getUserState(req.userId);
    if (state && maxTradeAmount) {
      state.riskSettings.maxTradeAmount = maxTradeAmount;
    }

    console.log(`✅ Credenciais BINANCE salvas no storage principal e sistema multiusuário`);

    if (exchangeSuccess) {
      res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso',
        config: {
          hasApiKeys: true,
          maxTradeAmount: user.maxTradeAmount,
          riskLevel: user.riskLevel
        }
      });
    } else {
      res.status(500).json({ success: false, error: 'Falha ao configurar exchange' });
    }
  } catch (error) {
    console.error('❌ Erro ao salvar credenciais multiusuário:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📈 Histórico de trades
router.get('/user/trades', authMiddleware, (req: any, res) => {
  try {
    const state = userManager.getUserState(req.userId);
    if (!state) {
      return res.status(404).json({ success: false, error: 'Estado do usuário não encontrado' });
    }

    res.json({
      success: true,
      trades: {
        active: state.activeTrades,
        summary: {
          total: state.totalTrades,
          today: state.todayTrades,
          profitTotal: state.totalProfit,
          profitToday: state.todayProfit
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🎯 Oportunidades atuais
router.get('/user/opportunities', authMiddleware, (req: any, res) => {
  try {
    // TODO: Integrar com sistema de análise existente
    // Por enquanto retorna mock
    res.json({
      success: true,
      opportunities: [],
      message: 'Integração com sistema de análise em desenvolvimento',
      lastAnalysis: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;