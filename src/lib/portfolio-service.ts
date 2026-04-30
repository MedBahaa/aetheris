import { PortfolioTransaction, PortfolioHolding, DividendTransaction, PriceAlert } from './schemas';
import { SupabaseClient } from '@supabase/supabase-js';
import { BROKERAGE_FEE, TAX_ON_PROFIT } from './portfolio-constants';

export class PortfolioService {
  /**
   * Récupère toutes les transactions de l'utilisateur connecté
   */
  static async getTransactions(client: SupabaseClient): Promise<PortfolioTransaction[]> {
    const { data, error } = await client
      .from('portfolio_transactions')
      .select('*')
      .order('buy_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Calcule les positions (holdings) avec Prix Moyen Pondéré (PMP)
   * Gère les ordres BUY (achat) et SELL (vente)
   */
  static calculateHoldings(transactions: PortfolioTransaction[]): PortfolioHolding[] {
    const { holdingsMap } = this._processTransactions(transactions);

    // Filter out positions with 0 quantity (fully sold out)
    return Array.from(holdingsMap.values())
      .filter(h => h.totalQuantity > 0)
      .map(({ currentPmp, ...rest }) => rest as PortfolioHolding);
  }

  /**
   * Calcule la PV réalisée totale (positions clôturées)
   * AUDIT FIX: Réutilise _processTransactions() au lieu de dupliquer la logique
   */
  static calculateRealizedPnL(transactions: PortfolioTransaction[]): number {
    const { holdingsMap } = this._processTransactions(transactions);
    let totalRealized = 0;
    for (const h of holdingsMap.values()) {
      totalRealized += h.realizedPnL || 0;
    }
    return totalRealized;
  }

  /**
   * Méthode interne partagée : traite toutes les transactions et retourne
   * la map complète des positions avec PMP, PnL réalisé, etc.
   * AUDIT FIX: Point unique de calcul (DRY)
   */
  private static _processTransactions(transactions: PortfolioTransaction[]) {
    const holdingsMap = new Map<string, PortfolioHolding & { 
      currentPmp: number;
      realizedPnL: number;
    }>();

    // Sort by date ascending to process in order
    const sorted = [...transactions].sort((a, b) => 
      new Date(a.buy_date).getTime() - new Date(b.buy_date).getTime()
    );

    sorted.forEach((tx) => {
      const existing = holdingsMap.get(tx.symbol);
      const txType = tx.type || 'BUY';

      if (txType === 'BUY') {
        const buyValueWithFees = tx.quantity * tx.buy_price * (1 + BROKERAGE_FEE);

        if (existing) {
          const newTotalQty = existing.totalQuantity + tx.quantity;
          const newTotalCost = existing.totalCost + buyValueWithFees;
          existing.totalQuantity = newTotalQty;
          existing.totalCost = newTotalCost;
          existing.currentPmp = newTotalCost / newTotalQty;
          existing.weightedAveragePrice = existing.currentPmp;
          existing.transactions.push(tx);
        } else {
          const pmp = buyValueWithFees / tx.quantity;
          holdingsMap.set(tx.symbol, {
            symbol: tx.symbol,
            totalQuantity: tx.quantity,
            weightedAveragePrice: pmp,
            currentPmp: pmp,
            totalCost: buyValueWithFees,
            realizedPnL: 0,
            transactions: [tx],
          });
        }
      } else if (txType === 'SELL' && existing) {
        // PV Brute sur cession = (Cours vente × (1 - frais)) - (PMP × Qté vendue)
        const sellValue = tx.quantity * tx.buy_price * (1 - BROKERAGE_FEE);
        const costBasis = existing.currentPmp * tx.quantity;
        const grossPnL = sellValue - costBasis;
        // TVP 15% sur les profits uniquement
        const netPnL = grossPnL > 0 ? grossPnL * (1 - TAX_ON_PROFIT) : grossPnL;

        existing.realizedPnL = (existing.realizedPnL || 0) + netPnL;
        existing.totalQuantity = Math.max(0, existing.totalQuantity - tx.quantity);
        existing.totalCost = existing.currentPmp * existing.totalQuantity;
        existing.totalSold = (existing.totalSold || 0) + tx.quantity;
        existing.transactions.push(tx);
      }
    });

    return { holdingsMap };
  }

  /**
   * Import de masse (CSV)
   */
  static async bulkImport(
    client: SupabaseClient, 
    data: { 
      transactions: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id'>[],
      dividends: Omit<DividendTransaction, 'id' | 'created_at' | 'user_id'>[]
    }
  ) {
    const userResp = await client.auth.getUser();
    if (!userResp.data.user) throw new Error("Non autorisé");
    const userId = userResp.data.user.id;

    if (data.transactions.length > 0) {
      const txs = data.transactions.map(t => ({ ...t, user_id: userId }));
      const { error: txError } = await client.from('portfolio_transactions').insert(txs);
      if (txError) throw txError;
    }

    if (data.dividends.length > 0) {
      const divs = data.dividends.map(d => ({ ...d, user_id: userId }));
      const { error: divError } = await client.from('portfolio_dividends').insert(divs);
      if (divError) throw divError;
    }
  }

  // ──────────────────────────────────
  // DIVIDENDES
  // ──────────────────────────────────

  static async getDividends(client: SupabaseClient): Promise<DividendTransaction[]> {
    const { data, error } = await client
      .from('portfolio_dividends')
      .select('*')
      .order('dividend_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async addDividend(
    client: SupabaseClient,
    div: Omit<DividendTransaction, 'id' | 'created_at' | 'user_id'>
  ) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await client
      .from('portfolio_dividends')
      .insert([{ ...div, user_id: user.id }])
      .select();
    if (error) throw error;
    return data[0];
  }

  static async deleteDividend(client: SupabaseClient, id: string) {
    const { error } = await client.from('portfolio_dividends').delete().eq('id', id);
    if (error) throw error;
  }

  /**
   * Calcule le total des dividendes reçus pour chaque holding
   * AUDIT FIX: Utilise la quantité détenue AU MOMENT du dividende (snapshot historique)
   * et non la quantité actuelle, pour un calcul financièrement correct.
   */
  static calculateDividendIncome(
    dividends: DividendTransaction[], 
    holdings: PortfolioHolding[],
    transactions?: PortfolioTransaction[]
  ): Record<string, number> {
    const income: Record<string, number> = {};
    
    dividends.forEach(div => {
      let quantityAtDivDate: number | undefined;

      // Si les transactions sont fournies, calculer la quantité détenue à la date du dividende
      if (transactions && transactions.length > 0) {
        const divDate = new Date(div.dividend_date).getTime();
        let qty = 0;
        // Rejouer les transactions jusqu'à la date du dividende
        const sorted = [...transactions]
          .filter(tx => tx.symbol === div.symbol)
          .sort((a, b) => new Date(a.buy_date).getTime() - new Date(b.buy_date).getTime());
        
        for (const tx of sorted) {
          if (new Date(tx.buy_date).getTime() > divDate) break;
          const txType = tx.type || 'BUY';
          if (txType === 'BUY') qty += tx.quantity;
          else if (txType === 'SELL') qty = Math.max(0, qty - tx.quantity);
        }
        quantityAtDivDate = qty;
      }

      // Fallback : utiliser la quantité actuelle si les transactions ne sont pas disponibles
      if (quantityAtDivDate === undefined) {
        const holding = holdings.find(h => h.symbol === div.symbol);
        quantityAtDivDate = holding?.totalQuantity || 0;
      }

      if (quantityAtDivDate > 0) {
        income[div.symbol] = (income[div.symbol] || 0) + (div.amount_per_share * quantityAtDivDate);
      }
    });
    return income;
  }

  // ──────────────────────────────────
  // ALERTES PRIX (SL/TP)
  // ──────────────────────────────────

  static async getAlerts(client: SupabaseClient): Promise<PriceAlert[]> {
    const { data, error } = await client
      .from('portfolio_alerts')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  }

  static async upsertAlert(
    client: SupabaseClient,
    alert: { symbol: string; sl_price?: number | null; tp_price?: number | null }
  ) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await client
      .from('portfolio_alerts')
      .upsert({ ...alert, user_id: user.id, is_active: true }, { onConflict: 'user_id,symbol' })
      .select();
    if (error) throw error;
    return data[0];
  }

  // ──────────────────────────────────
  // CRUD Standard
  // ──────────────────────────────────

  static async addTransaction(
    client: SupabaseClient, 
    tx: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id'>
  ) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié. Veuillez vous reconnecter.');
    const { data, error } = await client
      .from('portfolio_transactions')
      .insert([{ ...tx, user_id: user.id }])
      .select();
    if (error) throw error;
    return data[0];
  }

