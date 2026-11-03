/**
 * AUDIT FIX: Rate Limiter hybride (Upstash Redis distribué + Fallback mémoire)
 * Protège contre les abus d'API, le Denial of Wallet IA et l'usurpation d'en-têtes X-Forwarded-For.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const VALID_IP_REGEX = /^[0-9a-fA-F.:]+$/;

interface HeaderGetter {
  get(name: string): string | null;
}

/**
 * Extrait l'adresse IP réelle du client en privilégiant les en-têtes injectés par l'infrastructure Edge
 * (Vercel / Cloudflare) et le dernier saut de confiance (rightmost) de X-Forwarded-For afin d'empêcher
 * le contournement du Rate-Limiting par falsification de X-Forwarded-For[0] ou X-Real-IP côté client.
 */
export function getClientIpFromHeaders(headers: HeaderGetter): string {
  // 1. En-têtes signés / réécrits par la plateforme Edge (non falsifiables par le client sur Vercel / Cloudflare)
  const cfIp = headers.get('cf-connecting-ip')?.trim();
  if (cfIp && VALID_IP_REGEX.test(cfIp)) {
    return cfIp.substring(0, 45);
  }

  const vercelForwarded = headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    const hops = vercelForwarded.split(',').map((ip) => ip.trim()).filter(Boolean);
    const trustedHop = hops[hops.length - 1];
    if (trustedHop && VALID_IP_REGEX.test(trustedHop)) {
      return trustedHop.substring(0, 45);
    }
  }

  // 2. X-Forwarded-For : sélectionner le DERNIER saut (ajouté par le reverse-proxy de confiance) et non l'indice [0] contrôlé par le client
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const hops = forwardedFor
      .split(',')
      .map((ip) => ip.trim())
      .filter((ip) => Boolean(ip) && VALID_IP_REGEX.test(ip));
    if (hops.length > 0) {
      return hops[hops.length - 1].substring(0, 45);
    }
  }

  // 3. Fallback X-Real-IP uniquement si aucun X-Forwarded-For n'est présent
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp && VALID_IP_REGEX.test(realIp)) {
    return realIp.substring(0, 45);
  }

  return 'unknown';
}

/**
 * Extrait de manière sécurisée l'adresse IP du client depuis un objet Request
 */
export function getClientIp(req: Request): string {
  return getClientIpFromHeaders(req.headers);
}

/**
 * Vérifie si une requête est autorisée par le rate limiter en mémoire (synchrone)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetTime - now,
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
    if (now > entry.resetTime + 60000) {
      rateLimitMap.delete(key);
    }
  }
}, 120000);

if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
  cleanupTimer.unref();
}
