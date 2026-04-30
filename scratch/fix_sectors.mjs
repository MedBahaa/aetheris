const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ════════════════════════════════════════════
// SECTEURS RÉELS BVC (Bourse de Casablanca)
// Source: Casablanca Bourse - Classification Officielle
// ════════════════════════════════════════════
const SECTOR_UPDATES = {
  // Banques
  'ATW': 'Banques',
  'BCP': 'Banques',
  'BOA': 'Banques',
  'CIH': 'Banques',
  'CDM': 'Banques',
  'ATTIJARI': 'Banques',
  
  // Assurances
  'WAFA ASSUR': 'Assurances',
  'SANLAM MAROC': 'Assurances',
  
  // Télécoms
  'IAM': 'Télécoms',
  
  // Mines
  'MNG': 'Mines',
  'CMT': 'Mines',
  'SMI': 'Mines',
  'OCP': 'Mines',

  // Bâtiment & Matériaux de Construction
  'LHM': 'Bâtiment & Matériaux',
  'CMA': 'Bâtiment & Matériaux',
  'CIMENTS MAROC': 'Bâtiment & Matériaux',
  'LAFARGE': 'Bâtiment & Matériaux',
  'TGCC': 'Bâtiment & Matériaux', 
  'SGTM': 'Bâtiment & Matériaux',
  'ALM': 'Bâtiment & Matériaux',
  'ALUMINIUM MAROC': 'Bâtiment & Matériaux',
  'COL': 'Bâtiment & Matériaux',
  
  // Immobilier
  'ADI': 'Immobilier',
  'ADH': 'Immobilier',
  'RDS': 'Immobilier',
  
  // Santé & Pharmacie
  'AKT': 'Santé',
  'SOT': 'Santé & Pharmacie',
  
  // Agroalimentaire
  'DARI COUSPATE': 'Agroalimentaire',
  'CSM': 'Agroalimentaire',
  'LABEL VIE': 'Distribution',
  
  // Distribution
  'SNA': 'Distribution',
  'AUTO HALL': 'Distribution Automobile',
  'AUTO NEJMA': 'Distribution Automobile',
  
  // Holdings
  'DELTA HOLDING': 'Holdings',
  'SNI': 'Holdings',
  
  // Énergie
  'TAQ': 'Énergie',
  'TAQA': 'Énergie',
  'AFG': 'Énergie',
  
  // Industrie
  'AFM': 'Industrie',
  'AFRI': 'Industrie',
  'CTM': 'Transport',
  'SALAFIN': 'Sociétés de Financement',
  'AFRIC INDUS.': 'Industrie',

  // Technologie
  'HPS': 'Technologie',
  'MICRODATA': 'Technologie',

  // Agriculture
  'CMGP GROUP': 'Équipements Agricoles',

  // Services
  'AGM': 'Services',
  'ARD': 'Industrie',
  'ASW': 'Assurances',
};

// ════════════════════════════════════════════
// ENTREPRISES MANQUANTES (à ajouter dans la DB)
// ════════════════════════════════════════════
const MISSING_COMPANIES = [
  { symbol: 'COSUMAR', name: 'COSUMAR', sector: 'Agroalimentaire' },
  { symbol: 'FENIE BROSSETTE', name: 'FENIE BROSSETTE', sector: 'Distribution Industrielle' },
  { symbol: 'SOD', name: 'SONASID', sector: 'Sidérurgie' },
  { symbol: 'RESID DAR SAADA', name: 'RÉSIDENCES DAR SAADA', sector: 'Immobilier' },
];

// ═══ STEP 1: Update existing sectors ═══
console.log('═══ UPDATING SECTORS ═══');
let updated = 0, failed = 0;

for (const [symbol, sector] of Object.entries(SECTOR_UPDATES)) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?symbol=eq.${encodeURIComponent(symbol)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sector })
    }
  );
  const result = await res.json();
  if (Array.isArray(result) && result.length > 0) {
    console.log(`  ✅ ${symbol.padEnd(18)} → ${sector}`);
    updated++;
  } else {
    console.log(`  ⚠️  ${symbol.padEnd(18)} → NOT FOUND (skip)`);
    failed++;
  }
}

console.log(`\nSecteurs mis à jour: ${updated} | Non trouvés: ${failed}`);

// ═══ STEP 2: Add missing companies ═══
console.log('\n═══ ADDING MISSING COMPANIES ═══');
for (const company of MISSING_COMPANIES) {
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?symbol=eq.${encodeURIComponent(company.symbol)}&select=id`,
    { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
  );
  const existing = await checkRes.json();
  
  if (existing.length > 0) {
    // Update sector if exists
    await fetch(
      `${SUPABASE_URL}/rest/v1/companies?symbol=eq.${encodeURIComponent(company.symbol)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ sector: company.sector })
      }
    );
    console.log(`  🔄 ${company.symbol} → Updated sector to "${company.sector}"`);
  } else {
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/companies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(company)
      }
    );
    const result = await insertRes.json();
    if (insertRes.ok) {
      console.log(`  ✅ ${company.symbol} → Inserted (${company.sector})`);
    } else {
      console.log(`  ❌ ${company.symbol} → ERROR: ${JSON.stringify(result)}`);
    }
  }
}

// ═══ STEP 3: Verify final state ═══
console.log('\n═══ VERIFICATION FINALE ═══');
const verifyRes = await fetch(
  `${SUPABASE_URL}/rest/v1/companies?select=symbol,sector&order=symbol`,
  { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
);
const allCompanies = await verifyRes.json();
const withSector = allCompanies.filter(c => c.sector);
const withoutSector = allCompanies.filter(c => !c.sector);
console.log(`Total: ${allCompanies.length} | Avec secteur: ${withSector.length} | Sans secteur: ${withoutSector.length}`);
if (withoutSector.length > 0) {
  console.log('Sans secteur:', withoutSector.map(c => c.symbol).join(', '));
}
