// 🌐 GLOBAL PROXY SYSTEM - COMPREHENSIVE GEOGRAPHIC RESTRICTION BYPASS
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import http from 'http';
import https from 'https';

// 🌐 PROXY CONFIGURATION WITH MULTIPLE FALLBACKS
interface ProxyConfig {
  enabled: boolean;
  currentProxy?: string;
  fallbacks: string[];
  wsUrl?: string;
  noProxy?: string;
  testTimeout: number;
}

let proxyConfig: ProxyConfig = {
  enabled: false,
  fallbacks: [],
  testTimeout: 10000 // 10 seconds
};

let currentHttpAgent: any = null;
let currentHttpsAgent: any = null;
let wsProxyAgent: any = null;
let originalFetch: typeof fetch;

// 🔥 MULTIPLE HIGH-QUALITY PROXY FALLBACKS FOR RELIABILITY
const RELIABLE_PROXY_FALLBACKS = [
  // Public HTTP proxies for testing (users should add their own reliable proxies)
  'http://proxy.server:3128',
  'http://free-proxy.cz:3128',
  'http://proxy.tooling.io:8080',
  'http://proxy-server.net:3128',
  'http://public-proxy.com:8080',
  // SOCKS5 proxies
  'socks5://proxy.socks:1080',
  'socks5://socks-proxy.net:1080'
];

// 🛡️ GLOBAL HTTP AGENTS FOR ALL NETWORK CALLS
let globalHttpAgent: http.Agent | null = null;
let globalHttpsAgent: https.Agent | null = null;

/**
 * 🚀 INITIALIZE GLOBAL PROXY SYSTEM - INTERCEPTS ALL HTTP/HTTPS CALLS
 */
export async function initializeProxy(): Promise<void> {
  try {
    console.log('🔧 Initializing GLOBAL proxy system...');
    
    // Store original fetch before patching
    originalFetch = globalThis.fetch;
    
    // Read configuration from environment
    const proxiesFromEnv = [
      process.env.PROXY_URL,
      process.env.PROXY_URL_2,
      process.env.PROXY_URL_3,
      ...RELIABLE_PROXY_FALLBACKS
    ].filter(Boolean) as string[];
    
    proxyConfig = {
      enabled: process.env.PROXY_ENABLED === 'true' || proxiesFromEnv.length > 0,
      fallbacks: proxiesFromEnv,
      wsUrl: process.env.WS_PROXY_URL || proxiesFromEnv[0],
      noProxy: process.env.PROXY_NO_PROXY || 'localhost,127.0.0.1,*.local',
      testTimeout: parseInt(process.env.PROXY_TEST_TIMEOUT || '10000')
    };

    console.log(`🌐 Proxy Status: ${proxyConfig.enabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔗 Found ${proxyConfig.fallbacks.length} proxy fallbacks`);

    if (proxyConfig.enabled && proxyConfig.fallbacks.length > 0) {
      // 🔥 FIND WORKING PROXY AND SET AS GLOBAL AGENT
      const workingProxy = await findWorkingProxy();
      
      if (workingProxy) {
        console.log(`✅ Working proxy found: ${redactProxy(workingProxy)}`);
        await setupGlobalProxy(workingProxy);
        proxyConfig.currentProxy = workingProxy;
      } else {
        console.error('❌ No working proxies found - disabling proxy system');
        proxyConfig.enabled = false;
      }
    } else if (proxyConfig.enabled) {
      console.warn('⚠️ PROXY_ENABLED=true but no proxy URLs configured');
      proxyConfig.enabled = false;
    }
    
    if (proxyConfig.enabled) {
      console.log('🚀 GLOBAL PROXY SYSTEM ACTIVE - All HTTP/HTTPS calls will use proxy');
    } else {
      console.log('🌐 Proxy system disabled - using direct connections');
    }
  } catch (error) {
    console.error('❌ Critical error initializing proxy system:', error);
    proxyConfig.enabled = false;
  }
}

/**
 * 🔍 FIND WORKING PROXY FROM FALLBACK LIST
 */
async function findWorkingProxy(): Promise<string | null> {
  console.log(`🔍 Testing ${proxyConfig.fallbacks.length} proxy servers...`);
  
  for (const proxyUrl of proxyConfig.fallbacks) {
    try {
      console.log(`🧪 Testing proxy: ${redactProxy(proxyUrl)}`);
      
      if (await testProxyConnection(proxyUrl)) {
        console.log(`✅ Proxy working: ${redactProxy(proxyUrl)}`);
        return proxyUrl;
      } else {
        console.log(`❌ Proxy failed: ${redactProxy(proxyUrl)}`);
      }
    } catch (error) {
      console.log(`❌ Proxy error ${redactProxy(proxyUrl)}:`, (error as Error).message);
    }
  }
  
  return null;
}

