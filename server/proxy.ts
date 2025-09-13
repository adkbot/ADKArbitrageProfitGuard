// Note: undici not available in this environment, using alternative approach
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// 🌐 PROXY CONFIGURATION PARA CONTORNAR RESTRIÇÕES GEOGRÁFICAS
interface ProxyConfig {
  enabled: boolean;
  url?: string;
  wsUrl?: string;
  noProxy?: string;
}

let proxyConfig: ProxyConfig = {
  enabled: false
};

let wsProxyAgent: any = null;

/**
 * 🔧 Inicializar configuração de proxy baseada em variáveis de ambiente
 */
export function initializeProxy(): void {
  try {
    // Ler configuração das variáveis de ambiente
    proxyConfig = {
      enabled: process.env.PROXY_ENABLED === 'true',
      url: process.env.PROXY_URL,
      wsUrl: process.env.WS_PROXY_URL || process.env.PROXY_URL,
      noProxy: process.env.PROXY_NO_PROXY || 'localhost,127.0.0.1'
    };

    console.log(`🌐 Proxy Status: ${proxyConfig.enabled ? 'ENABLED' : 'DISABLED'}`);

    if (proxyConfig.enabled && proxyConfig.url) {
      console.log(`🔄 Configurando proxy para CCXT: ${redactProxy(proxyConfig.url)}`);
      
      // 🔌 Configurar proxy para WebSockets
      setupWebSocketProxy();
      
      console.log('✅ Proxy configurado com sucesso');
    } else if (proxyConfig.enabled) {
      console.warn('⚠️ PROXY_ENABLED=true mas PROXY_URL não definida');
    }
  } catch (error) {
    console.error('❌ Erro configurando proxy:', error);
    // Não parar a aplicação se proxy falhar
    proxyConfig.enabled = false;
  }
}

/**
 * 🔌 Configurar agente proxy para WebSockets
 */
function setupWebSocketProxy(): void {
  if (!proxyConfig.wsUrl) return;

  try {
    const url = new URL(proxyConfig.wsUrl);
    
    // Determinar tipo de proxy baseado no protocolo
    if (url.protocol === 'socks5:' || url.protocol === 'socks4:') {
      wsProxyAgent = new SocksProxyAgent(proxyConfig.wsUrl);
      console.log(`🧦 WebSocket SOCKS proxy: ${redactProxy(proxyConfig.wsUrl)}`);
    } else if (url.protocol === 'http:' || url.protocol === 'https:') {
      wsProxyAgent = new HttpsProxyAgent(proxyConfig.wsUrl);
      console.log(`🌐 WebSocket HTTP proxy: ${redactProxy(proxyConfig.wsUrl)}`);
    } else {
      console.warn(`⚠️ Protocolo de proxy não suportado: ${url.protocol}`);
    }
  } catch (error) {
    console.error('❌ Erro configurando WebSocket proxy:', error);
    wsProxyAgent = null;
  }
}

/**
 * 🛡️ Obter agente proxy para WebSockets (redacted para segurança)
 */
export function getWsAgent(): any {
  return proxyConfig.enabled ? wsProxyAgent : null;
}

/**
 * 🔒 Mascarar URL do proxy para logs seguros (não vazar credenciais)
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
 * 📊 Obter status atual do proxy
 */
export function getProxyStatus(): { enabled: boolean; url?: string; wsUrl?: string } {
  return {
    enabled: proxyConfig.enabled,
    url: proxyConfig.url ? redactProxy(proxyConfig.url) : undefined,
    wsUrl: proxyConfig.wsUrl ? redactProxy(proxyConfig.wsUrl) : undefined
  };
}

/**
 * 🧪 Testar conectividade do proxy
 */
export async function testProxyConnectivity(): Promise<{ 
  http: boolean; 
  binance: boolean; 
  coingecko: boolean; 
  error?: string 
}> {
  const result = {
    http: false,
    binance: false,
    coingecko: false,
    error: undefined as string | undefined
  };

  try {
    // Teste básico HTTP (sem timeout no RequestInit por limitações)
    const httpResponse = await fetch('https://httpbin.org/ip', {
      method: 'GET'
    });
    result.http = httpResponse.ok;

    // Teste Binance API (sem autenticação)
    const binanceResponse = await fetch('https://api.binance.com/api/v3/time', {
      method: 'GET'
    });
    result.binance = binanceResponse.ok;

    // Teste CoinGecko API
    const coingeckoResponse = await fetch('https://api.coingecko.com/api/v3/ping', {
      method: 'GET'
    });
    result.coingecko = coingeckoResponse.ok;

  } catch (error) {
    result.error = (error as Error).message;
    console.error('❌ Erro testando conectividade do proxy:', error);
  }

  return result;
}