  static async deleteTransaction(client: SupabaseClient, id: string) {
    const { error } = await client.from('portfolio_transactions').delete().eq('id', id);
    if (error) throw error;
  }

  // ──────────────────────────────────
  // PROFILS UTILISATEURS
  // ──────────────────────────────────

  static async getUserProfile(client: SupabaseClient): Promise<{ initial_capital: number } | null> {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('user_profiles')
      .select('initial_capital')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = Not found
    return data;
  }

  static async upsertUserProfile(client: SupabaseClient, profile: { initial_capital: number }) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { error } = await client
      .from('user_profiles')
      .upsert({ 
        user_id: user.id, 
        ...profile,
        updated_at: new Date().toISOString() 
      });

    if (error) throw error;
  }

  // ──────────────────────────────────
  // ANALYSE DE RISQUE (Bêta, Sharpe, Max Drawdown)
  // ──────────────────────────────────

  /**
   * Calcule les métriques de risque avancées du portefeuille.
   * @param transactions Les transactions historiques du portefeuille
   * @param historicalPrices Un dictionnaire { symbol: { date, price }[] }
   * @param riskFreeRate Taux sans risque annuel (ex: 3% pour le Maroc -> 0.03)
   */
  static calculateRiskMetrics(
    transactions: PortfolioTransaction[],
    historicalPrices: Record<string, { date: string; price: number }[]>,
    benchmarkPrices: { date: string; price: number }[],
    riskFreeRate: number = 0.03
  ) {
    if (transactions.length === 0 || Object.keys(historicalPrices).length === 0) {
      return { beta: 1, sharpeRatio: 0, maxDrawdown: 0, maxDrawdownPercentage: 0 };
    }

    // 1. Reconstruire la courbe de valeur du portefeuille (Equity Curve)
    // On prend toutes les dates uniques où on a des prix
    const allDatesSet = new Set<string>();
    Object.values(historicalPrices).forEach(arr => arr.forEach(p => allDatesSet.add(p.date)));
    benchmarkPrices.forEach(p => allDatesSet.add(p.date));
    
    const sortedDates = Array.from(allDatesSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    const portfolioValues: { date: string; value: number; return: number }[] = [];
    const benchmarkValues: { date: string; value: number; return: number }[] = [];
    
    let previousPortValue = 0;
    let previousBenchValue = 0;

    for (const date of sortedDates) {
      // Calculer les positions à cette date
      const dateTime = new Date(date).getTime();
      let dailyValue = 0;
      
      const holdingsQty: Record<string, number> = {};
      
      // Rejouer les transactions jusqu'à la date
      for (const tx of transactions) {
        if (new Date(tx.buy_date).getTime() <= dateTime) {
          if (tx.type === 'BUY') holdingsQty[tx.symbol] = (holdingsQty[tx.symbol] || 0) + tx.quantity;
          else if (tx.type === 'SELL') holdingsQty[tx.symbol] = Math.max(0, (holdingsQty[tx.symbol] || 0) - tx.quantity);
        }
      }

      // Valoriser ces positions avec le prix de la date (ou le dernier prix connu avant cette date)
      for (const [symbol, qty] of Object.entries(holdingsQty)) {
        if (qty > 0) {
          const prices = historicalPrices[symbol];
          if (prices) {
            // Trouver le prix le plus récent <= date
            const validPrices = prices.filter(p => new Date(p.date).getTime() <= dateTime);
            if (validPrices.length > 0) {
              const lastPrice = validPrices[validPrices.length - 1].price;
              dailyValue += lastPrice * qty;
            }
          }
        }
      }

      // Benchmark value (ex: MASI)
      let benchValue = previousBenchValue;
      const validBench = benchmarkPrices.filter(p => new Date(p.date).getTime() <= dateTime);
      if (validBench.length > 0) {
        benchValue = validBench[validBench.length - 1].price;
      }

      if (dailyValue > 0) {
        const portReturn = previousPortValue > 0 ? (dailyValue - previousPortValue) / previousPortValue : 0;
        const benchReturn = previousBenchValue > 0 ? (benchValue - previousBenchValue) / previousBenchValue : 0;
        
        portfolioValues.push({ date, value: dailyValue, return: portReturn });
        benchmarkValues.push({ date, value: benchValue, return: benchReturn });
        
        previousPortValue = dailyValue;
      }
      previousBenchValue = benchValue;
    }

    if (portfolioValues.length < 2) {
      return { beta: 1, sharpeRatio: 0, maxDrawdown: 0, maxDrawdownPercentage: 0 };
    }

    // 2. Calcul du Max Drawdown
    let peak = portfolioValues[0].value;
    let maxDrawdown = 0;
    let maxDrawdownPercentage = 0;

    for (const pv of portfolioValues) {
      if (pv.value > peak) peak = pv.value;
      const drawdown = peak - pv.value;
      const drawdownPct = peak > 0 ? drawdown / peak : 0;
      
      if (drawdownPct > maxDrawdownPercentage) {
        maxDrawdown = drawdown;
        maxDrawdownPercentage = drawdownPct;
      }
    }

    // 3. Calcul du Sharpe Ratio & Beta
    // On annualise les rendements (supposant ~252 jours de trading)
    const returns = portfolioValues.map(p => p.return);
    const benchReturns = benchmarkValues.filter((_, i) => i > 0 && portfolioValues[i]).map(b => b.return); // Aligné sur le portefeuille

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const meanBenchReturn = benchReturns.reduce((a, b) => a + b, 0) / benchReturns.length;
    
    // Annualiser le rendement moyen journalier
    const annualizedReturn = meanReturn * 252; 
    
    const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const annualizedStdDev = stdDev * Math.sqrt(252);

    const sharpeRatio = annualizedStdDev > 0 ? (annualizedReturn - riskFreeRate) / annualizedStdDev : 0;

    // Beta = Covariance(port, bench) / Variance(bench)
    let covariance = 0;
    let benchVariance = 0;
    const alignLength = Math.min(returns.length, benchReturns.length);
    
    for (let i = 0; i < alignLength; i++) {
      covariance += (returns[i] - meanReturn) * (benchReturns[i] - meanBenchReturn);
      benchVariance += Math.pow(benchReturns[i] - meanBenchReturn, 2);
    }
    covariance /= alignLength;
    benchVariance /= alignLength;

    const beta = benchVariance > 0 ? covariance / benchVariance : 1;

    return {
      beta: Number(beta.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      maxDrawdownPercentage: Number((maxDrawdownPercentage * 100).toFixed(2))
    };
  }
}
