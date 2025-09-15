import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, decimal, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (keeping existing)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Trades table
export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  pair: text('pair').notNull(), // BTC/USDT, ETH/USDT
  type: text('type').notNull(), // 'open' | 'close'
  side: text('side').notNull(), // 'long' | 'short'
  spotPrice: decimal('spot_price', { precision: 18, scale: 8 }).notNull(),
  futuresPrice: decimal('futures_price', { precision: 18, scale: 8 }).notNull(),
  basis: decimal('basis', { precision: 10, scale: 6 }).notNull(), // basis percentage
  quantity: decimal('quantity', { precision: 18, scale: 8 }).notNull(),
  pnl: decimal('pnl', { precision: 18, scale: 2 }),
  fundingRate: decimal('funding_rate', { precision: 10, scale: 6 }),
  wyckoffScore: decimal('wyckoff_score', { precision: 5, scale: 4 }),
  gexLevel: decimal('gex_level', { precision: 10, scale: 6 }),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
  metadata: jsonb('metadata') // Additional trade data
});

// Bot configuration
export const botConfig = pgTable('bot_config', {
  id: serial('id').primaryKey(),
  pairs: text('pairs').array().notNull(), // ["BTC/USDT", "ETH/USDT"]
  basisEntry: decimal('basis_entry', { precision: 6, scale: 4 }).notNull(), // 0.004 = 0.4%
  basisExit: decimal('basis_exit', { precision: 6, scale: 4 }).notNull(), // 0.0015 = 0.15%
  maxNotionalUsdt: decimal('max_notional_usdt', { precision: 12, scale: 2 }).notNull(),
  maxDailyTrades: integer('max_daily_trades').notNull(),
  slippageK: decimal('slippage_k', { precision: 6, scale: 4 }).notNull(),
  fundingLookaheadH: integer('funding_lookahead_h').notNull(),
  wyckoffN: integer('wyckoff_n').notNull(),
  gexRefreshSec: integer('gex_refresh_sec').notNull(),
  arbitrageEnabled: boolean('arbitrage_enabled').notNull().default(true),
  // 🔑 API CREDENTIALS - DADOS REAIS DAS EXCHANGES
  selectedExchange: text('selected_exchange'), // 'binance', 'okx', 'bybit'
  binanceApiKey: text('binance_api_key'),
  binanceApiSecret: text('binance_api_secret'),
  okxApiKey: text('okx_api_key'),
  okxApiSecret: text('okx_api_secret'),
  okxPassphrase: text('okx_passphrase'),
  bybitApiKey: text('bybit_api_key'),
  bybitApiSecret: text('bybit_api_secret'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Daily metrics
export const dailyMetrics = pgTable('daily_metrics', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD
  totalPnl: decimal('total_pnl', { precision: 18, scale: 2 }).notNull(),
  totalTrades: integer('total_trades').notNull(),
  avgBasis: decimal('avg_basis', { precision: 10, scale: 6 }).notNull(),
  avgFundingRate: decimal('avg_funding_rate', { precision: 10, scale: 6 }).notNull(),
  winRate: decimal('win_rate', { precision: 5, scale: 4 }).notNull(), // 0.65 = 65%
  maxDrawdown: decimal('max_drawdown', { precision: 18, scale: 2 }).notNull(),
  activePairs: text('active_pairs').array().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Market data cache
export const marketData = pgTable('market_data', {
  id: serial('id').primaryKey(),
  pair: text('pair').notNull(),
  spotPrice: decimal('spot_price', { precision: 18, scale: 8 }).notNull(),
  futuresPrice: decimal('futures_price', { precision: 18, scale: 8 }).notNull(),
  basis: decimal('basis', { precision: 10, scale: 6 }).notNull(),
  fundingRate: decimal('funding_rate', { precision: 10, scale: 6 }).notNull(),
  volume24h: decimal('volume_24h', { precision: 18, scale: 2 }).notNull(),
  wyckoffScore: decimal('wyckoff_score', { precision: 5, scale: 4 }),
  gexLevel: decimal('gex_level', { precision: 10, scale: 6 }),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, executedAt: true });
export const insertBotConfigSchema = createInsertSchema(botConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDailyMetricsSchema = createInsertSchema(dailyMetrics).omit({ id: true, createdAt: true });
export const insertMarketDataSchema = createInsertSchema(marketData).omit({ id: true, timestamp: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
// Account balance (carteira)
export const accountBalance = pgTable('account_balance', {
  id: serial('id').primaryKey(),
  exchange: text('exchange').notNull(), // 'spot' | 'futures'
  asset: text('asset').notNull(), // 'USDT', 'BTC', etc
  total: decimal('total', { precision: 18, scale: 8 }).notNull(),
  available: decimal('available', { precision: 18, scale: 8 }).notNull(),
  locked: decimal('locked', { precision: 18, scale: 8 }).notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull()
});

export const insertAccountBalanceSchema = createInsertSchema(accountBalance);
export type AccountBalance = typeof accountBalance.$inferSelect;
export type InsertAccountBalance = z.infer<typeof insertAccountBalanceSchema>;

export type BotConfig = typeof botConfig.$inferSelect;
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type DailyMetrics = typeof dailyMetrics.$inferSelect;
export type InsertDailyMetrics = z.infer<typeof insertDailyMetricsSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
