import { PortfolioTransaction, PortfolioHolding, DividendTransaction, PriceAlert, PortfolioTransactionSchema, DividendTransactionSchema, UpsertAlertInputSchema, UserProfileClientInputSchema } from './schemas';
import { SupabaseClient } from '@supabase/supabase-js';
import { BROKERAGE_FEE, TAX_ON_PROFIT, DIVIDEND_NET_RATIO } from './portfolio-constants';
import { MarketListScraper } from './scrapers/market-list-scraper';
import { InputSanitizer } from './input-sanitizer';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BULK_IMPORT_ROWS = 500;

/**
 * Hachage cryptographique HMAC-SHA256 (Web Crypto API compatible Node.js, Edge & Navigateur)
 * avec secret serveur pour empêcher toute désanonymisation par force brute des UUIDs sur le Leaderboard.
 */
export async function anonymizeUserId(rawId: string, secret: string = 'aetheris-leaderboard-v1'): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'aetheris-leaderboard-v1'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(rawId));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class PortfolioService {
  /**
   * Récupère toutes les transactions de l'utilisateur connecté
   */
  static async getTransactions(client: SupabaseClient, isVirtual: boolean = false): Promise<PortfolioTransaction[]> {
    const { data, error } = await client
      .from('portfolio_transactions')
      .select('*')
      .eq('is_virtual', isVirtual)
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

    if (
      !Array.isArray(data.transactions) ||
      !Array.isArray(data.dividends) ||
      data.transactions.length > MAX_BULK_IMPORT_ROWS ||
      data.dividends.length > MAX_BULK_IMPORT_ROWS
    ) {
      throw new Error(`Import limité à ${MAX_BULK_IMPORT_ROWS} lignes maximum par lot.`);
    }

    // Validation Zod pour les transactions
    const ImportTransactionSchema = PortfolioTransactionSchema.omit({ id: true, created_at: true, user_id: true });
    for (const tx of data.transactions) {
      const parsed = ImportTransactionSchema.safeParse(tx);
      if (!parsed.success) {
        throw new Error(`Transaction invalide pour ${tx.symbol || 'symbole inconnu'} : ${parsed.error.message}`);
      }
    }

    // Validation Zod pour les dividendes
    const ImportDividendSchema = DividendTransactionSchema.omit({ id: true, created_at: true, user_id: true });
    for (const div of data.dividends) {
      const parsed = ImportDividendSchema.safeParse(div);
      if (!parsed.success) {
        throw new Error(`Dividende invalide pour ${div.symbol || 'symbole inconnu'} : ${parsed.error.message}`);
      }
    }

    if (data.transactions.length > 0) {
      // 🔒 SÉCURITÉ : Interdire l'injection de positions Paper Trading (is_virtual: true) via import CSV
      const txs = data.transactions.map(t => ({ ...t, user_id: userId, is_virtual: false }));
      const { error: txError } = await client.from('portfolio_transactions').insert(txs);
      if (txError) throw txError;
    }

    if (data.dividends.length > 0) {
      const divs = data.dividends.map(d => ({ ...d, user_id: userId, is_virtual: false }));
      const { error: divError } = await client.from('portfolio_dividends').insert(divs);
      if (divError) throw divError;
    }
  }

  // ──────────────────────────────────
  // DIVIDENDES
  // ──────────────────────────────────

  static async getDividends(client: SupabaseClient, isVirtual: boolean = false): Promise<DividendTransaction[]> {
    const { data, error } = await client
      .from('portfolio_dividends')
      .select('*')
      .eq('is_virtual', isVirtual)
      .order('dividend_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async addDividend(
    client: SupabaseClient,
    div: Omit<DividendTransaction, 'id' | 'created_at' | 'user_id'>,
    adminClient?: SupabaseClient
  ) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const InputSchema = DividendTransactionSchema.omit({ id: true, created_at: true, user_id: true });
    const parsed = InputSchema.safeParse(div);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Données de dividende invalides');
    }

    const dbClient = parsed.data.is_virtual && adminClient ? adminClient : client;
    const { data, error } = await dbClient
      .from('portfolio_dividends')
      .insert([{ ...parsed.data, is_virtual: Boolean(parsed.data.is_virtual), user_id: user.id }])
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Erreur lors de l'enregistrement du dividende");
    return data[0];
  }

  static async deleteDividend(client: SupabaseClient, id: string, adminClient?: SupabaseClient) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    if (!UUID_REGEX.test(id)) throw new Error('Identifiant de dividende invalide');

    const dbClient = adminClient || client;
    const { error } = await dbClient
      .from('portfolio_dividends')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
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
        const holding = holdings.find((h: PortfolioHolding) => h.symbol === div.symbol);
        quantityAtDivDate = holding?.totalQuantity || 0;
      }

      if (quantityAtDivDate > 0) {
        const grossAmount = div.amount_per_share * quantityAtDivDate;
        const netAmount = grossAmount * DIVIDEND_NET_RATIO; // 86.55% Net (13.45% retenue globale)
        income[div.symbol] = (income[div.symbol] || 0) + netAmount;
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

    const parsed = UpsertAlertInputSchema.safeParse(alert);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Paramètres d'alerte invalides");
    }

    const { data, error } = await client
      .from('portfolio_alerts')
      .upsert({ ...parsed.data, user_id: user.id, is_active: true }, { onConflict: 'user_id,symbol' })
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Erreur lors de l'enregistrement de l'alerte");
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

    const InputSchema = PortfolioTransactionSchema.omit({ id: true, created_at: true, user_id: true });
    const parsed = InputSchema.safeParse(tx);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Données de transaction invalides');
    }

    const { data, error } = await client
      .from('portfolio_transactions')
      .insert([{ ...parsed.data, is_virtual: false, user_id: user.id }])
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Erreur lors de l'enregistrement de la transaction");
    return data[0];
  }

  static async deleteTransaction(client: SupabaseClient, id: string) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    if (!UUID_REGEX.test(id)) throw new Error('Identifiant de transaction invalide');

    const { error } = await client
      .from('portfolio_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_virtual', false);
    if (error) throw error;
  }

  static async deleteSymbolTransactions(client: SupabaseClient, symbol: string) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const cleanSymbol = InputSanitizer.sanitizeForDb(symbol);
    if (!cleanSymbol) throw new Error('Symbole invalide');

    const { error } = await client
      .from('portfolio_transactions')
      .delete()
      .eq('symbol', cleanSymbol)
      .eq('user_id', user.id)
      .eq('is_virtual', false);
    if (error) throw error;
  }

  // ──────────────────────────────────
  // PROFILS UTILISATEURS
  // ──────────────────────────────────

  static async getUserProfile(client: SupabaseClient): Promise<{ 
    initial_capital: number; 
    subscription_tier: string;
    telegram_chat_id?: string;
    telegram_verified?: boolean;
    whatsapp_phone?: string;
    whatsapp_verified?: boolean;
    alert_channel?: string;
    notification_email?: string;
    username?: string;
    virtual_initial_capital?: number;
    virtual_balance?: number;
  } | null> {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    let data: any = null;
    try {
      const res = await client
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!res.error || res.error.code === 'PGRST116') {
        data = res.data;
      }
    } catch (err: any) {
      console.warn('[getUserProfile] Exception reading profile:', err.message);
    }
    
    return {
      initial_capital: data?.initial_capital ?? 0,
      subscription_tier: data?.subscription_tier ?? 'free',
      telegram_chat_id: data?.telegram_chat_id ?? '',
      telegram_verified: Boolean(data?.telegram_verified),
      whatsapp_phone: data?.whatsapp_phone ?? '',
      whatsapp_verified: Boolean(data?.whatsapp_verified),
      alert_channel: data?.alert_channel ?? 'EMAIL',
      notification_email: data?.notification_email ?? user.email ?? '',
      username: data?.username ?? '',
      virtual_initial_capital: data?.virtual_initial_capital ?? 100000,
      virtual_balance: data?.virtual_balance ?? 100000,
    };
  }

  static async upsertUserProfile(client: SupabaseClient, profile: { 
    initial_capital?: number; 
    telegram_chat_id?: string;
    whatsapp_phone?: string;
    alert_channel?: string;
    notification_email?: string;
    username?: string;
  }) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const parsed = UserProfileClientInputSchema.safeParse(profile);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Données de profil invalides');
    }
    const valid = parsed.data;

    // 🔒 SÉCURITÉ : Les champs privilégiés (subscription_tier, virtual_balance, virtual_initial_capital, stripe_*)
    // ne sont JAMAIS acceptés ici. Ils sont gérés exclusivement côté serveur via supabaseAdmin / RPC atomiques.
    const payload: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (valid.initial_capital !== undefined) payload.initial_capital = valid.initial_capital;
    if (valid.telegram_chat_id !== undefined) payload.telegram_chat_id = valid.telegram_chat_id;
    if (valid.whatsapp_phone !== undefined) payload.whatsapp_phone = valid.whatsapp_phone;
    if (valid.alert_channel !== undefined) payload.alert_channel = valid.alert_channel;
    if (valid.notification_email !== undefined) payload.notification_email = valid.notification_email;
    if (valid.username !== undefined) payload.username = valid.username;

    const { error } = await client
      .from('user_profiles')
      .upsert(payload);

    if (error) {
      console.warn('[upsertUserProfile] First attempt error:', error.message);
      const safePayload: Record<string, unknown> = {
        user_id: user.id,
        initial_capital: payload.initial_capital ?? 0,
        updated_at: payload.updated_at
      };
      const { error: fallbackError } = await client
        .from('user_profiles')
        .upsert(safePayload);

      if (fallbackError) throw fallbackError;
    }
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

  // ──────────────────────────────────
  // PAPER TRADING & CLASSEMENT
  // ──────────────────────────────────

  private static leaderboardCache: { entries: any[]; expiresAt: number } | null = null;
  private static readonly LEADERBOARD_CACHE_TTL_MS = 45_000;

  static invalidateLeaderboardCache() {
    this.leaderboardCache = null;
  }

  /**
   * Résout le cours officiel côté serveur (jamais le prix fourni par le client).
   */
  private static async resolveServerMarketPrice(
    symbol: string,
    dbClient: SupabaseClient
  ): Promise<number> {
    const liveStock = await MarketListScraper.getLiveStock(symbol);
    if (liveStock?.price) {
      const parsedLive = parseFloat(liveStock.price.replace(',', '.').replace(/\s/g, ''));
      if (Number.isFinite(parsedLive) && parsedLive > 0) {
        return parsedLive;
      }
    }

    // Fallback serveur de confiance : dernier cours officiel persisté dans market_history (hors horaires BVC)
    const cleanSymbol = InputSanitizer.sanitizeForDb(symbol);
    if (cleanSymbol) {
      const { data: comp } = await dbClient
        .from('companies')
        .select('id')
        .ilike('symbol', cleanSymbol)
        .limit(1)
        .maybeSingle();

      if (comp?.id) {
        const { data: lastHist } = await dbClient
          .from('market_history')
          .select('price')
          .eq('company_id', comp.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        const histPrice = Number(lastHist?.price);
        if (Number.isFinite(histPrice) && histPrice > 0) {
          return histPrice;
        }
      }
    }

    throw new Error(
      `Cotation officielle temps réel indisponible pour ${symbol.toUpperCase()}. Ordre virtuel refusé par sécurité.`
    );
  }

  static async addVirtualTransaction(
    client: SupabaseClient, 
    tx: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id' | 'is_virtual'>,
    adminClient?: SupabaseClient
  ) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié. Veuillez vous reconnecter.');

    // 🔒 Validation stricte Zod (empêche les quantités négatives / NaN / Infinity)
    const VirtualInputSchema = PortfolioTransactionSchema.omit({
      id: true,
      created_at: true,
      user_id: true,
      is_virtual: true,
    });
    const parsed = VirtualInputSchema.safeParse(tx);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Transaction virtuelle invalide');
    }
    const validTx = parsed.data;
    const txType = validTx.type || 'BUY';
    const canonicalSymbol = validTx.symbol.trim().toUpperCase();
    const privilegedDb = adminClient || client;

    // 🔒 SÉCURITÉ ANTI-TRICHE : Ignorer buy_price et buy_date envoyés par le client
    const marketPrice = await this.resolveServerMarketPrice(canonicalSymbol, privilegedDb);
    const serverToday = new Date().toISOString().split('T')[0];

    // 🔒 Exécution atomique PostgreSQL (SELECT ... FOR UPDATE) via service_role pour éliminer les conditions de course TOCTOU
    if (adminClient) {
      const { data: rpcData, error: rpcError } = await adminClient.rpc('execute_virtual_order', {
        p_user_id: user.id,
        p_symbol: canonicalSymbol,
        p_type: txType,
        p_quantity: validTx.quantity,
        p_price: marketPrice,
        p_buy_date: serverToday,
        p_fee_rate: BROKERAGE_FEE,
      });

      if (!rpcError && rpcData) {
        this.invalidateLeaderboardCache();
        return rpcData;
      }

      const isMissingRpc =
        rpcError?.code === 'PGRST202' ||
        rpcError?.message?.includes('Could not find the function') ||
        rpcError?.message?.includes('execute_virtual_order');

      if (rpcError && !isMissingRpc) {
        throw new Error(rpcError.message);
      }
    }

    // Fallback serveur sécurisé via adminClient uniquement si la migration RPC n'a pas encore été exécutée en base
    const profile = await this.getUserProfile(client);
    if (!profile) throw new Error('Profil utilisateur introuvable.');

    const currentBalance = profile.virtual_balance ?? 100000;
    const transactionValue = validTx.quantity * marketPrice;
    const fee = transactionValue * BROKERAGE_FEE;
    const certifiedTx = {
      ...validTx,
      symbol: canonicalSymbol,
      buy_price: marketPrice,
      buy_date: serverToday,
    };

    if (txType === 'BUY') {
      const totalCost = transactionValue + fee;
      if (currentBalance < totalCost) {
        throw new Error(`Solde virtuel insuffisant (Trésorerie: ${currentBalance.toFixed(2)} MAD vs Requis: ${totalCost.toFixed(2)} MAD)`);
      }

      const { data, error } = await privilegedDb
        .from('portfolio_transactions')
        .insert([{ ...certifiedTx, user_id: user.id, is_virtual: true }])
        .select();

      if (error) throw error;

      const newBalance = currentBalance - totalCost;
      const { error: balErr } = await privilegedDb
        .from('user_profiles')
        .upsert({ user_id: user.id, virtual_balance: newBalance, updated_at: new Date().toISOString() });
      if (balErr) throw balErr;

      this.invalidateLeaderboardCache();
      return data[0];
    } else {
      const txs = await this.getTransactions(client, true);
      const holdings = this.calculateHoldings(txs);
      const holding = holdings.find(h => h.symbol.toLowerCase() === canonicalSymbol.toLowerCase());

      if (!holding || holding.totalQuantity < validTx.quantity) {
        throw new Error(`Quantité insuffisante d'actions à vendre (${holding?.totalQuantity || 0} possédées vs ${validTx.quantity} demandées)`);
      }

      const { data, error } = await privilegedDb
        .from('portfolio_transactions')
        .insert([{ ...certifiedTx, user_id: user.id, is_virtual: true }])
        .select();

      if (error) throw error;

      const revenue = transactionValue - fee;
      const newBalance = currentBalance + revenue;
      const { error: balErr } = await privilegedDb
        .from('user_profiles')
        .upsert({ user_id: user.id, virtual_balance: newBalance, updated_at: new Date().toISOString() });
      if (balErr) throw balErr;

      this.invalidateLeaderboardCache();
      return data[0];
    }
  }

  static async resetVirtualPortfolio(
    client: SupabaseClient,
    initialCapital: number = 100000,
    adminClient?: SupabaseClient
  ) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    if (!Number.isFinite(initialCapital) || initialCapital <= 0 || initialCapital > 10_000_000) {
      throw new Error('Le capital virtuel initial doit être compris entre 1 et 10 000 000 MAD.');
    }

    if (adminClient) {
      const { error: rpcError } = await adminClient.rpc('reset_virtual_portfolio', {
        p_user_id: user.id,
        p_initial_capital: initialCapital,
      });

      if (!rpcError) {
        this.invalidateLeaderboardCache();
        return;
      }

      const isMissingRpc =
        rpcError.code === 'PGRST202' ||
        rpcError.message?.includes('Could not find the function') ||
        rpcError.message?.includes('reset_virtual_portfolio');

      if (!isMissingRpc) {
        throw new Error(rpcError.message);
      }
    }

    const privilegedDb = adminClient || client;
    const { error: txError } = await privilegedDb
      .from('portfolio_transactions')
      .delete()
      .eq('user_id', user.id)
      .eq('is_virtual', true);
    if (txError) throw txError;

    const { error: divError } = await privilegedDb
      .from('portfolio_dividends')
      .delete()
      .eq('user_id', user.id)
      .eq('is_virtual', true);
    if (divError) throw divError;

    const { error: profErr } = await privilegedDb
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        virtual_initial_capital: initialCapital,
        virtual_balance: initialCapital,
        updated_at: new Date().toISOString(),
      });
    if (profErr) throw profErr;
    this.invalidateLeaderboardCache();
  }

  static async getLeaderboard(
    client: SupabaseClient,
    adminClient?: SupabaseClient,
    hmacSecret?: string
  ): Promise<any[]> {
    const { data: { user: currentUser } } = await client.auth.getUser();
    const now = Date.now();
    const currentAnonHash = currentUser
      ? (await anonymizeUserId(String(currentUser.id), hmacSecret || 'aetheris-leaderboard-v1')).substring(0, 16)
      : null;

    // 🔒 SÉCURITÉ ANTI-DoS : Cache mémoire court terme (45s) évitant un scan complet O(N) à chaque requête
    if (this.leaderboardCache && now < this.leaderboardCache.expiresAt) {
      return this.leaderboardCache.entries.map((entry) => ({
        ...entry,
        isCurrentUser: Boolean(currentAnonHash && entry.userId === `anon_${currentAnonHash}`),
      }));
    }

    const readDb = adminClient || client;

    const { data: profiles, error: pError } = await readDb
      .from('user_profiles')
      .select('user_id, username, virtual_initial_capital, virtual_balance');
    if (pError) throw pError;
    if (!profiles) return [];

    const { data: txs, error: tError } = await readDb
      .from('portfolio_transactions')
      .select('id, user_id, symbol, type, quantity, buy_price, buy_date, is_virtual, created_at')
      .eq('is_virtual', true);
    if (tError) throw tError;

    const marketData = await MarketListScraper.scrapeAll();
    const pricesMap = new Map<string, number>();
    if (marketData.status === 'success' && marketData.stocks) {
      marketData.stocks.forEach((s: any) => {
        const price = parseFloat(s.price.replace(',', '.').replace(/\s/g, ''));
        if (!isNaN(price)) {
          pricesMap.set(s.symbol.toLowerCase(), price);
        }
      });
    }

    const userTxsMap = new Map<string, PortfolioTransaction[]>();
    txs?.forEach(tx => {
      if (!userTxsMap.has(tx.user_id)) {
        userTxsMap.set(tx.user_id, []);
      }
      userTxsMap.get(tx.user_id)!.push(tx);
    });

    const leaderboard = await Promise.all(
      profiles.map(async (profile) => {
        const userTxs = userTxsMap.get(profile.user_id) || [];
        const holdings = this.calculateHoldings(userTxs);

        let stockValuation = 0;
        holdings.forEach(h => {
          const currentPrice = pricesMap.get(h.symbol.toLowerCase()) || h.weightedAveragePrice;
          stockValuation += h.totalQuantity * currentPrice;
        });

        const totalValue = Number(profile.virtual_balance) + stockValuation;
        const initial = Number(profile.virtual_initial_capital) || 100000;
        const roi = initial > 0 ? ((totalValue / initial) - 1) * 100 : 0;

        // 🔒 SÉCURITÉ VIE PRIVÉE : Anonymisation HMAC-SHA256 salée (aucun UUID brut exposé ni inversible)
        const fullHmac = await anonymizeUserId(String(profile.user_id), hmacSecret || 'aetheris-leaderboard-v1');
        const anonId = fullHmac.substring(0, 16);
        const displayName = profile.username || `Trader_${anonId.substring(0, 6)}`;

        return {
          userId: `anon_${anonId}`,
          isCurrentUser: Boolean(currentUser && currentUser.id === profile.user_id),
          username: displayName,
          totalValue,
          virtualBalance: Number(profile.virtual_balance),
          stockValuation,
          roi,
          initial
        };
      })
    );

    const sorted = leaderboard.sort((a, b) => b.roi - a.roi);
    this.leaderboardCache = {
      entries: sorted.map((e) => ({ ...e, isCurrentUser: false })),
      expiresAt: Date.now() + this.LEADERBOARD_CACHE_TTL_MS,
    };

    return sorted;
  }
}
