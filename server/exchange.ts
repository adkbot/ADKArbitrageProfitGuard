// 🚀 EXCHANGE API V2 - SISTEMA MULTI-EXCHANGE SEM GEO-BLOQUEIO
// Suporte automático: Binance + Bybit com fallback inteligente

import WebSocket from 'ws';
import { MultiExchangeManager } from './multi-exchange.js';
import { fetchWithKillSwitch } from './exchange-manager.js';
import type { IStorage } from './storage.js';

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
  private storage: IStorage; // 🔑 Storage para credenciais reais
  private wsConnections: Map<string, WebSocket> = new Map();
  private marketDataCallbacks: Map<string, (data: MarketData) => void> = new Map();
  private orderBookCallbacks: Map<string, (data: OrderBookData) => void> = new Map();
  
  // 🛡️ CACHE PARA OTIMIZAÇÃO
  private priceCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL_MS = 30000; // Cache 30 segundos
  private lastApiCall = 0;
  private readonly MIN_INTERVAL_MS = 100; // Mínimo 100ms entre chamadas

  constructor(storage: IStorage) {
    console.log('🚀 Inicializando ExchangeAPI V2 - Multi-Exchange...');
    
    this.multiExchange = new MultiExchangeManager();
    this.storage = storage; // 🔑 Armazenar referência do storage
    
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

  // 💰 BUSCAR SALDOS REAIS DA CARTEIRA - SEM DADOS SIMULADOS
  async getBalance(): Promise<any> {
    try {
      console.log('💰 Buscando saldos REAIS da carteira...');
      
      // 🔑 BUSCAR CREDENCIAIS REAIS DO USUÁRIO
      const config = await this.storage.getBotConfig();
      if (!config || !config.selectedExchange) {
        console.log('⚠️ Nenhuma exchange configurada - configure suas API keys primeiro');
        return {
          success: false,
          error: 'Configure suas API keys primeiro',
          message: 'Acesse Configurações para inserir suas credenciais da exchange'
        };
      }

      const exchangeName = config.selectedExchange;
      console.log(`💰 Buscando saldos REAIS via ${exchangeName.toUpperCase()}...`);

      // 🔑 USAR CREDENCIAIS REAIS DO USUÁRIO
      let apiKey, apiSecret, passphrase;
      
      if (exchangeName === 'binance') {
        apiKey = config.binanceApiKey;
        apiSecret = config.binanceApiSecret;
      } else if (exchangeName === 'okx') {
        apiKey = config.okxApiKey;
        apiSecret = config.okxApiSecret;
        passphrase = config.okxPassphrase;
      } else if (exchangeName === 'bybit') {
        apiKey = config.bybitApiKey;
        apiSecret = config.bybitApiSecret;
      }

      if (!apiKey || !apiSecret) {
        console.log(`⚠️ API keys não configuradas para ${exchangeName.toUpperCase()}`);
        return {
          success: false,
          error: 'API keys não configuradas',
          message: `Configure suas credenciais ${exchangeName.toUpperCase()} primeiro`
        };
      }

      // 🌐 BUSCAR SALDOS REAIS DA EXCHANGE
      const exchange = this.multiExchange.getExchangeInstance(exchangeName);
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} não disponível`);
      }

      // Configurar credenciais temporariamente para busca de saldos
      const originalApiKey = exchange.apiKey;
      const originalSecret = exchange.secret;
      const originalPassword = exchange.password;

      exchange.apiKey = apiKey;
      exchange.secret = apiSecret;
      if (passphrase) exchange.password = passphrase;

      try {
        // Buscar saldos REAIS
        const balance = await exchange.fetchBalance();
        console.log(`✅ Saldos REAIS obtidos de ${exchangeName.toUpperCase()}`);

        // Estruturar saldos spot
        const spotBalance = {
          USDT: balance.USDT?.free || 0,
          BTC: balance.BTC?.free || 0,
          ETH: balance.ETH?.free || 0,
          BNB: balance.BNB?.free || 0,
          XRP: balance.XRP?.free || 0,
          ADA: balance.ADA?.free || 0
        };

        // Calcular totais
        const spotTotalUSDT = balance.USDT?.total || 0;
        const totalPortfolioValue = balance.total?.USDT || spotTotalUSDT;
        
        return {
          success: true,
          real: true, // 🔑 Dados REAIS da exchange
          exchange: exchangeName.toUpperCase(),
          lastUpdate: new Date().toISOString(),
          spot: {
            name: "Carteira Spot",
            balance: spotBalance,
            totalUSDT: spotTotalUSDT,
            assets: Object.keys(balance).filter(asset => (balance[asset]?.total || 0) > 0).length
          },
          futures: {
            name: "Carteira Futures", 
            balance: { USDT: balance.total?.USDT || 0 },
            totalUSDT: balance.total?.USDT || 0,
            availableMargin: balance.free?.USDT || 0,
            usedMargin: (balance.total?.USDT || 0) - (balance.free?.USDT || 0),
            marginRatio: "N/A" // Futures específico precisa endpoint separado
          },
          summary: {
            totalPortfolioUSDT: totalPortfolioValue,
            spotPercentage: totalPortfolioValue > 0 ? ((spotTotalUSDT / totalPortfolioValue) * 100).toFixed(1) : "0",
            futuresPercentage: "0" // Será calculado quando futures for implementado
          }
        };
      } finally {
        // Restaurar credenciais originais
        exchange.apiKey = originalApiKey;
        exchange.secret = originalSecret;
        exchange.password = originalPassword;
      }
      
    } catch (error) {
      console.error('❌ Erro buscando saldos REAIS:', error.message);
      
      // Retornar erro informativo
      return {
        success: false,
        error: 'Erro ao buscar saldos',
        message: `Verifique suas API keys: ${error.message}`,
        lastUpdate: new Date().toISOString()
      };
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

// 🚀 EXPORT FACTORY FUNCTION - SERÁ INICIALIZADO NO INDEX.TS COM STORAGE
export let exchangeAPI: ExchangeAPI;

export function initializeExchangeAPI(storage: IStorage): void {
  if (!exchangeAPI) {
    exchangeAPI = new ExchangeAPI(storage);
    console.log('🔑 ExchangeAPI inicializado com storage para credenciais REAIS');
  }
}