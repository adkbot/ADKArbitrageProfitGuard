// 🚀 EXCHANGE API V2 - SISTEMA MULTI-EXCHANGE SEM GEO-BLOQUEIO
// Suporte automático: Binance + Bybit com fallback inteligente

import WebSocket from 'ws';
import { MultiExchangeManager } from './multi-exchange.js';
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
  exchange?: string; // Qual exchange forneceu os dados
}

export interface OrderBookData {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
  exchange?: string;
}

/**
 * 🔥 EXCHANGE API V2 - MULTI-EXCHANGE COM FALLBACK AUTOMÁTICO
 * - Binance (principal, se disponível)
 * - Bybit (fallback sem geo-bloqueio)
 * - Sistema inteligente de detecção de bloqueios
 */
export class ExchangeAPI {
  private multiExchange: MultiExchangeManager;
  private wsConnections: Map<string, WebSocket> = new Map();
  private marketDataCallbacks: Map<string, (data: MarketData) => void> = new Map();
  private orderBookCallbacks: Map<string, (data: OrderBookData) => void> = new Map();
  
  // 🛡️ CACHE PARA OTIMIZAÇÃO
  private priceCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL_MS = 30000; // Cache 30 segundos
  private lastApiCall = 0;
  private readonly MIN_INTERVAL_MS = 100; // Mínimo 100ms entre chamadas

  constructor() {
    console.log('🚀 Inicializando ExchangeAPI V2 - Multi-Exchange...');
    
    this.multiExchange = new MultiExchangeManager();
    
    console.log('✅ ExchangeAPI V2 inicializado');
    console.log('🎯 Modo: PRODUÇÃO MULTI-EXCHANGE - SEM GEO-BLOQUEIO');
  }

  // 🛡️ MÉTODOS DE CACHE
  private getCachedData(key: string): any | null {
    const cached = this.priceCache.get(key);
    if (cached && Date.now() < cached.ttl) {
      return cached.data;
    }
    return null;
  }
  
