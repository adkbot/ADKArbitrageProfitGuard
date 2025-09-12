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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private trades: Map<number, Trade>;
  private botConfig: BotConfig | undefined;
  private dailyMetrics: Map<string, DailyMetrics>;
  private marketData: Map<string, MarketData[]>;
  private tradeIdCounter: number;

  constructor() {
    this.users = new Map();
    this.trades = new Map();
    this.dailyMetrics = new Map();
    this.marketData = new Map();
    this.tradeIdCounter = 1;
    
    // Initialize default bot config
    this.botConfig = {
      id: 1,
      pairs: ['BTC/USDT', 'ETH/USDT'],
      basisEntry: '0.004',
      basisExit: '0.0015',
      maxNotionalUsdt: '500',
      maxDailyTrades: 10,
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
}

export const storage = new MemStorage();
