import { supabaseAdmin as supabase } from '../lib/supabase';

const mapping = [
  { symbol: 'AKT', bmce_id: '123429130', name: 'AKDITAL' },
  { symbol: 'IAM', bmce_id: '155210', name: 'MAROC TELECOM' },
  { symbol: 'ATW', bmce_id: '155106', name: 'ATTIJARIWAFA BANK' },
  { symbol: 'BOA', bmce_id: '155099', name: 'BANK OF AFRICA' },
  { symbol: 'BCP', bmce_id: '155098', name: 'BANQUE CENTRALE POPULAIRE' },
  { symbol: 'ADH', bmce_id: '2585582', name: 'ADDOHA' },
  { symbol: 'AFM', bmce_id: '30475766', name: 'AFMA' },
  { symbol: 'AFRI', bmce_id: '14506826', name: 'AFRIC INDUSTRIES' },
  { symbol: 'AFG', bmce_id: '1035527', name: 'AFRIQUIA GAZ' },
  { symbol: 'AGM', bmce_id: '1028379', name: 'AGMA' },
  { symbol: 'ADI', bmce_id: '4402446', name: 'ALLIANCES' },
  { symbol: 'ALM', bmce_id: '521641', name: 'ALUMINIUM DU MAROC' },
  { symbol: 'ARD', bmce_id: '58537666', name: 'ARADEI CAPITAL' },
  { symbol: 'ASW', bmce_id: '3428404', name: 'ATLANTASANAD' },
  { symbol: 'CDM', bmce_id: '781650', name: 'CREDIT DU MAROC' },
  { symbol: 'CIH', bmce_id: '2395856', name: 'CIH BANK' },
  { symbol: 'CMA', bmce_id: '18337', name: 'CIMENTS DU MAROC' },
  { symbol: 'CMT', bmce_id: '4240267', name: 'COMPAGNIE MINIERE DE TOUISSIT' },
  { symbol: 'COL', bmce_id: '11349116', name: 'COLORADO' },
  { symbol: 'CSM', bmce_id: '26545773', name: 'COSUMAR' },
  { symbol: 'CTM', bmce_id: '277392', name: 'CTM' },
  { symbol: 'TQM', bmce_id: '23057746', name: 'TAQA MOROCCO' },
  { symbol: 'SOT', bmce_id: '112290536', name: 'SOTHEMA' },
  { symbol: 'TGCC', bmce_id: '115038557', name: 'TGCC' },
  { symbol: 'SNA', bmce_id: '138953776', name: 'STOKVIS NORD AFRIQUE' },
  { symbol: 'SGTM', bmce_id: '150904121', name: 'SGTM' }
];

async function seedPremium() {
  console.log('🚀 Seeding BMCE IDs for top 25 Moroccan stocks...');
  
  for (const item of mapping) {
    const { error } = await supabase
      .from('companies')
      .upsert({ 
        symbol: item.symbol, 
        name: item.name, 
        bmce_id: item.bmce_id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'symbol' });
      
    if (error) console.error(`❌ Error seeding ${item.symbol}:`, error.message);
    else console.log(`✅ Seeded ${item.symbol} with ID ${item.bmce_id}`);
  }
  
  console.log('✨ Premium Seeding complete.');
}

seedPremium();
