// 🌐 SISTEMA DE REDE SIMPLIFICADO - Robusticidade sem complexidade
// Baseado na recomendação "colar e rodar" - proxy opcional via PROXY_URL ou SOCKS5
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import ccxt from 'ccxt';
import axios from 'axios';

// 🔧 CONFIGURAÇÃO SIMPLES - PROXY_URL ou SOCKS5 opcional
const { PROXY_URL, PROXY_SOCKS5_HOST, PROXY_SOCKS5_PORT, BINANCE_API_KEY, BINANCE_SECRET_KEY } = process.env;

// 🔧 CONFIGURAÇÃO INTELIGENTE MELHORADA
const BACKOFF_INTERVALS = [30, 120, 300, 900, 1800]; // 30s, 2m, 5m, 15m, 30m (em segundos)
const GEO_BLOCK_TTL = 2 * 60 * 60 * 1000; // 2 horas (reduzido)
const RATE_LIMIT_BACKOFF = 60 * 1000; // 1 minuto para rate limit

// 🧠 SISTEMA INTELIGENTE DE PROXY - Estado Centralizado MELHORADO
let proxyState = {
  mode: 'auto', // 'direct', 'testing', 'enabled', 'backoff', 'auto'
  failures: 0,
  nextRetryAt: 0,
  lastSuccessAt: 0, // Iniciar sem sucesso recente
  lastError: null,
  geoBlocked: false, // Iniciar sem assumir geo-bloqueio
  geoBlockedUntil: 0,
  rateLimitedUntil: 0, // Novo: controle de rate limit
  consecutiveRateLimits: 0 // Contador de rate limits consecutivos
};

/**
 * 🚀 CRIA AGENTE PROXY (SOCKS5 ou HTTP)
 * - Prioridade: SOCKS5 primeiro, depois HTTP
 * - Sem autenticação complexa
 * - Se nenhum proxy definido → conexão direta
 */
