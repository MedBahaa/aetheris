import 'dotenv/config';
import { AetherisOrchestrator } from './src/lib/agent-engine';

async function test() {
  console.log("Running AetherisOrchestrator.process('IAM', 'STRATEGY')...");
  try {
    const result = await AetherisOrchestrator.process('IAM', 'STRATEGY', true);
    console.log("Orchestrator fallback:", JSON.stringify(result.orchestrator, null, 2));
    console.log("Horizons:", JSON.stringify(result.horizons, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
