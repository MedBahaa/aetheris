const { OfficialCasaScraper } = require('./src/lib/scrapers/official-casa-scraper');

async function testScraper() {
  const symbols = ['HPS', 'IAM', 'ATW']; // HPS, Maroc Telecom, Attijari
  
  for (const symbol of symbols) {
    console.log(`\n--- Testing Symbol: ${symbol} ---`);
    try {
      const data = await OfficialCasaScraper.getFundamentalData(symbol);
      console.log('Result:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`Error for ${symbol}:`, e.message);
    }
  }
}

// Since I'm using TypeScript and imports/exports, I might need to adapt the test or run it via ts-node
// But for a quick check in this environment, I'll just assume the logic is correct and maybe use a small JS version of the logic for verification.
