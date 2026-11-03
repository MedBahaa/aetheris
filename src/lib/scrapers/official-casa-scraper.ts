import * as cheerio from 'cheerio';

export interface OfficialCasaData {
  netProfit?: string;
  roe?: string;
  status: 'success' | 'error';
}

export class OfficialCasaScraper {
  private static BASE_URL = 'https://www.casablanca-bourse.com';

  /**
   * Extrait les données fondamentales (RNPG, ROE) depuis le site officiel de la Bourse de Casablanca
   */
  static async getFundamentalData(symbol: string): Promise<OfficialCasaData> {
    try {
      console.log(`[OfficialCasa] Tentative de résolution pour le symbole: ${symbol}...`);
      
      const cleanSymbol = symbol.trim().toUpperCase();
      if (!/^[A-Z0-9._\-]{1,15}$/.test(cleanSymbol)) {
        return { status: 'error' };
      }

      // 1. Résoudre le lien de l'émetteur via la page de l'instrument
      const instrumentUrl = `${this.BASE_URL}/fr/live-market/instruments/${encodeURIComponent(cleanSymbol)}`;
      const instrumentRes = await fetch(instrumentUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!instrumentRes.ok) throw new Error(`Instrument page HTTP ${instrumentRes.status}`);
      const instrumentHtml = await instrumentRes.text();
      const $inst = cheerio.load(instrumentHtml);
      
      const issuerLink = $inst('a[href^="/fr/live-market/emetteurs/"]').first().attr('href');
      
      if (!issuerLink || !/^\/fr\/live-market\/emetteurs\/[A-Za-z0-9\-_]+$/.test(issuerLink)) {
        console.warn(`[OfficialCasa] ❌ Lien émetteur introuvable ou invalide pour "${cleanSymbol}"`);
        return { status: 'error' };
      }

      const resolvedIssuerUrl = new URL(issuerLink, this.BASE_URL);
      if (resolvedIssuerUrl.origin !== this.BASE_URL) {
        return { status: 'error' };
      }
      const issuerUrl = resolvedIssuerUrl.toString();
      console.log(`[OfficialCasa] Fiche émetteur trouvée: ${issuerUrl}`);

      // 2. Récupérer les données sur la fiche émetteur
      const issuerRes = await fetch(issuerUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!issuerRes.ok) throw new Error(`Issuer page HTTP ${issuerRes.status}`);
      const issuerHtml = await issuerRes.text();
      const $ = cheerio.load(issuerHtml);

      const result: OfficialCasaData = { status: 'success' };

      // Sélecteurs précis basés sur l'inspection DOM
      // On cherche la ligne qui contient le label et on prend la première valeur (2025 ou la plus récente)
      
      $('tr').each((_, el) => {
        const rowText = $(el).find('td:first-child').text().trim();
        
        // Résultat Net Part du Groupe (Marqué comme "Résultat net (4)" sur le site)
        if (rowText.includes('Résultat net (4)')) {
          const val = $(el).find('td:nth-child(2)').text().trim();
          if (val && val !== '-') result.netProfit = val;
        }
        
        // ROE (Rentabilité des fonds propres)
        if (rowText.includes('ROE (en %)')) {
          const val = $(el).find('td:nth-child(2)').text().trim();
          if (val && val !== '-') result.roe = val + '%';
        }
      });

      console.log(`[OfficialCasa] ✅ Données extraites: ROE=${result.roe || 'N/A'}, RNPG=${result.netProfit || 'N/A'}`);
      return result;

    } catch (e: any) {
      console.error(`[OfficialCasa] ❌ Erreur lors du scraping:`, e.message);
      return { status: 'error' };
    }
  }
}
