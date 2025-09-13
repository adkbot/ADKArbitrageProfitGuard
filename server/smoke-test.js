// 🧪 SMOKE TEST - Validar conectividade Binance usando net.js simplificado
// Baseado na recomendação "colar e rodar" do usuário

import { makeSpotExchange, makeFuturesExchange, makeFetch, getNetworkStatus } from './net.js';

/**
 * 🚀 TESTE PRINCIPAL DE CONECTIVIDADE
 */
async function smokeTest() {
  console.log('🧪 INICIANDO SMOKE TEST - Sistema simplificado net.js');
  console.log('=' .repeat(60));
  
  // Status da rede
  const networkStatus = getNetworkStatus();
  console.log('📊 Network Status:', networkStatus);
  
  if (networkStatus.proxyEnabled) {
    console.log(`🌐 Testando com PROXY: ${networkStatus.proxyUrl}`);
  } else {
    console.log('🌐 Testando com CONEXÃO DIRETA (sem proxy)');
  }
  
  const results = {
    httpTest: false,
    ccxtSpotTest: false,
    ccxtFuturesTest: false,
    publicApiTest: false,
    publicFuturesApiTest: false,
    errors: []
  };
  
  try {
    // 🧪 TESTE 1: HTTP básico usando makeFetch
    console.log('\n📡 TESTE 1: HTTP básico Binance');
    try {
      const response = await makeFetch('https://api.binance.com/api/v3/time');
      const data = await response.json();
      
      const serverTime = new Date(data.serverTime).toISOString();
      console.log(`✅ HTTP básico OK - Server time: ${serverTime}`);
      results.httpTest = true;
    } catch (error) {
      console.error(`❌ HTTP básico FALHOU:`, error.message);
      results.errors.push(`HTTP básico: ${error.message}`);
    }
    
    // 🧪 TESTE 2: CCXT Spot usando net.js
    console.log('\n📊 TESTE 2: CCXT Spot Exchange');
    try {
      const spotExchange = makeSpotExchange();
      const ticker = await spotExchange.fetchTicker('BTC/USDT');
      
      if (ticker && ticker.last) {
        console.log(`✅ CCXT Spot OK - BTC/USDT: $${ticker.last}`);
        results.ccxtSpotTest = true;
      } else {
        throw new Error('Ticker inválido retornado');
      }
    } catch (error) {
      console.error(`❌ CCXT Spot FALHOU:`, error.message);
      results.errors.push(`CCXT Spot: ${error.message}`);
    }
    
    // 🧪 TESTE 3: CCXT Futures usando net.js
    console.log('\n💎 TESTE 3: CCXT Futures Exchange');
    try {
      const futuresExchange = makeFuturesExchange();
      const ticker = await futuresExchange.fetchTicker('BTC/USDT:USDT');
      
      if (ticker && ticker.last) {
        console.log(`✅ CCXT Futures OK - BTC/USDT: $${ticker.last}`);
        results.ccxtFuturesTest = true;
      } else {
        throw new Error('Ticker futures inválido retornado');
      }
    } catch (error) {
      console.error(`❌ CCXT Futures FALHOU:`, error.message);
      results.errors.push(`CCXT Futures: ${error.message}`);
    }
    
    // 🧪 TESTE 4: API pública Spot (fallback)
    console.log('\n🔄 TESTE 4: API pública Binance Spot');
    try {
      const response = await makeFetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = await response.json();
      
      if (data.lastPrice) {
        console.log(`✅ API pública Spot OK - BTC/USDT: $${data.lastPrice}`);
        results.publicApiTest = true;
      } else {
        throw new Error('Dados de preço inválidos');
      }
    } catch (error) {
      console.error(`❌ API pública Spot FALHOU:`, error.message);
      results.errors.push(`API pública Spot: ${error.message}`);
    }
    
    // 🧪 TESTE 5: API pública Futures (fallback)
    console.log('\n💼 TESTE 5: API pública Binance Futures');
    try {
      const response = await makeFetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT');
      const data = await response.json();
      
      if (data.lastPrice) {
        console.log(`✅ API pública Futures OK - BTC/USDT: $${data.lastPrice}`);
        results.publicFuturesApiTest = true;
      } else {
        throw new Error('Dados de preço futures inválidos');
      }
    } catch (error) {
      console.error(`❌ API pública Futures FALHOU:`, error.message);
      results.errors.push(`API pública Futures: ${error.message}`);
    }
    
  } catch (globalError) {
    console.error('❌ ERRO GLOBAL no smoke test:', globalError.message);
    results.errors.push(`Global: ${globalError.message}`);
  }
  
  // 📊 RESUMO FINAL
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DO SMOKE TEST');
  console.log('=' .repeat(60));
  
  const successCount = Object.values(results).filter(v => v === true).length;
  const totalTests = 5;
  
  console.log(`✅ Testes bem-sucedidos: ${successCount}/${totalTests}`);
  console.log(`🌐 Proxy habilitado: ${networkStatus.proxyEnabled ? 'SIM' : 'NÃO'}`);
  
  if (results.httpTest) console.log('✅ HTTP básico: OK');
  if (results.ccxtSpotTest) console.log('✅ CCXT Spot: OK');
  if (results.ccxtFuturesTest) console.log('✅ CCXT Futures: OK');
  if (results.publicApiTest) console.log('✅ API pública Spot: OK');
  if (results.publicFuturesApiTest) console.log('✅ API pública Futures: OK');
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERROS ENCONTRADOS:');
    results.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  // 🎯 DIAGNÓSTICO E RECOMENDAÇÕES
  console.log('\n🎯 DIAGNÓSTICO:');
  
  if (successCount === totalTests) {
    console.log('🎉 PERFEITO! Todos os testes passaram - sistema pronto para uso');
  } else if (successCount >= 3) {
    console.log('✅ BOM! Maioria dos testes passou - sistema funcional com alguns fallbacks');
  } else if (successCount >= 1) {
    console.log('⚠️  PARCIAL! Alguns testes passaram - verifique configuração de proxy/rede');
  } else {
    console.log('❌ CRÍTICO! Nenhum teste passou - problema de conectividade ou configuração');
  }
  
  // 💡 RECOMENDAÇÕES
  if (!networkStatus.proxyEnabled && successCount < totalTests) {
    console.log('\n💡 RECOMENDAÇÃO: Considere usar PROXY_URL se estiver em região restrita');
  }
  
  if (networkStatus.proxyEnabled && successCount < totalTests) {
    console.log('\n💡 RECOMENDAÇÃO: Verifique se PROXY_URL está funcionando ou tente conexão direta');
  }
  
  console.log('\n🏁 Smoke test concluído');
  
  return {
    success: successCount >= 3, // Pelo menos 3 testes devem passar
    results,
    networkStatus
  };
}

/**
 * 🚀 EXECUTAR SMOKE TEST
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  smokeTest()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Smoke test falhou completamente:', error);
      process.exit(1);
    });
}

export { smokeTest };