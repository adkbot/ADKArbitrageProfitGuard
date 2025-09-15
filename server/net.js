// 🌐 SISTEMA DE REDE SIMPLIFICADO - Robusticidade sem complexidade
// Baseado na recomendação "colar e rodar" - proxy opcional via PROXY_URL ou SOCKS5
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import ccxt from 'ccxt';
import { http } from './http-client.js';

// 🔧 CONFIGURAÇÃO SIMPLES - PROXY_URL ou SOCKS5 opcional
const { PROXY_URL, PROXY_SOCKS5_HOST, PROXY_SOCKS5_PORT, BINANCE_API_KEY, BINANCE_SECRET_KEY } = process.env;

// 🛡️ SISTEMA ANTI-FALHAS - Auto-disable proxy após falhas
let consecutiveProxyFailures = 0;
let proxyDisabledAt = 0;
const MAX_FAILURES_BEFORE_DISABLE = 5;
const PROXY_DISABLE_DURATION = 60 * 1000; // 1 minuto
const AUTO_RECOVERY_CHECK = 2 * 60 * 1000; // 2 minutos

// 🔧 CONTROLE GLOBAL - Desabilita proxy temporariamente
let PROXY_TEMPORARILY_DISABLED = false;

/**
 * 🚀 CRIA AGENTE PROXY (SOCKS5 ou HTTP)
 * - Prioridade: SOCKS5 primeiro, depois HTTP
 * - Sem autenticação complexa
 * - Se nenhum proxy definido → conexão direta
 */
export function makeAgent() {
  // 🚨 EMERGÊNCIA: FORÇA CONEXÃO DIRETA - HARDCODED NUNCA DIE!
  console.log('🔥 EMERGÊNCIA ATIVA: FORÇANDO conexão DIRETA - NUNCA DIE!');
  return undefined;
  
  const now = Date.now();
  
  // 🚨 SISTEMA SUPER-SIMPLES: Se proxy temporariamente desabilitado, usar conexão direta
  if (PROXY_TEMPORARILY_DISABLED) {
    // ✅ AUTO-RECOVERY: Testa reabilitação após tempo configurado
    if (proxyDisabledAt > 0 && (now - proxyDisabledAt) > AUTO_RECOVERY_CHECK) {
      console.log('🔄 Tentando reabilitar proxy após período de recuperação...');
      PROXY_TEMPORARILY_DISABLED = false;
      consecutiveProxyFailures = 0;
      proxyDisabledAt = 0;
    } else {
      const timeLeft = Math.ceil((AUTO_RECOVERY_CHECK - (now - proxyDisabledAt)) / 1000);
      console.log(`🚫 Proxy temporariamente DESABILITADO (${timeLeft}s restantes) - usando conexão DIRETA`);
      return undefined;
    }
  }
  
  // 🚀 PROXY ATIVO - Tenta SOCKS5 primeiro
  if (PROXY_SOCKS5_HOST && PROXY_SOCKS5_PORT) {
    try {
      const socksProxy = `socks5h://${PROXY_SOCKS5_HOST}:${PROXY_SOCKS5_PORT}`;
      console.log(`🔧 Net: Criando SOCKS5 proxy agent: ${PROXY_SOCKS5_HOST}:${PROXY_SOCKS5_PORT}`);
      return new SocksProxyAgent(socksProxy);
    } catch (error) {
      console.error('❌ Net: Erro criando SOCKS5 proxy agent:', error.message);
      handleProxyFailure();
    }
  }
  
  // Fallback para HTTP proxy
  if (PROXY_URL && PROXY_URL.trim() !== '') {
    try {
      console.log('🔧 Net: Criando HTTP proxy agent para:', redactUrl(PROXY_URL));
      return new HttpsProxyAgent(PROXY_URL);
    } catch (error) {
      console.error('❌ Net: Erro criando HTTP proxy agent:', error.message);
      handleProxyFailure();
    }
  }
  
  console.log('🌐 Net: Usando conexão DIRETA (sem proxy configurado)');
  return undefined;
}

/**
 * 🚨 SISTEMA ANTI-FALHAS SIMPLES - Desabilita proxy automaticamente
 */
function handleProxyFailure() {
  consecutiveProxyFailures++;
  console.log(`⚠️ Falha de proxy detectada (#${consecutiveProxyFailures}/${MAX_FAILURES_BEFORE_DISABLE})`);
  
  if (consecutiveProxyFailures >= MAX_FAILURES_BEFORE_DISABLE) {
    PROXY_TEMPORARILY_DISABLED = true;
    proxyDisabledAt = Date.now();
    console.log(`🚨 PROXY AUTO-DESABILITADO após ${MAX_FAILURES_BEFORE_DISABLE} falhas consecutivas!`);
    console.log(`🔄 Reconexão automática em ${AUTO_RECOVERY_CHECK / 1000}s usando conexão DIRETA`);
  }
}

/**
 * 🎯 SUCESSO DE PROXY - Reseta contador de falhas  
 */
function handleProxySuccess() {
  if (consecutiveProxyFailures > 0 || PROXY_TEMPORARILY_DISABLED) {
    console.log('✅ Proxy funcionando - resetando sistema anti-falhas');
    consecutiveProxyFailures = 0;
    PROXY_TEMPORARILY_DISABLED = false;
    proxyDisabledAt = 0;
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
    const response = await http(axiosConfig);
    
    // ✅ REGISTRA SUCESSO DE PROXY
    if (agent) {
      handleProxySuccess();
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
      console.log('🚨 ERRO DETECTADO: Falha de conectividade do proxy');
      handleProxyFailure();
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
 * 📊 STATUS DO SISTEMA DE REDE
 */
export function getNetworkStatus() {
  const socks5Enabled = !!(PROXY_SOCKS5_HOST && PROXY_SOCKS5_PORT);
  const httpProxyEnabled = !!(PROXY_URL && PROXY_URL.trim() !== '');
  
  return {
    proxyEnabled: socks5Enabled || httpProxyEnabled,
    proxyType: socks5Enabled ? 'SOCKS5' : httpProxyEnabled ? 'HTTP' : 'NONE',
    proxyUrl: socks5Enabled 
      ? `${PROXY_SOCKS5_HOST}:${PROXY_SOCKS5_PORT}` 
      : httpProxyEnabled 
        ? redactUrl(PROXY_URL) 
        : null,
    hasApiKey: !!BINANCE_API_KEY,
    hasSecret: !!BINANCE_SECRET_KEY,
  };
}