// 🚀 SISTEMA MULTI-EXCHANGE - SOLUÇÃO DEFINITIVA PARA GEO-BLOQUEIO
// Suporte automático: Binance (principal) + Bybit (fallback sem geo-bloqueio)

import ccxt from "ccxt";
import { makeAgent, makeFetch } from "./net";

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
    name: "Binance",
    primary: true,
    hasGeoBlocking: true,
    endpoints: {
      spot: "https://api.binance.com",
      futures: "https://fapi.binance.com",
      testEndpoint: "https://api.binance.com/api/v3/ping",
    },
    createSpot: () =>
      new ccxt.binance({
        apiKey: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_API_SECRET,
        sandbox: false,
        enableRateLimit: true,
        agent: makeAgent(),
        timeout: 30000,
        options: {
          defaultType: "spot",
        },
      }),
    createFutures: () =>
      new ccxt.binance({
        apiKey: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_API_SECRET,
        sandbox: false,
        enableRateLimit: true,
        agent: makeAgent(),
        timeout: 30000,
        options: {
          defaultType: "future",
        },
      }),
  },

  bybit: {
    name: "Bybit",
    primary: false,
    hasGeoBlocking: true, // Bybit TAMBÉM tem CloudFront geo-bloqueio
    endpoints: {
      spot: "https://api.bybit.com",
      futures: "https://api.bybit.com",
      testEndpoint: "https://api.bybit.com/v5/market/time",
    },
    createSpot: () =>
      new ccxt.bybit({
        apiKey: process.env.BYBIT_API_KEY || "",
        secret: process.env.BYBIT_API_SECRET || "",
        sandbox: false,
        enableRateLimit: true,
        agent: makeAgent(),
        timeout: 30000,
        options: {
          defaultType: "spot",
        },
      }),
    createFutures: () =>
      new ccxt.bybit({
        apiKey: process.env.BYBIT_API_KEY || "",
        secret: process.env.BYBIT_API_SECRET || "",
        sandbox: false,
        enableRateLimit: true,
        agent: makeAgent(),
        timeout: 30000,
        options: {
          defaultType: "linear", // Bybit usa 'linear' para perpetual futures
        },
      }),
  },

  okx: {
    name: "OKX",
    primary: false,
    hasGeoBlocking: false, // OKX não usa CloudFront - PODE FUNCIONAR
    endpoints: {
      spot: "https://www.okx.com",
      futures: "https://www.okx.com",
      testEndpoint: "https://www.okx.com/api/v5/public/time",
    },
    createSpot: () =>
      new ccxt.okx({
        apiKey: process.env.OKX_API_KEY || "",
        secret: process.env.OKX_API_SECRET || "",
        password: process.env.OKX_PASSPHRASE || "",
        sandbox: false,
        enableRateLimit: true,
        agent: makeAgent(),
        timeout: 30000,
        options: {
          defaultType: "spot",
        },
      }),
    createFutures: () => {
      const exchange = new ccxt.okx({
        apiKey: process.env.OKX_API_KEY || "",
        secret: process.env.OKX_API_SECRET || "",
        password: process.env.OKX_PASSPHRASE || "",
        sandbox: false,
        enableRateLimit: true,
        agent: makeAgent(),
        timeout: 30000,
        options: {
          defaultType: "swap", // OKX usa 'swap' para perpetual futures
        },
      });
      // 🔧 FORCE swap market type for funding rates
      exchange.options.defaultType = "swap";
      return exchange;
    },
  },

  // 🔥 FALLBACK EXTREMO - API PÚBLICA SEM AUTENTICAÇÃO
  coinbase: {
    name: "Coinbase",
    primary: false,
    hasGeoBlocking: false, // Coinbase Pro API pública
    endpoints: {
      spot: "https://api.exchange.coinbase.com",
      futures: "https://api.exchange.coinbase.com",
      testEndpoint: "https://api.exchange.coinbase.com/time",
    },
    createSpot: () =>
      new ccxt.coinbasepro({
        apiKey: process.env.COINBASE_API_KEY || "",
        secret: process.env.COINBASE_API_SECRET || "",
        password: process.env.COINBASE_PASSPHRASE || "",
        sandbox: false,
        enableRateLimit: true,
        agent: makeAgent(),
        timeout: 30000,
        options: {
          defaultType: "spot",
        },
      }),
    createFutures: () =>
      new ccxt.coinbasepro({
        apiKey: process.env.COINBASE_API_KEY || "",
        secret: process.env.COINBASE_API_SECRET || "",
        password: process.env.COINBASE_PASSPHRASE || "",
        sandbox: false,
        enableRateLimit: true,
        agent: makeAgent(),
        timeout: 30000,
        options: {
          defaultType: "spot", // Coinbase não tem futures, usa spot
        },
      }),
  },
};

