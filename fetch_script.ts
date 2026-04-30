import fs from 'fs';

async function fetchInstruments() {
  try {
    const r = await fetch('https://www.casablanca-bourse.com/fr');
    const html = await r.text();
    const m = html.match(/"buildId":"([^"]+)"/);
    if(m) {
      const buildId = m[1];
      console.log('Build ID:', buildId);
      
      const r2 = await fetch(`https://www.casablanca-bourse.com/_next/data/${buildId}/fr/live-market/instruments.json`);
      if(r2.ok) {
        const j = await r2.json();
        fs.writeFileSync('instruments.json', JSON.stringify(j, null, 2));
        console.log('Saved instruments.json');
      } else {
        console.log('Failed to fetch instruments.json', r2.status);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
fetchInstruments();
