
// 🌐 RENDER.COM OPTIMIZED EXCHANGE CONFIGURATION WITH GEO-BYPASS
import ccxt from 'ccxt';
import { geoBypassFetch } from './geo-bypass';
import { getHttpAgent, getHttpsAgent, getCCXTProxyConfig } from './proxy';

interface RenderExchangeConfig {
  exchange: string;
  apiKey?: string;
  secret?: string;
  passphrase?: string;
  sandbox: boolean;
  enableRateLimit: boolean;
  timeout: number;
  headers: Record<string, string>;
  proxy?: any;
  agent?: any;
}

// 🚀 RENDER-OPTIMIZED EXCHANGE CONFIGURATIONS
const RENDER_EXCHANGE_CONFIGS: Record<string, Partial<RenderExchangeConfig>> = {
  binance: {
    sandbox: process.env.NODE_ENV !== 'production',
    enableRateLimit: true,
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    }
  },
  okx: {
    sandbox: process.env.NODE_ENV !== 'production',
    enableRateLimit: true,
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  },
  bybit: {
    sandbox: process.env.NODE_ENV !== 'production',
    enableRateLimit: true,
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  }
};

/**
 * 🚀 CREATE RENDER-OPTIMIZED EXCHANGE INSTANCE
 */
export function createRenderExchange(exchangeName: string, credentials: {
  apiKey?: string;
  secret?: string;
  passphrase?: string;
}): ccxt.Exchange {
  const ExchangeClass = ccxt[exchangeName as keyof typeof ccxt] as any;
  
  if (!ExchangeClass) {
    throw new Error(`Exchange ${exchangeName} not supported`);
  }
  
  const baseConfig = RENDER_EXCHANGE_CONFIGS[exchangeName] || {};
  const proxyConfig = getCCXTProxyConfig();
  
  // Enhanced configuration for Render.com deployment
  const config: any = {
    ...baseConfig,
    apiKey: credentials.apiKey,
    secret: credentials.secret,
    passphrase: credentials.passphrase,
    
    // Render.com specific optimizations
    ...proxyConfig,
    agent: {
      http: getHttpAgent(),
      https: getHttpsAgent()
    },
    
    // Enhanced headers for geo-bypass
    headers: {
      ...baseConfig.headers,
      'X-Forwarded-For': getRandomIP(),
      'CF-Connecting-IP': getRandomIP(),
      'X-Real-IP': getRandomIP()
    },
    
    // Custom fetch function with geo-bypass
    fetch: geoBypassFetch,
    
    // Render-specific settings
    verbose: process.env.LOG_LEVEL === 'debug',
    timeout: parseInt(process.env.EXCHANGE_TIMEOUT || '30000'),
    rateLimit: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100') * 60 / 1000, // Convert to ms
    
    // Additional options for stability on Render
    options: {
      adjustForTimeDifference: true,
      recvWindow: 60000,
      createMarketBuyOrderRequiresPrice: false,
      defaultType: 'spot', // or 'future' based on needs
      
      // Render.com specific optimizations
      keepAlive: true,
      maxSockets: 10,
      maxFreeSockets: 5,
      
      // Enhanced error handling
      retries: 3,
      retryDelay: 2000
    }
  };
  
  console.log(`🏦 Creating ${exchangeName} exchange for Render.com deployment`);
  
  const exchange = new ExchangeClass(config);
  
  // Add custom error handling for geo-blocking
  const originalRequest = exchange.request;
  exchange.request = async function(path: string, api = 'public', method = 'GET', params = {}, headers?: any, body?: any) {
    try {
      return await originalRequest.call(this, path, api, method, params, headers, body);
    } catch (error: any) {
      // Handle geo-blocking errors
      if (isGeoBlockingError(error)) {
        console.warn(`🌐 Geo-blocking detected for ${exchangeName}, retrying with enhanced bypass...`);
        
        // Add additional headers for bypass
        const enhancedHeaders = {
          ...headers,
          'User-Agent': getRandomUserAgent(),
          'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site'
        };
        
        // Retry with enhanced headers
        return await originalRequest.call(this, path, api, method, params, enhancedHeaders, body);
      }
      
      throw error;
    }
  };
  
  return exchange;
}

/**
 * 🛡️ DETECT GEO-BLOCKING ERRORS
 */
function isGeoBlockingError(error: any): boolean {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code;
  
  const geoBlockingIndicators = [
    errorMessage.includes('forbidden'),
    errorMessage.includes('access denied'),
    errorMessage.includes('not available in your region'),
    errorMessage.includes('geo'),
    errorMessage.includes('location'),
    errorMessage.includes('country'),
    errorCode === 403,
    errorCode === 451,
    error.status === 403,
    error.status === 451
  ];
  
  return geoBlockingIndicators.some(indicator => indicator);
}

/**
 * 🎲 GENERATE RANDOM IP ADDRESS
 */
function getRandomIP(): string {
  // Generate random IP addresses from common ranges
  const ranges = [
    '8.8.8.', '1.1.1.', '208.67.222.', '208.67.220.',
    '64.6.64.', '64.6.65.', '199.85.126.', '199.85.127.'
  ];
  
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  const lastOctet = Math.floor(Math.random() * 254) + 1;
  
  return range + lastOctet;
}

/**
 * 🎭 GET RANDOM USER AGENT
 */
function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * 🧪 TEST EXCHANGE CONNECTIVITY WITH GEO-BYPASS
 */
export async function testExchangeConnectivity(exchangeName: string): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
  geoBlocked?: boolean;
}> {
  try {
    console.log(`🧪 Testing ${exchangeName} connectivity...`);
    
    const startTime = Date.now();
    const exchange = createRenderExchange(exchangeName, {});
    
    // Test basic connectivity
    await exchange.fetchTime();
    
    const latency = Date.now() - startTime;
    
    console.log(`✅ ${exchangeName} connectivity test passed (${latency}ms)`);
    
    return {
      success: true,
      latency
    };
    
  } catch (error: any) {
    const isGeoBlocked = isGeoBlockingError(error);
    
    console.error(`❌ ${exchangeName} connectivity test failed:`, error.message);
    
    return {
      success: false,
      error: error.message,
      geoBlocked: isGeoBlocked
    };
  }
}

/**
 * 🏥 HEALTH CHECK FOR ALL EXCHANGES
 */
export async function performExchangeHealthCheck(): Promise<{
  overall: boolean;
  exchanges: Record<string, any>;
}> {
  const exchanges = ['binance', 'okx', 'bybit'];
  const results: Record<string, any> = {};
  let successCount = 0;
  
  console.log('🏥 Performing exchange health check...');
  
  for (const exchangeName of exchanges) {
    const result = await testExchangeConnectivity(exchangeName);
    results[exchangeName] = result;
    
    if (result.success) {
      successCount++;
    }
  }
  
  const overall = successCount > 0; // At least one exchange working
  
  console.log(`🏥 Health check completed: ${successCount}/${exchanges.length} exchanges operational`);
  
  return {
    overall,
    exchanges: results
  };
}

/**
 * 📊 GET RENDER DEPLOYMENT STATUS
 */
export function getRenderDeploymentStatus(): {
  environment: string;
  region: string;
  proxyEnabled: boolean;
  geoBypassEnabled: boolean;
  timestamp: string;
} {
  return {
    environment: process.env.NODE_ENV || 'development',
    region: process.env.RENDER_REGION || 'unknown',
    proxyEnabled: process.env.PROXY_ENABLED === 'true',
    geoBypassEnabled: true,
    timestamp: new Date().toISOString()
  };
}