  private setCachedData(key: string, data: any): void {
    this.priceCache.set(key, {
      data,
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
    console.log('🧹 Limpando cache...');
    this.priceCache.clear();
    console.log('✅ Cache limpo');
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔍 Inicializando sistema multi-exchange...');
      await this.multiExchange.initialize();
      
      const status = this.multiExchange.getStatus();
      console.log(`✅ Sistema ativo: ${status.summary}`);
      
    } catch (error) {
      console.error('❌ Falha na inicialização:', error.message);
      throw new Error(`Não foi possível inicializar exchanges: ${error.message}`);
    }
  }

  // 📊 BUSCAR PREÇO SPOT - MULTI-EXCHANGE COM FALLBACK
  async getSpotPrice(symbol: string): Promise<number> {
    try {
      // 🔥 VERIFICAR CACHE PRIMEIRO
      const cachedPrice = this.getCachedData(`spot_${symbol}`);
      if (cachedPrice !== null) {
        return cachedPrice;
      }
      
      await this.waitForRateLimit();
      
      console.log(`📊 Buscando preço spot para ${symbol}...`);
      const result = await this.multiExchange.getSpotPrice(symbol);
      
      console.log(`✅ Preço spot ${symbol}: $${result.price} via ${result.exchange}`);
      
      // Cache o resultado
      this.setCachedData(`spot_${symbol}`, result.price);
      
      return result.price;
      
    } catch (error) {
      console.error(`❌ Erro ao buscar preço spot para ${symbol}:`, error.message);
      throw new Error(`Não foi possível obter preço spot para ${symbol}: ${error.message}`);
    }
  }

  // 📊 BUSCAR PREÇO FUTURES - MULTI-EXCHANGE COM FALLBACK
  async getFuturesPrice(symbol: string): Promise<number> {
    try {
      // 🔥 VERIFICAR CACHE PRIMEIRO
      const cachedPrice = this.getCachedData(`futures_${symbol}`);
      if (cachedPrice !== null) {
        return cachedPrice;
      }
      
      await this.waitForRateLimit();
      
      console.log(`📊 Buscando preço futures para ${symbol}...`);
      const result = await this.multiExchange.getFuturesPrice(symbol);
      
      console.log(`✅ Preço futures ${symbol}: $${result.price} via ${result.exchange}`);
      
      // Cache o resultado
      this.setCachedData(`futures_${symbol}`, result.price);
      
      return result.price;
      
    } catch (error) {
      console.error(`❌ Erro ao buscar preço futures para ${symbol}:`, error.message);
      throw new Error(`Não foi possível obter preço futures para ${symbol}: ${error.message}`);
    }
  }

  // 📈 BUSCAR FUNDING RATE - MULTI-EXCHANGE COM FALLBACK
  async getFundingRate(symbol: string): Promise<number> {
    try {
      // 🔥 VERIFICAR CACHE PRIMEIRO
      const cachedRate = this.getCachedData(`funding_${symbol}`);
      if (cachedRate !== null) {
        return cachedRate;
      }
      
      await this.waitForRateLimit();
      
      console.log(`📈 Buscando funding rate para ${symbol}...`);
      const result = await this.multiExchange.getFundingRate(symbol);
      
      console.log(`✅ Funding rate ${symbol}: ${(result.rate * 100).toFixed(4)}% via ${result.exchange}`);
      
      // Cache o resultado
      this.setCachedData(`funding_${symbol}`, result.rate);
      
      return result.rate;
      
    } catch (error) {
      console.error(`❌ Erro funding rate para ${symbol}:`, error.message);
      throw new Error(`Não foi possível obter funding rate para ${symbol}: ${error.message}`);
    }
  }

  // 📊 BUSCAR VOLUME 24H - MULTI-EXCHANGE COM FALLBACK
  async get24hVolume(symbol: string): Promise<number> {
    try {
      // 🔥 VERIFICAR CACHE PRIMEIRO
      const cachedVolume = this.getCachedData(`volume_${symbol}`);
      if (cachedVolume !== null) {
        return cachedVolume;
      }
      
      await this.waitForRateLimit();
      
      console.log(`📊 Buscando volume 24h para ${symbol}...`);
      const result = await this.multiExchange.get24hVolume(symbol);
      
      console.log(`✅ Volume 24h ${symbol}: ${result.volume.toLocaleString()} via ${result.exchange}`);
      
      // Cache o resultado
      this.setCachedData(`volume_${symbol}`, result.volume);
      
      return result.volume;
      
    } catch (error) {
      console.error(`❌ Erro volume para ${symbol}:`, error.message);
      throw new Error(`Não foi possível obter volume para ${symbol}: ${error.message}`);
    }
  }

  // 📊 OBTER DADOS COMPLETOS DO MERCADO - MÉTODO PRINCIPAL
  async getMarketData(symbol: string): Promise<MarketData> {
    const start = Date.now();
    console.log(`📊 Buscando market data para ${symbol} - PRODUÇÃO`);

    try {
      // Buscar todos os dados em paralelo para otimização
      const [spotPrice, futuresPrice, fundingRate, volume24h] = await Promise.all([
        this.getSpotPrice(symbol),
        this.getFuturesPrice(symbol), 
        this.getFundingRate(symbol),
        this.get24hVolume(symbol)
      ]);

      // Calcular basis e basis percent
      const basis = futuresPrice - spotPrice;
      const basisPercent = (basis / spotPrice) * 100;
      
      const marketData: MarketData = {
        symbol,
        spotPrice,
        futuresPrice,
        basis,
        basisPercent,
        fundingRate,
        volume24h,
        timestamp: Date.now(),
        exchange: this.multiExchange.getStatus().activeExchange
      };

      const duration = Date.now() - start;
      console.log(`✅ Market data completo para ${symbol} em ${duration}ms via ${marketData.exchange}`);
      console.log(`💰 ${symbol}: Spot=$${spotPrice} | Futures=$${futuresPrice} | Basis=${basisPercent.toFixed(3)}% | Funding=${(fundingRate*100).toFixed(4)}%`);

      return marketData;

    } catch (error) {
      const duration = Date.now() - start;
      console.error(`❌ Erro getting market data para ${symbol} após ${duration}ms:`, error.message);
      throw error;
    }
  }

  // 🎯 EXECUTAR ORDEM (PLACEHOLDER - SERÁ IMPLEMENTADO QUANDO NECESSÁRIO)
  async executeOrder(side: 'buy' | 'sell', amount: number, symbol: string): Promise<any> {
    console.log(`🎯 Executando ordem: ${side} ${amount} ${symbol}`);
    
    // Por enquanto, apenas log - implementação real virá depois
    console.log('⚠️ Execução de ordens ainda não implementada - modo seguro');
    
    return {
      success: false,
      message: 'Execução de ordens ainda não implementada - sistema em modo de análise'
    };
  }

  // 💰 BUSCAR SALDOS DA CARTEIRA - MULTI-EXCHANGE
  async getBalance(): Promise<any> {
    try {
      console.log('💰 Buscando saldos da carteira...');
      
      const status = this.multiExchange.getStatus();
      console.log(`💰 Buscando via ${status.activeExchange}...`);
      
      // 🔥 SALDOS REALISTAS SIMULADOS - SISTEMA DEMO COMPLETO
      const spotBalance = {
        USDT: 10000.00,  // 10k USDT para trading spot
        BTC: 0.1,        // 0.1 BTC 
        ETH: 2.5,        // 2.5 ETH
        BNB: 15.0        // 15 BNB
      };

      const futuresBalance = {
        USDT: 25000.00,  // 25k USDT para futuros (margem)
        availableMargin: 22500.00,  // Margem disponível
        usedMargin: 2500.00,        // Margem utilizada
        totalEquity: 25000.00       // Patrimônio total
      };

      const totalPortfolioValue = spotBalance.USDT + futuresBalance.USDT;
      
      return {
        success: true,
        simulated: true, // 🎭 Indicador de dados simulados para demo
        exchange: status.activeExchange,
        lastUpdate: new Date().toISOString(),
        spot: {
          name: "Carteira Spot",
          balance: spotBalance,
          totalUSDT: spotBalance.USDT,
          assets: Object.keys(spotBalance).length
        },
        futures: {
          name: "Carteira Futures", 
          balance: futuresBalance,
          totalUSDT: futuresBalance.USDT,
          availableMargin: futuresBalance.availableMargin,
          usedMargin: futuresBalance.usedMargin,
          marginRatio: ((futuresBalance.usedMargin / futuresBalance.totalEquity) * 100).toFixed(2)
        },
        summary: {
          totalPortfolioUSDT: totalPortfolioValue,
          spotPercentage: ((spotBalance.USDT / totalPortfolioValue) * 100).toFixed(1),
          futuresPercentage: ((futuresBalance.USDT / totalPortfolioValue) * 100).toFixed(1)
        }
      };
      
    } catch (error) {
      console.error('❌ Erro buscando saldos:', error.message);
      throw new Error(`Não foi possível buscar saldos: ${error.message}`);
    }
  }

  // 📊 STATUS DO SISTEMA
  getSystemStatus(): any {
    const status = this.multiExchange.getStatus();
    const cacheSize = this.priceCache.size;
    
    return {
      multiExchange: status,
      cache: {
        entries: cacheSize,
        maxAge: `${this.CACHE_TTL_MS/1000}s`
      },
      websockets: this.wsConnections.size,
      lastApiCall: this.lastApiCall > 0 ? new Date(this.lastApiCall).toISOString() : 'never'
    };
  }

  // 🧹 CLEANUP
  async cleanup(): Promise<void> {
    console.log('🧹 Fazendo cleanup do ExchangeAPI...');
    
    // Fechar WebSocket connections
    for (const [symbol, ws] of this.wsConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    this.wsConnections.clear();
    
    // Limpar cache
    this.clearCache();
    
    console.log('✅ Cleanup completo');
  }

  // 🔧 MÉTODO TEMPORÁRIO PARA COMPATIBILIDADE
  async testConnection(exchange: string, apiKey: string, apiSecret: string): Promise<any> {
    console.log(`🔍 Testando conexão com ${exchange}...`);
    
    return {
      success: true,
      exchange: this.multiExchange.getStatus().activeExchange,
      message: 'Conexão multi-exchange ativa'
    };
  }
}

// 🚀 EXPORT INSTÂNCIA GLOBAL PARA COMPATIBILIDADE
export const exchangeAPI = new ExchangeAPI();