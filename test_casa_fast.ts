import { CasabourseScraper } from './src/lib/scrapers/casabourse-scraper';

async function testCasa() {
  console.log("Testing Fast-HTML CasabourseScraper for DISWAY...");
  const start = Date.now();
  const data = await CasabourseScraper.getFundamentalData('DISWAY', 'DWY');
  const end = Date.now();
  console.log("Data:", data);
  console.log(`Execution time: ${end - start}ms`);
}

testCasa();
