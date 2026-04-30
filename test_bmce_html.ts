import * as cheerio from 'cheerio';

async function testBmceHtml() {
  console.log("Fetching BMCE Bourse...");
  // ID pour Maroc Telecom: 144
  const res = await fetch('https://www.bmcecapitalbourse.com/bkbbourse/details/144,102,608', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // Tab3 = Statistiques
  const tab3 = $('#Tab3').html();
  // Tab6 = Indicateurs
  const tab6 = $('#Tab6').html();
  console.log("Tab3 length:", tab3?.length || 0);
  console.log("Tab6 length:", tab6?.length || 0);
}

testBmceHtml();
