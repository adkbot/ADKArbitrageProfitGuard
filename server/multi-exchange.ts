// 🚀 SISTEMA MULTI-EXCHANGE - SOLUÇÃO DEFINITIVA PARA GEO-BLOQUEIO
// Suporte automático: Binance (principal) + Bybit (fallback sem geo-bloqueio)

import ccxt from 'ccxt';
import { makeAgent, makeFetch } from './net.js';

export interface ExchangeConfig {
  name: string;
  primary: boolean;
  hasGeoBlocking: boolean;
  createSpot: () => any;
  createFutures: () => any;
  endpoints: {
    spot: string;
    futures: string;
    testEndpoint: string;
  };
}

export interface MarketData {
  symbol: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;
  basisPercent: number;
  fundingRate: number;
  volume24h: number;
  timestamp: number;
  exchange: string; // Qual exchange forneceu os dados
}

/**
 * 🌐 CONFIGURAÇÃO DE EXCHANGES SUPORTADAS
 */
const EXCHANGES: { [key: string]: ExchangeConfig } = {
  binance: {
    name: 'Binance',
    primary: true,
    hasGeoBlocking: true,
    endpoints: {
      spot: 'https://api.binance.com',
      futures: 'https://fapi.binance.com',
      testEndpoint: 'https://api.binance.com/api/v3/ping'
    },
    createSpot: () => new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_API_SECRET,
      sandbox: false,
      enableRateLimit: true,
      agent: makeAgent(),
      timeout: 30000,
      options: {
        defaultType: 'spot'
      }
    }),
    createFutures: () => new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_API_SECRET,
      sandbox: false,
      enableRateLimit: true,
      agent: makeAgent(),
      timeout: 30000,
      options: {
        defaultType: 'future'
      }
    })
  },
  
  bybit: {
    name: 'Bybit',
    primary: false,
    hasGeoBlocking: true, // Bybit TAMBÉM tem CloudFront geo-bloqueio
    endpoints: {
      spot: 'https://api.bybit.com',
      futures: 'https://api.bybit.com',
      testEndpoint: 'https://api.bybit.com/v5/market/time'
    },
    createSpot: () => new ccxt.bybit({
      apiKey: process.env.BYBIT_API_KEY || '',
      secret: process.env.BYBIT_API_SECRET || '',
      sandbox: false,
      enableRateLimit: true,
      agent: makeAgent(),
      timeout: 30000,
      options: {
        defaultType: 'spot'
      }
    }),
    createFutures: () => new ccxt.bybit({
      apiKey: process.env.BYBIT_API_KEY || '',
      secret: process.env.BYBIT_API_SECRET || '',
      sandbox: false,
      enableRateLimit: true,
      agent: makeAgent(),
      timeout: 30000,
      options: {
        defaultType: 'linear' // Bybit usa 'linear' para perpetual futures
      }
    })
  },

  okx: {
    name: 'OKX',
    primary: false,
    hasGeoBlocking: false, // OKX não usa CloudFront - PODE FUNCIONAR
    endpoints: {
      spot: 'https://www.okx.com',
      futures: 'https://www.okx.com',
      testEndpoint: 'https://www.okx.com/api/v5/public/time'
    },
    createSpot: () => new ccxt.okx({
      apiKey: process.env.OKX_API_KEY || '',
      secret: process.env.OKX_API_SECRET || '',
      password: process.env.OKX_PASSPHRASE || '',
      sandbox: false,
      enableRateLimit: true,
      agent: makeAgent(),
      timeout: 30000,
      options: {
        defaultType: 'spot'
      }
    }),
    createFutures: () => {
      const exchange = new ccxt.okx({
        apiKey: process.env.OKX_API_KEY || '',
        secret: process.env.OKX_API_SECRET || '',
        password: process.env.OKX_PASSPHRASE || '',
        sandbox: false,
        enableRateLimit: true,
        agent: makeAgent(),
        timeout: 30000,
        options: {
          defaultType: 'swap' // OKX usa 'swap' para perpetual futures
        }
      });
      // 🔧 FORCE swap market type for funding rates
      exchange.options.defaultType = 'swap';
      return exchange;
    }
  },

  // 🔥 FALLBACK EXTREMO - API PÚBLICA SEM AUTENTICAÇÃO
  coinbase: {
    name: 'Coinbase',
    primary: false,
    hasGeoBlocking: false, // Coinbase Pro API pública
    endpoints: {
      spot: 'https://api.exchange.coinbase.com',
      futures: 'https://api.exchange.coinbase.com',
      testEndpoint: 'https://api.exchange.coinbase.com/time'
    },
    createSpot: () => new ccxt.coinbasepro({
      apiKey: process.env.COINBASE_API_KEY || '',
      secret: process.env.COINBASE_API_SECRET || '',
      password: process.env.COINBASE_PASSPHRASE || '',
      sandbox: false,
      enableRateLimit: true,
      agent: makeAgent(),
      timeout: 30000,
      options: {
        defaultType: 'spot'
      }
    }),
    createFutures: () => new ccxt.coinbasepro({
      apiKey: process.env.COINBASE_API_KEY || '',
      secret: process.env.COINBASE_API_SECRET || '',
      password: process.env.COINBASE_PASSPHRASE || '',
      sandbox: false,
      enableRateLimit: true,
      agent: makeAgent(),
      timeout: 30000,
      options: {
        defaultType: 'spot' // Coinbase não tem futures, usa spot
      }
    })
  }
};

