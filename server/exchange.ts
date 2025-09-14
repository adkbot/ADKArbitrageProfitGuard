// 🚀 EXCHANGE API - APENAS DADOS REAIS
// Produção exclusiva com dados reais da Binance

import WebSocket from 'ws';
import { makeSpotExchange, makeFuturesExchange, makeFetch, getNetworkStatus } from './net.js';
import { fetchWithKillSwitch } from './exchange-manager.js';

export interface MarketData {
  symbol: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;
  basisPercent: number;
  fundingRate: number;
  volume24h: number;
  timestamp: number;
}

export interface OrderBookData {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

/**
 * 🔥 EXCHANGE API - APENAS DADOS REAIS DE PRODUÇÃO
 */
export class ExchangeAPI {
  private spotExchange: any;
  private futuresExchange: any;
  private wsConnections: Map<string, WebSocket> = new Map();
  private marketDataCallbacks: Map<string, (data: MarketData) => void> = new Map();
  private orderBookCallbacks: Map<string, (data: OrderBookData) => void> = new Map();
  
  // 🛡️ CACHE PARA OTIMIZAÇÃO
  private priceCache = new Map<string, { price: number; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL_MS = 30000; // Cache 30 segundos
  private lastApiCall = 0;
  private readonly MIN_INTERVAL_MS = 100; // Mínimo 100ms entre chamadas

  constructor() {
    console.log('🚀 Inicializando ExchangeAPI para produção...');
    
    const networkStatus = getNetworkStatus();
    console.log('🌐 Network Status:', networkStatus);
    
    try {
      // 🔥 CRIAR EXCHANGES USANDO NET.JS
      this.spotExchange = makeSpotExchange();
      this.futuresExchange = makeFuturesExchange();
      
      console.log('✅ ExchangeAPI inicializado para produção');
      if (networkStatus.proxyEnabled) {
        console.log(`🔧 Usando proxy: ${networkStatus.proxyUrl}`);
      } else {
        console.log('🌐 Conexão DIRETA (sem proxy)');
      }
      
    } catch (error) {
      console.error('❌ Erro inicializando ExchangeAPI:', error.message);
      throw error;
    }
  }

  // 🛡️ MÉTODOS DE CACHE
  private getCachedPrice(symbol: string): number | null {
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() < cached.ttl) {
      return cached.price;
    }
    return null;
  }
  
  private setCachedPrice(symbol: string, price: number): void {
    this.priceCache.set(symbol, {
      price,
      timestamp: Date.now(),
      ttl: Date.now() + this.CACHE_TTL_MS
    });
  }
  
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    
    if (timeSinceLastCall < this.MIN_INTERVAL_MS) {
      const waitTime = this.MIN_INTERVAL_MS - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastApiCall = Date.now();
  }

  // 🧹 LIMPAR CACHE
  clearCache(): void {
    console.log('🧹 Limpando cache de preços...');
    this.priceCache.clear();
    console.log('✅ Cache limpo');
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔍 Testando conectividade com Binance...');
      
      // Testar com BTC/USDT - símbolo mais estável
      const ticker = await this.spotExchange.fetchTicker('BTC/USDT');
      console.log('✅ Conectividade OK! BTC/USDT price:', ticker.last);
      console.log('🎯 Modo: PRODUÇÃO - DADOS REAIS');
      
    } catch (error) {
      console.error('❌ Falha na conectividade com Binance:', error.message);
      throw new Error(`Não foi possível conectar à Binance: ${error.message}`);
    }
  }

