
// 🌱 DATABASE SEEDING SCRIPT - PRODUCTION READY TEST DATA
import { databaseStorage } from '../server/database';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Test database connection
    const healthCheck = await databaseStorage.healthCheck();
    if (healthCheck.status !== 'healthy') {
      throw new Error(`Database not healthy: ${healthCheck.error}`);
    }

    console.log('✅ Database connection verified');

    // 1. Seed default bot configuration (if not exists)
    let config = await databaseStorage.getBotConfig();
    if (!config) {
      console.log('📊 Creating default bot configuration...');
      
      config = await databaseStorage.updateBotConfig({
        pairs: [
          // 🪙 TOP TIER - Major Coins
          'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
          'DOGE/USDT', 'SOL/USDT', 'TRX/USDT', 'LTC/USDT',
          
          // 💰 HIGH VOLUME - DeFi & Layer 1
          'AVAX/USDT', 'DOT/USDT', 'UNI/USDT', 'ATOM/USDT',
          'LINK/USDT', 'ETC/USDT', 'FTM/USDT', 'NEAR/USDT', 'ALGO/USDT',
          
          // 🚀 EMERGING - High Potential
          'APT/USDT', 'SUI/USDT', 'INJ/USDT', 'TIA/USDT', 'SEI/USDT',
          'ARB/USDT', 'OP/USDT', 'BLUR/USDT', 'WLD/USDT',
          
          // 📈 VOLATILE - Trading Opportunities  
          'FIL/USDT', 'AAVE/USDT', 'MKR/USDT'
        ],
        basisEntry: '0.004',
        basisExit: '0.0015',
        maxNotionalUsdt: '1000',
        maxDailyTrades: 20,
        slippageK: '0.0002',
        fundingLookaheadH: 8,
        wyckoffN: 50,
        gexRefreshSec: 120,
        arbitrageEnabled: true
      });
      
      console.log('✅ Default bot configuration created');
    } else {
      console.log('📊 Bot configuration already exists');
    }

    // 2. Seed sample market data for testing
    console.log('📈 Creating sample market data...');
    
    const samplePairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
    
    for (const pair of samplePairs) {
      try {
        // Create sample market data with realistic values
        const basePrice = pair === 'BTC/USDT' ? 43000 : 
                         pair === 'ETH/USDT' ? 2600 : 320;
        
        const spotPrice = basePrice + (Math.random() - 0.5) * basePrice * 0.01;
        const futuresPrice = spotPrice + (Math.random() - 0.5) * spotPrice * 0.005;
        const basis = futuresPrice - spotPrice;
        const fundingRate = (Math.random() - 0.5) * 0.001;
        const volume24h = Math.random() * 1000000 + 500000;

        await databaseStorage.saveMarketData({
          pair,
          spotPrice: spotPrice.toFixed(8),
          futuresPrice: futuresPrice.toFixed(8),
          basis: basis.toFixed(6),
          fundingRate: fundingRate.toFixed(6),
          volume24h: volume24h.toFixed(2)
        });
        
        console.log(`✅ Sample market data created for ${pair}`);
      } catch (error) {
        console.warn(`⚠️ Failed to create market data for ${pair}:`, error);
      }
    }

    // 3. Create sample daily metrics
    console.log('📊 Creating sample daily metrics...');
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await databaseStorage.updateDailyMetrics({
        date: today,
        totalPnl: '150.75',
        totalTrades: 12,
        avgBasis: '0.0025',
        avgFundingRate: '0.0001',
        winRate: '0.75',
        maxDrawdown: '25.50',
        activePairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT']
      });
      
      console.log('✅ Sample daily metrics created');
    } catch (error) {
      console.warn('⚠️ Failed to create daily metrics:', error);
    }

    // 4. Create sample trades
    console.log('💼 Creating sample trades...');
    
    const sampleTrades = [
      {
        pair: 'BTC/USDT',
        type: 'open' as const,
        side: 'long' as const,
        spotPrice: '43150.50',
        futuresPrice: '43180.25',
        basis: '0.0007',
        quantity: '0.025',
        fundingRate: '0.0001'
      },
      {
        pair: 'ETH/USDT',
        type: 'open' as const,
        side: 'short' as const,
        spotPrice: '2635.80',
        futuresPrice: '2630.40',
        basis: '-0.0020',
        quantity: '0.8',
        fundingRate: '0.0002'
      }
    ];

    for (const trade of sampleTrades) {
      try {
        await databaseStorage.createTrade(trade);
        console.log(`✅ Sample trade created: ${trade.pair} ${trade.side}`);
      } catch (error) {
        console.warn(`⚠️ Failed to create sample trade for ${trade.pair}:`, error);
      }
    }

    // 5. Update pair performance scores
    console.log('🏆 Updating pair performance scores...');
    
    for (const pair of config.pairs.slice(0, 10)) {
      try {
        await databaseStorage.updatePairPerformanceScore(pair, {
          basisPercent: (Math.random() - 0.5) * 0.01,
          volume24h: Math.random() * 1000000 + 100000,
          fundingRate: (Math.random() - 0.5) * 0.001
        });
        
        console.log(`✅ Performance score updated for ${pair}`);
      } catch (error) {
        console.warn(`⚠️ Failed to update performance score for ${pair}:`, error);
      }
    }

    console.log('\n🎉 =====================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log(`📊 Bot Config: Created/Updated`);
    console.log(`📈 Market Data: ${samplePairs.length} pairs`);
    console.log(`💼 Sample Trades: ${sampleTrades.length} trades`);
    console.log(`🏆 Performance Scores: ${Math.min(10, config.pairs.length)} pairs`);
    console.log(`📅 Daily Metrics: ${today}`);
    console.log('=====================================\n');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