/**
 * 🧪 TEST INDIVIDUAL PROXY CONNECTION
 */
async function testProxyConnection(proxyUrl: string): Promise<boolean> {
  try {
    const agent = createProxyAgent(proxyUrl);
    
    // Test with a simple HTTP request using the proxy
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), proxyConfig.testTimeout);
    
    const response = await originalFetch('https://httpbin.org/ip', {
      signal: controller.signal,
      // @ts-ignore - Node.js specific agent option
      agent: agent
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`🔍 Proxy IP: ${data.origin}`);
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * 🔧 CREATE PROXY AGENT BASED ON URL TYPE
 */
function createProxyAgent(proxyUrl: string): any {
  try {
    const url = new URL(proxyUrl);
    
    if (url.protocol === 'socks5:' || url.protocol === 'socks4:') {
      return new SocksProxyAgent(proxyUrl);
    } else if (url.protocol === 'http:' || url.protocol === 'https:') {
      return new HttpsProxyAgent(proxyUrl);
    } else {
      throw new Error(`Unsupported proxy protocol: ${url.protocol}`);
    }
  } catch (error) {
    throw new Error(`Invalid proxy URL: ${proxyUrl}`);
  }
}

/**
 * 🚀 SETUP GLOBAL PROXY - INTERCEPTS ALL HTTP/HTTPS CALLS
 */
async function setupGlobalProxy(proxyUrl: string): Promise<void> {
  try {
    console.log(`🔧 Setting up GLOBAL proxy agents: ${redactProxy(proxyUrl)}`);
    
    // Create proxy agents
    currentHttpAgent = createProxyAgent(proxyUrl);
    currentHttpsAgent = createProxyAgent(proxyUrl);
    
    // 🔥 SET GLOBAL HTTP/HTTPS AGENTS FOR ALL NODE.JS REQUESTS
    globalHttpAgent = currentHttpAgent;
    globalHttpsAgent = currentHttpsAgent;
    
    // Override default agents globally
    http.globalAgent = currentHttpAgent;
    https.globalAgent = currentHttpsAgent;
    
    // 🔥 PATCH GLOBAL FETCH TO USE PROXY
    patchGlobalFetch();
    
    // Setup WebSocket proxy
    setupWebSocketProxy(proxyUrl);
    
    console.log('🚀 GLOBAL proxy agents configured successfully');
  } catch (error) {
    console.error('❌ Error setting up global proxy:', error);
    throw error;
  }
}

/**
 * 🔌 SETUP WEBSOCKET PROXY
 */
function setupWebSocketProxy(proxyUrl: string): void {
  try {
    wsProxyAgent = createProxyAgent(proxyUrl);
    console.log(`🧦 WebSocket proxy configured: ${redactProxy(proxyUrl)}`);
  } catch (error) {
    console.error('❌ Error configuring WebSocket proxy:', error);
    wsProxyAgent = null;
  }
}

/**
 * 🔥 PATCH GLOBAL FETCH TO USE PROXY FOR ALL REQUESTS
 */
function patchGlobalFetch(): void {
  if (!originalFetch) {
    console.warn('⚠️ Original fetch not found - cannot patch');
    return;
  }
  
  globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Skip proxy for local/excluded URLs
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    if (shouldSkipProxy(url)) {
      return originalFetch(input, init);
    }
    
    // Apply proxy agent to request
    const proxyInit = {
      ...init,
      // @ts-ignore - Node.js specific agent option
      agent: url.startsWith('https:') ? currentHttpsAgent : currentHttpAgent
    };
    
    console.log(`🌐 Proxied fetch: ${url.substring(0, 50)}...`);
    return originalFetch(input, proxyInit);
  };
  
  console.log('🔥 Global fetch patched - ALL fetch calls will use proxy');
}

/**
 * 🛡️ CHECK IF URL SHOULD SKIP PROXY
 */