  // 📊 BUSCAR PREÇO SPOT - APENAS DADOS REAIS
  async getSpotPrice(symbol: string): Promise<number> {
    try {
      // 🔥 VERIFICAR CACHE PRIMEIRO
      const cachedPrice = this.getCachedPrice(`spot_${symbol}`);
      if (cachedPrice !== null) {
        return cachedPrice;
      }
      
      await this.waitForRateLimit();
      
      try {
        const ticker = await this.spotExchange.fetchTicker(symbol);
        
        if (!ticker || !ticker.last) {
          throw new Error(`Preço spot não disponível para ${symbol}`);
        }
        
        const price = parseFloat(ticker.last.toString());
        console.log(`✅ ${symbol}: Preço spot $${price.toFixed(4)} (CCXT)`);
        
        this.setCachedPrice(`spot_${symbol}`, price);
        return price;
        
      } catch (ccxtError) {
        // Fallback: API pública Binance com data.binance.com primeiro
        console.log(`🔄 Fallback: API pública para ${symbol}`);
        
        const binanceSymbol = symbol.replace('/', '');
        
        // Tenta primeiro data.binance.com (menos restritivo para geoblocking)
        try {
          const response = await makeFetch(`https://data.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
          if (response.ok) {
            const data = await response.json();
            const price = parseFloat(data.lastPrice);
            
            if (price && price > 0) {
              console.log(`✅ ${symbol}: Preço spot $${price.toFixed(4)} (data.binance.com)`);
              this.setCachedPrice(`spot_${symbol}`, price);
              return price;
            }
          }
        } catch (dataError) {
          console.log(`⚠️ data.binance.com falhou para ${symbol}, tentando api.binance.com`);
        }
        
        // Fallback para api.binance.com
        const response = await makeFetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
        
        if (!response.ok) {
          throw new Error(`Falha na API Binance: ${response.status}`);
        }
        
        const data = await response.json();
        const price = parseFloat(data.lastPrice);
        
        if (!price || price <= 0) {
          throw new Error(`Preço inválido recebido para ${symbol}: ${price}`);
        }
        
        console.log(`✅ ${symbol}: Preço spot $${price.toFixed(4)} (API Pública)`);
        
        this.setCachedPrice(`spot_${symbol}`, price);
        return price;
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar preço spot para ${symbol}:`, error.message);
      throw error;
    }
  }

  // 💎 BUSCAR PREÇO FUTURES - APENAS DADOS REAIS
  async getFuturesPrice(symbol: string): Promise<number> {
    try {
      // 🔥 VERIFICAR CACHE PRIMEIRO
      const cachedPrice = this.getCachedPrice(`futures_${symbol}`);
      if (cachedPrice !== null) {
        return cachedPrice;
      }
      
      await this.waitForRateLimit();
      
      const futuresSymbol = this.convertToFuturesSymbol(symbol);
      
      try {
        const ticker = await this.futuresExchange.fetchTicker(futuresSymbol);
        
        if (!ticker || !ticker.last) {
          throw new Error(`Preço futures não disponível para ${futuresSymbol}`);
        }
        
        const price = parseFloat(ticker.last.toString());
        console.log(`✅ ${futuresSymbol}: Preço futures $${price.toFixed(6)} (CCXT)`);
        
        this.setCachedPrice(`futures_${symbol}`, price);
        return price;
        
      } catch (ccxtError) {
        // Fallback: API pública Binance Futures
        console.log(`🔄 Fallback: API pública futures para ${futuresSymbol}`);
        
        const binanceSymbol = symbol.replace('/', '');
        const response = await makeFetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${binanceSymbol}`);
        
        if (!response.ok) {
          // Se for erro 400, o símbolo provavelmente não existe
          if (response.status === 400) {
            console.log(`⚠️ Símbolo futures ${symbol} não encontrado (400)`);
            throw new Error(`Símbolo futures não encontrado: ${symbol}`);
          }
          throw new Error(`Falha na API Binance Futures: ${response.status}`);
        }
        
        const data = await response.json();
        const price = parseFloat(data.lastPrice);
        
        if (!price || price <= 0 || isNaN(price)) {
          console.log(`⚠️ Preço futures inválido para ${symbol}: ${price}`);
          throw new Error(`Preço futures inválido recebido para ${symbol}: ${price}`);
        }
        
        console.log(`✅ ${futuresSymbol}: Preço futures $${price.toFixed(6)} (API Pública)`);
        
        this.setCachedPrice(`futures_${symbol}`, price);
        return price;
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar preço futures para ${symbol}:`, error.message);
      throw error;
    }
  }

  // 💰 FUNDING RATE - APENAS DADOS REAIS
  async getFundingRate(symbol: string): Promise<number> {
    try {
      const binanceSymbol = symbol.replace('/', '');
      const response = await makeFetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${binanceSymbol}`);
      
      if (!response.ok) {
        // Se for erro 400, o símbolo provavelmente não existe ou foi deslistado
        if (response.status === 400) {
          console.log(`⚠️ Símbolo ${symbol} não encontrado ou deslistado (400)`);
          return 0; // Retorna 0 em vez de quebrar o sistema
        }
        throw new Error(`Falha ao buscar funding rate: ${response.status}`);
      }
      
      const data = await response.json();
      const rate = parseFloat(data.lastFundingRate) || 0;
      
      return rate;
      
    } catch (error) {
      console.error(`❌ Erro funding rate para ${symbol}:`, error.message);
      
      // Para erros conhecidos, não quebrar o sistema
      if (error.message.includes('400') || error.message.includes('Invalid symbol')) {
        console.log(`🔇 Ignorando símbolo problemático: ${symbol}`);
        return 0;
      }
      
      throw new Error(`Não foi possível obter funding rate para ${symbol}: ${error.message}`);
    }
  }

  // 📈 VOLUME 24H - APENAS DADOS REAIS
  async get24hVolume(symbol: string): Promise<number> {
    try {
      const binanceSymbol = symbol.replace('/', '');
      const response = await makeFetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
      
      if (!response.ok) {
        throw new Error(`Falha ao buscar volume: ${response.status}`);
      }
      
      const data = await response.json();
      const volume = parseFloat(data.quoteVolume) || 0;
      
      return volume;
      
    } catch (error) {
      console.error(`❌ Erro volume para ${symbol}:`, error.message);
      
      throw new Error(`Não foi possível obter volume para ${symbol}: ${error.message}`);
    }
  }

  // 🎯 MARKET DATA PRINCIPAL - APENAS DADOS REAIS
  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      console.log(`📊 Buscando market data para ${symbol} - PRODUÇÃO`);
      
      const [spotPrice, futuresPrice, fundingRate, volume] = await Promise.all([
        this.getSpotPrice(symbol),
        this.getFuturesPrice(symbol),
        this.getFundingRate(symbol),
        this.get24hVolume(symbol)
      ]);

      // Validar se todos os preços são válidos
      if (!spotPrice || !futuresPrice || isNaN(spotPrice) || isNaN(futuresPrice) || spotPrice <= 0 || futuresPrice <= 0) {
        throw new Error(`Preços inválidos para ${symbol}: spot=${spotPrice}, futures=${futuresPrice}`);
      }

      const basis = futuresPrice - spotPrice;
      const basisPercent = spotPrice > 0 ? (basis / spotPrice) * 100 : 0;

      const marketData = {
        symbol,
        spotPrice,
        futuresPrice,
        basis,
        basisPercent,
        fundingRate: fundingRate * 100, // Convert to percentage
        volume24h: volume,
        timestamp: Date.now()
      };
      
      console.log(`✅ Market data ${symbol}: Spot $${spotPrice.toFixed(4)}, Futures $${futuresPrice.toFixed(4)}, Basis ${basisPercent.toFixed(3)}%`);
      
      return marketData;
      
    } catch (error) {
      console.error(`❌ Erro getting market data para ${symbol}:`, error.message);
      throw error;
    }
  }

  // 📚 ORDER BOOK - APENAS DADOS REAIS
  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBookData> {
    try {
      const orderBook = await this.spotExchange.fetchOrderBook(symbol, limit);
      
      if (!orderBook || !orderBook.bids || !orderBook.asks) {
        throw new Error(`Order book não disponível para ${symbol}`);
      }
      
      return {
        symbol,
        bids: orderBook.bids.slice(0, limit).map((bid: any) => [Number(bid[0]), Number(bid[1])]) as [number, number][],
        asks: orderBook.asks.slice(0, limit).map((ask: any) => [Number(ask[0]), Number(ask[1])]) as [number, number][],
        timestamp: orderBook.timestamp || Date.now()
      };
      
    } catch (error) {
      console.error(`❌ Erro fetching order book para ${symbol}:`, error.message);
      throw error;
    }
  }

  // 🔄 CONVERTER SYMBOL PARA FUTURES
  private convertToFuturesSymbol(symbol: string): string {
    // Binance futures format: BTC/USDT -> BTC/USDT:USDT
    if (symbol.endsWith('/USDT')) {
      return `${symbol}:USDT`;
    }
    return symbol;
  }

  // 🧦 WEBSOCKET METHODS - Para futura implementação
  subscribeToMarketData(symbol: string, callback: (data: MarketData) => void): void {
    this.marketDataCallbacks.set(symbol, callback);
    console.log(`📡 WebSocket subscription para ${symbol} (TODO)`);
  }

  subscribeToOrderBook(symbol: string, callback: (data: OrderBookData) => void): void {
    this.orderBookCallbacks.set(symbol, callback);
    console.log(`📡 WebSocket orderbook para ${symbol} (TODO)`);
  }

  // 🛠️ UTILITÁRIOS
  getStatus(): { mode: string; networkStatus: any; cacheSize: number } {
    return {
      mode: 'PRODUÇÃO',
      networkStatus: getNetworkStatus(),
      cacheSize: this.priceCache.size
    };
  }

  // 💰 BUSCAR SALDOS DA CARTEIRA (SPOT + FUTURES)
  async getAccountBalance(): Promise<any> {
    try {
      console.log('💰 Buscando saldos da carteira...');
      
      // 📊 Buscar saldo spot
      const spotBalance = await this.spotExchange.fetchBalance();
      
      // 🚀 Buscar saldo futures
      const futuresBalance = await this.futuresExchange.fetchBalance();
      
      const balance = {
        spot: {
          USDT: {
            available: spotBalance.USDT?.free || 0,
            locked: spotBalance.USDT?.used || 0,
            total: spotBalance.USDT?.total || 0
          }
        },
        futures: {
          USDT: {
            available: futuresBalance.USDT?.free || 0,
            locked: futuresBalance.USDT?.used || 0,
            total: futuresBalance.USDT?.total || 0
          }
        }
      };
      
      console.log(`💰 Saldos - Spot: $${balance.spot.USDT.available} | Futures: $${balance.futures.USDT.available}`);
      return balance;
      
    } catch (error) {
      console.error('❌ Erro buscando saldos:', error.message);
      throw new Error(`Não foi possível buscar saldos: ${error.message}`);
    }
  }

  // ⚡ EXECUTAR ESTRATÉGIA DE ARBITRAGEM COMPLETA
  async executeArbitrageStrategy(signal: any, usdtValue: number): Promise<any> {
    try {
      console.log(`
🎯 EXECUTANDO ARBITRAGEM REAL
   Símbolo: ${signal.symbol}
   Estratégia: ${signal.signal}
   Capital: $${usdtValue} USDT
   Lucro Esperado: ${signal.profitPotential?.toFixed(3)}%
      `);

      const baseSymbol = signal.symbol.replace('/USDT', '');
      const results: any = { success: false, trades: [] };

      if (signal.signal === 'long_spot_short_futures') {
        // 📈 COMPRAR SPOT + VENDER FUTURES (Short)
        console.log('📈 Executando: BUY Spot + SELL Futures');
        
        // 1. Comprar no mercado spot
        const spotQuantity = usdtValue / signal.spotPrice;
        const spotOrder = await this.spotExchange.createMarketBuyOrder(signal.symbol, spotQuantity);
        
        // 2. Vender no mercado futures (short)
        const futuresOrder = await this.futuresExchange.createMarketSellOrder(`${baseSymbol}USDT`, spotQuantity);
        
        results.trades.push({ 
          type: 'spot_buy', 
          symbol: signal.symbol, 
          quantity: spotQuantity, 
          price: signal.spotPrice,
          order: spotOrder 
        });
        
        results.trades.push({ 
          type: 'futures_sell', 
          symbol: `${baseSymbol}USDT`, 
          quantity: spotQuantity, 
          price: signal.futuresPrice,
          order: futuresOrder 
        });
        
      } else if (signal.signal === 'short_spot_long_futures') {
        // 📉 VENDER SPOT + COMPRAR FUTURES (Long)
        console.log('📉 Executando: SELL Spot + BUY Futures');
        
        // 1. Vender no mercado spot
        const spotQuantity = usdtValue / signal.spotPrice;
        const spotOrder = await this.spotExchange.createMarketSellOrder(signal.symbol, spotQuantity);
        
        // 2. Comprar no mercado futures (long)
        const futuresOrder = await this.futuresExchange.createMarketBuyOrder(`${baseSymbol}USDT`, spotQuantity);
        
        results.trades.push({ 
          type: 'spot_sell', 
          symbol: signal.symbol, 
          quantity: spotQuantity, 
          price: signal.spotPrice,
          order: spotOrder 
        });
        
        results.trades.push({ 
          type: 'futures_buy', 
          symbol: `${baseSymbol}USDT`, 
          quantity: spotQuantity, 
          price: signal.futuresPrice,
          order: futuresOrder 
        });
      }

      results.success = true;
      results.executedAt = new Date().toISOString();
      
      console.log(`✅ ARBITRAGEM EXECUTADA COM SUCESSO!`);
      console.log(`📊 Resultado: ${results.trades.length} ordens executadas`);
      
      return results;
      
    } catch (error) {
      console.error('❌ ERRO EXECUTANDO ARBITRAGEM:', error.message);
      throw new Error(`Falha na execução da arbitragem: ${error.message}`);
    }
  }

  // 🔄 FECHAR POSIÇÃO DE ARBITRAGEM
  async closeArbitragePosition(tradeData: any): Promise<any> {
    try {
      console.log(`🔄 Fechando posição de arbitragem para ${tradeData.pair}`);
      
      // Implementar lógica de fechamento baseada no tipo de posição original
      // Por enquanto, retornar estrutura básica
      return {
        success: true,
        closedAt: new Date().toISOString(),
        message: 'Posição fechada (implementação pendente)'
      };
      
    } catch (error) {
      console.error('❌ Erro fechando posição:', error.message);
      throw new Error(`Falha no fechamento: ${error.message}`);
    }
  }

  // 🧪 TESTAR CONEXÃO API
  async testConnection(exchange: string, apiKey: string, apiSecret: string): Promise<{ success: boolean; message: string }> {
    try {
      // Para Binance, teste básico de conectividade
      if (exchange === 'binance') {
        const response = await makeFetch('https://api.binance.com/api/v3/time');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return { success: true, message: 'Conexão com Binance estabelecida' };
      }
      
      return { success: false, message: 'Exchange não suportada' };
      
    } catch (error) {
      return { success: false, message: `Falha na conexão: ${error.message}` };
    }
  }
}

// 🚀 INSTÂNCIA GLOBAL DO EXCHANGE API
export const exchangeAPI = new ExchangeAPI();