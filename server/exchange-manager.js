// 🚀 EXCHANGE MANAGER SINGLETON COM CACHE E RECONEXÃO AUTOMÁTICA
import { makeSpotExchange, makeFuturesExchange } from "./net.js";
import { http } from "./http-client.js";

let spotExchange;
let futuresExchange;

export async function getSpotExchange() {
  if (!spotExchange) {
    console.log('🔄 Inicializando Spot Exchange...');
    spotExchange = makeSpotExchange();
    await spotExchange.loadMarkets();
    console.log('✅ Spot Exchange inicializado');
  }
  return spotExchange;
}

export async function getFuturesExchange() {
  if (!futuresExchange) {
    console.log('🔄 Inicializando Futures Exchange...');
    futuresExchange = makeFuturesExchange();
    await futuresExchange.loadMarkets();
    console.log('✅ Futures Exchange inicializado');
  }
  return futuresExchange;
}

// 🚨 FUNÇÃO DIRETA PARA CHAMADAS VIA AXIOS COM KILL-SWITCH
export async function fetchWithKillSwitch(url) {
  try {
    console.log(`🌐 Fetch direto: ${url.substring(0, 60)}...`);
    const response = await http.get(url);
    return response.data;
  } catch (error) {
    console.error(`❌ Erro no fetch: ${error.message}`);
    throw error;
  }
}

// 🔄 RESETAR EXCHANGES EM CASO DE ERRO
export function resetExchanges() {
  console.log('🔄 Resetando exchanges...');
  spotExchange = null;
  futuresExchange = null;
}