function shouldSkipProxy(url: string): boolean {
  if (!proxyConfig.noProxy) return false;
  
  const noProxyList = proxyConfig.noProxy.split(',').map(p => p.trim());
  
  for (const pattern of noProxyList) {
    if (pattern.startsWith('*')) {
      // Wildcard matching
      const domain = pattern.substring(1);
      if (url.includes(domain)) return true;
    } else if (url.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 🛡️ GET PROXY AGENT FOR WEBSOCKETS
 */
export function getWsAgent(): any {
  return proxyConfig.enabled ? wsProxyAgent : null;
}

/**
 * 🌐 GET CURRENT HTTP AGENT FOR CCXT
 */
export function getHttpAgent(): any {
  return proxyConfig.enabled ? currentHttpAgent : null;
}

/**
 * 🌐 GET CURRENT HTTPS AGENT FOR CCXT
 */
export function getHttpsAgent(): any {
  return proxyConfig.enabled ? currentHttpsAgent : null;
}

/**
 * 🔒 REDACT PROXY URL FOR SECURE LOGGING
 */
export function redactProxy(url?: string): string {
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
 * 📊 GET CURRENT PROXY STATUS
 */
export function getProxyStatus(): { enabled: boolean; currentProxy?: string; fallbacks: number; wsUrl?: string } {
  return {
    enabled: proxyConfig.enabled,
    currentProxy: proxyConfig.currentProxy ? redactProxy(proxyConfig.currentProxy) : undefined,
    fallbacks: proxyConfig.fallbacks.length,
    wsUrl: proxyConfig.wsUrl ? redactProxy(proxyConfig.wsUrl) : undefined
  };
}

/**
 * 🧪 TEST COMPREHENSIVE PROXY CONNECTIVITY
 */
export async function testProxyConnectivity(): Promise<{ 
  proxy: boolean;
  http: boolean; 
  binance: boolean; 
  binanceFutures: boolean;
  error?: string 
}> {
  const result = {
    proxy: proxyConfig.enabled,
    http: false,
    binance: false,
    binanceFutures: false,
    error: undefined as string | undefined
  };

  try {
    console.log('🧪 Testing proxy connectivity...');
    
    // Test basic HTTP connectivity
    console.log('📡 Testing basic HTTP...');
    const httpResponse = await fetch('https://httpbin.org/ip');
    result.http = httpResponse.ok;
    
    if (result.http) {
      const data = await httpResponse.json();
      console.log(`✅ HTTP test passed - IP: ${data.origin}`);
    }

    // Test Binance spot API
    console.log('🏦 Testing Binance Spot API...');
    const binanceResponse = await fetch('https://api.binance.com/api/v3/time');
    result.binance = binanceResponse.ok;
    
    if (result.binance) {
      const data = await binanceResponse.json();
      console.log(`✅ Binance spot test passed - Server time: ${new Date(data.serverTime).toISOString()}`);
    }

    // Test Binance futures API
    console.log('💎 Testing Binance Futures API...');
    const futuresResponse = await fetch('https://fapi.binance.com/fapi/v1/time');
    result.binanceFutures = futuresResponse.ok;
    
    if (result.binanceFutures) {
      const data = await futuresResponse.json();
      console.log(`✅ Binance futures test passed - Server time: ${new Date(data.serverTime).toISOString()}`);
    }

  } catch (error) {
    result.error = (error as Error).message;
    console.error('❌ Proxy connectivity test failed:', error);
  }

  console.log('🧪 Proxy test results:', result);
  return result;
}

/**
 * 🔄 SWITCH TO NEXT WORKING PROXY
 */
export async function switchToNextProxy(): Promise<boolean> {
  if (!proxyConfig.enabled || proxyConfig.fallbacks.length <= 1) {
    return false;
  }
  
  console.log('🔄 Switching to next proxy...');
  
  // Find current proxy index
  const currentIndex = proxyConfig.fallbacks.indexOf(proxyConfig.currentProxy || '');
  const nextIndex = (currentIndex + 1) % proxyConfig.fallbacks.length;
  const nextProxy = proxyConfig.fallbacks[nextIndex];
  
  try {
    if (await testProxyConnection(nextProxy)) {
      await setupGlobalProxy(nextProxy);
      proxyConfig.currentProxy = nextProxy;
      console.log(`✅ Switched to proxy: ${redactProxy(nextProxy)}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to switch to proxy ${redactProxy(nextProxy)}:`, error);
  }
  
  return false;
}

/**
 * 📋 GET PROXY CONFIGURATION FOR CCXT
 */
export function getCCXTProxyConfig(): any {
  if (!proxyConfig.enabled || !proxyConfig.currentProxy) {
    return {};
  }
  
  return {
    httpProxy: proxyConfig.currentProxy,
    httpsProxy: proxyConfig.currentProxy,
    agent: {
      http: currentHttpAgent,
      https: currentHttpsAgent
    }
  };
}

/**
 * 🆘 EMERGENCY PROXY RESET - RESTORE ORIGINAL FETCH
 */
export function resetProxy(): void {
  try {
    console.log('🆘 Resetting proxy system...');
    
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
    
    console.log('✅ Proxy system reset to direct connections');
  } catch (error) {
    console.error('❌ Error resetting proxy:', error);
  }
}