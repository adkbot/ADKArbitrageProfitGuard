
// 🚀 FIXED EXCHANGE MANAGER - COMPREHENSIVE GEO-BYPASS AND ERROR HANDLING
import ccxt from 'ccxt';
import { httpClient } from './http-client-fixed';
import { getEnhancedProxyStatus } from './proxy-enhanced';

export interface FixedExchangeConfig {
  name: string;
  id: string;
  primary: boolean;
  hasGeoBlocking: boolean;
  isAvailable: boolean;
  lastCheck: number;
  consecutiveFailures: number;
  endpoints: {
    spot: string;
    futures: string;
    testEndpoint: string;
  };
  createInstance: (type: 'spot' | 'futures') => ccxt.Exchange;
}

/**
 * 🌐 FIXED EXCHANGE CONFIGURATIONS WITH BETTER ERROR HANDLING
 */
const FIXED_EXCHANGE_CONFIGS: { [key: string]: Omit<FixedExchangeConfig, 'isAvailable' | 'lastCheck' | 'consecutiveFailures'> } = {
  okx: {
    name: "OKX",
    id: "okx",
    primary: true,
    hasGeoBlocking: false, // OKX has less aggressive geo-blocking
    endpoints: {
      spot: "https://www.okx.com",
      futures: "https://www.okx.com",
      testEndpoint: "https://www.okx.com/api/v5/public/time",
    },
    createInstance: (type) => {
      const options: any = {
        apiKey: process.env.OKX_API_KEY || '',
        secret: process.env.OKX_API_SECRET || '',
        password: process.env.OKX_PASSPHRASE || '',
        sandbox: process.env.NODE_ENV !== 'production',
        enableRateLimit: true,
        timeout: 30000,
        options: {
          defaultType: type === 'futures' ? 'swap' : 'spot',
          adjustForTimeDifference: true,
        },
      };

      // Apply proxy configuration
      const proxyStatus = getEnhancedProxyStatus();
      if (proxyStatus.enabled) {
        console.log('🔧 OKX: Configuring with proxy support');
        // Proxy will be handled by the global fetch patching
      }

      return new ccxt.okx(options);
    }
  },

  binance: {
    name: "Binance",
    id: "binance",
    primary: false,
    hasGeoBlocking: true, // Known to have strong geo-blocking
    endpoints: {
      spot: "https://api.binance.com",
      futures: "https://fapi.binance.com",
      testEndpoint: "https://api.binance.com/api/v3/ping",
    },
    createInstance: (type) => {
      const options: any = {
        apiKey: process.env.BINANCE_API_KEY || '',
        secret: process.env.BINANCE_API_SECRET || '',
        sandbox: process.env.NODE_ENV !== 'production',
        enableRateLimit: true,
        timeout: 30000,
        options: {
          defaultType: type === 'futures' ? 'future' : 'spot',
          adjustForTimeDifference: true,
        },
      };

      return new ccxt.binance(options);
    }
  },

  bybit: {
    name: "Bybit",
    id: "bybit",
    primary: false,
    hasGeoBlocking: true, // Has geo-blocking but less than Binance
    endpoints: {
      spot: "https://api.bybit.com",
      futures: "https://api.bybit.com",
      testEndpoint: "https://api.bybit.com/v5/market/time",
    },
    createInstance: (type) => {
      const options: any = {
        apiKey: process.env.BYBIT_API_KEY || '',
        secret: process.env.BYBIT_API_SECRET || '',
        sandbox: process.env.NODE_ENV !== 'production',
        enableRateLimit: true,
        timeout: 30000,
        options: {
          defaultType: type === 'futures' ? 'linear' : 'spot',
          adjustForTimeDifference: true,
        },
      };

      return new ccxt.bybit(options);
    }
  }
};

export interface MarketDataResult {
  symbol: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;
  basisPercent: number;
  fundingRate: number;
  volume24h: number;
  timestamp: number;
  exchange: string;
}

/**
 * 🎯 FIXED MULTI-EXCHANGE MANAGER WITH COMPREHENSIVE ERROR HANDLING
 */
export class FixedMultiExchangeManager {
  private exchanges: Map<string, FixedExchangeConfig> = new Map();
  private spotInstances: Map<string, ccxt.Exchange> = new Map();
  private futuresInstances: Map<string, ccxt.Exchange> = new Map();
  private activeExchange: string = 'okx'; // Start with OKX as it has less geo-blocking
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 30000; // 30 second cache

  constructor() {
    console.log('🚀 Initializing Fixed Multi-Exchange Manager...');
    this.initializeExchanges();
  }

