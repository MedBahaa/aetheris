import { MarketWorker } from './src/lib/agents/worker-agents';

async function test() {
  console.log("--- DEBUG AKDITAL ---");
  try {
    const analysis = await MarketWorker.analyze('AKDITAL');
    console.log("Analysis Result:", JSON.stringify(analysis, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
