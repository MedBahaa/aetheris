/**
 * AUDIT FIX: Rate Limiter hybride (Upstash Redis distribué + Fallback mémoire)
 * Protège contre les abus d'API, le Denial of Wallet IA et le spoofing d'IP
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Extrait de manière sécurisée l'adresse IP du client depuis les en-têtes HTTP
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp && /^[0-9a-fA-F.:]+$/.test(realIp.trim())) {
    return realIp.trim().substring(0, 45);
  }
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp && /^[0-9a-fA-F.:]+$/.test(firstIp)) {
      return firstIp.substring(0, 45);
    }
  }
  return 'unknown';
}

/**
 * Vérifie si une requête est autorisée par le rate limiter en mémoire (synchrone)
 * @param identifier - Identifiant unique (ex: IP, user.id, route)
 * @param maxRequests - Nombre maximum de requêtes par fenêtre
 * @param windowMs - Durée de la fenêtre en millisecondes
 * @returns { allowed: boolean, remaining: number, retryAfterMs: number }
 */
export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 30, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Nouvelle fenêtre
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  entry.count++;
  
  if (entry.count > maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      retryAfterMs: entry.resetTime - now 
    };
  }

  return { allowed: true, remaining: maxRequests - entry.count, retryAfterMs: 0 };
}

/**
 * Rate Limiter distribué via Upstash Redis REST API (Serverless-safe)
 * Bascule automatiquement sur checkRateLimit (mémoire) si Redis n'est pas configuré.
 */
export async function checkRateLimitAsync(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const windowKey = Math.floor(Date.now() / windowMs);
      const key = `aetheris:rl:${identifier}:${windowKey}`;
      const ttlSeconds = Math.ceil(windowMs / 1000) + 5;

      // Pipeline atomique INCR + EXPIRE via Upstash REST
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, ttlSeconds, 'NX'],
        ]),
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        const count = Number(data?.[0]?.result ?? 1);
        const resetTime = (windowKey + 1) * windowMs;
        const retryAfterMs = Math.max(0, resetTime - Date.now());

        if (count > maxRequests) {
          return { allowed: false, remaining: 0, retryAfterMs };
        }
        return { allowed: true, remaining: Math.max(0, maxRequests - count), retryAfterMs: 0 };
      }
    } catch {
      // Fallback transparent sur la Map en mémoire en cas d'erreur réseau Redis
    }
  }

  return checkRateLimit(identifier, maxRequests, windowMs);
}

/**
 * Nettoyage périodique des anciennes entrées (éviter les fuites mémoire)
 */
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime + 60000) { // 1 minute après expiration
      rateLimitMap.delete(key);
    }
  }
}, 120000); // Toutes les 2 minutes

if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
  cleanupTimer.unref();
}
