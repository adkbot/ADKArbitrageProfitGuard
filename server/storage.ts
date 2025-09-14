import { 
  type User, 
  type InsertUser,
  type Trade,
  type InsertTrade,
  type BotConfig,
  type InsertBotConfig,
  type DailyMetrics,
  type InsertDailyMetrics,
  type MarketData,
  type InsertMarketData
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trade methods
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTrades(limit?: number): Promise<Trade[]>;
  getTradesByDate(date: string): Promise<Trade[]>;
  getActiveTrades(): Promise<Trade[]>;
  
  // Bot config methods
  getBotConfig(): Promise<BotConfig | undefined>;
  updateBotConfig(config: InsertBotConfig): Promise<BotConfig>;
  
  // Metrics methods
  getDailyMetrics(date: string): Promise<DailyMetrics | undefined>;
  updateDailyMetrics(metrics: InsertDailyMetrics): Promise<DailyMetrics>;
  
  // Market data methods
  getLatestMarketData(pair: string): Promise<MarketData | undefined>;
  saveMarketData(data: InsertMarketData): Promise<MarketData>;
  getMarketDataHistory(pair: string, hours: number): Promise<MarketData[]>;
  
  // 🔥 TOP 30 PAIRS ANALYSIS METHODS
  getTopPairsByPerformance(limit?: number): Promise<string[]>;
  updatePairPerformanceScore(pair: string, marketData: { 
    basisPercent: number; 
    volume24h: number;
    fundingRate?: number;
  }): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private trades: Map<number, Trade>;
  private botConfig: BotConfig | undefined;
  private dailyMetrics: Map<string, DailyMetrics>;
  private marketData: Map<string, MarketData[]>;
  private tradeIdCounter: number;
  // 🔥 SISTEMA DE RANKING DOS TOP 30 PARES - DIÁRIO COM CUSTOS REAIS
  private dailyPairScores: Map<string, Map<string, number>>; // Map<date, Map<pair, score>>
  private pairAnalysisHistory: Map<string, { volume24h: number; basis: number; netScore: number; timestamp: Date }[]>;
  private lastScoreResetDate: string;

  constructor() {
    this.users = new Map();
    this.trades = new Map();
    this.dailyMetrics = new Map();
    this.marketData = new Map();
    this.tradeIdCounter = 1;
    // 🔥 INICIALIZAR SISTEMA DE RANKING DIÁRIO
    this.dailyPairScores = new Map();
    this.pairAnalysisHistory = new Map();
    this.lastScoreResetDate = new Date().toISOString().split('T')[0];
    
    // 🔥 TOP 50 PARES PARA SELEÇÃO AUTOMÁTICA DOS 30 MELHORES
    this.botConfig = {
      id: 1,
      pairs: [
        // 🪙 TOP TIER - Major Coins
        'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
        'DOGE/USDT', 'SOL/USDT', 'TRX/USDT', 'LTC/USDT',
        
        // 💰 HIGH VOLUME - DeFi & Layer 1
        'AVAX/USDT', 'DOT/USDT', 'UNI/USDT', 'ATOM/USDT',
        'LINK/USDT', 'ETC/USDT', 'FTM/USDT', 'NEAR/USDT', 'ALGO/USDT',
        
        // 🚀 EMERGING - High Potential
        'APT/USDT', 'SUI/USDT', 'INJ/USDT', 'TIA/USDT', 'SEI/USDT',
        'ARB/USDT', 'OP/USDT', 'BLUR/USDT', 'WLD/USDT',
        
        // 📈 VOLATILE - Trading Opportunities  
        'FIL/USDT', 'AAVE/USDT', 'MKR/USDT', 'CRV/USDT', 'SUSHI/USDT',
        'YFI/USDT', 'COMP/USDT', 'SNX/USDT', 'REN/USDT', 'KSM/USDT',
        
        // 🌐 ADDITIONAL - Volume & Liquidity
        'ICP/USDT', 'VET/USDT', 'HBAR/USDT', 'EGLD/USDT', 'THETA/USDT',
        'MANA/USDT', 'SAND/USDT', 'AXS/USDT', 'GALA/USDT', 'CHZ/USDT'
      ],
      basisEntry: '0.004',
      basisExit: '0.0015',
      maxNotionalUsdt: '500',
      maxDailyTrades: 30, // 🔄 Aumentado para suportar mais pares
      slippageK: '0.0002',
      fundingLookaheadH: 8,
      wyckoffN: 50,
      gexRefreshSec: 120,
      arbitrageEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Trade methods
  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = this.tradeIdCounter++;
    const trade: Trade = {
      ...insertTrade,
      id,
      pnl: insertTrade.pnl ?? null,
      fundingRate: insertTrade.fundingRate ?? null,
      wyckoffScore: insertTrade.wyckoffScore ?? null,
      gexLevel: insertTrade.gexLevel ?? null,
      metadata: insertTrade.metadata ?? null,
      executedAt: new Date()
    };
    this.trades.set(id, trade);
    return trade;
  }
  
  async getTrades(limit: number = 50): Promise<Trade[]> {
    const allTrades = Array.from(this.trades.values())
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
    return allTrades.slice(0, limit);
  }
  
  async getTradesByDate(date: string): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(trade => trade.executedAt.toISOString().startsWith(date))
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }
  
  async getActiveTrades(): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(trade => trade.type === 'open');
  }
  
  // Bot config methods
  async getBotConfig(): Promise<BotConfig | undefined> {
    return this.botConfig;
  }
  
  async updateBotConfig(config: InsertBotConfig): Promise<BotConfig> {
    this.botConfig = {
      ...this.botConfig!,
      ...config,
      updatedAt: new Date()
    };
    return this.botConfig;
  }
  
  // Metrics methods
  async getDailyMetrics(date: string): Promise<DailyMetrics | undefined> {
    return this.dailyMetrics.get(date);
  }
  
  async updateDailyMetrics(insertMetrics: InsertDailyMetrics): Promise<DailyMetrics> {
    const metrics: DailyMetrics = {
      ...insertMetrics,
      id: Date.now(), // Simple ID for memory storage
      createdAt: new Date()
    };
    this.dailyMetrics.set(insertMetrics.date, metrics);
    return metrics;
  }
  
  // Market data methods
  async getLatestMarketData(pair: string): Promise<MarketData | undefined> {
    const pairData = this.marketData.get(pair) || [];
    return pairData[pairData.length - 1];
  }
  
  async saveMarketData(insertData: InsertMarketData): Promise<MarketData> {
    const data: MarketData = {
      ...insertData,
      id: Date.now(), // Simple ID for memory storage
      wyckoffScore: insertData.wyckoffScore ?? null,
      gexLevel: insertData.gexLevel ?? null,
      timestamp: new Date()
    };
    
    if (!this.marketData.has(insertData.pair)) {
      this.marketData.set(insertData.pair, []);
    }
    
    const pairData = this.marketData.get(insertData.pair)!;
    pairData.push(data);
    
    // Keep only last 1000 records per pair
    if (pairData.length > 1000) {
      pairData.splice(0, pairData.length - 1000);
    }
    
    return data;
  }
  
  async getMarketDataHistory(pair: string, hours: number): Promise<MarketData[]> {
    const pairData = this.marketData.get(pair) || [];
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return pairData
      .filter(data => data.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // 🔥 TOP 30 PAIRS RANKING SYSTEM - DIÁRIO COM CUSTOS REAIS
  async getTopPairsByPerformance(limit: number = 30): Promise<string[]> {
    const today = new Date().toISOString().split('T')[0];
    this.ensureDailyScoreMap(today);
    
    const todayScores = this.dailyPairScores.get(today) || new Map();
    const scores = Array.from(todayScores.entries())
      .sort(([,a], [,b]) => b - a) // Ordenar por score decrescente (lucro líquido)
      .slice(0, limit)
      .map(([pair]) => pair);
    
    // Se não há scores suficientes do dia, usar todos os pares configurados
    if (scores.length < limit) {
      const allPairs = this.botConfig?.pairs || [];
      const remainingPairs = allPairs.filter(pair => !scores.includes(pair));
      scores.push(...remainingPairs.slice(0, limit - scores.length));
    }
    
    return scores.slice(0, limit);
  }

  async updatePairPerformanceScore(pair: string, marketData: { 
    basisPercent: number; 
    volume24h: number;
    fundingRate?: number;
  }): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    this.ensureDailyScoreMap(today);
    
    // 🏦 CALCULAR SCORE REAL CONSIDERANDO TODOS OS CUSTOS
    const config = this.botConfig!;
    const basisAbs = Math.abs(marketData.basisPercent);
    
    // Custos típicos de arbitragem
    const tradingFees = 0.04; // 0.02% cada lado (spot + futures)
    const slippage = parseFloat(config.slippageK) * 100; // slippageK em %
    const funding = Math.abs(marketData.fundingRate || 0) * 8; // 8h funding rate
    
    // 💰 LUCRO LÍQUIDO = BASIS - TODOS OS CUSTOS
    const netProfitPercent = basisAbs - tradingFees - slippage - funding;
    
    // 📊 FATOR DE VOLUME - favorece pares com mais liquidez
    const volumeFactor = Math.min(1.2, 1 + (marketData.volume24h / 100_000_000) * 0.2);
    
    // 🎯 SCORE FINAL = LUCRO LÍQUIDO * FATOR VOLUME * 100
    const finalScore = Math.max(0, netProfitPercent * volumeFactor * 100);
    
    // Atualizar score diário
    const todayScores = this.dailyPairScores.get(today)!;
    const currentScore = todayScores.get(pair) || 0;
    const smoothedScore = (currentScore * 0.8) + (finalScore * 0.2); // Suavização
    todayScores.set(pair, smoothedScore);
    
    // Manter histórico de análise
    if (!this.pairAnalysisHistory.has(pair)) {
      this.pairAnalysisHistory.set(pair, []);
    }
    
    const history = this.pairAnalysisHistory.get(pair)!;
    history.push({
      volume24h: marketData.volume24h, // DADOS REAIS
      basis: basisAbs,
      netScore: finalScore,
      timestamp: new Date()
    });
    
    // Manter apenas últimas 24 horas de histórico
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.pairAnalysisHistory.set(pair, 
      history.filter(h => h.timestamp >= cutoff)
    );
  }
  
  // 🔄 GARANTIR MAPA DE SCORES DIÁRIOS
  private ensureDailyScoreMap(date: string): void {
    // Reset diário às 00:00 UTC
    if (date !== this.lastScoreResetDate) {
      console.log(`🌅 RESET DIÁRIO DE SCORES: ${this.lastScoreResetDate} → ${date}`);
      this.lastScoreResetDate = date;
    }
    
    if (!this.dailyPairScores.has(date)) {
      this.dailyPairScores.set(date, new Map());
      
      // Limpar dados de mais de 7 dias
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      for (const [oldDate] of this.dailyPairScores) {
        if (oldDate < cutoffDate) {
          this.dailyPairScores.delete(oldDate);
        }
      }
    }
  }
  
  // 📈 OBTER DADOS DE PERFORMANCE PARA DEBUG
  async getPairPerformanceData(pair: string): Promise<{
    todayScore: number;
    history: { volume24h: number; basis: number; netScore: number; timestamp: Date }[];
  }> {
    const today = new Date().toISOString().split('T')[0];
    const todayScore = this.dailyPairScores.get(today)?.get(pair) || 0;
    const history = this.pairAnalysisHistory.get(pair) || [];
    
    return { todayScore, history };
  }
}

export const storage = new MemStorage();

// 🔄 AUTO-RESET DIÁRIO DE SCORES ÀS 00:00 UTC
setInterval(() => {
  const today = new Date().toISOString().split('T')[0];
  (storage as MemStorage)['ensureDailyScoreMap'](today);
}, 60 * 60 * 1000); // Verificar a cada hora
