const { BMCEBourseScraper } = require('../src/lib/scrapers/bmce-scraper');

async function testLiveScraping() {
    console.log("--- TEST LIVE SCRAPING AKDITAL ---");
    const startTime = Date.now();
    try {
        const data = await BMCEBourseScraper.getStockData('AKDITAL');
        const duration = (Date.now() - startTime) / 1000;
        console.log(`Duration: ${duration}s`);
        console.log("Data received:", JSON.stringify(data, null, 2));
        
        if (data.status === 'success' && parseFloat(data.price.replace(',', '.')) > 0) {
            console.log("SUCCESS: Scraper working correctly.");
        } else {
            console.log("FAILURE: Invalid data or scraping failed.");
        }
    } catch (e) {
        console.error("CRITICAL ERROR:", e.message);
    }
}

testLiveScraping();
