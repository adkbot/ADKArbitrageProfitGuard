import axios, { type AxiosRequestConfig } from 'axios';
// @ts-ignore
import { makeAgent, setGeoBlocked } from './net.js';

// 🌐 CRIAR CLIENTE HTTP INTELIGENTE
function getHttpClient() {
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
  
  // 🧠 USA SISTEMA INTELIGENTE DE PROXY
  const agent = makeAgent();
  if (agent) {
    config.httpsAgent = agent;
    config.httpAgent = agent;
  }
  
  return axios.create(config);
}

// 🌐 HTTP CLIENT INTELIGENTE COM DETECÇÃO GEO-BLOQUEIO
export const http = (() => {
  const client = getHttpClient();
  
  client.interceptors.response.use(
    response => response,
    error => {
      const code = error?.response?.status;
      
      // 🌍 DETECTA GEO-BLOQUEIO (HTTP 451/403)
      if (code === 451 || code === 403) {
        const url = error.config?.url || '';
        if (url.includes('binance.com')) {
          console.log(`🚨 Geo-bloqueio detectado: HTTP ${code} para ${url}`);
          setGeoBlocked();
        }
      }
      
      throw error;
    }
  );
  
  return client;
})();