  private initializeExchanges(): void {
    // Initialize exchange configurations
    Object.entries(FIXED_EXCHANGE_CONFIGS).forEach(([id, config]) => {
      const exchangeConfig: FixedExchangeConfig = {
        ...config,
        isAvailable: true,
        lastCheck: 0,
        consecutiveFailures: 0
      };

      this.exchanges.set(id, exchangeConfig);

      try {
        // Create instances
        this.spotInstances.set(id, config.createInstance('spot'));
        this.futuresInstances.set(id, config.createInstance('futures'));
        
        console.log(`✅ ${config.name} configured successfully`);
      } catch (error) {
        console.error(`❌ Failed to configure ${config.name}:`, (error as Error).message);
        exchangeConfig.isAvailable = false;
        exchangeConfig.consecutiveFailures = 999;
      }
    });
  }

  /**
   * 🔍 TEST EXCHANGE CONNECTIVITY WITH ENHANCED RETRY
   */
  private async testExchangeConnectivity(exchangeId: string): Promise<boolean> {
    const config = this.exchanges.get(exchangeId);
    if (!config) return false;

    try {
      console.log(`🔍 Testing ${config.name} connectivity...`);

      const response = await httpClient.fetch(config.endpoints.testEndpoint, {
        method: 'GET',
        timeout: 10000,
        maxRetries: 2
      });

      if (response.status === 200) {
        console.log(`✅ ${config.name} connectivity: OK`);
        config.isAvailable = true;
        config.consecutiveFailures = 0;
        config.lastCheck = Date.now();
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error(`❌ ${config.name} connectivity failed:`, error.message);
      
      // Handle geo-blocking detection
      if (error.message.includes('403') || error.message.includes('451') || 
          error.message.includes('geo') || error.message.includes('region')) {
        console.warn(`🌐 ${config.name}: Geo-blocking detected`);
        config.consecutiveFailures = 999; // Mark as permanently failed
      } else {
        config.consecutiveFailures++;
      }
      
      config.isAvailable = false;
      config.lastCheck = Date.now();
      return false;
    }
  }

  /**
   * 🎯 SELECT BEST AVAILABLE EXCHANGE
   */
  async selectBestExchange(): Promise<string> {
    console.log('🔍 Selecting best available exchange...');

    // Priority order: Non-geo-blocked first
    const priorityOrder = ['okx', 'bybit', 'binance'];
    
    for (const exchangeId of priorityOrder) {
      const config = this.exchanges.get(exchangeId);
      if (!config) continue;

      // Skip if too many recent failures
      if (config.consecutiveFailures >= 5 && (Date.now() - config.lastCheck) < 300000) {
        continue;
      }

      if (await this.testExchangeConnectivity(exchangeId)) {
        this.activeExchange = exchangeId;
        console.log(`🎯 Selected exchange: ${config.name}`);
        return exchangeId;
      }
    }

    throw new Error('❌ No working exchanges available - all exchanges failed connectivity test');
  }

  /**
   * 🔄 INITIALIZE WITH FALLBACK DISCOVERY
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Fixed Multi-Exchange system...');
      
      await this.selectBestExchange();
      
      // Test basic functionality
      const testResult = await this.getSpotPrice('BTC/USDT');
      console.log(`✅ Initialization successful: BTC/USDT = $${testResult.price} via ${testResult.exchange}`);
      
    } catch (error) {
      console.error('❌ Fixed Multi-Exchange initialization failed:', error);
      throw error;
    }
  }

  /**
   * 📊 GET SPOT PRICE WITH FALLBACK
   */
  async getSpotPrice(symbol: string): Promise<{ price: number; exchange: string }> {
    const cacheKey = `spot_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    let lastError: Error | null = null;

    // Try active exchange first
    const activeConfig = this.exchanges.get(this.activeExchange);
    if (activeConfig?.isAvailable) {
      try {
        const instance = this.spotInstances.get(this.activeExchange);
        if (instance) {
          const ticker = await instance.fetchTicker(symbol);
          const result = {
            price: ticker.last || ticker.close || 0,
            exchange: activeConfig.name
          };
          
          this.setCachedData(cacheKey, result);
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${activeConfig.name} spot price failed:`, error);
        
        // Mark as failed if geo-blocking
        if (this.isGeoBlockingError(error)) {
          activeConfig.isAvailable = false;
          activeConfig.consecutiveFailures = 999;
        }
      }
    }

    // Try fallback exchanges
    for (const [exchangeId, config] of this.exchanges) {
      if (exchangeId === this.activeExchange || !config.isAvailable) continue;
      
      try {
        const instance = this.spotInstances.get(exchangeId);
        if (!instance) continue;

        console.log(`🔄 Fallback spot price via ${config.name}...`);
        const ticker = await instance.fetchTicker(symbol);
        
        // Promote to active exchange
        this.activeExchange = exchangeId;
        console.log(`✅ Spot price fallback successful: ${config.name}`);
        
        const result = {
          price: ticker.last || ticker.close || 0,
          exchange: config.name
        };
        
        this.setCachedData(cacheKey, result);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ ${config.name} spot price fallback failed:`, error);
      }
    }

    throw new Error(`Failed to get spot price for ${symbol}: ${lastError?.message || 'All exchanges failed'}`);
  }

  /**
   * 📊 GET FUTURES PRICE WITH FALLBACK
   */
  async getFuturesPrice(symbol: string): Promise<{ price: number; exchange: string }> {
    const cacheKey = `futures_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    let lastError: Error | null = null;

    // Try active exchange first
    const activeConfig = this.exchanges.get(this.activeExchange);
    if (activeConfig?.isAvailable) {
      try {
        const instance = this.futuresInstances.get(this.activeExchange);
        if (instance) {
          const ticker = await instance.fetchTicker(symbol);
          const result = {
            price: ticker.last || ticker.close || 0,
            exchange: activeConfig.name
          };
          
          this.setCachedData(cacheKey, result);
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${activeConfig.name} futures price failed:`, error);
      }
    }

    // Try fallback exchanges
    for (const [exchangeId, config] of this.exchanges) {
      if (exchangeId === this.activeExchange || !config.isAvailable) continue;
      
      try {
        const instance = this.futuresInstances.get(exchangeId);
        if (!instance) continue;

        console.log(`🔄 Fallback futures price via ${config.name}...`);
        const ticker = await instance.fetchTicker(symbol);
        
        const result = {
          price: ticker.last || ticker.close || 0,
          exchange: config.name
        };
        
        this.setCachedData(cacheKey, result);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ ${config.name} futures price fallback failed:`, error);
      }
    }

    throw new Error(`Failed to get futures price for ${symbol}: ${lastError?.message || 'All exchanges failed'}`);
  }

  /**
   * 📈 GET FUNDING RATE WITH FALLBACK
   */
  async getFundingRate(symbol: string): Promise<{ rate: number; exchange: string }> {
    const cacheKey = `funding_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    let lastError: Error | null = null;

    // Try active exchange first
    const activeConfig = this.exchanges.get(this.activeExchange);
    if (activeConfig?.isAvailable) {
      try {
        const instance = this.futuresInstances.get(this.activeExchange);
        if (instance) {
          // Special handling for OKX swap symbols
          let querySymbol = symbol;
          if (this.activeExchange === 'okx' && !symbol.includes(':')) {
            querySymbol = `${symbol}:USDT`;
          }
          
          const fundingRate = await instance.fetchFundingRate(querySymbol);
          const result = {
            rate: fundingRate.fundingRate || 0,
            exchange: activeConfig.name
          };
          
          this.setCachedData(cacheKey, result);
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${activeConfig.name} funding rate failed:`, error);
      }
    }

    // Try fallback exchanges
    for (const [exchangeId, config] of this.exchanges) {
      if (exchangeId === this.activeExchange || !config.isAvailable) continue;
      
      try {
        const instance = this.futuresInstances.get(exchangeId);
        if (!instance) continue;

        console.log(`🔄 Fallback funding rate via ${config.name}...`);
        
        let querySymbol = symbol;
        if (exchangeId === 'okx' && !symbol.includes(':')) {
          querySymbol = `${symbol}:USDT`;
        }
        
        const fundingRate = await instance.fetchFundingRate(querySymbol);
        
        const result = {
          rate: fundingRate.fundingRate || 0,
          exchange: config.name
        };
        
        this.setCachedData(cacheKey, result);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ ${config.name} funding rate fallback failed:`, error);
      }
    }

    throw new Error(`Failed to get funding rate for ${symbol}: ${lastError?.message || 'All exchanges failed'}`);
  }

  /**
   * 📊 GET 24H VOLUME WITH FALLBACK
   */
  async get24hVolume(symbol: string): Promise<{ volume: number; exchange: string }> {
    const cacheKey = `volume_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    let lastError: Error | null = null;

    // Try active exchange first
    const activeConfig = this.exchanges.get(this.activeExchange);
    if (activeConfig?.isAvailable) {
      try {
        const instance = this.spotInstances.get(this.activeExchange);
        if (instance) {
          const ticker = await instance.fetchTicker(symbol);
          const result = {
            volume: ticker.baseVolume || ticker.quoteVolume || 0,
            exchange: activeConfig.name
          };
          
          this.setCachedData(cacheKey, result);
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${activeConfig.name} volume failed:`, error);
      }
    }

    // Try fallback exchanges
    for (const [exchangeId, config] of this.exchanges) {
      if (exchangeId === this.activeExchange || !config.isAvailable) continue;
      
      try {
        const instance = this.spotInstances.get(exchangeId);
        if (!instance) continue;

        console.log(`🔄 Fallback volume via ${config.name}...`);
        const ticker = await instance.fetchTicker(symbol);
        
        const result = {
          volume: ticker.baseVolume || ticker.quoteVolume || 0,
          exchange: config.name
        };
        
        this.setCachedData(cacheKey, result);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ ${config.name} volume fallback failed:`, error);
      }
    }

    throw new Error(`Failed to get volume for ${symbol}: ${lastError?.message || 'All exchanges failed'}`);
  }

  /**
   * 📊 GET COMPLETE MARKET DATA
   */
  async getMarketData(symbol: string): Promise<MarketDataResult> {
    console.log(`📊 Getting market data for ${symbol}...`);

    try {
      const [spot, futures, funding, volume] = await Promise.all([
        this.getSpotPrice(symbol),
        this.getFuturesPrice(symbol),
        this.getFundingRate(symbol),
        this.get24hVolume(symbol)
      ]);

      const basis = futures.price - spot.price;
      const basisPercent = spot.price > 0 ? (basis / spot.price) * 100 : 0;

      const result: MarketDataResult = {
        symbol,
        spotPrice: spot.price,
        futuresPrice: futures.price,
        basis,
        basisPercent,
        fundingRate: funding.rate,
        volume24h: volume.volume,
        timestamp: Date.now(),
        exchange: this.exchanges.get(this.activeExchange)?.name || 'Unknown'
      };

      console.log(`✅ Market data for ${symbol}: Basis=${basisPercent.toFixed(3)}%, Funding=${(funding.rate*100).toFixed(4)}%`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to get market data for ${symbol}:`, error);
      throw error;
    }
  }

  // Cache methods
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.ttl) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: Date.now() + this.CACHE_TTL
    });
  }

  private isGeoBlockingError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return message.includes('403') || 
           message.includes('451') || 
           message.includes('geo') || 
           message.includes('region') ||
           message.includes('forbidden');
  }

  /**
   * 📊 GET SYSTEM STATUS
   */
  getStatus(): {
    activeExchange: string;
    exchanges: { [key: string]: any };
    cache: { size: number; ttl: number };
  } {
    const exchangeStatus: { [key: string]: any } = {};
    
    for (const [id, config] of this.exchanges) {
      exchangeStatus[id] = {
        name: config.name,
        available: config.isAvailable,
        hasGeoBlocking: config.hasGeoBlocking,
        consecutiveFailures: config.consecutiveFailures,
        lastCheck: config.lastCheck
      };
    }

    return {
      activeExchange: this.exchanges.get(this.activeExchange)?.name || 'None',
      exchanges: exchangeStatus,
      cache: {
        size: this.cache.size,
        ttl: this.CACHE_TTL
      }
    };
  }

  /**
   * 🧹 CLEAR CACHE
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Exchange manager cache cleared');
  }

  // Legacy compatibility methods
  async isConnected(): Promise<boolean> {
    const config = this.exchanges.get(this.activeExchange);
    return config?.isAvailable || false;
  }

  async getBalance(): Promise<any> {
    const config = this.exchanges.get(this.activeExchange);
    return {
      exchange: config?.name || 'Unknown',
      spot: { error: 'Balance queries require API credentials' },
      futures: { error: 'Balance queries require API credentials' }
    };
  }

  getExchangeInstance(exchangeName: string): any {
    return this.spotInstances.get(exchangeName.toLowerCase());
  }

  getFuturesExchangeInstance(exchangeName: string): any {
    return this.futuresInstances.get(exchangeName.toLowerCase());
  }

  async testConnection(): Promise<any> {
    try {
      await this.selectBestExchange();
      return {
        success: true,
        exchange: this.activeExchange,
        message: 'Connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

// Export singleton instance
export const fixedMultiExchangeManager = new FixedMultiExchangeManager();
export default fixedMultiExchangeManager;
