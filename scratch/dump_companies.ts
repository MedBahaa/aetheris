import { supabaseAdmin } from './src/lib/supabase';

async function dumpCompanies() {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('symbol, name');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

dumpCompanies();
