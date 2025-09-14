// 🚨 HTTP CLIENT COM KILL-SWITCH AUTOMÁTICO PARA BLOQUEIO GEOGRÁFICO
import axios, { AxiosRequestConfig } from "axios";
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// 🌐 CRIAR AXIOS COM PROXY CONDICIONAL E HEADERS OTIMIZADOS
const createHttpClient = () => {
  const config: AxiosRequestConfig = { 
    timeout: 7000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  };
  
  // 🔧 APLICAR PROXY SE DISPONÍVEL
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
    }
  } else if (PROXY_URL && PROXY_URL.trim() !== '') {
    try {
      console.log('🔧 Configurando axios com HTTP proxy...');
      config.httpsAgent = new HttpsProxyAgent(PROXY_URL);
      config.httpAgent = new HttpsProxyAgent(PROXY_URL);
    } catch (error) {
      console.error('❌ Erro configurando HTTP proxy:', (error as Error).message);
    }
  } else {
    console.log('🌐 Axios configurado para conexão DIRETA');
  }
  
  return axios.create(config);
};

export const http = createHttpClient();

http.interceptors.response.use(
  r => r,
  err => {
    const code = err?.response?.status;
    if (code === 451 || code === 403) {
      console.error("[NET] Bloqueio geográfico detectado (", code, "). Pare o bot ou troque de região (VPS/WireGuard).");
      // 🚨 KILL-SWITCH AUTOMÁTICO - Desativa arbitragem quando detecta bloqueio
      process.env.ARBITRAGE_ENABLED = "false";
      console.error("🚨 SISTEMA DESATIVADO AUTOMATICAMENTE - Bloqueio geográfico detectado!");
    }
    return Promise.reject(err);
  }
);