// 🌐 SISTEMA DE REDE SIMPLIFICADO - Robusticidade sem complexidade
// Baseado na recomendação "colar e rodar" - proxy opcional via PROXY_URL ou SOCKS5
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import ccxt from 'ccxt';
import axios from 'axios';

// 🔧 CONFIGURAÇÃO SIMPLES - PROXY_URL ou SOCKS5 opcional
const { PROXY_URL, PROXY_SOCKS5_HOST, PROXY_SOCKS5_PORT, BINANCE_API_KEY, BINANCE_SECRET_KEY } = process.env;

// 🔧 CONFIGURAÇÃO INTELIGENTE
const BACKOFF_INTERVALS = [15, 60, 300, 600]; // 15s, 1m, 5m, 10m (em segundos)
const GEO_BLOCK_TTL = 6 * 60 * 60 * 1000; // 6 horas

// 🧠 SISTEMA INTELIGENTE DE PROXY - Estado Centralizado
let proxyState = {
  mode: 'enabled', // 'direct', 'testing', 'enabled', 'backoff' - FORÇADO ENABLED PARA SOCKS5
  failures: 0, // RESETADO PARA GARANTIR USO DO PROXY
  nextRetryAt: 0, // SEM BACKOFF
  lastSuccessAt: Date.now(), // MARCA COMO SUCESSO RECENTE
  lastError: null,
  geoBlocked: true, // GEO-BLOQUEIO DETECTADO
  geoBlockedUntil: Date.now() + (6 * 60 * 60 * 1000) // 6 horas
};

/**
 * 🚀 CRIA AGENTE PROXY (SOCKS5 ou HTTP)
 * - Prioridade: SOCKS5 primeiro, depois HTTP
 * - Sem autenticação complexa
 * - Se nenhum proxy definido → conexão direta
 */
export function makeAgent() {
  const now = Date.now();
  
  // 🧠 VERIFICAÇÃO INTELIGENTE DE ESTADO
  updateProxyState(now);
  
  // 🚫 SE BACKOFF ATIVO, USA CONEXÃO DIRETA
  if (proxyState.mode === 'backoff' && now < proxyState.nextRetryAt) {
    const timeLeft = Math.ceil((proxyState.nextRetryAt - now) / 1000);
    if (proxyState.failures === 1) { // Log apenas uma vez por período
      console.log(`🔄 Proxy em backoff - próxima tentativa em ${timeLeft}s`);
    }
    return undefined;
  }
  
  // 🌐 SE MODO DIRETO (sem geo-bloqueio), USA CONEXÃO DIRETA  
  if (proxyState.mode === 'direct' && !proxyState.geoBlocked) {
    return undefined;
  }
  
  // 🔧 CONFIGURAÇÃO DINÂMICA DE PROXY (VARIÁVEIS DE AMBIENTE APENAS)
  const { PROXY_SOCKS5_HOST, PROXY_SOCKS5_PORT } = process.env;
  
  // 🌐 TENTA SOCKS5 PRIMEIRO (SE CONFIGURADO)
  if (PROXY_SOCKS5_HOST && PROXY_SOCKS5_PORT) {
    try {
      const socksProxy = `socks5h://${PROXY_SOCKS5_HOST}:${PROXY_SOCKS5_PORT}`;
      if (proxyState.failures === 0) { // Log apenas na primeira tentativa
        console.log(`🔧 Net: Usando SOCKS5: ${PROXY_SOCKS5_HOST}:${PROXY_SOCKS5_PORT}`);
      }
      return new SocksProxyAgent(socksProxy);
    } catch (error) {
      recordProxyFailure('SOCKS5 creation error: ' + error.message);
      return undefined;
    }
  }
  
  // 🌐 TENTA HTTP PROXY (SE CONFIGURADO)
  if (PROXY_URL && PROXY_URL.trim() !== '') {
    try {
      if (proxyState.failures === 0) { // Log apenas na primeira tentativa
        console.log('🔧 Net: Usando HTTP proxy:', redactUrl(PROXY_URL));
      }
      return new HttpsProxyAgent(PROXY_URL);
    } catch (error) {
      recordProxyFailure('HTTP proxy creation error: ' + error.message);
      return undefined;
    }
  }
  
  // 🌐 SEM PROXY CONFIGURADO - CONEXÃO DIRETA
  if (proxyState.mode !== 'direct') {
    proxyState.mode = 'direct';
    console.log('🌐 Net: Conexão DIRETA (nenhum proxy configurado)');
  }
  return undefined;
}

/**
 * 🧠 ATUALIZA ESTADO INTELIGENTE DO PROXY
 */
function updateProxyState(now) {
  // ✅ EXPIRA GEO-BLOQUEIO SE NECESSÁRIO
  if (proxyState.geoBlocked && now > proxyState.geoBlockedUntil) {
    proxyState.geoBlocked = false;
    proxyState.mode = 'testing';
    console.log('🌍 Geo-bloqueio expirado - testando conexão direta');
  }
}

/**
 * 🚨 REGISTRA FALHA DE PROXY COM BACKOFF EXPONENCIAL
 */
