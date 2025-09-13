// 🌐 SISTEMA DE REDE SIMPLIFICADO - Robusticidade sem complexidade
// Baseado na recomendação "colar e rodar" - proxy opcional via PROXY_URL
import { HttpsProxyAgent } from 'https-proxy-agent';
import ccxt from 'ccxt';

// 🔧 CONFIGURAÇÃO SIMPLES - apenas PROXY_URL opcional
const { PROXY_URL, BINANCE_API_KEY, BINANCE_SECRET_KEY } = process.env;

/**
 * 🚀 CRIA AGENTE PROXY APENAS SE PROXY_URL ESTIVER DEFINIDO
 * - Sem autenticação complexa
 * - Sem fallbacks múltiplos
 * - Se PROXY_URL vazio → conexão direta
 */
export function makeAgent() {
  if (!PROXY_URL || PROXY_URL.trim() === '') {
    console.log('🌐 Net: Proxy URL não definido - usando conexão DIRETA');
    return undefined;
  }
  
  try {
    console.log('🔧 Net: Criando proxy agent para:', redactUrl(PROXY_URL));
    return new HttpsProxyAgent(PROXY_URL);
  } catch (error) {
    console.error('❌ Net: Erro criando proxy agent:', error.message);
    console.log('🌐 Net: Fallback para conexão DIRETA');
    return undefined;
  }
}

/**
 * 🔥 CRIA INSTÂNCIA CCXT PARA SPOT
 */
export function makeSpotExchange() {
  const agent = makeAgent();
  
  const options = {
    apiKey: BINANCE_API_KEY || '',
    secret: BINANCE_SECRET_KEY || '',
    sandbox: false,
    enableRateLimit: true,
    timeout: 15000,
    options: {
      defaultType: 'spot',
      adjustForTimeDifference: true,
    },
  };
  
  // 🌐 APLICAR PROXY AGENT SE DISPONÍVEL
  if (agent) {
    options.agent = agent;
    console.log('🔧 Net: CCXT Spot configurado com proxy');
  } else {
    console.log('🌐 Net: CCXT Spot configurado para conexão DIRETA');
  }
  
  return new ccxt.binance(options);
}

/**
 * 💎 CRIA INSTÂNCIA CCXT PARA FUTURES
 */
export function makeFuturesExchange() {
  const agent = makeAgent();
  
  const options = {
    apiKey: BINANCE_API_KEY || '',
    secret: BINANCE_SECRET_KEY || '',
    sandbox: false,
    enableRateLimit: true,
    timeout: 15000,
    options: {
      defaultType: 'swap', // USDT-M perpetuals
      adjustForTimeDifference: true,
    },
  };
  
  // 🌐 APLICAR PROXY AGENT SE DISPONÍVEL
  if (agent) {
    options.agent = agent;
    console.log('🔧 Net: CCXT Futures configurado com proxy');
  } else {
    console.log('🌐 Net: CCXT Futures configurado para conexão DIRETA');
  }
  
  return new ccxt.binance(options);
}

/**
 * 🌐 FETCH PERSONALIZADO COM PROXY OPCIONAL
 * - Usa proxy se PROXY_URL definido
 * - Conexão direta caso contrário
 */
export async function makeFetch(url, options = {}) {
  const agent = makeAgent();
  
  const fetchOptions = {
    ...options,
    timeout: 10000,
  };
  
  // 🌐 APLICAR PROXY AGENT SE DISPONÍVEL (Node.js específico)
  if (agent) {
    // @ts-ignore - Node.js specific agent option
    fetchOptions.agent = agent;
  }
  
  try {
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ Net: Fetch error for ${redactUrl(url)}:`, error.message);
    throw error;
  }
}

/**
 * 🛡️ REDUZ URL PARA LOG SEGURO
 */
function redactUrl(url) {
  if (!url) return '[undefined]';
  
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '[invalid-url]';
  }
}

/**
 * 📊 STATUS DO SISTEMA DE REDE
 */
export function getNetworkStatus() {
  return {
    proxyEnabled: !!PROXY_URL && PROXY_URL.trim() !== '',
    proxyUrl: PROXY_URL ? redactUrl(PROXY_URL) : null,
    hasApiKey: !!BINANCE_API_KEY,
    hasSecret: !!BINANCE_SECRET_KEY,
  };
}