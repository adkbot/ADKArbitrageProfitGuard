import ccxt from 'ccxt';
import WebSocket from 'ws';

export interface MarketData {
  symbol: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;
  basisPercent: number;
  fundingRate: number;
  volume24h: number;
  timestamp: number;
}

export interface OrderBookData {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

export class ExchangeAPI {
  private spotExchange: any;
  private futuresExchange: any;
  private wsConnections: Map<string, WebSocket> = new Map();
  private marketDataCallbacks: Map<string, (data: MarketData) => void> = new Map();
  private orderBookCallbacks: Map<string, (data: OrderBookData) => void> = new Map();

  constructor() {
    // Initialize CCXT with Binance for spot
    this.spotExchange = new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY || 'test',
      secret: process.env.BINANCE_SECRET_KEY || 'test',
      sandbox: false, // Disable sandbox to avoid geolocation issues
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
      },
    });
    
    // Initialize CCXT with Binance for futures (USDT-M perpetuals)
    this.futuresExchange = new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY || 'test',
      secret: process.env.BINANCE_SECRET_KEY || 'test',
      sandbox: false,
      enableRateLimit: true,
      options: {
        defaultType: 'swap', // For USDT-M perpetuals
      },
    });
  }

  async initialize(): Promise<void> {
    try {
      // Skip market loading if no API keys are provided (development mode)
      if (!process.env.BINANCE_API_KEY) {
        console.log('Exchange initialized in mock mode (no API keys provided)');
        return;
      }
      
      await Promise.all([
        this.spotExchange.loadMarkets(),
        this.futuresExchange.loadMarkets()
      ]);
      console.log('Exchange markets loaded successfully (spot + futures)');
    } catch (error) {
      console.warn('Failed to initialize exchange, running in mock mode:', error.message);
      // Don't throw in development - continue with mock data
    }
  }

  async getSpotPrice(symbol: string): Promise<number> {
    try {
      const ticker = await this.spotExchange.fetchTicker(symbol);
      return ticker.last || 0;
    } catch (error) {
      console.error(`Error fetching spot price for ${symbol}:`, error);
      return 0;
    }
  }

  async getFuturesPrice(symbol: string): Promise<number> {
    try {
      // Convert to futures symbol format (e.g., BTC/USDT -> BTC/USDT:USDT)
      const futuresSymbol = this.convertToFuturesSymbol(symbol);
      const ticker = await this.futuresExchange.fetchTicker(futuresSymbol);
      return ticker.last || 0;
    } catch (error) {
      console.error(`Error fetching futures price for ${symbol}:`, error);
      return 0;
    }
  }

  async getFundingRate(symbol: string): Promise<number> {
    try {
      // Convert to futures symbol format
      const futuresSymbol = this.convertToFuturesSymbol(symbol);
      const fundingRate = await this.futuresExchange.fetchFundingRate(futuresSymbol);
      return fundingRate.fundingRate || 0;
    } catch (error) {
      console.error(`Error fetching funding rate for ${symbol}:`, error);
      return 0;
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const [spotPrice, futuresPrice, fundingRate, volume] = await Promise.all([
        this.getSpotPrice(symbol),
        this.getFuturesPrice(symbol),
        this.getFundingRate(symbol),
        this.get24hVolume(symbol)
      ]);

      const basis = futuresPrice - spotPrice;
      const basisPercent = spotPrice > 0 ? (basis / spotPrice) * 100 : 0;

      return {
        symbol,
        spotPrice,
        futuresPrice,
        basis,
        basisPercent,
        fundingRate: fundingRate * 100, // Convert to percentage
        volume24h: volume,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error getting market data for ${symbol}:`, error);
      throw error;
    }
  }

  async get24hVolume(symbol: string): Promise<number> {
    try {
      const ticker = await this.spotExchange.fetchTicker(symbol);
      return ticker.quoteVolume || 0;
    } catch (error) {
      console.error(`Error fetching 24h volume for ${symbol}:`, error);
      return 0;
    }
  }

  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBookData> {
    try {
      const orderBook = await this.spotExchange.fetchOrderBook(symbol, limit);
      return {
        symbol,
        bids: orderBook.bids.slice(0, limit).map((bid: any) => [Number(bid[0]), Number(bid[1])]) as [number, number][],
        asks: orderBook.asks.slice(0, limit).map((ask: any) => [Number(ask[0]), Number(ask[1])]) as [number, number][],
        timestamp: orderBook.timestamp || Date.now()
      };
    } catch (error) {
      console.error(`Error fetching order book for ${symbol}:`, error);
      throw error;
    }
  }

  // WebSocket connections for real-time data
  subscribeToMarketData(symbol: string, callback: (data: MarketData) => void): void {
    this.marketDataCallbacks.set(symbol, callback);
    this.initializeWebSocket(symbol);
  }

  subscribeToOrderBook(symbol: string, callback: (data: OrderBookData) => void): void {
    this.orderBookCallbacks.set(symbol, callback);
    this.initializeOrderBookWebSocket(symbol);
  }

  private initializeWebSocket(symbol: string): void {
    const wsSymbol = symbol.toLowerCase().replace('/', '');
    const wsUrl = `wss://stream.binance.com:9443/ws/${wsSymbol}@ticker`;
    
    if (this.wsConnections.has(symbol)) {
      return; // Already connected
    }

    const ws = new WebSocket(wsUrl);
    this.wsConnections.set(symbol, ws);

    ws.on('open', () => {
      console.log(`WebSocket connected for ${symbol}`);
    });

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const ticker = JSON.parse(data.toString());
        const callback = this.marketDataCallbacks.get(symbol);
        
        if (callback) {
          // Get additional data (futures price, funding rate)
          const [futuresPrice, fundingRate] = await Promise.all([
            this.getFuturesPrice(symbol),
            this.getFundingRate(symbol)
          ]);

          const spotPrice = parseFloat(ticker.c); // Current price
          const basis = futuresPrice - spotPrice;
          const basisPercent = spotPrice > 0 ? (basis / spotPrice) * 100 : 0;

          const marketData: MarketData = {
            symbol,
            spotPrice,
            futuresPrice,
            basis,
            basisPercent,
            fundingRate: fundingRate * 100,
            volume24h: parseFloat(ticker.q), // 24h quote volume
            timestamp: Date.now()
          };

          callback(marketData);
        }
      } catch (error) {
        console.error(`WebSocket message error for ${symbol}:`, error);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${symbol}:`, error);
    });

    ws.on('close', () => {
      console.log(`WebSocket closed for ${symbol}`);
      this.wsConnections.delete(symbol);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.marketDataCallbacks.has(symbol)) {
          this.initializeWebSocket(symbol);
        }
      }, 5000);
    });
  }

  private initializeOrderBookWebSocket(symbol: string): void {
    const wsSymbol = symbol.toLowerCase().replace('/', '');
    const wsUrl = `wss://stream.binance.com:9443/ws/${wsSymbol}@depth20@100ms`;
    
    const wsKey = `${symbol}_orderbook`;
    if (this.wsConnections.has(wsKey)) {
      return; // Already connected
    }

    const ws = new WebSocket(wsUrl);
    this.wsConnections.set(wsKey, ws);

    ws.on('open', () => {
      console.log(`OrderBook WebSocket connected for ${symbol}`);
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const orderBookData = JSON.parse(data.toString());
        const callback = this.orderBookCallbacks.get(symbol);
        
        if (callback) {
          const formattedData: OrderBookData = {
            symbol,
            bids: orderBookData.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
            asks: orderBookData.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
            timestamp: Date.now()
          };

          callback(formattedData);
        }
      } catch (error) {
        console.error(`OrderBook WebSocket message error for ${symbol}:`, error);
      }
    });

    ws.on('error', (error) => {
      console.error(`OrderBook WebSocket error for ${symbol}:`, error);
    });

    ws.on('close', () => {
      console.log(`OrderBook WebSocket closed for ${symbol}`);
      this.wsConnections.delete(wsKey);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.orderBookCallbacks.has(symbol)) {
          this.initializeOrderBookWebSocket(symbol);
        }
      }, 5000);
    });
  }

  unsubscribe(symbol: string): void {
    // Close market data WebSocket
    const ws = this.wsConnections.get(symbol);
    if (ws) {
      ws.close();
      this.wsConnections.delete(symbol);
    }

    // Close order book WebSocket
    const orderBookWs = this.wsConnections.get(`${symbol}_orderbook`);
    if (orderBookWs) {
      orderBookWs.close();
      this.wsConnections.delete(`${symbol}_orderbook`);
    }

    // Remove callbacks
    this.marketDataCallbacks.delete(symbol);
    this.orderBookCallbacks.delete(symbol);
  }

  async disconnect(): Promise<void> {
    // Close all WebSocket connections
    this.wsConnections.forEach((ws, key) => {
      ws.close();
    });
    
    this.wsConnections.clear();
    this.marketDataCallbacks.clear();
    this.orderBookCallbacks.clear();

    console.log('Exchange API disconnected');
  }

  // Health check method
  async isConnected(): Promise<boolean> {
    try {
      // If no API keys, return mock connected status
      if (!process.env.BINANCE_API_KEY) {
        return true; // Mock mode
      }
      
      await Promise.all([
        this.spotExchange.fetchTime(),
        this.futuresExchange.fetchTime()
      ]);
      return true;
    } catch (error) {
      console.error('Exchange connection check failed:', error);
      return false;
    }
  }
  
  // Helper method to convert spot symbols to futures format
  private convertToFuturesSymbol(spotSymbol: string): string {
    // Convert BTC/USDT to BTC/USDT:USDT for USDT-M perpetuals
    if (spotSymbol.includes('/USDT')) {
      return `${spotSymbol}:USDT`;
    }
    // Add more conversions as needed
    return spotSymbol;
  }
}

// Singleton instance
export const exchangeAPI = new ExchangeAPI();