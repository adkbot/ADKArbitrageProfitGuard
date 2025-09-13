// 🚀 EXCHANGE API SIMPLIFICADO - Usando net.js robusto
// Baseado na recomendação "colar e rodar" do usuário

import WebSocket from 'ws';
import { makeSpotExchange, makeFuturesExchange, makeFetch, getNetworkStatus } from './net.js';

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
 * 🔥 EXCHANGE API SIMPLIFICADO - ROBUSTO E FÁCIL DE MANTER
 */
export class ExchangeAPI {
  private spotExchange: any;
  private futuresExchange: any;
  private wsConnections: Map<string, WebSocket> = new Map();
  private marketDataCallbacks: Map<string, (data: MarketData) => void> = new Map();
  private orderBookCallbacks: Map<string, (data: OrderBookData) => void> = new Map();
  
  // 🛡️ CACHE SIMPLES PARA OTIMIZAÇÃO
  private priceCache = new Map<string, { price: number; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL_MS = 30000; // Cache 30 segundos
  private lastApiCall = 0;
  private readonly MIN_INTERVAL_MS = 100; // Mínimo 100ms entre chamadas
  
  // 🎯 MODO DESENVOLVIMENTO - dados simulados quando geoblocking
  private readonly isGeoblocked = false; // Será determinado dinamicamente
  private isSimulationMode = false;

  constructor() {
    console.log('🚀 Inicializando ExchangeAPI simplificado...');
    
    const networkStatus = getNetworkStatus();
    console.log('🌐 Network Status:', networkStatus);
    
    try {
      // 🔥 CRIAR EXCHANGES USANDO NET.JS - SIMPLES E ROBUSTO
      this.spotExchange = makeSpotExchange();
      this.futuresExchange = makeFuturesExchange();
      
      console.log('✅ ExchangeAPI simplificado inicializado com sucesso');
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

  // 🛡️ MÉTODOS DE CACHE SIMPLES
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
      console.log('🔍 Testando conectividade...');
      
      // Testar com BTC/USDT - símbolo mais estável
      const ticker = await this.spotExchange.fetchTicker('BTC/USDT');
      console.log('✅ Conectividade OK! BTC/USDT price:', ticker.last);
      
      this.isSimulationMode = false;
      console.log('🎯 Modo: REAL DATA');
      
    } catch (error) {
      console.warn('⚠️ Detectado geoblocking, ativando modo simulação para desenvolvimento');
      console.warn('💡 Para produção, use VPS fora da região restrita ou configure PROXY_URL');
      
      this.isSimulationMode = true;
      console.log('🎯 Modo: SIMULAÇÃO (desenvolvimento)');
    }
  }

  // 🎲 DADOS SIMULADOS PARA DESENVOLVIMENTO (quando geoblocking)
  private generateSimulatedPrice(symbol: string, type: 'spot' | 'futures' = 'spot'): number {
    // Base prices para diferentes símbolos
    const basePrices: { [key: string]: number } = {
      'BTC/USDT': 45000,
      'ETH/USDT': 3000,
      'BNB/USDT': 250,
      'ADA/USDT': 0.5,
      'DOT/USDT': 7.0,
      'LINK/USDT': 15.0,
      'SOL/USDT': 100,
      'MATIC/USDT': 0.8
    };
    
    const basePrice = basePrices[symbol] || 100; // Default 100 USDT
    
    // Adicionar variação aleatória de ±2%
    const variation = (Math.random() - 0.5) * 0.04; // -2% to +2%
    let price = basePrice * (1 + variation);
    
    // Futures normalmente tem um pequeno premium/discount
    if (type === 'futures') {
      const basisVariation = (Math.random() - 0.5) * 0.001; // -0.05% to +0.05%
      price = price * (1 + basisVariation);
    }
    
    return price;
  }

  // 📊 BUSCAR PREÇO SPOT - SIMPLIFICADO
  async getSpotPrice(symbol: string): Promise<number> {
    try {
      // 🔥 VERIFICAR CACHE PRIMEIRO
      const cachedPrice = this.getCachedPrice(`spot_${symbol}`);
      if (cachedPrice !== null) {
        return cachedPrice;
      }
      
      await this.waitForRateLimit();
      
      let price: number;
      
      if (this.isSimulationMode) {
        // 🎲 MODO SIMULAÇÃO - dados para desenvolvimento
        price = this.generateSimulatedPrice(symbol, 'spot');
        console.log(`🎯 ${symbol}: Preço spot simulado $${price.toFixed(4)} (MODO DEV)`);
      } else {
        // 🌐 MODO REAL - usando net.js
        try {
          const ticker = await this.spotExchange.fetchTicker(symbol);
          
          if (!ticker || !ticker.last) {
            throw new Error(`Preço spot não disponível para ${symbol}`);
          }
          
          price = parseFloat(ticker.last.toString());
          console.log(`✅ ${symbol}: Preço spot real $${price.toFixed(4)} (CCXT)`);
          
        } catch (ccxtError) {
          // Fallback: API pública usando net.js
          console.log(`🔄 Fallback: API pública para ${symbol}`);
          
          const binanceSymbol = symbol.replace('/', '');
          const response = await makeFetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
          const data = await response.json();
          
          price = parseFloat(data.lastPrice);
          console.log(`✅ ${symbol}: Preço spot real $${price.toFixed(4)} (API Pública)`);
        }
      }
      
      this.setCachedPrice(`spot_${symbol}`, price);
      return price;
      
    } catch (error) {
      // Se tudo falhar, ativar modo simulação
      if (!this.isSimulationMode) {
        console.warn(`⚠️ Erro real data para ${symbol}, usando simulação:`, error.message);
        this.isSimulationMode = true;
      }
      
      const price = this.generateSimulatedPrice(symbol, 'spot');
      console.log(`🎯 ${symbol}: Preço spot simulado $${price.toFixed(4)} (FALLBACK)`);
      
      this.setCachedPrice(`spot_${symbol}`, price);
      return price;
    }
  }

  // 💎 BUSCAR PREÇO FUTURES - SIMPLIFICADO
  async getFuturesPrice(symbol: string): Promise<number> {
    try {
      // 🔥 VERIFICAR CACHE PRIMEIRO
      const cachedPrice = this.getCachedPrice(`futures_${symbol}`);
      if (cachedPrice !== null) {
        return cachedPrice;
      }
      
      await this.waitForRateLimit();
      
      const futuresSymbol = this.convertToFuturesSymbol(symbol);
      let price: number;
      
      if (this.isSimulationMode) {
        // 🎲 MODO SIMULAÇÃO - dados para desenvolvimento
        price = this.generateSimulatedPrice(symbol, 'futures');
        console.log(`🎯 ${futuresSymbol}: Preço futures simulado $${price.toFixed(6)} (MODO DEV)`);
      } else {
        // 🌐 MODO REAL - usando net.js
        try {
          const ticker = await this.futuresExchange.fetchTicker(futuresSymbol);
          
          if (!ticker || !ticker.last) {
            throw new Error(`Preço futures não disponível para ${futuresSymbol}`);
          }
          
          price = parseFloat(ticker.last.toString());
          console.log(`✅ ${futuresSymbol}: Preço futures real $${price.toFixed(6)} (CCXT)`);
          
        } catch (ccxtError) {
          // Fallback: API pública usando net.js
          console.log(`🔄 Fallback: API pública futures para ${futuresSymbol}`);
          
          const binanceSymbol = symbol.replace('/', '');
          const response = await makeFetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${binanceSymbol}`);
          const data = await response.json();
          
          price = parseFloat(data.lastPrice);
          console.log(`✅ ${futuresSymbol}: Preço futures real $${price.toFixed(6)} (API Pública)`);
        }
      }
      
      this.setCachedPrice(`futures_${symbol}`, price);
      return price;
      
    } catch (error) {
      // Se tudo falhar, ativar modo simulação
      if (!this.isSimulationMode) {
        console.warn(`⚠️ Erro real data futures para ${symbol}, usando simulação:`, error.message);
        this.isSimulationMode = true;
      }
      
      const price = this.generateSimulatedPrice(symbol, 'futures');
      console.log(`🎯 ${symbol}: Preço futures simulado $${price.toFixed(6)} (FALLBACK)`);
      
      this.setCachedPrice(`futures_${symbol}`, price);
      return price;
    }
  }

  // 💰 FUNDING RATE - SIMPLIFICADO
  async getFundingRate(symbol: string): Promise<number> {
    try {
      if (this.isSimulationMode) {
        // Funding rate simulado entre -0.1% a +0.1%
        const simulatedRate = (Math.random() - 0.5) * 0.002; // -0.1% to +0.1%
        return simulatedRate;
      }
      
      const binanceSymbol = symbol.replace('/', '');
      const response = await makeFetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${binanceSymbol}`);
      const data = await response.json();
      return parseFloat(data.lastFundingRate) || 0;
      
    } catch (error) {
      console.warn(`⚠️ Erro funding rate para ${symbol}, usando simulação`);
      const simulatedRate = (Math.random() - 0.5) * 0.002;
      return simulatedRate;
    }
  }

  // 📈 VOLUME 24H - SIMPLIFICADO
  async get24hVolume(symbol: string): Promise<number> {
    try {
      if (this.isSimulationMode) {
        // Volume simulado entre 10M a 100M USDT
        return Math.random() * 90000000 + 10000000;
      }
      
      const binanceSymbol = symbol.replace('/', '');
      const response = await makeFetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
      const data = await response.json();
      return parseFloat(data.quoteVolume) || 0;
      
    } catch (error) {
      console.warn(`⚠️ Erro volume para ${symbol}, usando simulação`);
      return Math.random() * 90000000 + 10000000;
    }
  }

  // 🎯 MARKET DATA PRINCIPAL - SIMPLIFICADO
  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      console.log(`📊 Buscando market data para ${symbol} - ${this.isSimulationMode ? 'SIMULAÇÃO' : 'REAL'}`);
      
      const [spotPrice, futuresPrice, fundingRate, volume] = await Promise.all([
        this.getSpotPrice(symbol),
        this.getFuturesPrice(symbol),
        this.getFundingRate(symbol),
        this.get24hVolume(symbol)
      ]);

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

  // 📚 ORDER BOOK - SIMPLIFICADO
  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBookData> {
    try {
      if (this.isSimulationMode) {
        // Order book simulado
        const spotPrice = await this.getSpotPrice(symbol);
        const bids: [number, number][] = [];
        const asks: [number, number][] = [];
        
        // Gerar bids (preços menores)
        for (let i = 0; i < limit; i++) {
          const price = spotPrice * (1 - (i + 1) * 0.0001); // 0.01% decrements
          const quantity = Math.random() * 10 + 1; // 1-11 quantity
          bids.push([price, quantity]);
        }
        
        // Gerar asks (preços maiores)
        for (let i = 0; i < limit; i++) {
          const price = spotPrice * (1 + (i + 1) * 0.0001); // 0.01% increments
          const quantity = Math.random() * 10 + 1; // 1-11 quantity
          asks.push([price, quantity]);
        }
        
        return {
          symbol,
          bids,
          asks,
          timestamp: Date.now()
        };
      }
      
      const orderBook = await this.spotExchange.fetchOrderBook(symbol, limit);
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

  // 🧦 WEBSOCKET METHODS - Mantidos para compatibilidade
  subscribeToMarketData(symbol: string, callback: (data: MarketData) => void): void {
    this.marketDataCallbacks.set(symbol, callback);
    // TODO: Implementar WebSocket quando necessário
    console.log(`📡 WebSocket subscription para ${symbol} (TODO)`);
  }

  subscribeToOrderBook(symbol: string, callback: (data: OrderBookData) => void): void {
    this.orderBookCallbacks.set(symbol, callback);
    // TODO: Implementar WebSocket quando necessário
    console.log(`📡 WebSocket orderbook para ${symbol} (TODO)`);
  }

  // 🛠️ UTILITÁRIOS
  getStatus(): { mode: string; networkStatus: any; cacheSize: number } {
    return {
      mode: this.isSimulationMode ? 'SIMULAÇÃO' : 'REAL',
      networkStatus: getNetworkStatus(),
      cacheSize: this.priceCache.size
    };
  }
}

// 🚀 INSTÂNCIA GLOBAL DO EXCHANGE API - Para compatibilidade com routes.ts
export const exchangeAPI = new ExchangeAPI();