import { supabaseAdmin as supabase } from '../lib/supabase';

const NEW_MAPPINGS = [
  { symbol: 'IAM', id: '1832967' },
  { symbol: 'RDS', id: '26125006' },
  { symbol: 'LHM', id: '33076955' },
  { symbol: 'TAQ', id: '23057746' },
  { symbol: 'MNG', id: '1103450' },
  { symbol: 'AKT', id: '123429130' }
];

async function updateIds() {
  console.log('🚀 Updating BMCE IDs for technical analysis...');

  for (const mapping of NEW_MAPPINGS) {
    console.log(`Updating ${mapping.symbol} with ID ${mapping.id}...`);
    
    const { error } = await supabase
      .from('companies')
      .update({ bmce_id: mapping.id })
      .eq('symbol', mapping.symbol);

    if (error) {
      console.error(`❌ Error updating ${mapping.symbol}:`, error.message);
    } else {
      console.log(`✅ ${mapping.symbol} updated.`);
    }
  }

  console.log('✨ All IDs updated successfully.');
}

updateIds();
