import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTradeSchema, insertBotConfigSchema, insertDailyMetricsSchema } from "@shared/schema";
import { exchangeAPI } from "./exchange";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString(), service: 'adk-arbitragem' });
  });
  
  // Test endpoint to verify routing works
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
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
            opportunities.push({
              ...marketData,
              signal: marketData.basisPercent > 0 ? 'long_spot_short_futures' : 'short_spot_long_futures',
              potentialProfit: Math.abs(marketData.basisPercent) - basisThreshold,
              confidence: Math.min(100, (Math.abs(marketData.basisPercent) / basisThreshold) * 50)
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

  // Initialize exchange API
  try {
    await exchangeAPI.initialize();
    console.log('Exchange API initialized successfully');
  } catch (error) {
    console.error('Failed to initialize exchange API:', error);
  }

  const httpServer = createServer(app);
  return httpServer;
}
