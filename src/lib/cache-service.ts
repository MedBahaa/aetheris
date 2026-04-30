import { supabaseAdmin } from './supabase';
import { CompanyAnalysis } from './schemas';

export class AnalysisCache {
  /** TTL dynamique par type d'agent */
  private static readonly TTL_MAP: Record<string, number> = {
    TECHNICAL:   5 * 60 * 1000,    // 5 min  — les cours bougent en séance
    SENTIMENT:   30 * 60 * 1000,   // 30 min — les news changent peu
    FUNDAMENTAL: 24 * 60 * 60 * 1000, // 24h — les ratios ne changent pas intraday
    STRATEGY:    15 * 60 * 1000,   // 15 min — synthèse équilibrée
  };
  private static readonly DEFAULT_TTL = 15 * 60 * 1000;

  /**
   * Tente de récupérer une analyse depuis le cache
   */
  static async get(ticker: string, type: string, forceRefresh: boolean = false): Promise<CompanyAnalysis | null> {
    if (!supabaseAdmin || forceRefresh) {
      if (forceRefresh) console.log(`[Cache] 🔄 Force Refresh demandé pour ${ticker} (${type}). Bypassing cache...`);
      return null;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('analysis_cache')
        .select('data, created_at')
        .eq('ticker', ticker.toUpperCase())
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      // Vérifier si le cache est encore valide avec le TTL adapté au type
      const createdAt = new Date(data.created_at).getTime();
      const now = Date.now();
      const ttl = this.TTL_MAP[type] || this.DEFAULT_TTL;
      
      if (now - createdAt > ttl) {
        console.log(`[Cache] Cache expiré pour ${ticker} (${type}) — TTL: ${ttl / 60000}min`);
        return null;
      }

      console.log(`[Cache] ✅ Hit pour ${ticker} (${type})`);
      return data.data as CompanyAnalysis;
    } catch (e) {
      console.error('[Cache] Get error:', e);
      return null;
    }
  }

  /**
   * Sauvegarde une analyse dans le cache
   */
  static async set(ticker: string, type: string, analysis: CompanyAnalysis): Promise<void> {
    if (!supabaseAdmin) return;

    try {
      const { error } = await supabaseAdmin
        .from('analysis_cache')
        .upsert({
          ticker: ticker.toUpperCase(),
          type: type,
          data: analysis,
          created_at: new Date().toISOString()
        }, { onConflict: 'ticker,type' });

      if (error) {
        // Si la table n'existe pas, on log l'erreur mais on ne bloque pas
        if (error.code === '42P01') {
          console.warn('[Cache] ⚠️ Table analysis_cache inexistante. Le cache est désactivé.');
        } else {
          console.error('[Cache] Set error:', error.message);
        }
      } else {
        console.log(`[Cache] 💾 Sauvegardé pour ${ticker} (${type})`);
      }
    } catch (e) {
      console.error('[Cache] Set exception:', e);
    }
  }
}
