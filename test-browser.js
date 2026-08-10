const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  console.log("Navigating to /console...");
  await page.goto('http://localhost:3000/console', { waitUntil: 'networkidle2' });
  
  console.log("Typing 'ATW'...");
  await page.type('.terminal-input', 'ATW');
  
  console.log("Clicking submit...");
  await page.click('button[type="submit"]');
  
  console.log("Waiting 15 seconds for analysis to finish...");
  await new Promise(r => setTimeout(r, 15000));
  
  console.log("Checking if error boundary appeared...");
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes("Erreur de connexion")) {
     console.log("ERROR BOUNDARY DETECTED!");
  } else {
     console.log("No error boundary. Text excerpt:", bodyText.substring(0, 200));
  }
  
  await browser.close();
})();
