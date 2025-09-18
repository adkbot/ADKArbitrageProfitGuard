
export type BotStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';

export interface ArbitrageOpportunity {
  id: string;
  pair: string;
  spotPrice: number;
  futuresPrice: number;
  spread: number;
  spreadPercentage: number;
  volume: number;
  timestamp: string;
  exchange: string;
  profitEstimate: number;
}

export interface Trade {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  profit: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  exchange: string;
}

export interface BotMetrics {
  status: BotStatus;
  totalProfit: number;
  totalTrades: number;
  successRate: number;
  balance: number;
  uptime: number;
  currentPairs: string[];
  lastUpdate: string;
}

export interface ExecutionAttempt {
  id: string;
  opportunity: ArbitrageOpportunity;
  timestamp: string;
  status: 'pending' | 'executed' | 'failed';
  reason?: string;
  executionTime?: number;
}
