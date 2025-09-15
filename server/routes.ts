import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTradeSchema, insertBotConfigSchema, insertDailyMetricsSchema } from "@shared/schema";
import { exchangeAPI } from "./exchange";
import { AnalysisEngine } from "./analysis-engine.js";
import publicApiRoutes from './public-api.js';
import { UserManager } from './user-manager.js';
import { AuthManager } from './auth.js';
import { getNetworkStatus } from './net.js';

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString(), service: 'adk-arbitragem' });
  });
  
  // Test endpoint to verify routing works
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
  });
  
  // Test connection endpoint for configuration modal
  app.post('/api/test-connection', async (req, res) => {
    try {
      const { exchange, apiKey, apiSecret } = req.body;
      
      if (!exchange || !apiKey || !apiSecret) {
        return res.status(400).json({ 
          success: false, 
          message: 'Exchange, API Key e API Secret são obrigatórios' 
        });
      }
      
      const result = await exchangeAPI.testConnection(exchange, apiKey, apiSecret);
      res.json(result);
      
    } catch (error) {
      console.error('❌ Erro no teste de conexão:', error);
      res.status(500).json({ 
        success: false, 
        message: `Erro interno: ${(error as Error).message}` 
      });
    }
  });
  
  // 🌐 PROXY MANAGEMENT ENDPOINTS
  app.get('/api/proxy/status', async (req, res) => {
    try {
      console.log('🔍 Getting proxy status...');
      
      const { getProxyStatus, testProxyConnectivity } = await import('./proxy');
      const proxyStatus = getProxyStatus();
      
      const result = {
        proxy: proxyStatus,
        timestamp: new Date().toISOString(),
        environment: {
          PROXY_ENABLED: process.env.PROXY_ENABLED || 'false',
          PROXY_URL_SET: !!process.env.PROXY_URL,
          PROXY_URL_2_SET: !!process.env.PROXY_URL_2,
          NODE_ENV: process.env.NODE_ENV || 'development'
        },
        instructions: {
          message: 'To enable proxy, set environment variables:',
          variables: [
            'PROXY_ENABLED=true',
            'PROXY_URL=http://your-proxy-server:port',
            'PROXY_URL_2=http://backup-proxy:port (optional)'
          ],
          recommendations: [
            'Consider using reliable VPN services like NordVPN, ExpressVPN',
            'Or proxy services like Bright Data, Smartproxy',
            'For testing: public proxies from proxy-list.download'
          ]
        }
      };
      
      console.log('📊 Proxy status:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ Error getting proxy status:', error);
      res.status(500).json({ 
        error: 'Failed to get proxy status',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.get('/api/proxy/test', async (req, res) => {
    try {
      console.log('🧪 Testing proxy connectivity...');
      
      const { testProxyConnectivity } = await import('./proxy');
      
      const connectivityResults = await testProxyConnectivity();
      
      const result = {
        connectivity: connectivityResults,
        success: connectivityResults.binance && connectivityResults.binanceFutures,
        timestamp: new Date().toISOString()
      };
      
      console.log('🧪 Proxy test result:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ Error testing proxy connectivity:', error);
      res.status(500).json({ 
        error: 'Failed to test proxy connectivity',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.post('/api/proxy/switch', async (req, res) => {
    try {
      console.log('🔄 Switching to next proxy...');
      
      const { switchToNextProxy } = await import('./proxy');
      
      const success = await switchToNextProxy();
      
      const result = {
        success,
        message: success ? 'Switched to next proxy successfully' : 'Failed to switch proxy',
        timestamp: new Date().toISOString()
      };
      
      console.log('🔄 Proxy switch result:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ Error switching proxy:', error);
      res.status(500).json({ 
        error: 'Failed to switch proxy',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.post('/api/proxy/reset', async (req, res) => {
    try {
      console.log('🔄 Resetting proxy system...');
      
      const { resetProxy } = await import('./proxy');
      
      resetProxy();
      
      const result = {
        success: true,
        message: 'Proxy system reset to direct connections',
        timestamp: new Date().toISOString()
      };
      
      console.log('🔄 Proxy reset result:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ Error resetting proxy:', error);
      res.status(500).json({ 
        error: 'Failed to reset proxy',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Legacy connectivity endpoint (redirect to new endpoints)
  app.get('/api/connectivity/status', (req, res) => {
    res.redirect('/api/proxy/status');
  });
  
  // Trades endpoints
  app.get('/api/trades', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const trades = await storage.getTrades(limit);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });
  
  app.get('/api/trades/active', async (req, res) => {
    try {
      const activeTrades = await storage.getActiveTrades();
      res.json(activeTrades);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch active trades' });
    }
  });
  
  app.post('/api/trades', async (req, res) => {
    try {
      const tradeData = insertTradeSchema.parse(req.body);
      const trade = await storage.createTrade(tradeData);
      res.json(trade);
    } catch (error) {
      res.status(400).json({ error: 'Invalid trade data' });
    }
  });
  
  // Bot configuration endpoints
  app.get('/api/config', async (req, res) => {
    try {
      console.log('GET /api/config called');
      const config = await storage.getBotConfig();
      console.log('Config retrieved:', config);
      
      // Force response completion
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config));
      console.log('Response sent for /api/config');
    } catch (error) {
      console.error('Error in /api/config:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch bot config' }));
    }
  });
  
  app.put('/api/config', async (req, res) => {
    try {
      const configData = insertBotConfigSchema.parse(req.body);
      const config = await storage.updateBotConfig(configData);
      res.json(config);
    } catch (error) {
      res.status(400).json({ error: 'Invalid config data' });
    }
  });
  
  // Storage-based market data endpoints (for historical data)
  app.get('/api/storage/market/:pair', async (req, res) => {
    try {
      const { pair } = req.params;
      const data = await storage.getLatestMarketData(pair);
      if (!data) {
        return res.status(404).json({ error: 'Market data not found' });
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch market data' });
    }
  });
  
  app.get('/api/storage/market/:pair/history', async (req, res) => {
    try {
      const { pair } = req.params;
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const history = await storage.getMarketDataHistory(pair, hours);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch market history' });
    }
  });
  
  // Daily metrics endpoints
  app.get('/api/metrics/:date', async (req, res) => {
    try {
      const { date } = req.params;
      const metrics = await storage.getDailyMetrics(date);
      if (!metrics) {
        return res.status(404).json({ error: 'Metrics not found' });
      }
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });
  
  app.get('/api/metrics/today', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const metrics = await storage.getDailyMetrics(today);
      res.json(metrics || null);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch today metrics' });
    }
  });
  
  // Bot status endpoints
  app.get('/api/status', async (req, res) => {
    try {
      const config = await storage.getBotConfig();
      const activeTrades = await storage.getActiveTrades();
      const today = new Date().toISOString().split('T')[0];
      const todayTrades = await storage.getTradesByDate(today);
      
      res.json({
        enabled: config?.arbitrageEnabled || false,
        activeTrades: activeTrades.length,
        todayTrades: todayTrades.length,
        pairs: config?.pairs || [],
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bot status' });
    }
  });

  // 🌐 STATUS DETALHADO DA REDE - Alias para /api/proxy/status
  app.get('/api/network/status', async (req, res) => {
    try {
      const networkStatus = getNetworkStatus();
      return res.json({
        success: true,
        mode: networkStatus.geoBlocked ? 'blocked' : 'working',
        proxyEnabled: process.env.PROXY_ENABLED === 'true',
        geoBlocked: networkStatus.geoBlocked,
        lastSuccess: networkStatus.lastSuccess,
        fallbackActive: networkStatus.fallbackActive,
        timestamp: new Date().toISOString(),
        recommendation: networkStatus.geoBlocked ? 
          'Configure PROXY_URL ou PROXY_SOCKS5_HOST para bypassar geo-bloqueio' : 
          'Sistema funcionando normalmente'
      });
    } catch (error) {
      console.error('Erro getting network status:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  });

  // 🔧 AÇÕES DE CONTROLE DA REDE (integra com sistema proxy)
  app.post('/api/network/actions', async (req, res) => {
    try {
      const { action } = req.body;
      
      if (!action) {
        return res.status(400).json({
          success: false,
          error: 'Ação não especificada'
        });
      }

      let result = { success: false, message: '' };

      switch (action) {
        case 'test':
          const { testProxyConnectivity } = await import('./proxy');
          const testResult = await testProxyConnectivity();
          result = {
            success: testResult.binance && testResult.binanceFutures,
            message: 'Teste de conectividade executado',
            data: testResult
          };
          break;
          
        case 'switch':
          const { switchToNextProxy } = await import('./proxy');
          const switched = await switchToNextProxy();
          result = {
            success: switched,
            message: switched ? 'Proxy alternado com sucesso' : 'Falha ao alternar proxy'
          };
          break;
          
        case 'reset':
          const { resetProxy } = await import('./proxy');
          resetProxy();
          result = {
            success: true,
            message: 'Sistema de proxy resetado'
          };
          break;
          
        default:
          return res.status(400).json({
            success: false,
            error: `Ação '${action}' não suportada. Use: test, switch, reset`
          });
      }
      
      console.log(`🔧 Ação de rede '${action}' executada:`, result);
      return res.json(result);
      
    } catch (error) {
      console.error('Erro executing network action:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  });

  // Endpoint movido para depois da declaração de analysisEngine

  // 💰 SALDOS DA CARTEIRA (SPOT + FUTURES)
  app.get('/api/exchange/balance', async (req, res) => {
    try {
      console.log('💰 API: Buscando saldos da carteira...');
      const balance = await exchangeAPI.getAccountBalance();
      res.json({
        ...balance,
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      console.error('❌ Erro API balance:', error.message);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch account balance',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 📊 STATUS DE OPERAÇÕES ATIVAS
  app.get('/api/exchange/active-operations', async (req, res) => {
    try {
      const activeTrades = await storage.getActiveTrades();
      const today = new Date().toISOString().split('T')[0];
      const todayTrades = await storage.getTradesByDate(today);
      
      res.json({
        activeOperations: activeTrades.length,
        todayOperations: todayTrades.length,
        activeTrades: activeTrades,
        todayTrades: todayTrades,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch active operations',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Exchange health check
  app.get('/api/exchange/health', async (req, res) => {
    try {
      const isConnected = await exchangeAPI.isConnected();
      res.json({ connected: isConnected, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ connected: false, error: 'Exchange connection failed' });
    }
  });

  // Exchange-based market data endpoints (real-time)
  app.get('/api/exchange/market/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const marketData = await exchangeAPI.getMarketData(symbol.toUpperCase());
      res.json(marketData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch market data' });
    }
  });
  
  app.get('/api/exchange/market/:symbol/orderbook', async (req, res) => {
    try {
      const { symbol } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const orderBook = await exchangeAPI.getOrderBook(symbol.toUpperCase(), limit);
      res.json(orderBook);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order book' });
    }
  });
  
  app.get('/api/exchange/market/data/all', async (req, res) => {
    try {
      const config = await storage.getBotConfig();
      const marketDataPromises = config.pairs.map(async (pair) => {
        try {
          return await exchangeAPI.getMarketData(pair);
        } catch (error) {
          console.error(`Failed to get market data for ${pair}:`, error);
          return null;
        }
      });
      
      const marketData = (await Promise.all(marketDataPromises)).filter(data => data !== null);
      res.json(marketData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch market data for all pairs' });
    }
  });
  
  // Arbitrage opportunities endpoint
  app.get('/api/arbitrage/opportunities', async (req, res) => {
    try {
      const config = await storage.getBotConfig();
      const opportunities = [];
      
      for (const pair of config.pairs) {
        try {
          const marketData = await exchangeAPI.getMarketData(pair);
          
          // Calculate if this is a valid arbitrage opportunity
          const basisThreshold = parseFloat(config.basisEntry);
          const isOpportunity = Math.abs(marketData.basisPercent) >= basisThreshold;
          
          if (isOpportunity) {
            const opportunity = {
              ...marketData,
              signal: marketData.basisPercent > 0 ? 'long_spot_short_futures' : 'short_spot_long_futures',
              potentialProfit: Math.abs(marketData.basisPercent) - basisThreshold,
              confidence: Math.min(100, (Math.abs(marketData.basisPercent) / basisThreshold) * 50)
            };
            opportunities.push(opportunity);
            
            // 🔥 ATUALIZAR PERFORMANCE SCORE PARA RANKING COM DADOS REAIS
            await storage.updatePairPerformanceScore(pair, {
              basisPercent: marketData.basisPercent,
              volume24h: marketData.volume24h || 0,
              fundingRate: marketData.fundingRate || 0
            });
          }
        } catch (error) {
          console.error(`Failed to check arbitrage for ${pair}:`, error);
        }
      }
      
      res.json(opportunities);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch arbitrage opportunities' });
    }
  });

  // 📊 Endpoint para tentativas de execução em tempo real
  app.get('/api/execution/attempts', async (req, res) => {
    try {
      if (!analysisEngine) {
        return res.status(503).json({ 
          error: 'Analysis engine não inicializado',
          attempts: [],
          total: 0,
          timestamp: Date.now()
        });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const attempts = analysisEngine.getExecutionAttempts(limit);
      
      res.json({
        success: true,
        attempts: attempts || [],
        total: (attempts || []).length,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Erro fetching execution attempts:', error);
      res.status(500).json({ 
        error: 'Failed to fetch execution attempts',
        attempts: [],
        total: 0,
        timestamp: Date.now()
      });
    }
  });

  // 🔥 TOP 30 PAIRS ENDPOINT - SISTEMA DE RANKING DIÁRIO PARALELIZADO
  app.get('/api/arbitrage/top-pairs', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const topPairs = await storage.getTopPairsByPerformance(limit);
      
      console.log(`🏆 Buscando dados para ${topPairs.length} top pairs...`);
      
      // 🚀 PARALELIZAR BUSCA DE DADOS PARA EVITAR 429 ERRORS
      const marketDataPromises = topPairs.map(async (pair, index) => {
        try {
          const marketData = await exchangeAPI.getMarketData(pair);
          const performanceData = await storage.getPairPerformanceData(pair);
          
          return {
            rank: index + 1,
            pair,
            basis: marketData.basisPercent,
            spotPrice: marketData.spotPrice,
            futuresPrice: marketData.futuresPrice,
            volume24h: marketData.volume24h || 0,
            score: performanceData.todayScore,
            netProfitEstimate: Math.max(0, Math.abs(marketData.basisPercent) - 0.06), // Deduz custos típicos
            lastUpdate: new Date().toISOString()
          };
        } catch (error) {
          console.error(`Erro obtendo dados para ${pair}:`, error);
          return {
            rank: index + 1,
            pair,
            basis: 0,
            spotPrice: 0,
            futuresPrice: 0,
            volume24h: 0,
            score: 0,
            netProfitEstimate: 0,
            lastUpdate: new Date().toISOString(),
            error: 'Data unavailable'
          };
        }
      });
      
      const pairDetails = await Promise.all(marketDataPromises);
      
      // Filtrar pares com erro e reordenar por score
      const validPairs = pairDetails
        .filter(p => !p.error)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      res.json({
        strategy: 'DAILY_NET_PROFIT_RANKING',
        totalPairs: validPairs.length,
        topPairs: validPairs,
        costs: {
          tradingFees: '0.04%',
          slippage: '0.02%',
          fundingRate: 'Variable'
        },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro no endpoint top-pairs:', error);
      res.status(500).json({ error: 'Failed to fetch top pairs' });
    }
  });

  // Initialize exchange API
  try {
    await exchangeAPI.initialize();
    console.log('Exchange API initialized successfully');
  } catch (error) {
    console.error('Failed to initialize exchange API:', error);
  }

  // Initialize and start analysis engine
  const analysisEngine = new AnalysisEngine(exchangeAPI, storage);
  
  // Analysis engine control endpoints
  app.post('/api/analysis/start', async (req, res) => {
    try {
      await analysisEngine.start();
      res.json({ status: 'started', message: 'Motor de análise automática iniciado' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao iniciar motor de análise' });
    }
  });
  
  app.post('/api/analysis/stop', async (req, res) => {
    try {
      analysisEngine.stop();
      res.json({ status: 'stopped', message: 'Motor de análise automática parado' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao parar motor de análise' });
    }
  });
  
  app.get('/api/analysis/status', (req, res) => {
    try {
      const status = analysisEngine.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao obter status da análise' });
    }
  });
  
  // 🔍 ENDPOINT DE DEBUG PARA SCORES E RANKING
  app.get('/api/debug/pair-scores', async (req, res) => {
    try {
      const config = await storage.getBotConfig();
      const debugData = [];
      
      console.log('🔍 Gerando debug de scores de performance...');
      
      for (const pair of config.pairs.slice(0, 10)) { // Apenas 10 para teste
        try {
          const marketData = await exchangeAPI.getMarketData(pair);
          const performanceData = await storage.getPairPerformanceData(pair);
          
          // Calcular custos manualmente para debug
          const basisAbs = Math.abs(marketData.basisPercent);
          const tradingFees = 0.04;
          const slippage = parseFloat(config.slippageK) * 100;
          const funding = Math.abs(marketData.fundingRate || 0) * 8;
          const netProfit = basisAbs - tradingFees - slippage - funding;
          
          debugData.push({
            pair,
            basis: marketData.basisPercent,
            basisAbs,
            costs: {
              tradingFees,
              slippage,
              funding,
              total: tradingFees + slippage + funding
            },
            netProfit,
            volume24h: marketData.volume24h || 0,
            finalScore: performanceData.todayScore,
            historyCount: performanceData.history.length
          });
        } catch (error) {
          console.error(`Debug error for ${pair}:`, error);
        }
      }
      
      // Ordenar por score para mostrar ranking
      debugData.sort((a, b) => b.finalScore - a.finalScore);
      
      res.json({
        explanation: 'Sistema de ranking corrigido - considera todos os custos reais',
        formula: 'score = max(0, (|basis%| - fees - slippage - funding) * volumeFactor * 100)',
        debugData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate debug data' });
    }
  });
  
  // 🔄 ENDPOINT PARA ATUALIZAR TODOS OS SCORES MANUALMENTE
  app.post('/api/debug/update-all-scores', async (req, res) => {
    try {
      await analysisEngine.updateAllPairScores();
      res.json({ 
        success: true, 
        message: 'Todos os scores foram atualizados com dados reais',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update scores' });
    }
  });

  // 🔍 STATUS DETALHADO DO MOTOR DE ANÁLISE
  app.get('/api/engine/status', async (req, res) => {
    try {
      const engineStatus = analysisEngine.getStatus();
      const networkStatus = getNetworkStatus();
      
      const status = {
        success: true,
        engine: {
          isActive: engineStatus.isRunning,
          lastAnalysis: engineStatus.lastAnalysis,
          symbolsMonitored: engineStatus.symbolsMonitored,
          priceHistorySize: engineStatus.priceHistorySize,
          health: engineStatus.isRunning ? 'healthy' : 'stopped'
        },
        network: {
          proxyMode: networkStatus.proxyMode,
          connectionStatus: networkStatus.connectionStatus,
          lastSuccessfulConnection: networkStatus.lastSuccess,
          geoBlocked: networkStatus.geoBlocked,
          fallbacksActive: networkStatus.fallbackActive
        },
        performance: {
          activeOpportunities: 0, // Valor fixo por enquanto
          averageResponseTime: networkStatus.avgResponseTime || 'N/A',
          successRate: networkStatus.successRate || 'N/A'
        },
        timestamp: new Date().toISOString()
      };

      return res.json(status);
    } catch (error) {
      console.error('Erro getting engine status:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Auto-start analysis engine if arbitrage is enabled - FIXED: Non-blocking initialization
  const config = await storage.getBotConfig();
  if (config && config.arbitrageEnabled) {
    console.log('🚀 Auto-iniciando motor de análise automática...');
    
    // Start analysis engine without waiting - prevents server startup blocking
    analysisEngine.start().catch(error => {
      console.error('⚠️ Erro iniciando análise automática:', error);
    });
    
    // Update scores after server is fully started - don't block server startup
    setTimeout(() => {
      analysisEngine.updateAllPairScores().catch(error => {
        console.error('⚠️ Erro na atualização inicial de scores:', error);
      });
    }, 10000); // Wait 10s for server to be fully up
  }

  // 🌍 MULTIUSER API - SISTEMA PÚBLICO PARA MÚLTIPLOS USUÁRIOS
  app.use('/api', publicApiRoutes);
  
  // Initialize multiuser managers
  const userManager = UserManager.getInstance();
  const authManager = AuthManager.getInstance();
  
  // Reset daily stats every day at midnight
  setInterval(() => {
    userManager.resetDailyStats();
  }, 24 * 60 * 60 * 1000); // 24 hours
  
  console.log('🌍 API multiusuário registrada:');
  console.log('   📖 GET  /api/public/docs - Documentação');
  console.log('   📊 GET  /api/public/status - Status geral');
  console.log('   🔐 POST /api/public/auth - Login/registro');
  console.log('   👤 GET  /api/user/status - Status do usuário');
  console.log('   ▶️  POST /api/user/start - Iniciar bot');
  console.log('   ⏹️  POST /api/user/stop - Parar bot');
  console.log('   🔧 POST /api/user/config - Configurar API keys');

  const httpServer = createServer(app);
  return httpServer;
}
