import { AetherisOrchestrator } from '../lib/agent-engine';
import { supabaseAdmin } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debug() {
  const ticker = 'SGTM';
  console.log(`🔍 Debugging analysis for ${ticker}...`);
  
  // Force delete cache
  await supabaseAdmin.from('analysis_cache').delete().eq('ticker', ticker);
  
  const result = await AetherisOrchestrator.process(ticker, 'STRATEGY');
  
  console.log('--- DATA SENT TO UI ---');
  console.log('Price:', result.price);
  console.log('Support:', result.support);
  console.log('Resistance:', result.resistance);
  console.log('RSI:', JSON.stringify(result.rsi));
  console.log('--- AI RESPONSE ---');
  console.log('Final Action:', result.orchestrator?.finalAction);
  console.log('Why:', result.orchestrator?.why);
  console.log('Ideal Entry Point:', result.orchestrator?.idealEntryPoint);
  console.log('Strategy Plan:', result.orchestrator?.strategyPlan);
  console.log('--- END ---');
}

debug();
