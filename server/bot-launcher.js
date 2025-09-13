// 🚀 BOT LAUNCHER OTIMIZADO - BASEADO NAS SUGESTÕES DO USUÁRIO
import { http } from "./http-client.js";
import { getSpotExchange, getFuturesExchange } from "./exchange-manager.js";

export class BotLauncher {
  
  // 📡 FETCH DIRETO VIA AXIOS COM KILL-SWITCH AUTOMÁTICO
  static async fetchBinanceData(endpoint) {
    try {
      console.log(`🌐 Fetch Binance: ${endpoint}`);
      const response = await http.get(endpoint);
      return response.data;
    } catch (error) {
      console.error(`❌ Erro Binance fetch: ${error.message}`);
      
      // 🚨 Verificar se kill-switch foi ativado
      if (process.env.ARBITRAGE_ENABLED === "false") {
        console.error("🚨 Bot parado pelo kill-switch!");
        return null;
      }
      
      throw error;
    }
  }
  
  // 📊 EXEMPLO DE USO DIRETO DO AXIOS
  static async getFundingRate(symbol) {
    const url = `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`;
    const data = await this.fetchBinanceData(url);
    return data;
  }
  
  // 📈 EXEMPLO DE PREÇO SPOT
  static async getSpotPrice(symbol) {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    const data = await this.fetchBinanceData(url);
    return data;
  }
  
  // 🔄 VERIFICAR STATUS DO BOT
  static isActive() {
    return process.env.ARBITRAGE_ENABLED !== "false";
  }
  
  // 🚀 INICIALIZAR EXCHANGES
  static async initializeExchanges() {
    try {
      const spot = await getSpotExchange();
      const futures = await getFuturesExchange();
      console.log("✅ Exchanges inicializados com sucesso");
      return { spot, futures };
    } catch (error) {
      console.error("❌ Erro inicializando exchanges:", error.message);
      return null;
    }
  }
}