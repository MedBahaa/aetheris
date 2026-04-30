import { CasabourseScraper } from './src/lib/scrapers/casabourse-scraper';
import { BMCEBourseScraper } from './src/lib/scrapers/bmce-scraper';

async function test() {
  const companies = ['IAM', 'AKDITAL', 'Maroc Telecom'];
  
  for (const c of companies) {
    console.log(`\n--- TESTING: ${c} ---`);
    const casa = await CasabourseScraper.getFundamentalData(c);
    const bmce = await BMCEBourseScraper.getFundamentalData(c);
    console.log(`CASA [${c}]:`, casa);
    console.log(`BMCE [${c}]:`, bmce);
  }
}

test();
