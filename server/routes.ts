import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTradeSchema, insertBotConfigSchema, insertDailyMetricsSchema } from "@shared/schema";

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
      res.json(config);
    } catch (error) {
      console.error('Error in /api/config:', error);
      res.status(500).json({ error: 'Failed to fetch bot config' });
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
  
  // Market data endpoints
  app.get('/api/market/:pair', async (req, res) => {
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
  
  app.get('/api/market/:pair/history', async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
