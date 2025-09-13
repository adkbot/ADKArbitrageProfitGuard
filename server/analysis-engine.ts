import { ExchangeAPI } from './exchange.js';
import { IStorage } from './storage.js';

interface WyckoffPhase {
  phase: 'accumulation' | 'markup' | 'distribution' | 'markdown';
  confidence: number;
  signal: 'buy' | 'sell' | 'hold';
}

interface ArbitrageSignal {
  symbol: string;
  spotPrice: number;
  futuresPrice: number;
  basisPercent: number;
  signal: 'long_spot_short_futures' | 'short_spot_long_futures' | 'close';
  confidence: number;
  profitPotential: number;
  wyckoffPhase: WyckoffPhase;
  volume24h: number;
  funding: number;
  timestamp: string;
}

export class AnalysisEngine {
  private exchangeAPI: ExchangeAPI;
  private storage: IStorage;
  private analysisInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private priceHistory: Map<string, number[]> = new Map();

  constructor(exchangeAPI: ExchangeAPI, storage: IStorage) {
    this.exchangeAPI = exchangeAPI;
    this.storage = storage;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Iniciando motor de análise automática...');
    
    // Análise inicial
    await this.runAnalysis();
    
    // Análise contínua a cada 30 segundos
    this.analysisInterval = setInterval(async () => {
      try {
        await this.runAnalysis();
      } catch (error) {
        console.error('Erro na análise automática:', error);
      }
    }, 30000);
  }

  stop(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Motor de análise automática parado');
  }

  private async runAnalysis(): Promise<void> {
    const config = await this.storage.getBotConfig();
    if (!config || !config.arbitrageEnabled) return;

    console.log('📊 Executando análise automática...');
    
    const signals: ArbitrageSignal[] = [];
    
    for (const pair of config.pairs) {
      try {
        const signal = await this.analyzeSymbol(pair, config);
        if (signal) {
          signals.push(signal);
        }
      } catch (error) {
        console.error(`Erro analisando ${pair}:`, error);
      }
    }

    // Salvar sinais encontrados
    if (signals.length > 0) {
      console.log(`🎯 ${signals.length} oportunidades detectadas:`, 
        signals.map(s => `${s.symbol}: ${s.basisPercent.toFixed(3)}% (${s.signal})`));
      
      // Aqui seria onde executaríamos trades reais
      for (const signal of signals) {
        await this.handleSignal(signal, config);
      }
    }
  }

  private async analyzeSymbol(symbol: string, config: any): Promise<ArbitrageSignal | null> {
    try {
      // Obter dados de mercado em tempo real
      const marketData = await this.exchangeAPI.getMarketData(symbol);
      
      // Calcular Wyckoff
      const wyckoffPhase = await this.calculateWyckoff(symbol);
      
      // Verificar se atende critérios de entrada
      const basisThreshold = parseFloat(config.basisEntry);
      const basisAbs = Math.abs(marketData.basisPercent);
      
      if (basisAbs >= basisThreshold) {
        const signal: ArbitrageSignal = {
          symbol,
          spotPrice: marketData.spotPrice,
          futuresPrice: marketData.futuresPrice,
          basisPercent: marketData.basisPercent,
          signal: marketData.basisPercent > 0 ? 'long_spot_short_futures' : 'short_spot_long_futures',
          confidence: Math.min(100, (basisAbs / basisThreshold) * 100),
          profitPotential: basisAbs - basisThreshold,
          wyckoffPhase,
          volume24h: marketData.volume24h,
          funding: marketData.funding || 0,
          timestamp: new Date().toISOString()
        };

        return signal;
      }
      
      return null;
    } catch (error) {
      console.error(`Erro analisando ${symbol}:`, error);
      return null;
    }
  }

