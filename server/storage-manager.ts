
// 🗃️ STORAGE MANAGER - DATABASE FALLBACK SYSTEM
import { MemStorage } from './storage';
import { DatabaseStorage, databaseStorage } from './database';
import type { IStorage } from './storage';

/**
 * 🚀 INTELLIGENT STORAGE MANAGER
 * Automatically switches between PostgreSQL and MemStorage based on availability
 */
class StorageManager {
  private primaryStorage: DatabaseStorage;
  private fallbackStorage: MemStorage;
  private currentStorage: IStorage;
  private isDatabaseMode: boolean = false;

  constructor() {
    console.log('🗃️ Initializing Storage Manager...');
    
    this.primaryStorage = databaseStorage;
    this.fallbackStorage = new MemStorage();
    this.currentStorage = this.fallbackStorage; // Start with fallback
    
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Try to connect to database
      if (process.env.DATABASE_URL) {
        console.log('🗃️ Attempting PostgreSQL connection...');
        
        const healthCheck = await this.primaryStorage.healthCheck();
        
        if (healthCheck.status === 'healthy') {
          console.log('✅ PostgreSQL connected - switching to database mode');
          this.currentStorage = this.primaryStorage;
          this.isDatabaseMode = true;
        } else {
          console.warn('⚠️ PostgreSQL unhealthy, using MemStorage fallback:', healthCheck.error);
          this.useFallbackStorage();
        }
      } else {
        console.warn('⚠️ DATABASE_URL not configured, using MemStorage');
        this.useFallbackStorage();
      }
    } catch (error) {
      console.error('❌ Failed to initialize PostgreSQL, using MemStorage fallback:', error);
      this.useFallbackStorage();
    }
  }

  private useFallbackStorage(): void {
    this.currentStorage = this.fallbackStorage;
    this.isDatabaseMode = false;
    console.log('🔄 Storage Manager using MemStorage (fallback mode)');
  }

  // Storage interface methods - delegate to current storage
  async getUser(id: string) {
    return this.currentStorage.getUser(id);
  }

  async getUserByUsername(username: string) {
    return this.currentStorage.getUserByUsername(username);
  }

  async createUser(user: any) {
    return this.currentStorage.createUser(user);
  }

  async createTrade(trade: any) {
    return this.currentStorage.createTrade(trade);
  }

  async getTrades(limit?: number) {
    return this.currentStorage.getTrades(limit);
  }

  async getTradesByDate(date: string) {
    return this.currentStorage.getTradesByDate(date);
  }

  async getActiveTrades() {
    return this.currentStorage.getActiveTrades();
  }

  async getBotConfig() {
    return this.currentStorage.getBotConfig();
  }

  async updateBotConfig(config: any) {
    return this.currentStorage.updateBotConfig(config);
  }

  async getDailyMetrics(date: string) {
    return this.currentStorage.getDailyMetrics(date);
  }

  async updateDailyMetrics(metrics: any) {
    return this.currentStorage.updateDailyMetrics(metrics);
  }

  async getLatestMarketData(pair: string) {
    return this.currentStorage.getLatestMarketData(pair);
  }

  async saveMarketData(data: any) {
    return this.currentStorage.saveMarketData(data);
  }

  async getMarketDataHistory(pair: string, hours: number) {
    return this.currentStorage.getMarketDataHistory(pair, hours);
  }

  async getTopPairsByPerformance(limit?: number) {
    return this.currentStorage.getTopPairsByPerformance(limit);
  }

  async updatePairPerformanceScore(pair: string, marketData: any) {
    return this.currentStorage.updatePairPerformanceScore(pair, marketData);
  }

  // Additional methods for fallback storage compatibility
  async getPairPerformanceData(pair: string) {
    if (this.isDatabaseMode) {
      // Database mode doesn't have this method, return default
      return { todayScore: 0, history: [] };
    } else {
      // Call the method on MemStorage
      return (this.currentStorage as MemStorage)['getPairPerformanceData'](pair);
    }
  }

  /**
   * 🔄 ATTEMPT TO RECONNECT TO DATABASE
   */
  async attemptDatabaseReconnection(): Promise<boolean> {
    if (this.isDatabaseMode) {
      return true; // Already connected
    }

    try {
      console.log('🔄 Attempting to reconnect to PostgreSQL...');
      
      const healthCheck = await this.primaryStorage.healthCheck();
      
      if (healthCheck.status === 'healthy') {
        console.log('✅ PostgreSQL reconnected successfully');
        
        // TODO: Migrate data from MemStorage to Database
        await this.migrateMemDataToDatabase();
        
        this.currentStorage = this.primaryStorage;
        this.isDatabaseMode = true;
        return true;
      } else {
        console.warn('⚠️ PostgreSQL still unhealthy:', healthCheck.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Database reconnection failed:', error);
      return false;
    }
  }

  /**
   * 📦 MIGRATE DATA FROM MEMSTORAGE TO DATABASE
   */
  private async migrateMemDataToDatabase(): Promise<void> {
    if (!this.isDatabaseMode || !(this.fallbackStorage instanceof MemStorage)) {
      return;
    }

    try {
      console.log('📦 Migrating MemStorage data to PostgreSQL...');

      // Migrate bot config
      const memConfig = await this.fallbackStorage.getBotConfig();
      if (memConfig) {
        await this.primaryStorage.updateBotConfig(memConfig);
        console.log('✅ Bot config migrated');
      }

      // Migrate trades
      const memTrades = await this.fallbackStorage.getTrades(1000);
      for (const trade of memTrades) {
        try {
          // Remove id and executedAt for insertion
          const { id, executedAt, ...tradeData } = trade;
          await this.primaryStorage.createTrade(tradeData as any);
        } catch (error) {
          console.warn('⚠️ Failed to migrate trade:', error);
        }
      }
      console.log(`✅ ${memTrades.length} trades migrated`);

      console.log('✅ Data migration completed');
    } catch (error) {
      console.error('❌ Data migration failed:', error);
    }
  }

  /**
   * 📊 GET STORAGE STATUS
   */
  getStatus(): {
    mode: 'database' | 'memory';
    connected: boolean;
    databaseUrl: boolean;
    canReconnect: boolean;
  } {
    return {
      mode: this.isDatabaseMode ? 'database' : 'memory',
      connected: this.isDatabaseMode,
      databaseUrl: !!process.env.DATABASE_URL,
      canReconnect: !this.isDatabaseMode && !!process.env.DATABASE_URL
    };
  }

  /**
   * 🏥 HEALTH CHECK
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    mode: 'database' | 'memory';
    details?: any;
  }> {
    try {
      if (this.isDatabaseMode) {
        const dbHealth = await this.primaryStorage.healthCheck();
        return {
          status: dbHealth.status,
          mode: 'database',
          details: dbHealth
        };
      } else {
        return {
          status: process.env.DATABASE_URL ? 'degraded' : 'healthy',
          mode: 'memory',
          details: {
            reason: process.env.DATABASE_URL ? 'Database configured but not connected' : 'No database configured'
          }
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        mode: this.isDatabaseMode ? 'database' : 'memory',
        details: { error: (error as Error).message }
      };
    }
  }
}

// Export singleton instance
export const storageManager = new StorageManager();
export default storageManager;

// Backward compatibility - export the storage interface
export const storage = storageManager;
