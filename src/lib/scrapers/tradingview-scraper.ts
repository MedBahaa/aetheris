import { SymbolMapper } from '../symbol-mapper';

export interface TradingViewFundamentalData {
  peRatio: string;
  dividendYield: string;
  marketCap: string;
  netProfit: string;
  roe: string;
  margin: string;
  revenueGrowth: string;
  profitGrowth: string;
  status: 'success' | 'error';
}

export class TradingViewScraper {
  /**
   * Récupère les données fondamentales depuis TradingView (CSEMA) avec conversion USD/MAD.
   */
  static async getFundamentalData(company: string, symbolInput?: string): Promise<TradingViewFundamentalData> {
    const symbol = (symbolInput || SymbolMapper.resolve(company) || company).toUpperCase();
    console.log(`[TradingViewScraper] Récupération des fondamentaux pour : CSEMA:${symbol}...`);

    try {
      // Requête pour l'action et pour obtenir le taux USD/MAD
      const postData = {
        symbols: {
          tickers: [`CSEMA:${symbol}`, "FX_IDC:USDMAD"],
          query: { types: [] }
        },
        columns: [
          "name",
          "close",
          "market_cap_basic",
          "price_earnings_ttm",
          "dividends_yield",
          "return_on_equity_fq",
          "net_income",
          "operating_margin",
          "total_revenue",
          "revenue_growth_yoy"
        ]
      };

      const res = await fetch('https://scanner.tradingview.com/global/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify(postData)
      });

      if (!res.ok) {
        throw new Error(`TradingView HTTP Error ${res.status}`);
      }

      const parsed = await res.json();
      const rows = parsed.data || [];

      const stockRow = rows.find((r: any) => r.s === `CSEMA:${symbol}`);
      const rateRow = rows.find((r: any) => r.s === "FX_IDC:USDMAD");

      if (!stockRow) {
        throw new Error(`Symbole CSEMA:${symbol} introuvable dans TradingView`);
      }

      const d = stockRow.d;
      const usdMadRate = rateRow?.d?.[0] || 10.0;

      // Correspondance des indices de colonnes :
      // 0: name
      // 1: close
      // 2: market_cap_basic
      // 3: price_earnings_ttm
      // 4: dividends_yield
      // 5: return_on_equity_fq
      // 6: net_income
      // 7: operating_margin
      // 8: total_revenue
      // 9: revenue_growth_yoy

      const pe = d[3] !== null && d[3] !== undefined ? d[3].toFixed(2) : 'N/A';
      const divYield = d[4] !== null && d[4] !== undefined ? `${d[4].toFixed(2)} %` : 'N/A';
      
      // Conversion en MAD
      const marketCapRaw = d[2] !== null && d[2] !== undefined ? Math.round(d[2] * usdMadRate) : null;
      const marketCap = marketCapRaw ? marketCapRaw.toString() : 'N/A';
      
      const netProfitRaw = d[6] !== null && d[6] !== undefined ? Math.round(d[6] * usdMadRate) : null;
      const netProfit = netProfitRaw 
        ? `${netProfitRaw.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MAD`
        : 'N/A';

      const roe = d[5] !== null && d[5] !== undefined ? `${d[5].toFixed(2)}%` : 'N/A';
      const margin = d[7] !== null && d[7] !== undefined ? `${d[7].toFixed(2)}%` : 'N/A';
      const revenueGrowth = d[9] !== null && d[9] !== undefined ? `${d[9].toFixed(2)}%` : 'N/A';

      console.log(`[TradingViewScraper] ✅ Données extraites pour ${symbol}`);
      return {
        peRatio: pe,
        dividendYield: divYield,
        marketCap,
        netProfit,
        roe,
        margin,
        revenueGrowth,
        profitGrowth: 'N/A',
        status: 'success'
      };

    } catch (error: any) {
      console.error(`[TradingViewScraper] Erreur sur ${symbol} :`, error.message);
      return {
        peRatio: 'N/A',
        dividendYield: 'N/A',
        marketCap: 'N/A',
        netProfit: 'N/A',
        roe: 'N/A',
        margin: 'N/A',
        revenueGrowth: 'N/A',
        profitGrowth: 'N/A',
        status: 'error'
      };
    }
  }
}