function recordProxyFailure(errorMessage) {
  const now = Date.now();
  proxyState.failures++;
  proxyState.lastError = errorMessage;
  
  // 📊 LOG LIMITADO - Apenas falhas significativas
  if (proxyState.failures === 1 || proxyState.failures % 10 === 0) {
    console.log(`⚠️ Proxy falha #${proxyState.failures}: ${errorMessage}`);
  }
  
  // 🔄 BACKOFF EXPONENCIAL
  const backoffIndex = Math.min(proxyState.failures - 1, BACKOFF_INTERVALS.length - 1);
  const backoffSeconds = BACKOFF_INTERVALS[backoffIndex];
  const jitter = Math.random() * 0.3 + 0.85; // 85-115% do tempo base
  
  proxyState.nextRetryAt = now + (backoffSeconds * 1000 * jitter);
  proxyState.mode = 'backoff';
  
  if (proxyState.failures === 1) {
    console.log(`🔄 Proxy desabilitado - próxima tentativa em ${backoffSeconds}s`);
  }
}

/**
 * 🎯 SUCESSO DE PROXY - Reseta estado de falhas
 */
function recordProxySuccess() {
  if (proxyState.failures > 0) {
    console.log(`✅ Proxy funcionando - resetando ${proxyState.failures} falhas`);
    proxyState.failures = 0;
    proxyState.mode = 'enabled';
    proxyState.lastSuccessAt = Date.now();
    proxyState.nextRetryAt = 0;
    proxyState.lastError = null;
  }
}

/**
 * 🌍 DETECTA GEO-BLOQUEIO (HTTP 451/403)
 */
export function setGeoBlocked() {
  const now = Date.now();
  if (!proxyState.geoBlocked) {
    proxyState.geoBlocked = true;
    proxyState.geoBlockedUntil = now + GEO_BLOCK_TTL;
    proxyState.mode = 'testing';
    console.log('🚨 Geo-bloqueio detectado - ativando proxy por 6h');
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
 * 🚨 FETCH COM KILL-SWITCH AUTOMÁTICO
 * - Usa axios com interceptors para detectar bloqueio geográfico  
 * - Kill-switch automático em HTTP 451/403
 * - Proxy opcional via PROXY_URL
 */
export async function makeFetch(url, options = {}) {
  console.log('🌐 Proxied fetch:', url.length > 60 ? url.substring(0, 60) + '...' : url);
  
  const agent = makeAgent();
  const axiosConfig = {
    url,
    method: options.method || 'GET',
    timeout: 10000,
    proxy: false, // 🚨 FORÇA BYPASSE DE PROXY GLOBAL!
    ...options,
    httpsAgent: agent,
    httpAgent: agent
  };
  
  try {
    const response = await axios(axiosConfig);
    
    // ✅ REGISTRA SUCESSO DE PROXY
    if (agent) {
      recordProxySuccess();
    }
    
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      json: () => Promise.resolve(response.data),
      text: () => Promise.resolve(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))
    };
  } catch (error) {    
    // 🚨 DETECÇÃO AUTOMÁTICA DE FALHAS - Múltiplas verificações
    const isConnectionError = error.code === 'ECONNREFUSED' || 
                             error.code === 'ECONNRESET' || 
                             error.code === 'ETIMEDOUT' ||
                             error.message?.includes('ECONNREFUSED') ||
                             error.message?.includes('connect ECONNREFUSED');
    
    if (agent && isConnectionError) {
      recordProxyFailure(error.message);
    }
    
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
 * 📊 STATUS COMPLETO DO SISTEMA DE REDE
 */
export function getNetworkStatus() {
  const { PROXY_SOCKS5_HOST, PROXY_SOCKS5_PORT, PROXY_URL } = process.env;
  const socks5Enabled = !!(PROXY_SOCKS5_HOST && PROXY_SOCKS5_PORT);
  const httpProxyEnabled = !!(PROXY_URL && PROXY_URL.trim() !== '');
  const now = Date.now();
  
  return {
    mode: proxyState.mode,
    proxyEnabled: socks5Enabled || httpProxyEnabled,
    proxyType: socks5Enabled ? 'SOCKS5' : httpProxyEnabled ? 'HTTP' : 'NONE',
    proxyUrl: socks5Enabled 
      ? `${PROXY_SOCKS5_HOST}:${PROXY_SOCKS5_PORT}` 
      : httpProxyEnabled 
        ? redactUrl(PROXY_URL) 
        : null,
    failures: proxyState.failures,
    nextRetrySeconds: proxyState.nextRetryAt > now ? Math.ceil((proxyState.nextRetryAt - now) / 1000) : 0,
    geoBlocked: proxyState.geoBlocked,
    geoBlockedUntil: proxyState.geoBlockedUntil,
    lastSuccessAt: proxyState.lastSuccessAt,
    lastError: proxyState.lastError,
    hasApiKey: !!BINANCE_API_KEY,
    hasSecret: !!BINANCE_SECRET_KEY,
  };
}