
// 🌐 ENHANCED PROXY SYSTEM - PRODUCTION READY WITH INTELLIGENT FALLBACKS
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import http from 'http';
import https from 'https';

interface EnhancedProxyConfig {
  enabled: boolean;
  currentProxy?: string;
  fallbacks: string[];
  workingProxies: string[];
  failedProxies: Set<string>;
  testTimeout: number;
  retryInterval: number;
  lastSuccessfulTest: number;
  consecutiveFailures: number;
}

let proxyConfig: EnhancedProxyConfig = {
  enabled: false,
  fallbacks: [],
  workingProxies: [],
  failedProxies: new Set(),
  testTimeout: 10000,
  retryInterval: 300000, // 5 minutes
  lastSuccessfulTest: 0,
  consecutiveFailures: 0
};

let currentHttpAgent: any = null;
let currentHttpsAgent: any = null;
let originalFetch: typeof fetch;

// 🔥 COMPREHENSIVE PROXY LIST WITH AUTOMATIC FAILOVER
const ENHANCED_PROXY_FALLBACKS: string[] = [
  // Internal Render proxy service
  process.env.RENDER_INTERNAL_PROXY_URL,
  // User-configured proxies
  process.env.PROXY_URL,
  process.env.PROXY_URL_2,
  process.env.PROXY_URL_3,
  // Backup proxy services
  process.env.PROXY_URL_BACKUP_1,
  process.env.PROXY_URL_BACKUP_2,
  process.env.PROXY_URL_BACKUP_3
].filter(Boolean) as string[];

// 🛡️ GLOBAL HTTP AGENTS
let globalHttpAgent: http.Agent | null = null;
let globalHttpsAgent: https.Agent | null = null;

/**
 * 🚀 INITIALIZE ENHANCED PROXY SYSTEM
 */
export async function initializeEnhancedProxy(): Promise<void> {
  try {
    console.log('🔧 Initializing Enhanced Proxy System...');
    
    // Store original fetch
    originalFetch = globalThis.fetch;
    
    // Read configuration
    const proxiesFromEnv = [
      process.env.PROXY_URL,
      process.env.PROXY_URL_2,
      process.env.PROXY_URL_3,
      ...ENHANCED_PROXY_FALLBACKS
    ].filter(Boolean) as string[];
    
    proxyConfig = {
      ...proxyConfig,
      enabled: process.env.PROXY_ENABLED === 'true' || proxiesFromEnv.length > 0,
      fallbacks: [...new Set(proxiesFromEnv)], // Remove duplicates
    };

    console.log(`🌐 Enhanced Proxy Status: ${proxyConfig.enabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔗 Available proxies: ${proxyConfig.fallbacks.length}`);

    if (proxyConfig.enabled && proxyConfig.fallbacks.length > 0) {
      // Test all proxies and find working ones
      await discoverWorkingProxies();
      
      if (proxyConfig.workingProxies.length > 0) {
        console.log(`✅ Found ${proxyConfig.workingProxies.length} working proxies`);
        await setupEnhancedGlobalProxy();
        proxyConfig.lastSuccessfulTest = Date.now();
      } else {
        console.warn('⚠️ No working proxies found - disabling proxy system');
        proxyConfig.enabled = false;
      }
    }
    
    if (proxyConfig.enabled) {
      console.log('🚀 Enhanced Proxy System Active');
      // Start background proxy monitoring
      startProxyMonitoring();
    } else {
      console.log('🌐 Direct connections enabled');
    }
  } catch (error) {
    console.error('❌ Critical error initializing enhanced proxy system:', error);
    proxyConfig.enabled = false;
  }
}

/**
 * 🔍 DISCOVER ALL WORKING PROXIES
 */
async function discoverWorkingProxies(): Promise<void> {
  console.log(`🔍 Testing ${proxyConfig.fallbacks.length} proxy servers...`);
  
  const testPromises = proxyConfig.fallbacks.map(async (proxyUrl) => {
    try {
      const isWorking = await testEnhancedProxyConnection(proxyUrl);
      return { url: proxyUrl, working: isWorking };
    } catch (error) {
      console.warn(`⚠️ Proxy test error ${redactProxyUrl(proxyUrl)}:`, (error as Error).message);
      return { url: proxyUrl, working: false };
    }
  });

  const results = await Promise.allSettled(testPromises);
  
  proxyConfig.workingProxies = [];
  proxyConfig.failedProxies.clear();

  results.forEach((result, index) => {
    const proxyUrl = proxyConfig.fallbacks[index];
    
    if (result.status === 'fulfilled' && result.value.working) {
      proxyConfig.workingProxies.push(proxyUrl);
      console.log(`✅ Working proxy: ${redactProxyUrl(proxyUrl)}`);
    } else {
      proxyConfig.failedProxies.add(proxyUrl);
      console.log(`❌ Failed proxy: ${redactProxyUrl(proxyUrl)}`);
    }
  });
}

