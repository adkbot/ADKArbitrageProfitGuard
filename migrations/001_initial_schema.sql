
-- 🗃️ INITIAL DATABASE SCHEMA - POSTGRESQL PRODUCTION READY
-- This migration creates all necessary tables for the ADK Arbitrage Profit Guard system

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  pair TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('open', 'close')),
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  spot_price DECIMAL(18, 8) NOT NULL,
  futures_price DECIMAL(18, 8) NOT NULL,
  basis DECIMAL(10, 6) NOT NULL,
  quantity DECIMAL(18, 8) NOT NULL,
  pnl DECIMAL(18, 2),
  funding_rate DECIMAL(10, 6),
  wyckoff_score DECIMAL(5, 4),
  gex_level DECIMAL(10, 6),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB
);

-- Bot configuration table
CREATE TABLE IF NOT EXISTS bot_config (
  id SERIAL PRIMARY KEY,
  pairs TEXT[] NOT NULL,
  basis_entry DECIMAL(6, 4) NOT NULL,
  basis_exit DECIMAL(6, 4) NOT NULL,
  max_notional_usdt DECIMAL(12, 2) NOT NULL,
  max_daily_trades INTEGER NOT NULL,
  slippage_k DECIMAL(6, 4) NOT NULL,
  funding_lookahead_h INTEGER NOT NULL,
  wyckoff_n INTEGER NOT NULL,
  gex_refresh_sec INTEGER NOT NULL,
  arbitrage_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Exchange API credentials (encrypted)
  selected_exchange TEXT,
  binance_api_key TEXT,
  binance_api_secret TEXT,
  okx_api_key TEXT,
  okx_api_secret TEXT,
  okx_passphrase TEXT,
  bybit_api_key TEXT,
  bybit_api_secret TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Daily metrics table
CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  total_pnl DECIMAL(18, 2) NOT NULL,
  total_trades INTEGER NOT NULL,
  avg_basis DECIMAL(10, 6) NOT NULL,
  avg_funding_rate DECIMAL(10, 6) NOT NULL,
  win_rate DECIMAL(5, 4) NOT NULL,
  max_drawdown DECIMAL(18, 2) NOT NULL,
  active_pairs TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Market data cache table
CREATE TABLE IF NOT EXISTS market_data (
  id SERIAL PRIMARY KEY,
  pair TEXT NOT NULL,
  spot_price DECIMAL(18, 8) NOT NULL,
  futures_price DECIMAL(18, 8) NOT NULL,
  basis DECIMAL(10, 6) NOT NULL,
  funding_rate DECIMAL(10, 6) NOT NULL,
  volume_24h DECIMAL(18, 2) NOT NULL,
  wyckoff_score DECIMAL(5, 4),
  gex_level DECIMAL(10, 6),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Account balance table
CREATE TABLE IF NOT EXISTS account_balance (
  id SERIAL PRIMARY KEY,
  exchange TEXT NOT NULL,
  asset TEXT NOT NULL,
  total DECIMAL(18, 8) NOT NULL,
  available DECIMAL(18, 8) NOT NULL,
  locked DECIMAL(18, 8) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(exchange, asset)
);

-- Performance monitoring table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(18, 6) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id SERIAL PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('info', 'warning', 'critical')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Pair performance tracking table
CREATE TABLE IF NOT EXISTS pair_performance (
  id SERIAL PRIMARY KEY,
  pair TEXT NOT NULL,
  date DATE NOT NULL,
  score DECIMAL(10, 4) DEFAULT 0,
  basis_avg DECIMAL(10, 6),
  volume_avg DECIMAL(18, 2),
  funding_rate_avg DECIMAL(10, 6),
  trades_count INTEGER DEFAULT 0,
  profit_potential DECIMAL(10, 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pair, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_pair_executed_at ON trades(pair, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_type_executed_at ON trades(type, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_pair_timestamp ON market_data(pair, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_created_at ON performance_metrics(metric_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved_created_at ON system_alerts(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pair_performance_date_score ON pair_performance(date DESC, score DESC);
CREATE INDEX IF NOT EXISTS idx_account_balance_exchange_asset ON account_balance(exchange, asset);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_bot_config_updated_at 
  BEFORE UPDATE ON bot_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pair_performance_updated_at 
  BEFORE UPDATE ON pair_performance 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default bot configuration if none exists
INSERT INTO bot_config (
  pairs,
  basis_entry,
  basis_exit,
  max_notional_usdt,
  max_daily_trades,
  slippage_k,
  funding_lookahead_h,
  wyckoff_n,
  gex_refresh_sec,
  arbitrage_enabled
) 
SELECT 
  ARRAY[
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
    'DOGE/USDT', 'SOL/USDT', 'TRX/USDT', 'LTC/USDT', 'AVAX/USDT',
    'DOT/USDT', 'UNI/USDT', 'ATOM/USDT', 'LINK/USDT', 'ETC/USDT',
    'FTM/USDT', 'NEAR/USDT', 'ALGO/USDT', 'APT/USDT', 'SUI/USDT',
    'INJ/USDT', 'TIA/USDT', 'SEI/USDT', 'ARB/USDT', 'OP/USDT',
    'BLUR/USDT', 'WLD/USDT', 'FIL/USDT', 'AAVE/USDT', 'MKR/USDT'
  ] as pairs,
  0.004 as basis_entry,
  0.0015 as basis_exit,
  1000.00 as max_notional_usdt,
  20 as max_daily_trades,
  0.0002 as slippage_k,
  8 as funding_lookahead_h,
  50 as wyckoff_n,
  120 as gex_refresh_sec,
  true as arbitrage_enabled
WHERE NOT EXISTS (SELECT 1 FROM bot_config);

-- Create a view for active trading opportunities
CREATE OR REPLACE VIEW active_trading_opportunities AS
SELECT 
  md.pair,
  md.spot_price,
  md.futures_price,
  md.basis,
  (md.basis / md.spot_price * 100) as basis_percent,
  md.funding_rate,
  md.volume_24h,
  md.timestamp,
  pp.score as performance_score,
  CASE 
    WHEN (md.basis / md.spot_price * 100) > 0 THEN 'long_spot_short_futures'
    ELSE 'short_spot_long_futures'
  END as signal_type
FROM market_data md
LEFT JOIN pair_performance pp ON md.pair = pp.pair AND pp.date = CURRENT_DATE
WHERE md.timestamp > NOW() - INTERVAL '5 minutes'
  AND ABS(md.basis / md.spot_price * 100) > 0.001
ORDER BY pp.score DESC NULLS LAST, ABS(md.basis / md.spot_price * 100) DESC;

-- Create a view for system health monitoring
CREATE OR REPLACE VIEW system_health_overview AS
SELECT 
  COUNT(CASE WHEN sa.alert_type = 'critical' AND NOT sa.resolved THEN 1 END) as critical_alerts,
  COUNT(CASE WHEN sa.alert_type = 'warning' AND NOT sa.resolved THEN 1 END) as warning_alerts,
  COUNT(CASE WHEN sa.alert_type = 'info' AND NOT sa.resolved THEN 1 END) as info_alerts,
  COUNT(CASE WHEN t.executed_at > NOW() - INTERVAL '24 hours' THEN 1 END) as trades_24h,
  COUNT(CASE WHEN t.executed_at > NOW() - INTERVAL '1 hour' THEN 1 END) as trades_1h,
  AVG(CASE WHEN md.timestamp > NOW() - INTERVAL '5 minutes' THEN ABS(md.basis / md.spot_price * 100) END) as avg_basis_5min,
  COUNT(DISTINCT md.pair) FILTER (WHERE md.timestamp > NOW() - INTERVAL '5 minutes') as active_pairs
FROM system_alerts sa
CROSS JOIN trades t
CROSS JOIN market_data md;

COMMENT ON TABLE users IS 'User authentication and management';
COMMENT ON TABLE trades IS 'Trading history and active positions';
COMMENT ON TABLE bot_config IS 'Bot configuration and exchange API credentials';
COMMENT ON TABLE daily_metrics IS 'Daily performance metrics and statistics';
COMMENT ON TABLE market_data IS 'Real-time market data cache';
COMMENT ON TABLE account_balance IS 'Account balances across exchanges';
COMMENT ON TABLE performance_metrics IS 'System performance monitoring data';
COMMENT ON TABLE system_alerts IS 'System alerts and notifications';
COMMENT ON TABLE pair_performance IS 'Trading pair performance tracking';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO adk_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO adk_user;