/**
 * 🎯 GERENCIADOR INTELIGENTE DE MÚLTIPLAS EXCHANGES
 */
export class MultiExchangeManager {
  private activeExchange: string = "binance"; // Exchange ativa no momento
  private exchangeHealth: {
    [key: string]: {
      available: boolean;
      lastCheck: number;
      errorCount: number;
    };
  } = {};
  private spotExchanges: { [key: string]: any } = {};
  private futuresExchanges: { [key: string]: any } = {};

  constructor() {
    console.log("🚀 Inicializando MultiExchangeManager...");
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
          errorCount: 0,
        };

        console.log(`✅ ${config.name} inicializada`);
      } catch (error) {
        console.log(`⚠️ ${config.name} não configurada: ${error.message}`);
        this.exchangeHealth[exchangeId] = {
          available: false,
          lastCheck: Date.now(),
          errorCount: 999, // Marca como indisponível
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
        method: "GET",
        timeout: 10000,
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
      if (
        error.message.includes("451") ||
        error.message.includes("restricted location")
      ) {
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
    console.log("🔍 Selecionando melhor exchange disponível...");

    // 🎯 PRIORIDADE: Exchanges SEM geo-bloqueio primeiro
    const exchangePriority = [
      "okx", // OKX - SEM CloudFront, mais provável de funcionar
      "coinbase", // Coinbase - API pública, sem restrições severas
      "binance", // Binance - Primária mas pode ter geo-bloqueio
      "bybit", // Bybit - CloudFront geo-bloqueado
    ];

    // 1. Testar em ordem de prioridade
    for (const exchangeId of exchangePriority) {
      if (EXCHANGES[exchangeId] && (await this.testExchange(exchangeId))) {
        this.activeExchange = exchangeId;
        const status = EXCHANGES[exchangeId].hasGeoBlocking
          ? "(COM potencial geo-bloqueio)"
          : "(SEM geo-bloqueio)";
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
      console.log(
        `🔄 FALLBACK: Usando ${EXCHANGES[this.activeExchange].name} (melhor disponível)`,
      );
      return this.activeExchange;
    }

    throw new Error(
      "❌ TODAS exchanges falharam! Possível geo-bloqueio total.",
    );
  }

  /**
   * 📊 BUSCAR PREÇO SPOT COM FALLBACK AUTOMÁTICO
   */
  async getSpotPrice(
    symbol: string,
  ): Promise<{ price: number; exchange: string }> {
    let lastError;

    // Tentar exchange ativa primeiro
    try {
      const exchange = this.spotExchanges[this.activeExchange];
      if (exchange) {
        const ticker = await exchange.fetchTicker(symbol);
        return {
          price: ticker.last,
          exchange: EXCHANGES[this.activeExchange].name,
        };
      }
    } catch (error) {
      lastError = error;
      console.log(
        `⚠️ Erro na ${EXCHANGES[this.activeExchange].name}: ${error.message}`,
      );

      // Se foi geo-bloqueio, marcar exchange como indisponível
      if (
        error.message.includes("451") ||
        error.message.includes("restricted")
      ) {
        this.exchangeHealth[this.activeExchange].available = false;
        console.log(
          `🚫 ${EXCHANGES[this.activeExchange].name}: Marcada como geo-bloqueada`,
        );
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
          console.log(
            `✅ Fallback bem-sucedido: ${EXCHANGES[exchangeId].name}`,
          );

          return {
            price: ticker.last,
            exchange: EXCHANGES[exchangeId].name,
          };
        }
      } catch (error) {
        console.log(
          `❌ Fallback falhou: ${EXCHANGES[exchangeId].name}: ${error.message}`,
        );
        lastError = error;
      }
    }

    throw new Error(
      `Não foi possível buscar preço spot para ${symbol}: ${lastError?.message || "Todas as exchanges falharam"}`,
    );
  }

  /**
   * 📊 BUSCAR PREÇO FUTURES COM FALLBACK AUTOMÁTICO
   */
  async getFuturesPrice(
    symbol: string,
  ): Promise<{ price: number; exchange: string }> {
    let lastError;

    // Tentar exchange ativa primeiro
    try {
      const exchange = this.futuresExchanges[this.activeExchange];
      if (exchange) {
        const ticker = await exchange.fetchTicker(symbol);
        return {
          price: ticker.last,
          exchange: EXCHANGES[this.activeExchange].name,
        };
      }
    } catch (error) {
      lastError = error;
      console.log(
        `⚠️ Erro futures na ${EXCHANGES[this.activeExchange].name}: ${error.message}`,
      );
    }

    // Fallback automático
    for (const [exchangeId, health] of Object.entries(this.exchangeHealth)) {
      if (exchangeId === this.activeExchange || !health.available) continue;

      try {
        const exchange = this.futuresExchanges[exchangeId];
        if (exchange) {
          console.log(
            `🔄 Tentando fallback futures: ${EXCHANGES[exchangeId].name}`,
          );
          const ticker = await exchange.fetchTicker(symbol);

          this.activeExchange = exchangeId;
          console.log(
            `✅ Fallback futures bem-sucedido: ${EXCHANGES[exchangeId].name}`,
          );

          return {
            price: ticker.last,
            exchange: EXCHANGES[exchangeId].name,
          };
        }
      } catch (error) {
        console.log(
          `❌ Fallback futures falhou: ${EXCHANGES[exchangeId].name}: ${error.message}`,
        );
        lastError = error;
      }
    }

    throw new Error(
      `Não foi possível buscar preço futures para ${symbol}: ${lastError?.message || "Todas as exchanges falharam"}`,
    );
  }

  /**
   * 📈 BUSCAR FUNDING RATE COM FALLBACK AUTOMÁTICO
   */
  async getFundingRate(
    symbol: string,
  ): Promise<{ rate: number; exchange: string }> {
    let lastError;

    // 🔧 TRATAMENTO ESPECÍFICO PARA OKX - normalizar símbolo para swap
    if (this.activeExchange === "okx") {
      try {
        const exchange = this.futuresExchanges["okx"];
        if (exchange) {
          // ✅ Carregar markets e normalizar símbolo para swap format
          await exchange.loadMarkets();

          // Converter ALGO/USDT → ALGO/USDT:USDT para funding rates
          const swapSymbol = symbol.includes(":") ? symbol : `${symbol}:USDT`;

          console.log(`🔧 OKX funding rate: ${symbol} → ${swapSymbol}`);

          const fundingRate = await exchange.fetchFundingRate(swapSymbol);

          return {
            rate: fundingRate.fundingRate || 0,
            exchange: "OKX",
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
      if (exchange && this.activeExchange !== "okx") {
        const fundingRate = await exchange.fetchFundingRate(symbol);
        return {
          rate: fundingRate.fundingRate || 0,
          exchange: EXCHANGES[this.activeExchange].name,
        };
      }
    } catch (error) {
      lastError = error;
      console.log(
        `⚠️ Erro funding rate na ${EXCHANGES[this.activeExchange].name}: ${error.message}`,
      );
    }

    // 🎯 FALLBACK INTELIGENTE - apenas exchanges SEM geo-bloqueio
    const viableExchanges = ["okx", "coinbase"]; // Exchanges que funcionam sem proxy

    for (const exchangeId of viableExchanges) {
      if (exchangeId === this.activeExchange) continue;

      const health = this.exchangeHealth[exchangeId];
      if (!health || !health.available || health.errorCount >= 5) continue;

      try {
        const exchange = this.futuresExchanges[exchangeId];
        if (exchange) {
          console.log(
            `🔄 Tentando fallback funding rate: ${EXCHANGES[exchangeId].name}`,
          );

          // 🔧 Tratamento específico OKX
          if (exchangeId === "okx") {
            await exchange.loadMarkets();
            const swapSymbol = symbol.includes(":") ? symbol : `${symbol}:USDT`;

            console.log(
              `🔧 OKX fallback funding rate: ${symbol} → ${swapSymbol}`,
            );

            const fundingRate = await exchange.fetchFundingRate(swapSymbol);

            this.activeExchange = exchangeId;
            console.log(`✅ Fallback funding rate bem-sucedido: OKX`);

            return {
              rate: fundingRate.fundingRate || 0,
              exchange: "OKX",
            };
          } else {
            const fundingRate = await exchange.fetchFundingRate(symbol);

            this.activeExchange = exchangeId;
            console.log(
              `✅ Fallback funding rate bem-sucedido: ${EXCHANGES[exchangeId].name}`,
            );

            return {
              rate: fundingRate.fundingRate || 0,
              exchange: EXCHANGES[exchangeId].name,
            };
          }
        }
      } catch (error) {
        console.log(
          `❌ Fallback funding rate falhou: ${EXCHANGES[exchangeId].name}: ${error.message}`,
        );
        lastError = error;
      }
    }

    throw new Error(
      `Não foi possível buscar funding rate para ${symbol}: ${lastError?.message || "Todas as exchanges falharam"}`,
    );
  }

  /**
   * 📊 BUSCAR VOLUME 24H COM FALLBACK AUTOMÁTICO
   */
  async get24hVolume(
    symbol: string,
  ): Promise<{ volume: number; exchange: string }> {
    let lastError;

    // Tentar exchange ativa primeiro
    try {
      const exchange = this.spotExchanges[this.activeExchange];
      if (exchange) {
        const ticker = await exchange.fetchTicker(symbol);
        return {
          volume: ticker.baseVolume || 0,
          exchange: EXCHANGES[this.activeExchange].name,
        };
      }
    } catch (error) {
      lastError = error;
      console.log(
        `⚠️ Erro volume na ${EXCHANGES[this.activeExchange].name}: ${error.message}`,
      );
    }

    // Fallback automático
    for (const [exchangeId, health] of Object.entries(this.exchangeHealth)) {
      if (exchangeId === this.activeExchange || !health.available) continue;

      try {
        const exchange = this.spotExchanges[exchangeId];
        if (exchange) {
          console.log(
            `🔄 Tentando fallback volume: ${EXCHANGES[exchangeId].name}`,
          );
          const ticker = await exchange.fetchTicker(symbol);

          this.activeExchange = exchangeId;
          console.log(
            `✅ Fallback volume bem-sucedido: ${EXCHANGES[exchangeId].name}`,
          );

          return {
            volume: ticker.baseVolume || 0,
            exchange: EXCHANGES[exchangeId].name,
          };
        }
      } catch (error) {
        console.log(
          `❌ Fallback volume falhou: ${EXCHANGES[exchangeId].name}: ${error.message}`,
        );
        lastError = error;
      }
    }

    throw new Error(
      `Não foi possível buscar volume para ${symbol}: ${lastError?.message || "Todas as exchanges falharam"}`,
    );
  }

  /**
   * 🎯 STATUS ATUAL DO SISTEMA
   */
  getStatus(): { activeExchange: string; health: any; summary: string } {
    const activeExchangeName =
      EXCHANGES[this.activeExchange]?.name || "Nenhuma";
    const availableCount = Object.values(this.exchangeHealth).filter(
      (h) => h.available,
    ).length;

    return {
      activeExchange: activeExchangeName,
      health: this.exchangeHealth,
      summary: `${activeExchangeName} ativa | ${availableCount}/${Object.keys(EXCHANGES).length} exchanges disponíveis`,
    };
  }

  /**
   * 🔄 INICIALIZAR SISTEMA - SELECIONA AUTOMATICAMENTE A MELHOR EXCHANGE
   */
  async initialize(): Promise<void> {
    console.log("🚀 Inicializando sistema multi-exchange...");

    try {
      const selectedExchange = await this.selectBestExchange();
      console.log(
        `✅ Sistema multi-exchange inicializado com: ${EXCHANGES[selectedExchange].name}`,
      );

      // Teste básico com BTC/USDT
      const btcPrice = await this.getSpotPrice("BTC/USDT");
      console.log(
        `🎯 Teste bem-sucedido: BTC/USDT = $${btcPrice.price} via ${btcPrice.exchange}`,
      );
    } catch (error) {
      console.error("❌ Falha na inicialização multi-exchange:", error.message);
      throw error;
    }
  }

  /**
   * 🔑 OBTER INSTÂNCIA DE EXCHANGE PARA OPERAÇÕES COM CREDENCIAIS REAIS
   */
  getExchangeInstance(exchangeName: string): any {
    console.log(`🔍 Buscando instância para exchange: ${exchangeName}`);

    // Normalizar nome da exchange (minúsculo)
    const normalizedName = exchangeName.toLowerCase();

    // Verificar se a exchange existe
    if (!EXCHANGES[normalizedName]) {
      console.log(`❌ Exchange ${exchangeName} não suportada`);
      return null;
    }

    // Retornar a instância spot da exchange
    const instance = this.spotExchanges[normalizedName];
    if (instance) {
      console.log(`✅ Instância ${exchangeName} encontrada`);
      return instance;
    } else {
      console.log(`⚠️ Instância ${exchangeName} não inicializada`);
      return null;
    }
  }

  /**
   * 🔑 OBTER INSTÂNCIA DE EXCHANGE FUTURES PARA OPERAÇÕES COM CREDENCIAIS REAIS
   */
  getFuturesExchangeInstance(exchangeName: string): any {
    console.log(`🔍 Buscando instância futures para exchange: ${exchangeName}`);

    // Normalizar nome da exchange (minúsculo)
    const normalizedName = exchangeName.toLowerCase();

    // Verificar se a exchange existe
    if (!EXCHANGES[normalizedName]) {
      console.log(`❌ Exchange futures ${exchangeName} não suportada`);
      return null;
    }

    // Retornar a instância futures da exchange
    const instance = this.futuresExchanges[normalizedName];
    if (instance) {
      console.log(`✅ Instância futures ${exchangeName} encontrada`);
      return instance;
    } else {
      console.log(`⚠️ Instância futures ${exchangeName} não inicializada`);
      return null;
    }
  }

  /**
   * 📦 Order book (bids/asks) com fallback simples
   */
  async getOrderBook(symbol: string, limit: number = 20): Promise<any> {
    let lastError: any;

    // 1) tenta na exchange ativa
    try {
      const ex = this.spotExchanges[this.activeExchange];
      if (ex) {
        const ob = await ex.fetchOrderBook(symbol, limit);
        return {
          symbol,
          orderBook: ob,
          exchange: EXCHANGES[this.activeExchange].name,
          timestamp: Date.now(),
        };
      }
    } catch (e: any) {
      lastError = e;
      this.exchangeHealth[this.activeExchange].errorCount++;
    }

    // 2) tenta fallback em outras exchanges disponíveis
    for (const [id, health] of Object.entries(this.exchangeHealth)) {
      if (id === this.activeExchange || !health.available) continue;
      try {
        const ex = this.spotExchanges[id];
        if (!ex) continue;
        const ob = await ex.fetchOrderBook(symbol, limit);
        this.activeExchange = id; // promove fallback
        return {
          symbol,
          orderBook: ob,
          exchange: EXCHANGES[id].name,
          timestamp: Date.now(),
        };
      } catch (e: any) {
        lastError = e;
      }
    }

    throw new Error(
      `OrderBook indisponível para ${symbol}: ${lastError?.message || "todas exchanges falharam"}`,
    );
  }

  /**
   * 🧮 Market data unificado (spot, futures, basis, funding, volume)
   * Retorna no formato que o painel espera.
   */
  async getMarketData(symbol: string): Promise<{
    symbol: string;
    spotPrice: number;
    futuresPrice: number;
    basis: number;
    basisPercent: number;
    fundingRate: number;
    volume24h: number;
    timestamp: number;
    exchange: string;
  }> {
    const sym = symbol.toUpperCase();

    const spot = await this.getSpotPrice(sym);
    const fut = await this.getFuturesPrice(sym);

    const spotPrice = Number(spot.price) || 0;
    const futuresPrice = Number(fut.price) || 0;

    const basis = futuresPrice - spotPrice;
    const basisPercent = spotPrice > 0 ? (basis / spotPrice) * 100 : 0;

    let fundingRate = 0;
    try {
      const fr = await this.getFundingRate(sym);
      fundingRate = Number(fr.rate) || 0;
    } catch {
      fundingRate = 0;
    }

    let volume24h = 0;
    try {
      const vol = await this.get24hVolume(sym);
      volume24h = Number(vol.volume) || 0;
    } catch {
      volume24h = 0;
    }

    return {
      symbol: sym,
      spotPrice,
      futuresPrice,
      basis,
      basisPercent,
      fundingRate,
      volume24h,
      timestamp: Date.now(),
      exchange: EXCHANGES[this.activeExchange]?.name || "Desconhecida",
    };
  }

  /**
   * 🟢 Conectividade simples (usa um ping rápido)
   */
  async isConnected(): Promise<boolean> {
    try {
      const ok = await this.testExchange(this.activeExchange);
      if (ok) return true;
      await this.selectBestExchange();
      return await this.testExchange(this.activeExchange);
    } catch {
      return false;
    }
  }

  /**
   * 💰 Saldo simplificado: consulta free/used/total no SPOT e FUTURES (se disponível)
   */
  async getBalance(): Promise<{
    spot?: any;
    futures?: any;
    exchange: string;
  }> {
    const name = EXCHANGES[this.activeExchange]?.name || this.activeExchange;

    const out: any = { exchange: name };

    try {
      const ex = this.spotExchanges[this.activeExchange];
      if (ex && ex.fetchBalance) {
        out.spot = await ex.fetchBalance();
      }
    } catch (_) {
      out.spot = { error: "Falha ao obter saldo spot" };
    }

    try {
      const exF = this.futuresExchanges[this.activeExchange];
      if (exF && exF.fetchBalance) {
        out.futures = await exF.fetchBalance();
      }
    } catch (_) {
      out.futures = { error: "Falha ao obter saldo futures" };
    }

    return out;
  }

  /**
   * 🔍 TESTE DE CONEXÃO COMPLETO - DIAGNÓSTICO DETALHADO DO SISTEMA
   * Testa conectividade, latência e funcionalidade de todas as exchanges
   */
  async testConnection(): Promise<{
    success: boolean;
    activeExchange: string;
    exchanges: Array<{
      name: string;
      id: string;
      available: boolean;
      latency?: number;
      error?: string;
      endpoints: {
        spot: { status: string; latency?: number; error?: string };
        futures: { status: string; latency?: number; error?: string };
        test: { status: string; latency?: number; error?: string };
      };
      features: {
        spotTrading: boolean;
        futuresTrading: boolean;
        dataAccess: boolean;
      };
    }>;
    systemHealth: {
      overallStatus: string;
      availableExchanges: number;
      totalExchanges: number;
      primaryExchangeOnline: boolean;
      fallbackAvailable: boolean;
    };
    testResults: {
      spotPriceTest: { success: boolean; symbol?: string; price?: number; exchange?: string; error?: string };
      futuresPriceTest: { success: boolean; symbol?: string; price?: number; exchange?: string; error?: string };
      fundingRateTest: { success: boolean; symbol?: string; rate?: number; exchange?: string; error?: string };
      volumeTest: { success: boolean; symbol?: string; volume?: number; exchange?: string; error?: string };
      marketDataTest: { success: boolean; symbol?: string; data?: any; error?: string };
    };
    recommendations: string[];
    timestamp: number;
  }> {
    console.log("🔍 Iniciando teste de conexão completo...");
    const startTime = Date.now();
    
    const results = {
      success: false,
      activeExchange: this.activeExchange,
      exchanges: [] as any[],
      systemHealth: {
        overallStatus: "UNKNOWN",
        availableExchanges: 0,
        totalExchanges: Object.keys(EXCHANGES).length,
        primaryExchangeOnline: false,
        fallbackAvailable: false
      },
      testResults: {
        spotPriceTest: { success: false },
        futuresPriceTest: { success: false },
        fundingRateTest: { success: false },
        volumeTest: { success: false },
        marketDataTest: { success: false }
      },
      recommendations: [] as string[],
      timestamp: Date.now()
    };

    // 1. TESTAR CADA EXCHANGE INDIVIDUALMENTE
    console.log("📊 Testando conectividade de cada exchange...");
    
    for (const [exchangeId, config] of Object.entries(EXCHANGES)) {
      const exchangeResult = {
        name: config.name,
        id: exchangeId,
        available: false,
        latency: 0,
        error: undefined as string | undefined,
        endpoints: {
          spot: { status: "UNKNOWN" },
          futures: { status: "UNKNOWN" },
          test: { status: "UNKNOWN" }
        },
        features: {
          spotTrading: false,
          futuresTrading: false,
          dataAccess: false
        }
      };

      try {
        // Teste de conectividade básica
        const testStart = Date.now();
        const isAvailable = await this.testExchange(exchangeId);
        const testLatency = Date.now() - testStart;
        
        exchangeResult.available = isAvailable;
        exchangeResult.latency = testLatency;

        if (isAvailable) {
          // Teste de endpoints específicos
          try {
            const spotEx = this.spotExchanges[exchangeId];
            if (spotEx) {
              const spotStart = Date.now();
              await spotEx.fetchStatus();
              exchangeResult.endpoints.spot = {
                status: "OK",
                latency: Date.now() - spotStart
              };
              exchangeResult.features.spotTrading = true;
              exchangeResult.features.dataAccess = true;
            }
          } catch (error: any) {
            exchangeResult.endpoints.spot = {
              status: "ERROR",
              error: error.message
            };
          }

          try {
            const futuresEx = this.futuresExchanges[exchangeId];
            if (futuresEx) {
              const futuresStart = Date.now();
              await futuresEx.fetchStatus();
              exchangeResult.endpoints.futures = {
                status: "OK",
                latency: Date.now() - futuresStart
              };
              exchangeResult.features.futuresTrading = true;
            }
          } catch (error: any) {
            exchangeResult.endpoints.futures = {
              status: "ERROR",
              error: error.message
            };
          }

          // Teste de endpoint de teste específico
          try {
            const testStart = Date.now();
            const response = await fetch(config.endpoints.testEndpoint, {
              method: 'GET',
              timeout: 5000
            });
            
            if (response.ok) {
              exchangeResult.endpoints.test = {
                status: "OK",
                latency: Date.now() - testStart
              };
            } else {
              exchangeResult.endpoints.test = {
                status: "ERROR",
                error: `HTTP ${response.status}`
              };
            }
          } catch (error: any) {
            exchangeResult.endpoints.test = {
              status: "ERROR",
              error: error.message
            };
          }

          console.log(`✅ ${config.name}: OK (${testLatency}ms)`);
        } else {
          console.log(`❌ ${config.name}: FALHOU`);
          exchangeResult.error = "Teste de conectividade falhou";
        }

      } catch (error: any) {
        console.log(`❌ ${config.name}: ERRO - ${error.message}`);
        exchangeResult.error = error.message;
        exchangeResult.available = false;
      }

      results.exchanges.push(exchangeResult);
    }

    // 2. CALCULAR SAÚDE DO SISTEMA
    const availableExchanges = results.exchanges.filter(ex => ex.available);
    results.systemHealth.availableExchanges = availableExchanges.length;
    
    const primaryExchange = results.exchanges.find(ex => ex.id === 'binance');
    results.systemHealth.primaryExchangeOnline = primaryExchange?.available || false;
    
    const fallbackExchanges = results.exchanges.filter(ex => ex.id !== 'binance' && ex.available);
    results.systemHealth.fallbackAvailable = fallbackExchanges.length > 0;

    // Determinar status geral
    if (results.systemHealth.availableExchanges === 0) {
      results.systemHealth.overallStatus = "CRITICAL";
    } else if (results.systemHealth.primaryExchangeOnline) {
      results.systemHealth.overallStatus = "HEALTHY";
    } else if (results.systemHealth.fallbackAvailable) {
      results.systemHealth.overallStatus = "DEGRADED";
    } else {
      results.systemHealth.overallStatus = "CRITICAL";
    }

    // 3. TESTES FUNCIONAIS
    console.log("🧪 Executando testes funcionais...");
    
    // Teste de preço spot
    try {
      const spotResult = await this.getSpotPrice("BTC/USDT");
      results.testResults.spotPriceTest = {
        success: true,
        symbol: "BTC/USDT",
        price: spotResult.price,
        exchange: spotResult.exchange
      };
      console.log(`✅ Preço Spot: BTC/USDT = $${spotResult.price} via ${spotResult.exchange}`);
    } catch (error: any) {
      results.testResults.spotPriceTest = {
        success: false,
        error: error.message
      };
      console.log(`❌ Teste de preço spot falhou: ${error.message}`);
    }

    // Teste de preço futures
    try {
      const futuresResult = await this.getFuturesPrice("BTC/USDT");
      results.testResults.futuresPriceTest = {
        success: true,
        symbol: "BTC/USDT",
        price: futuresResult.price,
        exchange: futuresResult.exchange
      };
      console.log(`✅ Preço Futures: BTC/USDT = $${futuresResult.price} via ${futuresResult.exchange}`);
    } catch (error: any) {
      results.testResults.futuresPriceTest = {
        success: false,
        error: error.message
      };
      console.log(`❌ Teste de preço futures falhou: ${error.message}`);
    }

    // Teste de funding rate
    try {
      const fundingResult = await this.getFundingRate("BTC/USDT");
      results.testResults.fundingRateTest = {
        success: true,
        symbol: "BTC/USDT",
        rate: fundingResult.rate,
        exchange: fundingResult.exchange
      };
      console.log(`✅ Funding Rate: BTC/USDT = ${(fundingResult.rate * 100).toFixed(4)}% via ${fundingResult.exchange}`);
    } catch (error: any) {
      results.testResults.fundingRateTest = {
        success: false,
        error: error.message
      };
      console.log(`❌ Teste de funding rate falhou: ${error.message}`);
    }

    // Teste de volume
    try {
      const volumeResult = await this.get24hVolume("BTC/USDT");
      results.testResults.volumeTest = {
        success: true,
        symbol: "BTC/USDT",
        volume: volumeResult.volume,
        exchange: volumeResult.exchange
      };
      console.log(`✅ Volume 24h: BTC/USDT = ${volumeResult.volume.toLocaleString()} via ${volumeResult.exchange}`);
    } catch (error: any) {
      results.testResults.volumeTest = {
        success: false,
        error: error.message
      };
      console.log(`❌ Teste de volume falhou: ${error.message}`);
    }

    // Teste de market data completo
    try {
      const marketData = await this.getMarketData("BTC/USDT");
      results.testResults.marketDataTest = {
        success: true,
        symbol: "BTC/USDT",
        data: marketData
      };
      console.log(`✅ Market Data: BTC/USDT completo via ${marketData.exchange}`);
    } catch (error: any) {
      results.testResults.marketDataTest = {
        success: false,
        error: error.message
      };
      console.log(`❌ Teste de market data falhou: ${error.message}`);
    }

    // 4. GERAR RECOMENDAÇÕES
    if (results.systemHealth.overallStatus === "CRITICAL") {
      results.recommendations.push("🚨 CRÍTICO: Nenhuma exchange disponível. Verifique conectividade de rede.");
      results.recommendations.push("🔧 Verifique configurações de proxy/VPN se estiver em região com geo-bloqueio.");
    } else if (results.systemHealth.overallStatus === "DEGRADED") {
      results.recommendations.push("⚠️ Exchange principal (Binance) indisponível. Sistema operando com fallback.");
      results.recommendations.push("🔄 Considere verificar conectividade com Binance ou usar VPN.");
    } else {
      results.recommendations.push("✅ Sistema operando normalmente.");
    }

    // Recomendações específicas por exchange
    const failedExchanges = results.exchanges.filter(ex => !ex.available);
    if (failedExchanges.length > 0) {
      results.recommendations.push(`🔧 Exchanges com problemas: ${failedExchanges.map(ex => ex.name).join(", ")}`);
    }

    // Recomendações de performance
    const slowExchanges = results.exchanges.filter(ex => ex.available && ex.latency && ex.latency > 2000);
    if (slowExchanges.length > 0) {
      results.recommendations.push(`🐌 Exchanges com alta latência: ${slowExchanges.map(ex => `${ex.name} (${ex.latency}ms)`).join(", ")}`);
    }

    // 5. DETERMINAR SUCESSO GERAL
    const functionalTests = Object.values(results.testResults);
    const successfulTests = functionalTests.filter(test => test.success).length;
    const totalTests = functionalTests.length;
    
    results.success = results.systemHealth.availableExchanges > 0 && successfulTests >= (totalTests * 0.6); // 60% dos testes devem passar

    const totalTime = Date.now() - startTime;
    console.log(`🏁 Teste de conexão concluído em ${totalTime}ms`);
    console.log(`📊 Status: ${results.systemHealth.overallStatus}`);
    console.log(`✅ Exchanges disponíveis: ${results.systemHealth.availableExchanges}/${results.systemHealth.totalExchanges}`);
    console.log(`🧪 Testes funcionais: ${successfulTests}/${totalTests} passaram`);

    return results;
  }
} // fim da classe

// --- exporta uma instância única do gerenciador ---
const multiExchangeManager = new MultiExchangeManager();
export { multiExchangeManager };

// export default (opcional)
export default multiExchangeManager;