/**
 * 🧪 ENHANCED PROXY CONNECTION TEST
 */
async function testEnhancedProxyConnection(proxyUrl: string): Promise<boolean> {
  try {
    const agent = createEnhancedProxyAgent(proxyUrl);
    if (!agent) return false;
    
    // Test with multiple endpoints for reliability
    const testEndpoints = [
      'https://httpbin.org/ip',
      'https://api.binance.com/api/v3/ping',
      'https://www.okx.com/api/v5/public/time'
    ];
    
    let successCount = 0;
    
    for (const endpoint of testEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), proxyConfig.testTimeout);
        
        const response = await originalFetch(endpoint, {
          signal: controller.signal,
          // @ts-ignore - Node.js specific agent option
          agent: agent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          successCount++;
          
          // Try to get the IP for verification
          if (endpoint.includes('httpbin.org')) {
            try {
              const data = await response.json();
              console.log(`🔍 Proxy IP via ${redactProxyUrl(proxyUrl)}: ${data.origin}`);
            } catch (e) {
              // Ignore JSON parsing errors
            }
          }
        }
      } catch (error) {
        // Continue to next endpoint
      }
    }
    
    // Proxy is considered working if at least 1 endpoint succeeds
    return successCount > 0;
    
  } catch (error) {
    return false;
  }
}

/**
 * 🔧 CREATE ENHANCED PROXY AGENT
 */
function createEnhancedProxyAgent(proxyUrl: string): any {
  try {
    const url = new URL(proxyUrl);
    
    const options = {
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 10,
      maxFreeSockets: 5,
      timeout: proxyConfig.testTimeout,
      freeSocketTimeout: 15000
    };
    
    if (url.protocol === 'socks5:' || url.protocol === 'socks4:') {
      return new SocksProxyAgent(proxyUrl, options);
    } else if (url.protocol === 'http:' || url.protocol === 'https:') {
      return new HttpsProxyAgent(proxyUrl, options);
    } else {
      throw new Error(`Unsupported proxy protocol: ${url.protocol}`);
    }
  } catch (error) {
    throw new Error(`Invalid proxy URL: ${proxyUrl}`);
  }
}

/**
 * 🚀 SETUP ENHANCED GLOBAL PROXY
 */
async function setupEnhancedGlobalProxy(): Promise<void> {
  try {
    if (proxyConfig.workingProxies.length === 0) {
      throw new Error('No working proxies available');
    }
    
    // Use the first working proxy
    const primaryProxy = proxyConfig.workingProxies[0];
    console.log(`🔧 Setting up global proxy with: ${redactProxyUrl(primaryProxy)}`);
    
    // Create proxy agents
    currentHttpAgent = createEnhancedProxyAgent(primaryProxy);
    currentHttpsAgent = createEnhancedProxyAgent(primaryProxy);
    
    // Set global agents
    globalHttpAgent = currentHttpAgent;
    globalHttpsAgent = currentHttpsAgent;
    
    // Override default agents globally
    http.globalAgent = currentHttpAgent;
    https.globalAgent = currentHttpsAgent;
    
    // Patch global fetch
    patchEnhancedGlobalFetch();
    
    proxyConfig.currentProxy = primaryProxy;
    
    console.log('🚀 Enhanced global proxy configured successfully');
  } catch (error) {
    console.error('❌ Error setting up enhanced global proxy:', error);
    throw error;
  }
}

/**
 * 🔥 ENHANCED GLOBAL FETCH PATCHING
 */