/**
 * 🎯 GERENCIADOR INTELIGENTE DE MÚLTIPLAS EXCHANGES
 */
export class MultiExchangeManager {
  private activeExchange: string = 'binance'; // Exchange ativa no momento
  private exchangeHealth: { [key: string]: { available: boolean; lastCheck: number; errorCount: number } } = {};
  private spotExchanges: { [key: string]: any } = {};
  private futuresExchanges: { [key: string]: any } = {};
  
  constructor() {
    console.log('🚀 Inicializando MultiExchangeManager...');
    this.initializeExchanges();
  }

  private initializeExchanges(): void {
    // Inicializar todas as exchanges suportadas
    for (const [exchangeId, config] of Object.entries(EXCHANGES)) {
      try {
        this.spotExchanges[exchangeId] = config.createSpot();
        this.futuresExchanges[exchangeId] = config.createFutures();
        
        this.exchangeHealth[exchangeId] = {
          available: true,
          lastCheck: Date.now(),
          errorCount: 0
        };
        
        console.log(`✅ ${config.name} inicializada`);
      } catch (error) {
        console.log(`⚠️ ${config.name} não configurada: ${error.message}`);
        this.exchangeHealth[exchangeId] = {
          available: false,
          lastCheck: Date.now(),
          errorCount: 999 // Marca como indisponível
        };
      }
    }
  }

  /**
   * 🔍 TESTA CONECTIVIDADE DE UMA EXCHANGE
   */
  private async testExchange(exchangeId: string): Promise<boolean> {
    try {
      const config = EXCHANGES[exchangeId];
      
      console.log(`🔍 Testando conectividade: ${config.name}...`);
      
      // Teste simples de ping/connectivity
      const response = await makeFetch(config.endpoints.testEndpoint, {
        method: 'GET',
        timeout: 10000
      });
      
      if (response.ok) {
        console.log(`✅ ${config.name}: Conectividade OK`);
        this.exchangeHealth[exchangeId].available = true;
        this.exchangeHealth[exchangeId].errorCount = 0;
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`❌ ${EXCHANGES[exchangeId].name}: ${error.message}`);
      
      // Detectar geo-bloqueio
      if (error.message.includes('451') || error.message.includes('restricted location')) {
        console.log(`🚫 ${EXCHANGES[exchangeId].name}: GEO-BLOQUEIO DETECTADO`);
        this.exchangeHealth[exchangeId].available = false;
        this.exchangeHealth[exchangeId].errorCount = 999;
      } else {
        this.exchangeHealth[exchangeId].errorCount++;
      }
      
      this.exchangeHealth[exchangeId].lastCheck = Date.now();
      return false;
    }
  }

