import { supabaseAdmin } from './supabase';

export interface ImpactValidationResult {
  newsTitle: string;
  predictedImpact: string;
  actualVariation: number;
  isAccurate: boolean;
  score: number; // 0 to 100
}

export class ImpactValidator {
  
  /**
   * Valide les prédictions d'impact pour une société donnée sur une période passée
   */
  static async validate(companyId: string, daysAgo: number = 7): Promise<ImpactValidationResult[]> {
    if (!supabaseAdmin) return [];

    try {
      // 1. Récupérer les news avec impact prédit d'il y a environ 'daysAgo' jours
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo - 2); // Fenêtre de 2 jours
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - daysAgo + 2);

      const { data: newsItems, error: newsError } = await supabaseAdmin
        .from('news_items')
        .select('title, sentiment_label, impact, timestamp, url')
        .eq('company_id', companyId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .not('impact', 'is', null);

      if (newsError || !newsItems || newsItems.length === 0) return [];

      // 2. Récupérer l'historique des prix pour cette période + aujourd'hui
      const { data: prices, error: priceError } = await supabaseAdmin
        .from('market_history')
        .select('price, timestamp')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: true });

      if (priceError || !prices || prices.length < 2) return [];

      const currentPrice = prices[prices.length - 1].price;

      const results: ImpactValidationResult[] = [];

      for (const news of newsItems) {
        const newsTimestamp = new Date(news.timestamp).getTime();
        
        // Trouver le prix au moment de la news (ou le plus proche)
        const priceAtNews = prices.find((p: { timestamp: string; price: number }) => new Date(p.timestamp).getTime() >= newsTimestamp)?.price;

        if (priceAtNews && priceAtNews > 0) {
          const variation = ((currentPrice - priceAtNews) / priceAtNews) * 100;
          
          let isAccurate = false;
          let score = 0;

          // Logique de validation simplifiée
          if (news.sentiment_label === 'POSITIF' && variation > 0.5) isAccurate = true;
          if (news.sentiment_label === 'NEGATIF' && variation < -0.5) isAccurate = true;
          if (news.sentiment_label === 'NEUTRE' && Math.abs(variation) <= 0.5) isAccurate = true;

          // Calcul d'un score de confiance
          score = isAccurate ? 80 + Math.min(20, Math.abs(variation) * 5) : Math.max(0, 40 - Math.abs(variation) * 10);

          results.push({
            newsTitle: news.title,
            predictedImpact: news.impact!,
            actualVariation: parseFloat(variation.toFixed(2)),
            isAccurate,
            score
          });
        }
      }

      return results;
    } catch (e) {
      console.error("[ImpactValidator] Error:", e);
      return [];
    }
  }

  /**
   * Calcule le score de fiabilité global d'un agent pour une société
   */
  static async getAgentReliabilityScore(companyId: string): Promise<number> {
    const results = await this.validate(companyId, 7); // Par défaut sur 7 jours
    if (results.length === 0) return 85; // Score de confiance par défaut élevé pour un nouvel agent hétérogène

    const avgScore = results.reduce((acc, curr) => acc + curr.score, 0) / results.length;
    return Math.round(avgScore);
  }
}
