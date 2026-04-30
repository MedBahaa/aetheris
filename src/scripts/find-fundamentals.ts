import * as cheerio from 'cheerio';

async function run() {
  // SNA ID from my mapping: 138953776
  const tickerId = '138953776'; 
  const url = `https://www.bmcecapitalbourse.com/bkbbourse/details/${tickerId},102,608`;
  
  console.log(`Fetching ${url}...`);
  const response = await fetch(url, {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Extract all text from Tab 3
  const tabContent = $('#Tab3').text();
  console.log('--- TAB 3 CONTENT ---');
  console.log(tabContent || 'NOT FOUND');
  
  // Extract specific ratios if they exist
  const results: any = {};
  $('#Tab3 table tr').each((_, row) => {
    const cells = $(row).find('td, th');
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim();
      const val = $(cells[1]).text().trim();
      if (key.includes('Capitalisation') || key.includes('Rendement') || key.includes('PER') || key.includes('Bénéfice') || key.includes('P/E')) {
        results[key] = val;
      }
    }
  });
  
  console.log('--- RATIOS FOUND ---');
  console.log(JSON.stringify(results, null, 2));
}

run();