  /**
   * 🎯 SELECIONA AUTOMATICAMENTE A MELHOR EXCHANGE DISPONÍVEL
   */
  async selectBestExchange(): Promise<string> {
    console.log('🔍 Selecionando melhor exchange disponível...');
    
    // 🎯 PRIORIDADE: Exchanges SEM geo-bloqueio primeiro
    const exchangePriority = [
      'okx',      // OKX - SEM CloudFront, mais provável de funcionar
      'coinbase', // Coinbase - API pública, sem restrições severas  
      'binance',  // Binance - Primária mas pode ter geo-bloqueio
      'bybit'     // Bybit - CloudFront geo-bloqueado
    ];
    
    // 1. Testar em ordem de prioridade
    for (const exchangeId of exchangePriority) {
      if (EXCHANGES[exchangeId] && await this.testExchange(exchangeId)) {
        this.activeExchange = exchangeId;
        const status = EXCHANGES[exchangeId].hasGeoBlocking ? '(COM potencial geo-bloqueio)' : '(SEM geo-bloqueio)';
        console.log(`🎯 Usando ${EXCHANGES[exchangeId].name} ${status}`);
        return exchangeId;
      }
    }
    
    // 2. Se nenhuma da prioridade funcionar, tentar qualquer uma disponível
    const availableExchanges = Object.entries(this.exchangeHealth)
      .filter(([id, health]) => health.available && health.errorCount < 5)
      .sort(([, a], [, b]) => a.errorCount - b.errorCount);
    
    if (availableExchanges.length > 0) {
      this.activeExchange = availableExchanges[0][0];
      console.log(`🔄 FALLBACK: Usando ${EXCHANGES[this.activeExchange].name} (melhor disponível)`);
      return this.activeExchange;
    }
    
    throw new Error('❌ TODAS exchanges falharam! Possível geo-bloqueio total.');
  }

  /**
   * 📊 BUSCAR PREÇO SPOT COM FALLBACK AUTOMÁTICO
   */
  async getSpotPrice(symbol: string): Promise<{ price: number; exchange: string }> {
    let lastError;
    
    // Tentar exchange ativa primeiro
    try {
      const exchange = this.spotExchanges[this.activeExchange];
      if (exchange) {
        const ticker = await exchange.fetchTicker(symbol);
        return {
          price: ticker.last,
          exchange: EXCHANGES[this.activeExchange].name
        };
      }
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Erro na ${EXCHANGES[this.activeExchange].name}: ${error.message}`);
      
      // Se foi geo-bloqueio, marcar exchange como indisponível
      if (error.message.includes('451') || error.message.includes('restricted')) {
        this.exchangeHealth[this.activeExchange].available = false;
        console.log(`🚫 ${EXCHANGES[this.activeExchange].name}: Marcada como geo-bloqueada`);
      }
    }
    
    // Fallback automático para outras exchanges
    for (const [exchangeId, health] of Object.entries(this.exchangeHealth)) {
      if (exchangeId === this.activeExchange || !health.available) continue;
      
      try {
        const exchange = this.spotExchanges[exchangeId];
        if (exchange) {
          console.log(`🔄 Tentando fallback: ${EXCHANGES[exchangeId].name}`);
          const ticker = await exchange.fetchTicker(symbol);
          
          // Atualizar exchange ativa se funcionou
          this.activeExchange = exchangeId;
          console.log(`✅ Fallback bem-sucedido: ${EXCHANGES[exchangeId].name}`);
          
          return {
            price: ticker.last,
            exchange: EXCHANGES[exchangeId].name
          };
        }
      } catch (error) {
        console.log(`❌ Fallback falhou: ${EXCHANGES[exchangeId].name}: ${error.message}`);
        lastError = error;
      }
    }
    
    throw new Error(`Não foi possível buscar preço spot para ${symbol}: ${lastError?.message || 'Todas as exchanges falharam'}`);
  }

  /**
   * 📊 BUSCAR PREÇO FUTURES COM FALLBACK AUTOMÁTICO
   */
  async getFuturesPrice(symbol: string): Promise<{ price: number; exchange: string }> {
    let lastError;
    
    // Tentar exchange ativa primeiro
    try {
      const exchange = this.futuresExchanges[this.activeExchange];
      if (exchange) {
        const ticker = await exchange.fetchTicker(symbol);
        return {
          price: ticker.last,
          exchange: EXCHANGES[this.activeExchange].name
        };
      }
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Erro futures na ${EXCHANGES[this.activeExchange].name}: ${error.message}`);
    }
    
