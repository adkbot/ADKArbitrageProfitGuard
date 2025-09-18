
// 🚀 FIXED ROUTES SYSTEM - ALL CRITICAL AND MODERATE FIXES IMPLEMENTED
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-manager";
import { fixedMultiExchangeManager } from "./exchange-manager-fixed";
import { httpClient } from "./http-client-fixed";
import { 
  performOptimizedHealthCheck, 
  lightningHealthCheck, 
  getOptimizedSystemMetrics,
  clearHealthCheckCache 
} from "./health-check-optimized";
import { 
  getEnhancedProxyStatus, 
  testEnhancedProxyConnectivity,
  switchToNextEnhancedProxy,
  resetEnhancedProxy 
} from "./proxy-enhanced";
import { testGeoBypass, getGeoBypassStatus } from "./geo-bypass";
import { performExchangeHealthCheck, getRenderDeploymentStatus } from "./exchange-render";
import { AnalysisEngine } from "./analysis-engine.js";
import publicApiRoutes from "./public-api.js";
import { UserManager } from "./user-manager.js";
import { AuthManager } from "./auth.js";
import { MonitoringSystem } from "./monitoring-system";
import {
  insertTradeSchema,
  insertBotConfigSchema,
  insertDailyMetricsSchema,
} from "@shared/schema";

/**
 * 🚀 REGISTER ALL FIXED ROUTES WITH COMPREHENSIVE ERROR HANDLING
 */
