const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=symbol,name,sector&order=symbol`, {
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  }
});
const data = await res.json();
console.log(`Total companies: ${data.length}`);
console.log('\nSymbol → Sector mapping:');
data.forEach(c => console.log(`  ${c.symbol.padEnd(12)} → ${c.sector || '(VIDE)'}`));

// Check the user's portfolio symbols
const txRes = await fetch(`${SUPABASE_URL}/rest/v1/portfolio_transactions?select=symbol`, {
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  }
});
const txData = await txRes.json();
const uniqueSymbols = [...new Set(txData.map(t => t.symbol))];
console.log('\n--- Symbols in portfolio ---');
uniqueSymbols.forEach(s => {
  const match = data.find(c => c.symbol === s);
  console.log(`  ${s.padEnd(12)} → ${match ? match.sector || '(VIDE)' : '❌ NOT IN DB'}`);
});
