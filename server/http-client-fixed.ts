
// 🌐 FIXED HTTP CLIENT WITH COMPREHENSIVE GEO-BYPASS AND ERROR HANDLING
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

interface HttpClientConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
  userAgents: string[];
  proxies: string[];
}

interface RequestOptions extends AxiosRequestConfig {
  skipGeoBypass?: boolean;
  maxRetries?: number;
}

// 🛡️ COMPREHENSIVE HTTP CLIENT WITH AUTO-RETRY AND GEO-BYPASS
export class FixedHttpClient {
  private config: HttpClientConfig;
  private currentUserAgentIndex = 0;
  private currentProxyIndex = 0;
  private failedProxies = new Set<string>();
  private rateLimitResets = new Map<string, number>();

  constructor() {
    this.config = {
      timeout: parseInt(process.env.EXCHANGE_TIMEOUT || '30000'),
      retries: 3,
      retryDelay: 2000,
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebL6.1 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
      ],
      proxies: this.getProxyList()
    };

    console.log(`🌐 FixedHttpClient initialized with ${this.config.proxies.length} proxies`);
  }

  private getProxyList(): string[] {
    const proxies = [
      process.env.PROXY_URL,
      process.env.PROXY_URL_2,
      process.env.PROXY_URL_3,
      process.env.RENDER_INTERNAL_PROXY_URL
    ].filter(Boolean) as string[];

    return proxies;
  }

  private getNextUserAgent(): string {
    const agent = this.config.userAgents[this.currentUserAgentIndex % this.config.userAgents.length];
    this.currentUserAgentIndex++;
    return agent;
  }

  private createProxyAgent(proxyUrl: string): any {
    try {
      const url = new URL(proxyUrl);
      
      if (url.protocol.startsWith('socks')) {
        return new SocksProxyAgent(proxyUrl);
      } else if (url.protocol.startsWith('http')) {
        return new HttpsProxyAgent(proxyUrl);
      }
      
      throw new Error(`Unsupported proxy protocol: ${url.protocol}`);
    } catch (error) {
      console.warn(`⚠️ Failed to create proxy agent for ${this.redactUrl(proxyUrl)}:`, (error as Error).message);
      return null;
    }
  }

  private async getWorkingProxy(): Promise<any> {
    const availableProxies = this.config.proxies.filter(proxy => !this.failedProxies.has(proxy));
    
    if (availableProxies.length === 0) {
      console.warn('⚠️ No working proxies available, clearing failed proxy list');
      this.failedProxies.clear();
      return null;
    }

    const proxyUrl = availableProxies[this.currentProxyIndex % availableProxies.length];
    this.currentProxyIndex++;

    return this.createProxyAgent(proxyUrl);
  }

  private async checkRateLimit(url: string): Promise<void> {
    const domain = new URL(url).hostname;
    const resetTime = this.rateLimitResets.get(domain);
    
    if (resetTime && Date.now() < resetTime) {
      const waitTime = resetTime - Date.now();
      console.log(`⏳ Rate limit active for ${domain}, waiting ${Math.ceil(waitTime / 1000)}s`);
      await this.sleep(waitTime);
    }
  }

  private handleRateLimit(url: string, retryAfter?: number): void {
    const domain = new URL(url).hostname;
    const waitTime = retryAfter ? retryAfter * 1000 : 60000; // Default 1 minute
    
    this.rateLimitResets.set(domain, Date.now() + waitTime);
    console.log(`🚨 Rate limit set for ${domain}, reset in ${Math.ceil(waitTime / 1000)}s`);
  }

  private isGeoBlockingError(error: any): boolean {
    const status = error.response?.status;
    const message = error.message?.toLowerCase() || '';
    
    return status === 403 || 
           status === 451 || 
           message.includes('forbidden') ||
           message.includes('geo') ||
           message.includes('region') ||
           message.includes('location');
  }

  private isRateLimitError(error: any): boolean {
    const status = error.response?.status;
    return status === 429 || status === 418; // 418 is often used for rate limiting too
  }

  private isRetryableError(error: any): boolean {
    const status = error.response?.status;
    
    // Retryable status codes
    const retryableStatuses = [500, 502, 503, 504, 408, 429, 403, 451];
    
    // Network errors
    const networkErrors = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
    const isNetworkError = networkErrors.some(code => error.code === code || error.message?.includes(code));
    
    return retryableStatuses.includes(status) || isNetworkError;
  }

  private redactUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return url.substring(0, 50) + '...';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🚀 ENHANCED FETCH WITH COMPREHENSIVE ERROR HANDLING
   */
  async fetch(url: string, options: RequestOptions = {}): Promise<AxiosResponse> {
    const maxRetries = options.maxRetries ?? this.config.retries;
    let lastError: any;

    // Check rate limit before starting
    await this.checkRateLimit(url);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 HTTP Request [${attempt}/${maxRetries}]: ${this.redactUrl(url)}`);

        // Prepare request configuration
        const requestConfig: AxiosRequestConfig = {
          ...options,
          url,
          timeout: this.config.timeout,
          headers: {
            'User-Agent': this.getNextUserAgent(),
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            ...options.headers
          }
        };

        // Add proxy if not skipping geo-bypass and proxies available
        if (!options.skipGeoBypass && this.config.proxies.length > 0) {
          const proxyAgent = await this.getWorkingProxy();
          if (proxyAgent) {
            requestConfig.httpsAgent = proxyAgent;
            requestConfig.httpAgent = proxyAgent;
            requestConfig.proxy = false; // Disable axios built-in proxy
          }
        }

        // Make request
        const response = await axios(requestConfig);
        
        console.log(`✅ HTTP Success [${attempt}/${maxRetries}]: ${response.status} ${this.redactUrl(url)}`);
        return response;

      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;
        
        console.warn(`❌ HTTP Error [${attempt}/${maxRetries}]: ${status || error.code} ${this.redactUrl(url)} - ${error.message}`);

        // Handle rate limiting
        if (this.isRateLimitError(error)) {
          const retryAfter = parseInt(error.response?.headers['retry-after'] || '60');
          this.handleRateLimit(url, retryAfter);
          
          if (attempt < maxRetries) {
            await this.sleep(retryAfter * 1000);
            continue;
          }
        }

        // Handle geo-blocking
        if (this.isGeoBlockingError(error)) {
          console.warn(`🌐 Geo-blocking detected for ${this.redactUrl(url)}`);
          
          // Mark current proxy as failed if we were using one
          const currentProxy = this.config.proxies[this.currentProxyIndex % this.config.proxies.length];
          if (currentProxy) {
            this.failedProxies.add(currentProxy);
            console.warn(`🚫 Marking proxy as failed: ${this.redactUrl(currentProxy)}`);
          }
          
          if (attempt < maxRetries) {
            await this.sleep(this.config.retryDelay * attempt);
            continue;
          }
        }

        // Handle other retryable errors
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`🔄 Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // Non-retryable error or max retries reached
        break;
      }
    }

    // All attempts failed
    console.error(`💥 All HTTP attempts failed for ${this.redactUrl(url)}:`, lastError?.message);
    throw lastError;
  }

  /**
   * 🧪 TEST CONNECTIVITY TO EXCHANGES
   */
  async testConnectivity(): Promise<{
    overall: boolean;
    results: Array<{
      url: string;
      success: boolean;
      latency?: number;
      error?: string;
      status?: number;
    }>;
  }> {
    const testUrls = [
      'https://api.binance.com/api/v3/ping',
      'https://fapi.binance.com/fapi/v1/ping', 
      'https://www.okx.com/api/v5/public/time',
      'https://api.bybit.com/v5/market/time'
    ];

    console.log('🧪 Testing HTTP connectivity to exchanges...');

    const results = [];
    let successCount = 0;

    for (const url of testUrls) {
      const startTime = Date.now();
      try {
        const response = await this.fetch(url, { method: 'GET', maxRetries: 2 });
        const latency = Date.now() - startTime;
        
        results.push({
          url: this.redactUrl(url),
          success: true,
          latency,
          status: response.status
        });
        
        successCount++;
        console.log(`✅ ${this.redactUrl(url)}: ${response.status} (${latency}ms)`);
        
      } catch (error: any) {
        const latency = Date.now() - startTime;
        
        results.push({
          url: this.redactUrl(url),
          success: false,
          latency,
          error: error.message,
          status: error.response?.status
        });
        
        console.error(`❌ ${this.redactUrl(url)}: ${error.message} (${latency}ms)`);
      }
    }

    const overall = successCount > 0;
    console.log(`🏁 Connectivity test completed: ${successCount}/${testUrls.length} successful`);

    return { overall, results };
  }

  /**
   * 📊 GET CLIENT STATUS
   */
  getStatus(): {
    proxies: {
      total: number;
      working: number;
      failed: number;
    };
    rateLimits: {
      active: number;
      domains: string[];
    };
    config: HttpClientConfig;
  } {
    const activeRateLimits = Array.from(this.rateLimitResets.entries())
      .filter(([, resetTime]) => Date.now() < resetTime);

    return {
      proxies: {
        total: this.config.proxies.length,
        working: this.config.proxies.length - this.failedProxies.size,
        failed: this.failedProxies.size
      },
      rateLimits: {
        active: activeRateLimits.length,
        domains: activeRateLimits.map(([domain]) => domain)
      },
      config: this.config
    };
  }

  /**
   * 🔄 RESET FAILED PROXIES AND RATE LIMITS
   */
  reset(): void {
    this.failedProxies.clear();
    this.rateLimitResets.clear();
    this.currentProxyIndex = 0;
    this.currentUserAgentIndex = 0;
    console.log('🔄 HTTP client state reset');
  }
}

// Export singleton instance
export const httpClient = new FixedHttpClient();
export default httpClient;
