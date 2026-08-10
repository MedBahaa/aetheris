import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabaseAdmin as supabase } from '../lib/supabase';

async function scrapeAmmcBrokers() {
  console.log('🚀 Démarrage du scraping des Sociétés de Bourse depuis l\'AMMC...');
  
  try {
    const response = await axios.get('https://www.ammc.ma/entreprises-de-marche/societes-de-bourse-sdb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const brokers: any[] = [];
    
    $('table tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 4) {
        // AMMC table columns: [Logo (empty/img)], [Nom], [Agrément], [Date d'agrément]
        let name = $(cols[1]).text().replace(/\s+/g, ' ').trim();
        let agrement = $(cols[2]).text().replace(/\s+/g, ' ').trim();
        let dateAgrement = $(cols[3]).text().replace(/\s+/g, ' ').trim();
        
        // If the first col has the name (different layout)
        if (!name && $(cols[0]).text().trim().length > 3) {
            name = $(cols[0]).text().replace(/\s+/g, ' ').trim();
            agrement = $(cols[1]).text().replace(/\s+/g, ' ').trim();
            dateAgrement = $(cols[2]).text().replace(/\s+/g, ' ').trim();
        }

        if (name && name.length > 2) {
          brokers.push({
            name,
            agrement,
            date_agrement: dateAgrement,
            updated_at: new Date().toISOString()
          });
        }
      }
    });

    console.log(`📊 ${brokers.length} sociétés de bourse trouvées. Insertion dans Supabase...`);

    let successCount = 0;
    for (const broker of brokers) {
      const { error } = await supabase
        .from('brokerage_firms')
        .upsert({ 
          name: broker.name, 
          agrement: broker.agrement, 
          date_agrement: broker.date_agrement 
        }, { onConflict: 'name' });
        
      if (error) {
        console.error(`❌ Erreur lors de l'insertion de ${broker.name}:`, error.message);
      } else {
        successCount++;
      }
    }
    
    console.log(`✨ Scraping terminé. ${successCount}/${brokers.length} sociétés insérées/mises à jour avec succès.`);
    
  } catch (err: any) {
    console.error('❌ Échec du scraping:', err.message);
  }
}

scrapeAmmcBrokers();
