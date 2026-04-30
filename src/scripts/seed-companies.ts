import { supabaseAdmin as supabase } from '../lib/supabase';

const companies = [
  { symbol: 'AKT', name: 'AKDITAL', sector: 'Santé' },
  { symbol: 'IAM', name: 'MAROC TELECOM', sector: 'Télécoms' },
  { symbol: 'ATW', name: 'ATTIJARIWAFA BANK', sector: 'Banques' },
  { symbol: 'BCP', name: 'BCP', sector: 'Banques' },
  { symbol: 'BOA', name: 'BANK OF AFRICA', sector: 'Banques' },
  { symbol: 'CIMR', name: 'CIMENTS DU MAROC', sector: 'Bâtiment' },
  { symbol: 'LHM', name: 'LAFARGEHOLCIM MAROC', sector: 'Bâtiment' },
  { symbol: 'ADI', name: 'ALLIANCES', sector: 'Immobilier' },
  { symbol: 'RDS', name: 'RESIDENCES DAR SAADA', sector: 'Immobilier' },
  { symbol: 'SNI', name: 'AL MADA (Ex-SNI)', sector: 'Holding' },
  { symbol: 'TAQ', name: 'TAQA MOROCCO', sector: 'Energie' },
  { symbol: 'OCP', name: 'OCP (Corporate)', sector: 'Mines' },
  { symbol: 'MNG', name: 'MANAGEM', sector: 'Mines' },
  { symbol: 'TGCC', name: 'TGCC', sector: 'Bâtiment' },
  { symbol: 'SNA', name: 'STOKVIS NORD AFRIQUE', sector: 'Distributeurs' },
  { symbol: 'SGTM', name: 'SGTM', sector: 'Bâtiment' },
];

async function seed() {
  console.log('🚀 Seeding basic Casablanca Stock Exchange companies...');
  
  for (const company of companies) {
    const { error } = await supabase
      .from('companies')
      .upsert({ 
        symbol: company.symbol, 
        name: company.name, 
        sector: company.sector,
        updated_at: new Date().toISOString()
      }, { onConflict: 'symbol' });
      
    if (error) console.error(`❌ Error seeding ${company.symbol}:`, error.message);
    else console.log(`✅ Seeded ${company.symbol}`);
  }
  
  console.log('✨ Seed complete.');
}

seed();
