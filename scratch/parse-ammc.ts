import axios from 'axios';
import * as cheerio from 'cheerio';

async function fetchAmmc() {
  try {
    const response = await axios.get('https://www.ammc.ma/entreprises-de-marche/societes-de-bourse-sdb');
    const $ = cheerio.load(response.data);
    
    const tableData: any[] = [];
    $('table tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length > 0) {
        tableData.push({
          name: $(cols[0]).text().replace(/\s+/g, ' ').trim(),
          address: $(cols[1]).text().replace(/\s+/g, ' ').trim(),
          phone: $(cols[2]).text().replace(/\s+/g, ' ').trim(),
          fax: $(cols[3]).text().replace(/\s+/g, ' ').trim(),
          email: $(cols[4]).text().replace(/\s+/g, ' ').trim(),
        });
      }
    });

    // if no tables, try views-row
    if (tableData.length === 0) {
        $('.views-row').each((i, row) => {
            tableData.push($(row).text().replace(/\s+/g, ' ').trim());
        });
    }

    console.log(JSON.stringify(tableData.slice(0, 5), null, 2));
    console.log("Total found:", tableData.length);
    
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

fetchAmmc();
