import { supabaseAdmin } from './supabase';

// Client REST Upstash Redis ultra-léger sans paquet npm
class RedisClient {
  private static get config() {
    return {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    };
  }

  static get isAvailable(): boolean {
    const { url, token } = this.config;
    return !!(url && token);
  }

  static async execute(command: any[]): Promise<any> {
    const { url, token } = this.config;
    if (!url || !token) throw new Error("Credentials Redis manquants");

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command),
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Erreur Redis REST API : ${res.statusText}`);
    }

    const data = await res.json();
    return data.result;
  }
}

export class CacheService {
  /** TTL dynamique par type d'agent */
  private static readonly TTL_MAP: Record<string, number> = {
    TECHNICAL:   5 * 60 * 1000,    // 5 min  — les cours bougent en séance
    SENTIMENT:   30 * 60 * 1000,   // 30 min — les news changent peu
    FUNDAMENTAL: 24 * 60 * 60 * 1000, // 24h — les ratios ne changent pas intraday
    STRATEGY:    15 * 60 * 1000,   // 15 min — synthèse équilibrée
  };
  private static readonly DEFAULT_TTL = 15 * 60 * 1000;

  /**
   * Tente de récupérer une analyse en cache
   */
  static async get(ticker: string, type: string, forceRefresh: boolean = false): Promise<any | null> {
    if (forceRefresh) return null;
    const key = `aetheris:cache:${type.toLowerCase()}:${ticker.toUpperCase()}`;

    // Driver Redis
    if (RedisClient.isAvailable) {
      try {
        console.log(`[Cache] 🔴 Lecture Redis pour ${key}`);
        const result = await RedisClient.execute(["GET", key]);
        if (result) {
          return JSON.parse(result);
        }
        return null;
      } catch (e) {
        console.warn("[Cache Warning] Échec lecture Redis, bascule sur la base de données :", e);
      }
    }

    // Fallback Driver Supabase (DB)
    try {
      console.log(`[Cache] 💾 Lecture Supabase DB pour ${ticker} (${type})`);
      const { data, error } = await supabaseAdmin
        .from('analysis_cache')
        .select('data, created_at')
        .eq('ticker', ticker.toUpperCase())
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      // Vérifier le TTL adapté au type d'agent
      const createdAt = new Date(data.created_at).getTime();
      const now = Date.now();
      const ttl = this.TTL_MAP[type] || this.DEFAULT_TTL;

      if (now - createdAt > ttl) {
        console.log(`[Cache] Cache expiré pour ${ticker} (${type})`);
        return null; // Expiré
      }

      return data.data;
    } catch (e) {
      console.error("Cache Read Error (Supabase):", e);
      return null;
    }
  }

  /**
   * Sauvegarde une analyse en cache
   */
  static async set(ticker: string, type: string, analysis: any): Promise<void> {
    const key = `aetheris:cache:${type.toLowerCase()}:${ticker.toUpperCase()}`;
    const ttl = this.TTL_MAP[type] || this.DEFAULT_TTL;

    // Driver Redis
    if (RedisClient.isAvailable) {
      try {
        console.log(`[Cache] 🔴 Écriture Redis pour ${key} (TTL: ${ttl / 1000}s)`);
        await RedisClient.execute(["SET", key, JSON.stringify(analysis), "PX", ttl]);
        return;
      } catch (e) {
        console.warn("[Cache Warning] Échec écriture Redis, bascule sur la base de données :", e);
      }
    }

    // Fallback Driver Supabase (DB)
    try {
      console.log(`[Cache] 💾 Écriture Supabase DB pour ${ticker} (${type})`);
      const { error } = await supabaseAdmin
        .from('analysis_cache')
        .upsert({
          ticker: ticker.toUpperCase(),
          type: type,
          data: analysis,
          created_at: new Date().toISOString()
        }, { onConflict: 'ticker,type' });

      if (error) {
        if (error.code === '42P01') {
          console.warn('[Cache] ⚠️ Table analysis_cache inexistante. Le cache est désactivé.');
        } else {
          console.error('[Cache] Set error:', error.message);
        }
      }
    } catch (e) {
      console.error("Cache Write Error (Supabase):", e);
    }
  }

  /**
   * Récupère une valeur générique par clé de cache (ex: hash de prompt LLM)
   */
  static async getGeneric(key: string): Promise<any | null> {
    if (RedisClient.isAvailable) {
      try {
        const result = await RedisClient.execute(["GET", key]);
        if (result) return JSON.parse(result);
        return null;
      } catch (e) {
        console.warn("[Cache Warning] Échec GET Redis générique:", e);
      }
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('analysis_cache')
        .select('data, created_at')
        .eq('ticker', key.substring(0, 100)) // Limitation de longueur du ticker
        .eq('type', 'GENERIC')
        .maybeSingle();

      if (error || !data) return null;

      // TTL générique de 15 minutes pour les appels LLM
      const createdAt = new Date(data.created_at).getTime();
      if (Date.now() - createdAt > 15 * 60 * 1000) {
        return null; // Expiré
      }

      return data.data;
    } catch (e) {
      return null;
    }
  }

  /**
   * Stocke une valeur générique avec TTL
   */
  static async setGeneric(key: string, value: any): Promise<void> {
    if (RedisClient.isAvailable) {
      try {
        const ttlMs = 15 * 60 * 1000; // 15 min TTL
        await RedisClient.execute(["SET", key, JSON.stringify(value), "PX", ttlMs]);
        return;
      } catch (e) {
        console.warn("[Cache Warning] Échec SET Redis générique:", e);
      }
    }

    try {
      await supabaseAdmin
        .from('analysis_cache')
        .upsert({
          ticker: key.substring(0, 100),
          type: 'GENERIC',
          data: value,
          created_at: new Date().toISOString()
        }, { onConflict: 'ticker,type' });
    } catch (e) {
      // Ignorer l'échec de cache non critique
    }
  }
}
