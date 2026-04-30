import { AetherisOrchestrator } from '../lib/agent-engine';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugFundamental() {
  console.log('🔍 Starting Fundamental Debug for AKDITAL...');
  
  try {
    // Force a fresh analysis (skip cache for debug)
    const result = await AetherisOrchestrator.process('AKDITAL', 'STRATEGY');
    
    console.log('--- FUNDAMENTALS DETECTED ---');
    console.log('P/E Ratio:', result.fundamentals?.peRatio);
    console.log('Dividend Yield:', result.fundamentals?.dividendYield);
    console.log('Market Cap:', result.fundamentals?.marketCap);
    console.log('Sector:', result.fundamentals?.sector);
    
    console.log('\n--- AI STRATEGIC REASONING ---');
    console.log('Recommended Action:', result.recommendedAction);
    console.log('Why:', result.orchestrator?.why);
    
    if (result.fundamentals?.peRatio !== 'N/A') {
      console.log('✅ SUCCESS: Real fundamentals integrated.');
    } else {
      console.warn('⚠️ WARNING: Fundamentals are still N/A.');
    }
    
  } catch (error) {
    console.error('❌ DEBUG FAILED:', error);
  }
}

debugFundamental();
