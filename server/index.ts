import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { initializeExchangeAPI } from "./exchange";
import { initializeProxy } from "./proxy";
import { testGeoBypass } from "./geo-bypass";
// 🌐 RENDER.COM PRODUCTION READY WITH GEO-BYPASS SYSTEM

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// 🌐 INITIALIZE GLOBAL PROXY SYSTEM BEFORE ANY NETWORK CALLS
async function startServer() {
  console.log('🚀 Starting ADK Arbitrage Profit Guard - Render.com Production');
  
  // Initialize global proxy system first for geo-bypass
  console.log('🌐 Initializing geo-bypass proxy system...');
  await initializeProxy();
  
  // Test geo-bypass capabilities
  console.log('🧪 Testing geo-bypass system...');
  try {
    const geoBypassTest = await testGeoBypass();
    if (geoBypassTest.success) {
      console.log('✅ Geo-bypass system operational');
    } else {
      console.warn('⚠️ Geo-bypass system has issues, but continuing...');
    }
  } catch (error) {
    console.error('❌ Geo-bypass test failed:', error);
    console.log('🔄 Continuing with direct connections...');
  }
  
  // 🔑 INICIALIZAR EXCHANGE API COM STORAGE PARA CREDENCIAIS REAIS
  console.log('🔍 Inicializando sistema multi-exchange...');
  initializeExchangeAPI(storage);
  
  console.log('🚀 Starting server with proxy configuration...');
  const server = await registerRoutes(app);

  // API fence: prevent Vite from intercepting API routes
  app.use(/^\/api(?:\/$|\/|$)/, (req, res) => {
    if (!res.headersSent) {
      res.status(404).json({ error: "API endpoint not found" });
    }
    // Do NOT call next() - this prevents Vite from processing /api requests
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Render uses PORT env variable, Replit uses 5000. Auto-detect platform.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('🚨 Failed to start server:', error);
  process.exit(1);
});
