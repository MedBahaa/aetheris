import { SymbolMapper } from '../symbol-mapper';

export class WafabourseScraper {
  /**
   * Récupère l'historique des cours de clôture pour une action.
   */
  static async getStockHistory(company: string): Promise<number[]> {
    const symbol = SymbolMapper.resolve(company) || company;
    console.log(`[WafabourseScraper] Récupération de l'historique pour : ${symbol}...`);

    try {
      // 1. Récupération du token de session et du cookie CSRF
      const tokenRes = await fetch('https://www.wafabourse.com/api/proxy/token', {
        headers: {
          'Origin': 'https://www.wafabourse.com',
          'Referer': 'https://www.wafabourse.com/fr/market-tracking',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      if (!tokenRes.ok) {
        throw new Error(`Échec de récupération du token : HTTP ${tokenRes.status}`);
      }

      const tokenData = await tokenRes.json();
      const token = tokenData.token;

      // Extraction du cookie
      const setCookie = tokenRes.headers.get('set-cookie');
      const cookiesStr = setCookie ? setCookie.split(';')[0] : '';

      // 2. Requête POST pour obtenir l'historique (action VALEUR-GRAPH)
      const postData = {
        "ACTIONS": [
          {
            "ACTION": {
              "NAME": "VALEUR-GRAPH",
              "TYPE": "SELECT",
              "VALUE": "VALEUR-GRAPH"
            },
            "PARAMS": [
              {
                "NAME": "Symbol_",
                "TYPE": "S",
                "VALUE": symbol
              }
            ]
          }
        ]
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Origin': 'https://www.wafabourse.com',
        'Referer': 'https://www.wafabourse.com/fr/market-tracking',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-proxy-token': token
      };

      if (cookiesStr) {
        headers['Cookie'] = cookiesStr;
      }

      const graphRes = await fetch('https://www.wafabourse.com/api/proxy/data/JNNJ', {
        method: 'POST',
        headers,
        body: JSON.stringify(postData)
      });

      if (!graphRes.ok) {
        throw new Error(`Échec de récupération du graphique : HTTP ${graphRes.status}`);
      }

      const parsed = await graphRes.json();
      const dataPoints = parsed[0]?.["VALEUR-GRAPH"]?.Data;

      if (!dataPoints || !Array.isArray(dataPoints)) {
        console.warn(`[WafabourseScraper] Pas de données graphiques valides pour ${symbol}`);
        return [];
      }

      // Extraction des cours de clôture
      const closes = dataPoints
        .map((dp: any) => typeof dp.Cours === 'number' ? dp.Cours : parseFloat(dp.Cours))
        .filter((c: number) => !isNaN(c) && c > 0);

      console.log(`[WafabourseScraper] Succès : ${closes.length} séances récupérées pour ${symbol}`);
      return closes;

    } catch (error: any) {
      console.error(`[WafabourseScraper] Erreur sur ${symbol} :`, error.message);
      return [];
    }
  }
}
