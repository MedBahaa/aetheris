import { AetherisOrchestrator } from './src/lib/agent-engine';

async function main() {
  try {
    console.log("Running AetherisOrchestrator...");
    const result = await AetherisOrchestrator.process('ATW', 'STRATEGY');
    console.log("Success! Keys:", Object.keys(result));
    console.log("Horizons keys:", Object.keys(result.horizons || {}));
    console.log("Result type:", result.type);
    
    // Simulate what React does when rendering
    const data = result.horizons ? result.horizons['shortTerm'] : result.orchestrator;
    if (!data) console.log("DATA IS NULL!");
    
    if (result.type === 'STRATEGY') {
        console.log("Is finalAction valid?", data.finalAction);
        console.log("Is risk valid?", data.risk);
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