  private async calculateWyckoff(symbol: string): Promise<WyckoffPhase> {
    try {
      // Obter histórico de preços
      const history = this.priceHistory.get(symbol) || [];
      const ticker = await this.exchangeAPI.getMarketData(symbol);
      
      // Adicionar preço atual ao histórico
      history.push(ticker.spotPrice);
      if (history.length > 50) {
        history.shift(); // Manter apenas últimos 50 pontos
      }
      this.priceHistory.set(symbol, history);

      if (history.length < 20) {
        return { phase: 'accumulation', confidence: 50, signal: 'hold' };
      }

      // Análise simplificada de Wyckoff
      const recent = history.slice(-10);
      const older = history.slice(-20, -10);
      
      const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b) / older.length;
      
      const priceChange = (recentAvg - olderAvg) / olderAvg;
      const volatility = this.calculateVolatility(recent);
      
      // Determinar fase Wyckoff
      let phase: WyckoffPhase['phase'];
      let signal: WyckoffPhase['signal'];
      let confidence: number;
      
      if (priceChange > 0.02 && volatility < 0.05) {
        phase = 'markup';
        signal = 'buy';
        confidence = 80;
      } else if (priceChange < -0.02 && volatility < 0.05) {
        phase = 'markdown';
        signal = 'sell';
        confidence = 80;
      } else if (volatility < 0.03) {
        phase = 'accumulation';
        signal = 'hold';
        confidence = 70;
      } else {
        phase = 'distribution';
        signal = 'sell';
        confidence = 60;
      }

      return { phase, confidence, signal };
    } catch (error) {
      console.error('Erro calculando Wyckoff:', error);
      return { phase: 'accumulation', confidence: 50, signal: 'hold' };
    }
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private async handleSignal(signal: ArbitrageSignal, config: any): Promise<void> {
    try {
      // Verificar se já existe uma posição ativa para este símbolo
      const activeTrades = await this.storage.getActiveTrades();
      const existingTrade = activeTrades.find(t => t.symbol === signal.symbol);
      
      if (existingTrade) {
        console.log(`📍 Posição ativa existente para ${signal.symbol}, verificando saída...`);
        await this.checkExitConditions(existingTrade, signal, config);
        return;
      }

      // Verificar limites de trading
      const todayTrades = await this.storage.getTradesByDate(new Date().toISOString().split('T')[0]);
      if (todayTrades.length >= config.maxDailyTrades) {
        console.log('⚠️ Limite diário de trades atingido');
        return;
      }

      // Log da oportunidade detectada
      console.log(`
🎯 OPORTUNIDADE DE ARBITRAGEM DETECTADA:
   Símbolo: ${signal.symbol}
   Basis: ${signal.basisPercent.toFixed(3)}%
   Sinal: ${signal.signal}
   Confiança: ${signal.confidence.toFixed(1)}%
   Wyckoff: ${signal.wyckoffPhase.phase} (${signal.wyckoffPhase.confidence}%)
   Potencial de Lucro: ${signal.profitPotential.toFixed(3)}%
   Volume 24h: $${signal.volume24h.toLocaleString()}
      `);

      // Em um sistema real, aqui executaríamos o trade
      // Por agora, apenas logamos e salvamos a análise
      await this.logTradingOpportunity(signal);
      
    } catch (error) {
      console.error('Erro processando sinal:', error);
    }
  }

  private async checkExitConditions(trade: any, currentSignal: ArbitrageSignal, config: any): Promise<void> {
    const exitThreshold = parseFloat(config.basisExit);
    
    if (Math.abs(currentSignal.basisPercent) <= exitThreshold) {
      console.log(`🔄 Condições de saída atingidas para ${trade.symbol}`);
      // Aqui executaríamos o fechamento da posição
      await this.logTradeExit(trade, currentSignal);
    }
  }

  private async logTradingOpportunity(signal: ArbitrageSignal): Promise<void> {
    // Salvar oportunidade no storage para análise
    console.log(`💾 Salvando oportunidade: ${signal.symbol} - ${signal.basisPercent.toFixed(3)}%`);
  }

  private async logTradeExit(trade: any, signal: ArbitrageSignal): Promise<void> {
    console.log(`📤 Saída registrada: ${trade.symbol} - ${signal.basisPercent.toFixed(3)}%`);
  }

  // Método para obter status atual da análise
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      symbolsMonitored: Array.from(this.priceHistory.keys()),
      lastAnalysis: new Date().toISOString(),
      priceHistorySize: this.priceHistory.size
    };
  }
}