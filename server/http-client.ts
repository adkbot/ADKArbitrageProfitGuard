import axios, { type AxiosRequestConfig } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 🛡️ CIRCUIT BREAKER PARA HTTP CLIENT
let httpProxyFailures = 0;
let httpProxyDisabledUntil = 0;
const HTTP_PROXY_FAILURE_THRESHOLD = 3;
const HTTP_PROXY_DISABLE_DURATION = 2 * 60 * 1000; // 2 minutos

function recordHttpProxyFailure() {
  httpProxyFailures++;
  if (httpProxyFailures >= HTTP_PROXY_FAILURE_THRESHOLD) {
    httpProxyDisabledUntil = Date.now() + HTTP_PROXY_DISABLE_DURATION;
    console.log('🚨 HTTP Client: Detectada falha de conectividade do proxy - ATIVANDO HTTP CIRCUIT BREAKER');
    console.log(`⚠️ HTTP Proxy failure #${httpProxyFailures}/${HTTP_PROXY_FAILURE_THRESHOLD}`);
    console.log('🚨 HTTP PROXY DESABILITADO por 120s - usando conexão DIRETA');
  }
}

function recordHttpProxySuccess() {
  if (httpProxyFailures > 0) {
    console.log('✅ HTTP Proxy funcionando - resetando contador de falhas');
    httpProxyFailures = 0;
    httpProxyDisabledUntil = 0;
  }
}

// 🌐 CRIAR AXIOS COM VPS FRANKFURT PARA RESOLVER BLOQUEIO GEOGRÁFICO
const createHttpClient = () => {
  const config: AxiosRequestConfig = { 
    timeout: 7000,
    proxy: false, // 🚨 FORÇA BYPASSE DE PROXY GLOBAL!
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  };
  
  // 🌐 SISTEMA INTELIGENTE DE PROXY - FRANKFURT VPS + FALLBACKS
  const now = Date.now();
  
  // 🛡️ CIRCUIT BREAKER - Verifica se proxy está temporariamente desabilitado
  if (httpProxyDisabledUntil > now) {
    const remainingTime = Math.ceil((httpProxyDisabledUntil - now) / 1000);
    console.log(`🚨 HTTP Proxy desabilitado por circuit breaker (${remainingTime}s restantes)`);
    console.log('🌐 Usando conexão DIRETA temporariamente');
    return axios.create(config);
  }

  // ✅ TESTE CONFIRMOU: RESTRIÇÕES GEOGRÁFICAS EXISTEM!
  // 🌐 REATIVANDO VPS FRANKFURT PARA CONTORNAR BLOQUEIO HTTP 451
  const FRANKFURT_VPS_HOST = '165.227.168.225';
  const FRANKFURT_VPS_PORT = '1080';
  
  console.log(`🌐 Usando VPS Frankfurt: ${FRANKFURT_VPS_HOST}:${FRANKFURT_VPS_PORT} (confirmado necessário por HTTP 451)`);
  
  try {
    const socksProxy = `socks5h://${FRANKFURT_VPS_HOST}:${FRANKFURT_VPS_PORT}`;
    config.httpsAgent = new SocksProxyAgent(socksProxy);
    config.httpAgent = new SocksProxyAgent(socksProxy);
    console.log('✅ VPS Frankfurt ativo - contornando restrições geográficas!');
    return axios.create(config);
  } catch (error) {
    console.log('⚠️ VPS Frankfurt indisponível, usando fallback...');
  }

  // 🌐 OPÇÃO 3: CONEXÃO DIRETA (ÚLTIMO FALLBACK)
  console.log('🌐 Usando conexão DIRETA - sistema "never die" ativo');
  
  return axios.create(config);
};

export const http = createHttpClient();

http.interceptors.response.use(
  r => {
    // ✅ REGISTRA SUCESSO DE PROXY HTTP
    recordHttpProxySuccess();
    return r;
  },
  err => {
    // 🔍 DEBUG HTTP CLIENT - Verificar estrutura do erro
    console.log('🔍 DEBUG HTTP Error:', {
      code: err.code,
      message: err.message,
      responseStatus: err?.response?.status,
      errorType: typeof err,
      keys: Object.keys(err)
    });
    
    const code = err?.response?.status;
    
    // 🚨 DETECTA FALHAS DE CONECTIVIDADE DO PROXY - Múltiplas verificações
    const isConnectivityFailure = 
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.code === 'ENETUNREACH' ||
      err.code === 'EHOSTUNREACH' ||
      err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT' ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('ENOTFOUND') ||
      err.message?.includes('timeout') ||
      code === 503 ||
      code === 502;
    
    if (isConnectivityFailure) {
      recordHttpProxyFailure();
    }
    
    throw err;
  }
);