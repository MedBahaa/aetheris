import { supabaseAdmin as supabase } from '../lib/supabase';

async function deduplicate() {
  console.log('🔍 Starting database deduplication...');

  // 1. Fetch all companies
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*');

  if (error || !companies) {
    console.error('❌ Error fetching companies:', error);
    return;
  }

  console.log(`📊 Found ${companies.length} records in total.`);

  // 2. Group by name
  const groups: Record<string, typeof companies> = {};
  for (const c of companies) {
    const name = c.name.toUpperCase().trim();
    if (!groups[name]) groups[name] = [];
    groups[name].push(c);
  }

  const toDelete: string[] = [];

  for (const name in groups) {
    const list = groups[name];
    if (list.length > 1) {
      console.log(`\n🏢 Company: "${name}" (${list.length} entries)`);
      
      // Sort to find the "best" one
      // Priority: 
      // 1. Shortest symbol (usually the ticker like IAM, AKT)
      // 2. Has a sector
      // 3. Most recently updated
      const sorted = [...list].sort((a, b) => {
        // Length of symbol (shorter is better) - Tickers are usually 3-4 chars
        if (a.symbol.length !== b.symbol.length) {
          return a.symbol.length - b.symbol.length;
        }
        // Presence of sector
        if (a.sector && !b.sector) return -1;
        if (!a.sector && b.sector) return 1;
        // Updated at
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      const best = sorted[0];
      const others = sorted.slice(1);

      console.log(`   ✅ KEEPING: Symbol=${best.symbol}, Sector=${best.sector || 'N/A'}`);
      
      for (const other of others) {
        console.log(`   🗑️ DELETING: Symbol=${other.symbol}, Sector=${other.sector || 'N/A'}`);
        toDelete.push(other.id);
      }
    }
  }

  // 3. Perform Deletions
  if (toDelete.length > 0) {
    console.log(`\n🚀 Deleting ${toDelete.length} redundant records...`);
    const { error: delError } = await supabase
      .from('companies')
      .delete()
      .in('id', toDelete);

    if (delError) {
      console.error('❌ Error during deletion:', delError.message);
    } else {
      console.log('✨ Database is now clean.');
    }
  } else {
    console.log('\n✅ No duplicates found to delete.');
  }
}

deduplicate();