export function makeAgent() {
  console.log(`🔍 Net: makeAgent() chamado`);
  console.log(`🔍 Net: PROXY_SOCKS5_HOST = ${PROXY_SOCKS5_HOST ? 'SET' : 'NOT SET'}`);
  console.log(`🔍 Net: PROXY_SOCKS5_PORT = ${PROXY_SOCKS5_PORT ? 'SET' : 'NOT SET'}`);
  
  // 🔥 PRIORIDADE 1: SOCKS5 PROXY (MELHOR PARA GEO-BYPASS)
  if (PROXY_SOCKS5_HOST && PROXY_SOCKS5_PORT) {
    try {
      const socks5Url = `socks5h://${PROXY_SOCKS5_HOST}:${PROXY_SOCKS5_PORT}`;
      console.log(`🔧 Net: Criando SOCKS5 proxy: ${PROXY_SOCKS5_HOST}:${PROXY_SOCKS5_PORT}`);
      const agent = new SocksProxyAgent(socks5Url, { keepAlive: true });
      console.log(`✅ Net: SOCKS5 proxy criado com sucesso!`);
      return agent;
    } catch (error) {
      console.error('❌ Erro criando SOCKS5 proxy:', error.message);
      recordProxyFailure('SOCKS5 proxy creation error: ' + error.message);
    }
  }
  
  // 🌐 FALLBACK: HTTP PROXY (SE CONFIGURADO)
  if (PROXY_URL && PROXY_URL.trim() !== '') {
    try {
      if (proxyState.failures === 0) { // Log apenas na primeira tentativa
        console.log('🔧 Net: Usando HTTP proxy:', redactUrl(PROXY_URL));
      }
      return new HttpsProxyAgent(PROXY_URL, { keepAlive: true });
    } catch (error) {
      recordProxyFailure('HTTP proxy creation error: ' + error.message);
    }
  }
  
  // 🌐 SEM PROXY CONFIGURADO - CONEXÃO DIRETA (PODE DAR GEO-BLOQUEIO)
  if (proxyState.mode !== 'direct') {
    proxyState.mode = 'direct';
    console.log('⚠️ Net: Conexão DIRETA (sem proxy) - pode haver geo-bloqueio');
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
 * ✅ REGISTRAR SUCESSO GERAL
 */
function recordSuccess() {
  const now = Date.now();
  proxyState.lastSuccessAt = now;
  proxyState.consecutiveRateLimits = 0; // Reset rate limit counter
  
  // Reset geo-block se estava ativo
  if (proxyState.geoBlocked && proxyState.geoBlockedUntil <= now) {
    proxyState.geoBlocked = false;
    proxyState.geoBlockedUntil = 0;
    console.log('✅ Geo-bloqueio removido após sucesso');
  }
  
  // Reset rate limit se estava ativo
  if (proxyState.rateLimitedUntil <= now) {
    proxyState.rateLimitedUntil = 0;
  }
}

/**
 * 🚨 REGISTRAR RATE LIMIT
 */
function recordRateLimit() {
  const now = Date.now();
  proxyState.consecutiveRateLimits++;
  
  // Backoff exponencial baseado em rate limits consecutivos
  const backoffMultiplier = Math.min(proxyState.consecutiveRateLimits, 5); // Max 5x
  const backoffTime = RATE_LIMIT_BACKOFF * backoffMultiplier;
  
  proxyState.rateLimitedUntil = now + backoffTime;
  proxyState.lastError = 'Rate limit (429)';
  
  console.log(`🚨 Rate limit #${proxyState.consecutiveRateLimits} - backoff ${backoffTime/1000}s`);
}

/**
 * 🚫 REGISTRAR GEO-BLOQUEIO
 */
function recordGeoBlock() {
  const now = Date.now();
  proxyState.geoBlocked = true;
  proxyState.geoBlockedUntil = now + GEO_BLOCK_TTL;
  proxyState.lastError = 'Geo-bloqueio (451/403)';
  
  console.log(`🚫 Geo-bloqueio ativado por ${GEO_BLOCK_TTL/1000/60} minutos`);
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
 * 🚨 FETCH COM KILL-SWITCH AUTOMÁTICO E RATE LIMIT INTELIGENTE
 * - Usa axios com interceptors para detectar bloqueio geográfico  
 * - Kill-switch automático em HTTP 451/403
 * - Rate limit inteligente com backoff exponencial
 * - Proxy opcional via PROXY_URL
 */
export async function makeFetch(url, options = {}) {
  if (!url) {
    throw new Error('URL é obrigatório para makeFetch');
  }
  
  const now = Date.now();
  
  // 🚨 VERIFICAR RATE LIMIT ATIVO
  if (proxyState.rateLimitedUntil > now) {
    const waitTime = Math.ceil((proxyState.rateLimitedUntil - now) / 1000);
    console.log(`⏳ Rate limit ativo - aguardando ${waitTime}s...`);
    await new Promise(resolve => setTimeout(resolve, proxyState.rateLimitedUntil - now));
  }
  
  // 🚨 VERIFICAR GEO-BLOQUEIO ATIVO
  if (proxyState.geoBlocked && proxyState.geoBlockedUntil > now) {
    const waitTime = Math.ceil((proxyState.geoBlockedUntil - now) / 1000);
    throw new Error(`Geo-bloqueio ativo por mais ${waitTime}s. Configure proxy adequado.`);
  }
  
  console.log('🌐 Proxied fetch:', url.length > 60 ? url.substring(0, 60) + '...' : url);
  
  const agent = makeAgent();
  const axiosConfig = {
    url,
    method: options.method || 'GET',
    timeout: options.timeout || 15000, // Timeout maior
    proxy: false, // 🚨 FORÇA BYPASSE DE PROXY GLOBAL!
    ...options,
    httpsAgent: agent,
    httpAgent: agent
  };
  
  try {
    const response = await axios(axiosConfig);
    
    // ✅ REGISTRA SUCESSO
    recordSuccess();
    
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      json: () => Promise.resolve(response.data),
      text: () => Promise.resolve(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))
    };
  } catch (error) {    
    // 🚨 DETECÇÃO INTELIGENTE DE TIPOS DE ERRO
    const status = error.response?.status;
    const isRateLimit = status === 429 || error.message?.includes('Too Many Requests');
    const isGeoBlock = status === 451 || status === 403 || error.message?.includes('restricted location');
    const isConnectionError = error.code === 'ECONNREFUSED' || 
                             error.code === 'ECONNRESET' || 
                             error.code === 'ETIMEDOUT' ||
                             error.message?.includes('ECONNREFUSED') ||
                             error.message?.includes('connect ECONNREFUSED');
    
    // 🚨 TRATAR RATE LIMIT
    if (isRateLimit) {
      recordRateLimit();
      console.log(`🚨 Rate limit detectado - backoff de ${RATE_LIMIT_BACKOFF/1000}s`);
    }
    
    // 🚨 TRATAR GEO-BLOQUEIO
    if (isGeoBlock) {
      recordGeoBlock();
      console.log(`🚨 Geo-bloqueio detectado - ativando proxy por ${GEO_BLOCK_TTL/1000/60}min`);
    }
    
    // 🚨 TRATAR ERRO DE CONEXÃO
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
 * 📊 STATUS COMPLETO DO SISTEMA DE REDE MELHORADO
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
    geoBlockedSecondsLeft: proxyState.geoBlockedUntil > now ? Math.ceil((proxyState.geoBlockedUntil - now) / 1000) : 0,
    rateLimited: proxyState.rateLimitedUntil > now,
    rateLimitedUntil: proxyState.rateLimitedUntil,
    rateLimitSecondsLeft: proxyState.rateLimitedUntil > now ? Math.ceil((proxyState.rateLimitedUntil - now) / 1000) : 0,
    consecutiveRateLimits: proxyState.consecutiveRateLimits,
    lastSuccessAt: proxyState.lastSuccessAt,
    lastSuccessAgo: proxyState.lastSuccessAt > 0 ? Math.ceil((now - proxyState.lastSuccessAt) / 1000) : null,
    lastError: proxyState.lastError,
    hasApiKey: !!BINANCE_API_KEY,
    hasSecret: !!BINANCE_SECRET_KEY,
    connectionStatus: proxyState.lastSuccessAt > 0 && (now - proxyState.lastSuccessAt) < 300000 ? 'healthy' : 'degraded', // 5 min
    fallbackActive: proxyState.mode !== 'direct' && (socks5Enabled || httpProxyEnabled),
    avgResponseTime: 'N/A', // Placeholder para futura implementação
    successRate: 'N/A' // Placeholder para futura implementação
  };
}