
// 🌐 ADVANCED GEO-BLOCKING BYPASS SYSTEM FOR RENDER.COM
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

interface GeoBypassConfig {
  enabled: boolean;
  strategies: string[];
  fallbackProxies: string[];
  userAgents: string[];
  headers: Record<string, string>;
  retryAttempts: number;
  retryDelay: number;
}

// 🛡️ COMPREHENSIVE GEO-BYPASS CONFIGURATION
const geoBypassConfig: GeoBypassConfig = {
  enabled: process.env.PROXY_ENABLED === 'true',
  strategies: ['proxy', 'headers', 'user-agent-rotation', 'retry-with-backoff'],
  fallbackProxies: [
    process.env.PROXY_URL,
    process.env.PROXY_URL_2,
    process.env.PROXY_URL_3,
    // Internal Render proxy service
    process.env.RENDER_INTERNAL_PROXY_URL
  ].filter(Boolean) as string[],
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
  ],
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"'
  },
  retryAttempts: 3,
  retryDelay: 2000
};

let currentProxyIndex = 0;
let currentUserAgentIndex = 0;

/**
 * 🚀 ENHANCED FETCH WITH GEO-BYPASS CAPABILITIES
 */
export async function geoBypassFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  if (!geoBypassConfig.enabled) {
    return fetch(url, options);
  }

  let lastError: Error | null = null;
  
  // Try each strategy with retries
  for (let attempt = 0; attempt < geoBypassConfig.retryAttempts; attempt++) {
    try {
      console.log(`🌐 Geo-bypass attempt ${attempt + 1}/${geoBypassConfig.retryAttempts} for ${url}`);
      
      // Rotate user agent
      const userAgent = geoBypassConfig.userAgents[currentUserAgentIndex % geoBypassConfig.userAgents.length];
      currentUserAgentIndex++;
      
      // Prepare enhanced headers
      const enhancedHeaders = {
        ...geoBypassConfig.headers,
        'User-Agent': userAgent,
        ...options.headers
      };
      
      // Try with proxy if available
      let agent = null;
      if (geoBypassConfig.fallbackProxies.length > 0) {
        const proxyUrl = geoBypassConfig.fallbackProxies[currentProxyIndex % geoBypassConfig.fallbackProxies.length];
        currentProxyIndex++;
        
        try {
          agent = createProxyAgent(proxyUrl);
          console.log(`🔗 Using proxy: ${redactProxyUrl(proxyUrl)}`);
        } catch (proxyError) {
          console.warn(`⚠️ Proxy creation failed: ${(proxyError as Error).message}`);
        }
      }
      
      // Enhanced request options
      const enhancedOptions: RequestInit = {
        ...options,
        headers: enhancedHeaders,
        // @ts-ignore - Node.js specific agent option
        agent: agent
      };
      
      // Add timeout if not specified
      if (!enhancedOptions.signal) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 30000); // 30 second timeout
        enhancedOptions.signal = controller.signal;
      }
      
      const response = await fetch(url, enhancedOptions);
      
      // Check if response indicates geo-blocking
      if (isGeoBlocked(response)) {
        throw new Error(`Geo-blocked response: ${response.status} ${response.statusText}`);
      }
      
      console.log(`✅ Geo-bypass successful for ${url}`);
      return response;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ Geo-bypass attempt ${attempt + 1} failed: ${lastError.message}`);
      
      // Wait before retry
      if (attempt < geoBypassConfig.retryAttempts - 1) {
        await sleep(geoBypassConfig.retryDelay * (attempt + 1));
      }
    }
  }
  
  // All attempts failed
  console.error(`🚫 All geo-bypass attempts failed for ${url}`);
  throw lastError || new Error('Geo-bypass failed after all attempts');
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
 * 🛡️ DETECT GEO-BLOCKING RESPONSES
 */
function isGeoBlocked(response: Response): boolean {
  // Common geo-blocking indicators
  const geoBlockingIndicators = [
    response.status === 403, // Forbidden
    response.status === 451, // Unavailable For Legal Reasons
    response.status === 503, // Service Unavailable (sometimes used for geo-blocking)
    response.headers.get('cf-ray') && response.status === 403, // Cloudflare geo-blocking
    response.headers.get('server')?.includes('cloudflare') && response.status === 403
  ];
  
  return geoBlockingIndicators.some(indicator => indicator);
}

/**
 * 🔒 REDACT PROXY URL FOR SECURE LOGGING
 */
function redactProxyUrl(url: string): string {
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
 * ⏱️ SLEEP UTILITY
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🧪 TEST GEO-BYPASS SYSTEM
 */
export async function testGeoBypass(): Promise<{
  success: boolean;
  results: Array<{ url: string; success: boolean; error?: string }>;
}> {
  const testUrls = [
    'https://api.binance.com/api/v3/time',
    'https://fapi.binance.com/fapi/v1/time',
    'https://www.okx.com/api/v5/public/time',
    'https://api.bybit.com/v5/market/time'
  ];
  
  const results = [];
  let successCount = 0;
  
  for (const url of testUrls) {
    try {
      console.log(`🧪 Testing geo-bypass for ${url}`);
      const response = await geoBypassFetch(url);
      
      if (response.ok) {
        results.push({ url, success: true });
        successCount++;
        console.log(`✅ Geo-bypass test passed for ${url}`);
      } else {
        results.push({ url, success: false, error: `HTTP ${response.status}` });
        console.log(`❌ Geo-bypass test failed for ${url}: HTTP ${response.status}`);
      }
    } catch (error) {
      results.push({ url, success: false, error: (error as Error).message });
      console.log(`❌ Geo-bypass test failed for ${url}: ${(error as Error).message}`);
    }
  }
  
  const success = successCount > 0;
  console.log(`🧪 Geo-bypass test completed: ${successCount}/${testUrls.length} successful`);
  
  return { success, results };
}

/**
 * 📊 GET GEO-BYPASS STATUS
 */
export function getGeoBypassStatus(): {
  enabled: boolean;
  strategies: string[];
  proxies: number;
  userAgents: number;
} {
  return {
    enabled: geoBypassConfig.enabled,
    strategies: geoBypassConfig.strategies,
    proxies: geoBypassConfig.fallbackProxies.length,
    userAgents: geoBypassConfig.userAgents.length
  };
}