function patchEnhancedGlobalFetch(): void {
  if (!originalFetch) {
    console.warn('⚠️ Original fetch not found - cannot patch');
    return;
  }
  
  globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Skip proxy for local/excluded URLs
    if (shouldSkipEnhancedProxy(url)) {
      return originalFetch(input, init);
    }
    
    // Apply proxy agent with retry logic
    const enhancedInit = {
      ...init,
      // @ts-ignore - Node.js specific agent option
      agent: url.startsWith('https:') ? currentHttpsAgent : currentHttpAgent,
      timeout: init?.timeout || 30000
    };
    
    // Enhanced headers for geo-bypass
    const enhancedHeaders = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'X-Forwarded-For': generateRandomIP(),
      ...init?.headers
    };
    
    enhancedInit.headers = enhancedHeaders;
    
    console.log(`🌐 Enhanced proxied fetch: ${url.substring(0, 50)}...`);
    return originalFetch(input, enhancedInit);
  };
  
  console.log('🔥 Enhanced global fetch patched');
}

/**
 * 🛡️ CHECK IF URL SHOULD SKIP ENHANCED PROXY
 */
function shouldSkipEnhancedProxy(url: string): boolean {
  const noProxyList = (process.env.PROXY_NO_PROXY || 'localhost,127.0.0.1,*.local,*.render.com')
    .split(',').map(p => p.trim());
  
  for (const pattern of noProxyList) {
    if (pattern.startsWith('*')) {
      const domain = pattern.substring(1);
      if (url.includes(domain)) return true;
    } else if (url.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 🎭 GET RANDOM USER AGENT
 */
function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * 🎲 GENERATE RANDOM IP
 */
function generateRandomIP(): string {
  const ranges = [
    '8.8.8.', '1.1.1.', '208.67.222.', '64.6.64.', '199.85.126.'
  ];
  
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  const lastOctet = Math.floor(Math.random() * 254) + 1;
  
  return range + lastOctet;
}

/**
 * 🔄 SWITCH TO NEXT WORKING PROXY
 */
export async function switchToNextEnhancedProxy(): Promise<boolean> {
  if (proxyConfig.workingProxies.length <= 1) {
    console.warn('⚠️ No alternative working proxies available');
    return false;
  }
  
  try {
    console.log('🔄 Switching to next enhanced proxy...');
    
    // Remove current proxy from working list and add to failed
    if (proxyConfig.currentProxy) {
      proxyConfig.failedProxies.add(proxyConfig.currentProxy);
      proxyConfig.workingProxies = proxyConfig.workingProxies.filter(p => p !== proxyConfig.currentProxy);
    }
    
    // Setup with next working proxy
    await setupEnhancedGlobalProxy();
    
    console.log(`✅ Switched to enhanced proxy: ${redactProxyUrl(proxyConfig.currentProxy!)}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to switch enhanced proxy:', error);
    return false;
  }
}

/**
 * 🔍 START BACKGROUND PROXY MONITORING
 */
function startProxyMonitoring(): void {
  // Monitor proxy health every 5 minutes
  setInterval(async () => {
    try {
      if (!proxyConfig.enabled || !proxyConfig.currentProxy) return;
      
      // Test current proxy
      const isWorking = await testEnhancedProxyConnection(proxyConfig.currentProxy);
      
      if (!isWorking) {
        proxyConfig.consecutiveFailures++;
        console.warn(`⚠️ Proxy monitoring: Current proxy failed (${proxyConfig.consecutiveFailures} consecutive failures)`);
        
        if (proxyConfig.consecutiveFailures >= 3) {
          console.log('🔄 Too many proxy failures, attempting switch...');
          await switchToNextEnhancedProxy();
          proxyConfig.consecutiveFailures = 0;
        }
      } else {
        if (proxyConfig.consecutiveFailures > 0) {
          console.log('✅ Proxy monitoring: Current proxy recovered');
        }
        proxyConfig.consecutiveFailures = 0;
        proxyConfig.lastSuccessfulTest = Date.now();
      }
      
      // Rediscover failed proxies every hour
      if (Date.now() - proxyConfig.lastSuccessfulTest > 3600000) { // 1 hour
        console.log('🔍 Rediscovering failed proxies...');
        await discoverWorkingProxies();
      }
      
    } catch (error) {
      console.error('❌ Proxy monitoring error:', error);
    }
  }, proxyConfig.retryInterval);
  
  console.log('👁️ Enhanced proxy monitoring started');
}

/**
 * 🧪 TEST ENHANCED PROXY CONNECTIVITY
 */
export async function testEnhancedProxyConnectivity(): Promise<{
  proxy: boolean;
  http: boolean;
  exchanges: { [key: string]: boolean };
  workingProxies: number;
  totalProxies: number;
  error?: string;
}> {
  const result = {
    proxy: proxyConfig.enabled,
    http: false,
    exchanges: {} as { [key: string]: boolean },
    workingProxies: proxyConfig.workingProxies.length,
    totalProxies: proxyConfig.fallbacks.length,
    error: undefined as string | undefined
  };

  try {
    console.log('🧪 Testing enhanced proxy connectivity...');
    
    // Test basic HTTP connectivity
    console.log('📡 Testing basic HTTP...');
    const httpResponse = await fetch('https://httpbin.org/ip');
    result.http = httpResponse.ok;
    
    if (result.http) {
      try {
        const data = await httpResponse.json();
        console.log(`✅ HTTP test passed - IP: ${data.origin}`);
      } catch (e) {
        console.log('✅ HTTP test passed');
      }
    }

    // Test exchange connectivity
    const exchanges = ['binance', 'okx', 'bybit'];
    const exchangeUrls: { [key: string]: string } = {
      binance: 'https://api.binance.com/api/v3/ping',
      okx: 'https://www.okx.com/api/v5/public/time',
      bybit: 'https://api.bybit.com/v5/market/time'
    };

    for (const exchange of exchanges) {
      try {
        console.log(`🏦 Testing ${exchange.toUpperCase()}...`);
        const response = await fetch(exchangeUrls[exchange]);
        result.exchanges[exchange] = response.ok;
        
        if (response.ok) {
          console.log(`✅ ${exchange.toUpperCase()} test passed`);
        }
      } catch (error) {
        result.exchanges[exchange] = false;
        console.error(`❌ ${exchange.toUpperCase()} test failed:`, (error as Error).message);
      }
    }

  } catch (error) {
    result.error = (error as Error).message;
    console.error('❌ Enhanced proxy connectivity test failed:', error);
  }

  console.log('🧪 Enhanced proxy test results:', result);
  return result;
}

/**
 * 📊 GET ENHANCED PROXY STATUS
 */
export function getEnhancedProxyStatus(): {
  enabled: boolean;
  currentProxy?: string;
  workingProxies: number;
  failedProxies: number;
  totalProxies: number;
  lastSuccessfulTest: number;
  consecutiveFailures: number;
} {
  return {
    enabled: proxyConfig.enabled,
    currentProxy: proxyConfig.currentProxy ? redactProxyUrl(proxyConfig.currentProxy) : undefined,
    workingProxies: proxyConfig.workingProxies.length,
    failedProxies: proxyConfig.failedProxies.size,
    totalProxies: proxyConfig.fallbacks.length,
    lastSuccessfulTest: proxyConfig.lastSuccessfulTest,
    consecutiveFailures: proxyConfig.consecutiveFailures
  };
}

/**
 * 🔒 REDACT PROXY URL FOR SECURE LOGGING
 */
function redactProxyUrl(url: string): string {
  if (!url) return 'undefined';
  
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      return `${parsed.protocol}//${parsed.username ? '***:***@' : ''}${parsed.host}`;
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '[invalid-url]';
  }
}

/**
 * 🆘 RESET ENHANCED PROXY SYSTEM
 */
export function resetEnhancedProxy(): void {
  try {
    console.log('🆘 Resetting enhanced proxy system...');
    
    // Restore original fetch
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }
    
    // Reset global agents
    http.globalAgent = new http.Agent();
    https.globalAgent = new https.Agent();
    
    // Reset proxy config
    proxyConfig.enabled = false;
    proxyConfig.currentProxy = undefined;
    proxyConfig.workingProxies = [];
    proxyConfig.failedProxies.clear();
    proxyConfig.consecutiveFailures = 0;
    
    console.log('✅ Enhanced proxy system reset');
  } catch (error) {
    console.error('❌ Error resetting enhanced proxy:', error);
  }
}

// Backward compatibility exports
export const initializeProxy = initializeEnhancedProxy;
export const getProxyStatus = getEnhancedProxyStatus;
export const testProxyConnectivity = testEnhancedProxyConnectivity;
export const switchToNextProxy = switchToNextEnhancedProxy;
export const resetProxy = resetEnhancedProxy;