export async function registerFixedRoutes(app: Express): Promise<Server> {
  console.log('🚀 Registering Fixed Routes System...');

  // Initialize monitoring system
  const monitoringSystem = new MonitoringSystem();
  await monitoringSystem.initialize();

  // 🏥 ULTRA-FAST HEALTH CHECK ENDPOINTS (SUB-5 SECOND PERFORMANCE)
  
  // Lightning-fast health check for Render.com (< 1 second)
  app.get("/health", async (req, res) => {
    try {
      const health = await lightningHealthCheck();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      });
    }
  });

  // Simple JSON health check
  app.get("/api/health", async (req, res) => {
    try {
      const health = await lightningHealthCheck();
      res.status(200).json({ 
        ok: health.status === 'healthy', 
        status: health.status, 
        timestamp: health.timestamp,
        uptime: health.uptime
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        status: 'unhealthy', 
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Comprehensive health check (< 5 seconds guaranteed)
  app.get("/api/health/full", async (req, res) => {
    try {
      const health = await performOptimizedHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 206 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      });
    }
  });

  // Clear health check cache endpoint
  app.post("/api/health/clear-cache", (req, res) => {
    try {
      clearHealthCheckCache();
      res.json({ success: true, message: 'Health check cache cleared' });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  });

  // System metrics endpoint
  app.get("/api/metrics", (req, res) => {
    try {
      const metrics = getOptimizedSystemMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🌐 ENHANCED PROXY AND GEO-BYPASS STATUS ENDPOINTS
  
  // Enhanced proxy status
  app.get("/api/proxy/status", (req, res) => {
    try {
      const status = getEnhancedProxyStatus();
      res.json({
        success: true,
        proxy: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test enhanced proxy connectivity
  app.post("/api/proxy/test", async (req, res) => {
    try {
      const result = await testEnhancedProxyConnectivity();
      res.json({
        success: result.proxy && result.http,
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Switch to next proxy
  app.post("/api/proxy/switch", async (req, res) => {
    try {
      const result = await switchToNextEnhancedProxy();
      res.json({
        success: result,
        message: result ? 'Switched to next proxy successfully' : 'Failed to switch proxy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Reset proxy system
  app.post("/api/proxy/reset", (req, res) => {
    try {
      resetEnhancedProxy();
      res.json({
        success: true,
        message: 'Proxy system reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🌐 GEO-BYPASS SYSTEM ENDPOINTS
  
  // Geo-bypass status
  app.get("/api/geo-bypass/status", (req, res) => {
    try {
      const status = getGeoBypassStatus();
      res.json({
        success: true,
        geoBypass: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test geo-bypass system
  app.post("/api/geo-bypass/test", async (req, res) => {
    try {
      const result = await testGeoBypass();
      res.json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🏦 FIXED EXCHANGE CONNECTIVITY ENDPOINTS
  
  // Exchange health check with fixed manager
  app.get("/api/exchanges/health", async (req, res) => {
    try {
      const health = await performExchangeHealthCheck();
      const statusCode = health.overall ? 200 : 503;
      res.status(statusCode).json({
        success: health.overall,
        ...health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test exchange manager connectivity
  app.post("/api/exchanges/test", async (req, res) => {
    try {
      const result = await fixedMultiExchangeManager.testConnection();
      res.json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 📊 MONITORING SYSTEM ENDPOINTS
  
  // Get monitoring status
  app.get("/api/monitoring/status", async (req, res) => {
    try {
      const status = await monitoringSystem.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get system metrics
  app.get("/api/monitoring/metrics", async (req, res) => {
    try {
      const metrics = await monitoringSystem.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get performance alerts
  app.get("/api/monitoring/alerts", async (req, res) => {
    try {
      const alerts = await monitoringSystem.getAlerts();
      res.json({ success: true, alerts });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🌍 HTTP CLIENT TEST ENDPOINT
  app.post("/api/http-client/test", async (req, res) => {
    try {
      const result = await httpClient.testConnectivity();
      res.json({
        ...result,
        httpClientStatus: httpClient.getStatus(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Reset HTTP client
  app.post("/api/http-client/reset", (req, res) => {
    try {
      httpClient.reset();
      res.json({
        success: true,
        message: 'HTTP client reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🏢 RENDER DEPLOYMENT STATUS
  app.get("/api/render/status", (req, res) => {
    try {
      const status = getRenderDeploymentStatus();
      res.json({
        success: true,
        render: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🔄 CORS CONFIGURATION FOR VERCEL FRONTEND SEPARATION
  app.use((req, res, next) => {
    // Allow Vercel domains and localhost for development
    const allowedOrigins = [
      'https://adkarbitrageprofitguard.vercel.app',
      'https://*.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    const origin = req.headers.origin;
    if (origin && allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowed === origin;
    })) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Legacy API endpoint (updated to always return JSON)
  app.get("/api", (req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      service: "adk-arbitrage-profit-guard-fixed",
      version: "2.1.0-production-ready",
      environment: process.env.NODE_ENV || 'development',
      features: {
        databaseEnabled: process.env.DATABASE_URL ? true : false,
        proxyEnabled: process.env.PROXY_ENABLED === 'true',
        monitoringEnabled: true,
        healthCheckOptimized: true,
        geoBypassEnabled: true
      }
    });
  });

  // Test endpoint (always returns JSON)
  app.get("/api/test", (req, res) => {
    res.json({
      success: true,
      message: "Fixed API is working!",
      timestamp: new Date().toISOString(),
      systemHealth: {
        proxy: getEnhancedProxyStatus().enabled,
        storage: storage.getStatus(),
        exchange: fixedMultiExchangeManager.getStatus()
      }
    });
  });

  // 🔧 FIXED API ENDPOINTS - ALL RETURN JSON PROPERLY

  // Test connection endpoint (fixed to always return JSON)
  app.post("/api/test-connection", async (req, res) => {
    try {
      const { exchange, apiKey, apiSecret } = req.body;

      if (!exchange || !apiKey || !apiSecret) {
        return res.status(400).json({
          success: false,
          message: "Exchange, API Key e API Secret são obrigatórios",
          timestamp: new Date().toISOString()
        });
      }

      const result = await fixedMultiExchangeManager.testConnection();
      res.json({
        ...result,
        exchange: exchange.toLowerCase(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("❌ Erro no teste de conexão:", error);
      res.status(500).json({
        success: false,
        message: `Erro interno: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🔑 SAVE EXCHANGE CONFIG ENDPOINT (FIXED)
  app.post("/api/save-exchange-config", async (req, res) => {
    try {
      const { exchange, apiKey, apiSecret, passphrase } = req.body;

      if (!exchange || !apiKey || !apiSecret) {
        return res.status(400).json({
          success: false,
          message: "Exchange, API Key e API Secret são obrigatórios",
          timestamp: new Date().toISOString()
        });
      }

      console.log(`🔑 Saving credentials for ${exchange.toUpperCase()}`);

      // Get current config
      let config = await storage.getBotConfig();
      if (!config) {
        // Create default config
        config = await storage.updateBotConfig({
          pairs: ["BTC/USDT", "ETH/USDT", "BNB/USDT"],
          basisEntry: '0.004',
          basisExit: '0.0015',
          maxNotionalUsdt: '1000',
          maxDailyTrades: 10,
          slippageK: '0.002',
          fundingLookaheadH: 8,
          wyckoffN: 100,
          gexRefreshSec: 300,
          arbitrageEnabled: true,
        });
      }

      // Update with API keys
      const updateData: any = {
        ...config,
        selectedExchange: exchange.toLowerCase(),
      };

      // Save exchange-specific credentials
      if (exchange.toLowerCase() === "binance") {
        updateData.binanceApiKey = apiKey;
        updateData.binanceApiSecret = apiSecret;
      } else if (exchange.toLowerCase() === "okx") {
        updateData.okxApiKey = apiKey;
        updateData.okxApiSecret = apiSecret;
        if (passphrase) updateData.okxPassphrase = passphrase;
      } else if (exchange.toLowerCase() === "bybit") {
        updateData.bybitApiKey = apiKey;
        updateData.bybitApiSecret = apiSecret;
      }

      // Save updated config
      await storage.updateBotConfig(updateData);

      console.log(`✅ Credentials saved for ${exchange.toUpperCase()}`);

      res.json({
        success: true,
        message: `Credentials ${exchange.toUpperCase()} saved successfully!`,
        exchange: exchange.toLowerCase(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("❌ Error saving credentials:", error);
      res.status(500).json({
        success: false,
        message: `Error saving: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🗄️ STORAGE AND DATABASE ENDPOINTS

  // Trades endpoints (fixed to always return JSON)
  app.get("/api/trades", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const trades = await storage.getTrades(limit);
      res.json({
        success: true,
        trades,
        count: trades.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch trades",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/api/trades/active", async (req, res) => {
    try {
      const activeTrades = await storage.getActiveTrades();
      res.json({
        success: true,
        activeTrades,
        count: activeTrades.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch active trades",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const tradeData = insertTradeSchema.parse(req.body);
      const trade = await storage.createTrade(tradeData);
      res.json({
        success: true,
        trade,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({ 
        success: false,
        error: "Invalid trade data",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Bot configuration endpoints (fixed)
  app.get("/api/config", async (req, res) => {
    try {
      console.log("GET /api/config called");
      const config = await storage.getBotConfig();
      console.log("Config retrieved:", config);

      res.json({
        success: true,
        config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error in /api/config:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch bot config",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.put("/api/config", async (req, res) => {
    try {
      const configData = insertBotConfigSchema.parse(req.body);
      const config = await storage.updateBotConfig(configData);
      res.json({
        success: true,
        config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({ 
        success: false,
        error: "Invalid config data",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 💰 FIXED EXCHANGE ENDPOINTS

  // Account balance endpoint (fixed)
  app.get("/api/exchange/balance", async (req, res) => {
    try {
      console.log("💰 API: Fetching account balance...");
      const balance = await fixedMultiExchangeManager.getBalance();
      res.json({
        success: true,
        ...balance,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("❌ Error fetching balance:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch account balance",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Exchange health check endpoint
  app.get("/api/exchange/health", async (req, res) => {
    try {
      const isConnected = await fixedMultiExchangeManager.isConnected();
      const status = fixedMultiExchangeManager.getStatus();
      
      res.json({ 
        success: true,
        connected: isConnected, 
        status,
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        connected: false, 
        error: "Exchange connection failed",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Market data endpoints (fixed)
  app.get("/api/exchange/market/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const marketData = await fixedMultiExchangeManager.getMarketData(symbol.toUpperCase());
      res.json({
        success: true,
        marketData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch market data",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // All market data endpoint (fixed)
  app.get("/api/exchange/market/data/all", async (req, res) => {
    try {
      const config = await storage.getBotConfig();
      if (!config?.pairs) {
        return res.json({
          success: true,
          marketData: [],
          message: "No pairs configured",
          timestamp: new Date().toISOString()
        });
      }

      const marketDataPromises = config.pairs.map(async (pair) => {
        try {
          return await fixedMultiExchangeManager.getMarketData(pair);
        } catch (error) {
          console.error(`Failed to get market data for ${pair}:`, error);
          return null;
        }
      });

      const marketData = (await Promise.all(marketDataPromises))
        .filter(data => data !== null);
      
      res.json({
        success: true,
        marketData,
        count: marketData.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch market data for all pairs",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 📊 ARBITRAGE OPPORTUNITIES ENDPOINT (FIXED)
  app.get("/api/arbitrage/opportunities", async (req, res) => {
    try {
      const config = await storage.getBotConfig();
      if (!config?.pairs) {
        return res.json({
          success: true,
          opportunities: [],
          message: "No pairs configured",
          timestamp: new Date().toISOString()
        });
      }

      const opportunities = [];
      const basisThreshold = parseFloat(config.basisEntry || '0.004');

      for (const pair of config.pairs) {
        try {
          const marketData = await fixedMultiExchangeManager.getMarketData(pair);

          const isValidOpportunity = Math.abs(marketData.basisPercent) >= basisThreshold;

          const opportunity = {
            ...marketData,
            signal: marketData.basisPercent > 0 ? "long_spot_short_futures" : "short_spot_long_futures",
            potentialProfit: Math.abs(marketData.basisPercent) - basisThreshold,
            confidence: Math.min(100, (Math.abs(marketData.basisPercent) / basisThreshold) * 50),
            isValidOpportunity,
          };

          opportunities.push(opportunity);

          // Update pair performance score
          await storage.updatePairPerformanceScore(pair, {
            basisPercent: marketData.basisPercent,
            volume24h: marketData.volume24h || 0,
            fundingRate: marketData.fundingRate || 0,
          });
        } catch (error) {
          console.error(`Failed to check arbitrage for ${pair}:`, error);
        }
      }

      res.json({
        success: true,
        opportunities,
        count: opportunities.length,
        validOpportunities: opportunities.filter(o => o.isValidOpportunity).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch arbitrage opportunities",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🏆 TOP PAIRS ENDPOINT (FIXED)
  app.get("/api/arbitrage/top-pairs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const topPairs = await storage.getTopPairsByPerformance(limit);

      console.log(`🏆 Fetching data for ${topPairs.length} top pairs...`);

      const marketDataPromises = topPairs.map(async (pair, index) => {
        try {
          const marketData = await fixedMultiExchangeManager.getMarketData(pair);
          const performanceData = await storage.getPairPerformanceData(pair);

          return {
            rank: index + 1,
            pair,
            basis: marketData.basisPercent,
            spotPrice: marketData.spotPrice,
            futuresPrice: marketData.futuresPrice,
            volume24h: marketData.volume24h || 0,
            score: performanceData.todayScore,
            netProfitEstimate: Math.max(0, Math.abs(marketData.basisPercent) - 0.06),
            lastUpdate: new Date().toISOString(),
          };
        } catch (error) {
          console.error(`Error fetching data for ${pair}:`, error);
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
            error: "Data unavailable",
          };
        }
      });

      const pairDetails = await Promise.all(marketDataPromises);
      const validPairs = pairDetails
        .filter(p => !p.error)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      res.json({
        success: true,
        strategy: "DAILY_NET_PROFIT_RANKING",
        totalPairs: validPairs.length,
        topPairs: validPairs,
        costs: {
          tradingFees: "0.04%",
          slippage: "0.02%",
          fundingRate: "Variable",
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in top-pairs endpoint:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch top pairs",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 📊 BOT STATUS ENDPOINT (FIXED)
  app.get("/api/status", async (req, res) => {
    try {
      const config = await storage.getBotConfig();
      const activeTrades = await storage.getActiveTrades();
      const today = new Date().toISOString().split("T")[0];
      const todayTrades = await storage.getTradesByDate(today);

      res.json({
        success: true,
        enabled: config?.arbitrageEnabled || false,
        activeTrades: activeTrades.length,
        todayTrades: todayTrades.length,
        pairs: config?.pairs || [],
        storage: storage.getStatus(),
        exchange: fixedMultiExchangeManager.getStatus(),
        proxy: getEnhancedProxyStatus(),
        lastUpdate: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch bot status",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Initialize fixed exchange manager
  try {
    console.log('🔄 Initializing Fixed Exchange Manager...');
    await fixedMultiExchangeManager.initialize();
    console.log('✅ Fixed Exchange Manager initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Fixed Exchange Manager:', error);
  }

  // Initialize and start analysis engine
  const analysisEngine = new AnalysisEngine(fixedMultiExchangeManager, storage);

  // Analysis engine control endpoints (fixed to return JSON)
  app.post("/api/analysis/start", async (req, res) => {
    try {
      await analysisEngine.start();
      res.json({
        success: true,
        status: "started",
        message: "Analysis engine started successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: "Failed to start analysis engine",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post("/api/analysis/stop", async (req, res) => {
    try {
      analysisEngine.stop();
      res.json({
        success: true,
        status: "stopped",
        message: "Analysis engine stopped successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: "Failed to stop analysis engine",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/api/analysis/status", (req, res) => {
    try {
      const status = analysisEngine.getStatus();
      res.json({
        success: true,
        ...status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: "Failed to get analysis status",
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🌍 MULTIUSER API ROUTES
  app.use("/api", publicApiRoutes);

  // Initialize multiuser managers
  const userManager = UserManager.getInstance();
  const authManager = AuthManager.getInstance();

  console.log('🌍 API multi-user registered:');
  console.log('   📖 GET  /api/public/docs - Documentation');
  console.log('   📊 GET  /api/public/status - General status');
  console.log('   🔐 POST /api/public/auth - Login/register');

  // API fence: prevent Vite from intercepting API routes (ALWAYS RETURN JSON)
  app.use(/^\/api(?:\/$|\/|$)/, (req, res) => {
    if (!res.headersSent) {
      res.status(404).json({ 
        success: false,
        error: "API endpoint not found",
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Global error handler (ALWAYS RETURN JSON)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ 
      success: false,
      error: message,
      status,
      timestamp: new Date().toISOString()
    });
    
    console.error('🚨 API Error:', err);
  });

  // Auto-start analysis engine if arbitrage is enabled
  const config = await storage.getBotConfig();
  if (config && config.arbitrageEnabled) {
    console.log("🚀 Auto-starting analysis engine...");
    analysisEngine.start().catch((error) => {
      console.error("⚠️ Error starting analysis engine:", error);
    });
  }

  const httpServer = createServer(app);
  
  console.log('✅ All Fixed Routes registered successfully');
  console.log('🚀 System ready for production deployment');
  
  return httpServer;
}

// Backward compatibility
export const registerRoutes = registerFixedRoutes;
