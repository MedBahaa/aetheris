import { BMCEBourseScraper } from '../src/lib/scrapers/bmce-scraper';

async function verifyMultiCompany() {
  const testCompanies = ['IAM', 'BCP', 'ADDOHA', 'COSUMAR'];
  console.log(`--- Verifying Multi-Company Support (${testCompanies.length} stocks) ---`);

  for (const name of testCompanies) {
    console.log(`\nTesting: ${name}...`);
    const start = Date.now();
    try {
      const data = await BMCEBourseScraper.getStockData(name);
      const duration = (Date.now() - start) / 1000;
      
      console.log(`Result for ${name} (${data.resolvedName}):`);
      console.log(`- Price: ${data.price} MAD`);
      console.log(`- Var:   ${data.variation}`);
      console.log(`- Status: ${data.status}`);
      console.log(`- Time:   ${duration.toFixed(1)}s`);

      if (data.status === 'success' && parseFloat(data.price) > 0) {
        console.log(`✅ Success: ${name} is valid.`);
      } else {
        console.log(`❌ Failed: ${name} returned invalid data.`);
      }
    } catch (e: any) {
      console.error(`❌ Error for ${name}:`, e.message);
    }
  }
}

verifyMultiCompany();
