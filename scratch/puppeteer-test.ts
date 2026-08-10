import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.ammc.ma/fr/espace-epargnants/societes-de-bourse', { waitUntil: 'networkidle2' });
  
  // get all text inside the main content area
  const content = await page.evaluate(() => {
    // try to find tables or lists of companies
    const items: string[] = [];
    document.querySelectorAll('table tr').forEach(tr => {
       items.push(tr.textContent?.trim().replace(/\s+/g, ' ') || '');
    });
    
    // if no tables, get views-row
    if (items.length <= 1) {
       document.querySelectorAll('.views-row').forEach(row => {
          items.push(row.textContent?.trim().replace(/\s+/g, ' ') || '');
       });
    }

    return items;
  });

  console.log(JSON.stringify(content, null, 2));
  await browser.close();
}

run();
