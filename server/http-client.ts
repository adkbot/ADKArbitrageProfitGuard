// 🚨 HTTP CLIENT COM KILL-SWITCH AUTOMÁTICO PARA BLOQUEIO GEOGRÁFICO
import axios from "axios";
import { HttpsProxyAgent } from 'https-proxy-agent';

// 🌐 CRIAR AXIOS COM PROXY CONDICIONAL
const createHttpClient = () => {
  const config = { timeout: 7000 };
  
  // 🔧 APLICAR PROXY SE DISPONÍVEL
  const { PROXY_URL } = process.env;
  if (PROXY_URL && PROXY_URL.trim() !== '') {
    try {
      console.log('🔧 Configurando axios com proxy...');
      config.httpsAgent = new HttpsProxyAgent(PROXY_URL);
      config.httpAgent = new HttpsProxyAgent(PROXY_URL);
    } catch (error) {
      console.error('❌ Erro configurando proxy:', error.message);
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