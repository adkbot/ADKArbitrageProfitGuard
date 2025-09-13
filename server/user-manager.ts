import { UserProfile } from './auth.js';

export interface UserTradeState {
  activeTrades: any[];
  totalTrades: number;
  totalProfit: number;
  todayTrades: number;
  todayProfit: number;
  isEnabled: boolean;
  isExecutingTrade: boolean;
  lastAnalysis: Date | null;
  riskSettings: {
    maxTradeAmount: number;
    maxDailyTrades: number;
    stopLossThreshold: number;
    profitThreshold: number;
  };
}

export interface UserExchangeConfig {
  binanceApiKey?: string;
  binanceSecretKey?: string;
  exchangeInstance?: any; // CCXT instance
  lastApiCall: Date | null;
  apiCallsToday: number;
  isConnected: boolean;
}

export class UserManager {
  private static instance: UserManager;
  private userStates: Map<string, UserTradeState> = new Map();
  private userExchanges: Map<string, UserExchangeConfig> = new Map();

  static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  // 🎯 Inicializar estado do usuário
  initializeUser(userId: string, profile: UserProfile): UserTradeState {
    if (!this.userStates.has(userId)) {
      const state: UserTradeState = {
        activeTrades: [],
        totalTrades: 0,
        totalProfit: 0,
        todayTrades: 0,
        todayProfit: 0,
        isEnabled: false, // Usuário começa desabilitado
        isExecutingTrade: false,
        lastAnalysis: null,
        riskSettings: {
          maxTradeAmount: profile.maxTradeAmount || 100,
          maxDailyTrades: profile.riskLevel === 'low' ? 5 : profile.riskLevel === 'high' ? 50 : 20,
          stopLossThreshold: profile.riskLevel === 'low' ? -2 : profile.riskLevel === 'high' ? -10 : -5,
          profitThreshold: 0.1 // 0.1% mínimo
        }
      };
      this.userStates.set(userId, state);
      console.log(`🔧 Estado inicializado para usuário ${userId}`);
    }

    // Inicializar configuração de exchange
    if (!this.userExchanges.has(userId)) {
      const exchangeConfig: UserExchangeConfig = {
        binanceApiKey: profile.binanceApiKey,
        binanceSecretKey: profile.binanceSecretKey,
        lastApiCall: null,
        apiCallsToday: 0,
        isConnected: false
      };
      this.userExchanges.set(userId, exchangeConfig);
    }

    return this.userStates.get(userId)!;
  }

  // 📊 Obter estado do usuário
  getUserState(userId: string): UserTradeState | null {
    return this.userStates.get(userId) || null;
  }

  // 🔧 Configurar exchange do usuário
  setUserExchange(userId: string, apiKey: string, secretKey: string): boolean {
    try {
      const config = this.userExchanges.get(userId);
      if (!config) {
        console.log(`❌ Usuário ${userId} não encontrado`);
        return false;
      }

      config.binanceApiKey = apiKey;
      config.binanceSecretKey = secretKey;
      config.isConnected = true;
      
      // TODO: Criar instância CCXT aqui se necessário
      console.log(`🔑 API configurada para usuário ${userId}`);
      return true;
    } catch (error) {
      console.log(`❌ Erro ao configurar exchange para ${userId}: ${error.message}`);
      return false;
    }
  }

  // ▶️ Ativar/Desativar bot para usuário
  setUserBotStatus(userId: string, enabled: boolean): boolean {
    const state = this.userStates.get(userId);
    if (!state) {
      console.log(`❌ Estado do usuário ${userId} não encontrado`);
      return false;
    }

    // Verificar se tem exchange configurado
    const exchange = this.userExchanges.get(userId);
    if (enabled && (!exchange?.binanceApiKey || !exchange?.binanceSecretKey)) {
      console.log(`❌ Usuário ${userId} tentou ativar sem API keys`);
      return false;
    }

    state.isEnabled = enabled;
    console.log(`${enabled ? '✅' : '⏹️'} Bot ${enabled ? 'ativado' : 'desativado'} para usuário ${userId}`);
    return true;
  }

  // 📈 Registrar trade do usuário
  recordUserTrade(userId: string, trade: any): void {
    const state = this.userStates.get(userId);
    if (!state) {
      console.log(`❌ Tentativa de registrar trade para usuário inexistente: ${userId}`);
      return;
    }

    state.activeTrades.push(trade);
    state.totalTrades++;
    state.todayTrades++;
    
    if (trade.profit) {
      state.totalProfit += trade.profit;
      state.todayProfit += trade.profit;
    }

    console.log(`📊 Trade registrado para ${userId}: ${trade.symbol} (Lucro: ${trade.profit || 0})`);
  }

  // 🔒 Verificar se usuário pode fazer trade
  canUserTrade(userId: string): { canTrade: boolean; reason?: string } {
    const state = this.userStates.get(userId);
    if (!state) {
      return { canTrade: false, reason: 'Usuário não encontrado' };
    }

    if (!state.isEnabled) {
      return { canTrade: false, reason: 'Bot desativado pelo usuário' };
    }

    if (state.isExecutingTrade) {
      return { canTrade: false, reason: 'Trade em execução' };
    }

    const exchange = this.userExchanges.get(userId);
    if (!exchange?.isConnected) {
      return { canTrade: false, reason: 'Exchange não conectado' };
    }

    if (state.todayTrades >= state.riskSettings.maxDailyTrades) {
      return { canTrade: false, reason: 'Limite diário de trades atingido' };
    }

    return { canTrade: true };
  }

  // 🔄 Reset estatísticas diárias (chamado diariamente)
  resetDailyStats(): void {
    for (const [userId, state] of this.userStates) {
      state.todayTrades = 0;
      state.todayProfit = 0;
      
      const exchange = this.userExchanges.get(userId);
      if (exchange) {
        exchange.apiCallsToday = 0;
      }
    }
    console.log('🔄 Estatísticas diárias resetadas para todos usuários');
  }

  // 📊 Obter estatísticas gerais
  getGlobalStats() {
    const states = Array.from(this.userStates.values());
    return {
      totalUsers: states.length,
      activeUsers: states.filter(s => s.isEnabled).length,
      usersInTrade: states.filter(s => s.isExecutingTrade).length,
      totalTradesToday: states.reduce((sum, s) => sum + s.todayTrades, 0),
      totalProfitToday: states.reduce((sum, s) => sum + s.todayProfit, 0),
      totalActiveTrades: states.reduce((sum, s) => sum + s.activeTrades.length, 0)
    };
  }

  // 👥 Obter todos usuários ativos
  getActiveUsers(): string[] {
    const activeUsers: string[] = [];
    for (const [userId, state] of this.userStates) {
      if (state.isEnabled && !state.isExecutingTrade) {
        const canTrade = this.canUserTrade(userId);
        if (canTrade.canTrade) {
          activeUsers.push(userId);
        }
      }
    }
    return activeUsers;
  }

  // 🗑️ Limpar dados do usuário
  removeUser(userId: string): void {
    this.userStates.delete(userId);
    this.userExchanges.delete(userId);
    console.log(`🗑️ Dados removidos para usuário ${userId}`);
  }
}