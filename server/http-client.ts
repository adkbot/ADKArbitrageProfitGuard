// 🚨 HTTP CLIENT COM KILL-SWITCH AUTOMÁTICO PARA BLOQUEIO GEOGRÁFICO
import axios, { AxiosRequestConfig } from "axios";
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// 🛡️ SISTEMA ANTI-FALHAS - Circuit Breaker para HTTP client
let httpProxyFailureCount = 0;
let httpProxyDisabledUntil = 0;
let lastHttpProxyTest = 0;
const MAX_HTTP_PROXY_FAILURES = 3;
const HTTP_PROXY_DISABLE_TIME = 2 * 60 * 1000; // 2 minutos
const HTTP_PROXY_TEST_INTERVAL = 5 * 60 * 1000; // 5 minutos

/**
 * 🚨 REGISTRA FALHA DE PROXY - Circuit Breaker HTTP
 */
function recordHttpProxyFailure() {
  httpProxyFailureCount++;
  console.log(`⚠️ HTTP Proxy failure #${httpProxyFailureCount}/${MAX_HTTP_PROXY_FAILURES}`);
  
  if (httpProxyFailureCount >= MAX_HTTP_PROXY_FAILURES) {
    httpProxyDisabledUntil = Date.now() + HTTP_PROXY_DISABLE_TIME;
    console.log(`🚨 HTTP PROXY DESABILITADO por ${HTTP_PROXY_DISABLE_TIME/1000}s - usando conexão DIRETA`);
  }
}

/**
 * 🎯 REGISTRA SUCESSO DE PROXY - Reseta circuit breaker HTTP
 */
function recordHttpProxySuccess() {
  if (httpProxyFailureCount > 0) {
    console.log('✅ HTTP Proxy funcionando - circuit breaker resetado!');
    httpProxyFailureCount = 0;
    httpProxyDisabledUntil = 0;
  }
}

// 🌐 CRIAR AXIOS COM PROXY RESILIENTE E HEADERS OTIMIZADOS
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
  
  // 🚨 EMERGÊNCIA: FORÇA CONEXÃO DIRETA - HARDCODED NUNCA DIE!
  console.log('🔥 HTTP Client: EMERGÊNCIA ATIVA - usando apenas conexão DIRETA!');
  return axios.create(config);
  
  const now = Date.now();
  
  // 🛡️ CIRCUIT BREAKER - Verifica se proxy está temporariamente desabilitado
  if (httpProxyDisabledUntil > now) {
    const remainingTime = Math.ceil((httpProxyDisabledUntil - now) / 1000);
    console.log(`🚨 HTTP Proxy desabilitado por circuit breaker (${remainingTime}s restantes)`);
    return axios.create(config);
  }
  
  // 🚀 PROXY RESILIENTE - usando VPS com fallback
  const { PROXY_URL, PROXY_SOCKS5_HOST, PROXY_SOCKS5_PORT } = process.env;
  
  // Prioridade: SOCKS5 primeiro, depois HTTP proxy
  if (PROXY_SOCKS5_HOST && PROXY_SOCKS5_PORT) {
    try {
      // Use socks5h:// para resolver DNS através do proxy
      const socksProxy = `socks5h://${PROXY_SOCKS5_HOST}:${PROXY_SOCKS5_PORT}`;
      console.log(`🔧 Configurando axios com SOCKS5 proxy (DNS via proxy): ${PROXY_SOCKS5_HOST}:${PROXY_SOCKS5_PORT}`);
      config.httpsAgent = new SocksProxyAgent(socksProxy);
      config.httpAgent = new SocksProxyAgent(socksProxy);
    } catch (error) {
      console.error('❌ Erro configurando SOCKS5 proxy:', (error as Error).message);
      recordHttpProxyFailure();
    }
  } else if (PROXY_URL && PROXY_URL.trim() !== '') {
    try {
      console.log('🔧 Configurando axios com HTTP proxy...');
      config.httpsAgent = new HttpsProxyAgent(PROXY_URL);
      config.httpAgent = new HttpsProxyAgent(PROXY_URL);
    } catch (error) {
      console.error('❌ Erro configurando HTTP proxy:', (error as Error).message);
      recordHttpProxyFailure();
    }
  } else {
    console.log('🌐 Axios configurado para conexão DIRETA');
  }
  
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
    const isConnectionError = err.code === 'ECONNREFUSED' || 
                             err.code === 'ECONNRESET' || 
                             err.code === 'ETIMEDOUT' ||
                             err.message?.includes('ECONNREFUSED') ||
                             err.message?.includes('connect ECONNREFUSED');
    
    if (isConnectionError) {
      console.log('🚨 HTTP Client: Detectada falha de conectividade do proxy - ATIVANDO HTTP CIRCUIT BREAKER');
      recordHttpProxyFailure();
    }
    
    // 🛡️ BLOQUEIO GEOGRÁFICO - Só desativa se não conseguir contornar
    if (code === 451 || code === 403) {
      console.error("[NET] Bloqueio geográfico detectado (", code, "). Sistema continua usando fallbacks...");
      
      // 🚨 SÓ DESATIVA SE NÃO TEM PROXY FUNCIONAL
      const hasWorkingProxy = httpProxyDisabledUntil <= Date.now();
      if (!hasWorkingProxy) {
        process.env.ARBITRAGE_ENABLED = "false";
        console.error("🚨 SISTEMA DESATIVADO - Sem proxy funcional para contornar bloqueio!");
      } else {
        console.log("✅ Sistema continua usando conexão alternativa...");
      }
    }
    return Promise.reject(err);
  }
);