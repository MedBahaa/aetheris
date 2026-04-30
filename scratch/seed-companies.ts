import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const STOCK_MAP = {
  'AKDITAL': '123429130,102,608',
  'MAROC TELECOM': '1832967,102,608',
  'IAM': '1832967,102,608',
  'BCP': '4998885,102,608',
  'ATTIJARIWAFA BANK': '56107421,102,608',
  'ATTIJARI': '56107421,102,608',
  'LAFARGEHOLCIM MAROC': '33076955,102,608',
  'LAFARGE': '33076955,102,608',
  'COSUMAR': '26545773,102,608',
  'ADDOHA': '2585582,102,608',
  'AFMA': '30475766,102,608',
  'AFRIC INDUS.': '14506826,102,608',
  'AFRIQUIA GAZ': '1035527,102,608',
  'AGMA': '1028379,102,608',
  'ALLIANCES': '4402446,102,608',
  'ALUMINIUM MAROC': '521641,102,608',
  'ARADEI CAPITAL': '58537666,102,608',
  'ATLANTASANAD': '3428404,102,608',
  'AUTO HALL': '1028380,102,608',
  'AUTO NEJMA': '1041513,102,608',
  'CIH': '2395856,102,608',
  'CIMENTS MAROC': '18337,102,608',
  'CMGP GROUP': '140242147,102,608',
  'CMT': '4240267,102,608',
  'COLORADO': '11349116,102,608',
  'CTM': '277392,102,608',
  'DARI COUSPATE': '2199434,102,608',
  'DELTA HOLDING': '4625623,102,608',
  'MANAGEM': '1103450,102,608',
  'MICRODATA': '18738219,102,608',
  'SALAFIN': '3570640,102,608',
  'SANLAM MAROC': '11994556,102,608',
  'SMI': '659253,102,608',
  'SOTHEMA': '112290536,102,608',
  'WAFA ASSUR': '935037,102,608',
  'HPS': '129902470,102,608',
  'BANK OF AFRICA': '56110292,102,608',
  'BOA': '56110292,102,608',
  'TAQA MOROCCO': '26634125,102,608',
  'TAQA': '26634125,102,608',
  'LABEL VIE': '5648834,102,608'
};

async function seed() {
  console.log('--- Initialisation du seeding ---');
  
  const entries = Object.entries(STOCK_MAP).map(([symbol, bmce_id]) => ({
    name: symbol, // On utilise le symbole comme nom par défaut pour l'instant
    symbol: symbol,
    bmce_id: bmce_id
  }));

  const { data, error } = await supabase
    .from('companies')
    .upsert(entries, { onConflict: 'symbol' });

  if (error) {
    console.error('Erreur lors du seeding:', error);
  } else {
    console.log('Seeding réussi !', entries.length, 'sociétés insérées.');
  }
}

seed();
