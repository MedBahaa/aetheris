import { MarketWorker } from '../src/lib/agents/worker-agents';

async function test() {
  console.log('🧪 VERIFICATION DES FLUX TECHNIQUES...');
  
  const testCases = ['IAM', 'RDS'];

  for (const ticker of testCases) {
    console.log(`\n--- Test: ${ticker} ---`);
    try {
      const result = await MarketWorker.analyze(ticker);
      
      if (result.price && result.price !== '0.0') {
        console.log(`✅ SUCCÈS pour ${ticker}`);
        console.log(`💰 Prix: ${result.price}`);
        console.log(`📊 Situation: ${result.marketSituation}`);
        console.log(`📉 Support/Résistance: ${result.support} / ${result.resistance}`);
      } else {
        console.error(`❌ ÉCHEC pour ${ticker}: Prix non récupéré.`);
      }
    } catch (e: any) {
      console.error(`❌ ERREUR pour ${ticker}:`, e.message);
    }
  }
}

test();
