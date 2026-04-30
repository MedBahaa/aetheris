import * as cheerio from 'cheerio';

async function testCasaScreener() {
  console.log("Fetching Casabourse screener...");
  const res = await fetch('https://casabourse.ma/screener/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const tables = $('table');
  console.log(`Found ${tables.length} tables.`);
  
  if (tables.length > 0) {
    const trs = $('table tr');
    console.log(`Initial rows: ${trs.length}`);
    if (trs.length > 5) {
       console.log("Success! Rendered server-side.");
       return true;
    }
  }
  console.log("Failed: Likely CSR rendered.");
  return false;
}

testCasaScreener();
