import { AetherisOrchestrator } from './src/lib/agent-engine';

async function test() {
  console.log("Testing orchestrator for DISWAY...");
  const analysis = await AetherisOrchestrator.process('DISWAY', 'STRATEGY', true);
  console.log(JSON.stringify(analysis.orchestrator, null, 2));
  console.log("Ideal Entry Point:", analysis.idealEntryPoint);
}

test();