    // Fallback automático
    for (const [exchangeId, health] of Object.entries(this.exchangeHealth)) {
      if (exchangeId === this.activeExchange || !health.available) continue;
      
      try {
        const exchange = this.futuresExchanges[exchangeId];
        if (exchange) {
          console.log(`🔄 Tentando fallback futures: ${EXCHANGES[exchangeId].name}`);
          const ticker = await exchange.fetchTicker(symbol);
          
          this.activeExchange = exchangeId;
          console.log(`✅ Fallback futures bem-sucedido: ${EXCHANGES[exchangeId].name}`);
          
          return {
            price: ticker.last,
            exchange: EXCHANGES[exchangeId].name
          };
        }
      } catch (error) {
        console.log(`❌ Fallback futures falhou: ${EXCHANGES[exchangeId].name}: ${error.message}`);
        lastError = error;
      }
    }
    
    throw new Error(`Não foi possível buscar preço futures para ${symbol}: ${lastError?.message || 'Todas as exchanges falharam'}`);
  }

  /**
   * 📈 BUSCAR FUNDING RATE COM FALLBACK AUTOMÁTICO
   */
  async getFundingRate(symbol: string): Promise<{ rate: number; exchange: string }> {
    let lastError;
    
    // 🔧 TRATAMENTO ESPECÍFICO PARA OKX - normalizar símbolo para swap
    if (this.activeExchange === 'okx') {
      try {
        const exchange = this.futuresExchanges['okx'];
        if (exchange) {
          // ✅ Carregar markets e normalizar símbolo para swap format
          await exchange.loadMarkets();
          
          // Converter ALGO/USDT → ALGO/USDT:USDT para funding rates
          const swapSymbol = symbol.includes(':') ? symbol : `${symbol}:USDT`;
          
          console.log(`🔧 OKX funding rate: ${symbol} → ${swapSymbol}`);
          
          const fundingRate = await exchange.fetchFundingRate(swapSymbol);
          
          return {
            rate: fundingRate.fundingRate || 0,
            exchange: 'OKX'
          };
        }
      } catch (error) {
        lastError = error;
        console.log(`⚠️ Erro funding rate na OKX: ${error.message}`);
      }
    }
    
    // Tentar exchange ativa padrão
    try {
      const exchange = this.futuresExchanges[this.activeExchange];
      if (exchange && this.activeExchange !== 'okx') {
        const fundingRate = await exchange.fetchFundingRate(symbol);
        return {
          rate: fundingRate.fundingRate || 0,
          exchange: EXCHANGES[this.activeExchange].name
        };
      }
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Erro funding rate na ${EXCHANGES[this.activeExchange].name}: ${error.message}`);
    }
    
    // 🎯 FALLBACK INTELIGENTE - apenas exchanges SEM geo-bloqueio
    const viableExchanges = ['okx', 'coinbase']; // Exchanges que funcionam sem proxy
    
    for (const exchangeId of viableExchanges) {
      if (exchangeId === this.activeExchange) continue;
      
      const health = this.exchangeHealth[exchangeId];
      if (!health || !health.available || health.errorCount >= 5) continue;
      
      try {
        const exchange = this.futuresExchanges[exchangeId];
        if (exchange) {
          console.log(`🔄 Tentando fallback funding rate: ${EXCHANGES[exchangeId].name}`);
          
          // 🔧 Tratamento específico OKX
          if (exchangeId === 'okx') {
            await exchange.loadMarkets();
            const swapSymbol = symbol.includes(':') ? symbol : `${symbol}:USDT`;
            
            console.log(`🔧 OKX fallback funding rate: ${symbol} → ${swapSymbol}`);
            
            const fundingRate = await exchange.fetchFundingRate(swapSymbol);
            
            this.activeExchange = exchangeId;
            console.log(`✅ Fallback funding rate bem-sucedido: OKX`);
            
            return {
              rate: fundingRate.fundingRate || 0,
              exchange: 'OKX'
            };
          } else {
            const fundingRate = await exchange.fetchFundingRate(symbol);
            
            this.activeExchange = exchangeId;
            console.log(`✅ Fallback funding rate bem-sucedido: ${EXCHANGES[exchangeId].name}`);
            
            return {
              rate: fundingRate.fundingRate || 0,
              exchange: EXCHANGES[exchangeId].name
            };
          }
        }
      } catch (error) {
        console.log(`❌ Fallback funding rate falhou: ${EXCHANGES[exchangeId].name}: ${error.message}`);
        lastError = error;
      }
    }
    
    throw new Error(`Não foi possível buscar funding rate para ${symbol}: ${lastError?.message || 'Todas as exchanges falharam'}`);
  }

  /**
   * 📊 BUSCAR VOLUME 24H COM FALLBACK AUTOMÁTICO
   */
  async get24hVolume(symbol: string): Promise<{ volume: number; exchange: string }> {
    let lastError;
    
    // Tentar exchange ativa primeiro
    try {
      const exchange = this.spotExchanges[this.activeExchange];
      if (exchange) {
        const ticker = await exchange.fetchTicker(symbol);
        return {
          volume: ticker.baseVolume || 0,
          exchange: EXCHANGES[this.activeExchange].name
        };
      }
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Erro volume na ${EXCHANGES[this.activeExchange].name}: ${error.message}`);
    }
    
    // Fallback automático
    for (const [exchangeId, health] of Object.entries(this.exchangeHealth)) {
      if (exchangeId === this.activeExchange || !health.available) continue;
      
      try {
        const exchange = this.spotExchanges[exchangeId];
        if (exchange) {
          console.log(`🔄 Tentando fallback volume: ${EXCHANGES[exchangeId].name}`);
          const ticker = await exchange.fetchTicker(symbol);
          
          this.activeExchange = exchangeId;
          console.log(`✅ Fallback volume bem-sucedido: ${EXCHANGES[exchangeId].name}`);
          
          return {
            volume: ticker.baseVolume || 0,
            exchange: EXCHANGES[exchangeId].name
          };
        }
      } catch (error) {
        console.log(`❌ Fallback volume falhou: ${EXCHANGES[exchangeId].name}: ${error.message}`);
        lastError = error;
      }
    }
    
    throw new Error(`Não foi possível buscar volume para ${symbol}: ${lastError?.message || 'Todas as exchanges falharam'}`);
  }

  /**
   * 🎯 STATUS ATUAL DO SISTEMA
   */
  getStatus(): { activeExchange: string; health: any; summary: string } {
    const activeExchangeName = EXCHANGES[this.activeExchange]?.name || 'Nenhuma';
    const availableCount = Object.values(this.exchangeHealth).filter(h => h.available).length;
    
    return {
      activeExchange: activeExchangeName,
      health: this.exchangeHealth,
      summary: `${activeExchangeName} ativa | ${availableCount}/${Object.keys(EXCHANGES).length} exchanges disponíveis`
    };
  }

  /**
   * 🔄 INICIALIZAR SISTEMA - SELECIONA AUTOMATICAMENTE A MELHOR EXCHANGE
   */
  async initialize(): Promise<void> {
    console.log('🚀 Inicializando sistema multi-exchange...');
    
    try {
      const selectedExchange = await this.selectBestExchange();
      console.log(`✅ Sistema multi-exchange inicializado com: ${EXCHANGES[selectedExchange].name}`);
      
      // Teste básico com BTC/USDT
      const btcPrice = await this.getSpotPrice('BTC/USDT');
      console.log(`🎯 Teste bem-sucedido: BTC/USDT = $${btcPrice.price} via ${btcPrice.exchange}`);
      
    } catch (error) {
      console.error('❌ Falha na inicialização multi-exchange:', error.message);
      throw error;
    }
  }
}