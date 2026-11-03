import 'server-only';

/**
 * AUDIT FIX: Rate Limiter hybride (Upstash Redis distribué + Fallback mémoire borné)
 * Protège contre les abus d'API, le Denial of Wallet IA, la saturation OOM
 * et l'usurpation d'en-têtes (cf-connecting-ip / X-Forwarded-For / X-Real-IP).
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export const MAX_RATE_LIMIT_MEMORY_ENTRIES = 10_000;

const rateLimitMap = new Map<string, RateLimitEntry>();
const VALID_IP_REGEX = /^[0-9a-fA-F.:]+$/;

interface HeaderGetter {
  get(name: string): string | null;
}

/**
 * Extrait l'adresse IP réelle du client selon l'infrastructure de confiance active :
 * 1. Vercel Edge (`x-vercel-forwarded-for`) uniquement si `VERCEL === '1'`
 * 2. Cloudflare (`cf-connecting-ip`) uniquement si `TRUST_CLOUDFLARE_PROXY === 'true'`
 * 3. Dernier saut (rightmost) de `x-forwarded-for` ajouté par le reverse-proxy frontal
 * 4. `x-real-ip` uniquement si `TRUST_REVERSE_PROXY === 'true'`
 */
export function getClientIpFromHeaders(headers: HeaderGetter): string {
  // 1. Sur Vercel : faire confiance à l'en-tête signé par le réseau Edge Vercel
  if (process.env.VERCEL === '1') {
    const vercelForwarded = headers.get('x-vercel-forwarded-for');
    if (vercelForwarded) {
      const hops = vercelForwarded
        .split(',')
        .map((ip) => ip.trim())
        .filter((ip) => Boolean(ip) && VALID_IP_REGEX.test(ip));
      if (hops.length > 0) {
        return hops[hops.length - 1].substring(0, 45);
      }
    }
  }

  // 2. Derrière Cloudflare authentifié uniquement (bloque la falsification directe de cf-connecting-ip)
  if (process.env.TRUST_CLOUDFLARE_PROXY === 'true') {
    const cfIp = headers.get('cf-connecting-ip')?.trim();
    if (cfIp && VALID_IP_REGEX.test(cfIp)) {
      return cfIp.substring(0, 45);
    }
  }

  // 3. X-Forwarded-For : sélectionner le DERNIER saut (ajouté par le reverse-proxy) et jamais l'indice [0]
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

  // 4. Fallback X-Real-IP uniquement derrière un reverse-proxy local explicitement déclaré
  if (process.env.TRUST_REVERSE_PROXY === 'true') {
    const realIp = headers.get('x-real-ip')?.trim();
    if (realIp && VALID_IP_REGEX.test(realIp)) {
      return realIp.substring(0, 45);
    }
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
 * Vérifie si une requête est autorisée par le rate limiter en mémoire (synchrone, borné anti-OOM)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const safeId = identifier.substring(0, 160);
  const entry = rateLimitMap.get(safeId);

  if (!entry || now > entry.resetTime) {
    if (!rateLimitMap.has(safeId) && rateLimitMap.size >= MAX_RATE_LIMIT_MEMORY_ENTRIES) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey !== undefined) {
        rateLimitMap.delete(oldestKey);
      }
    }
    rateLimitMap.set(safeId, { count: 1, resetTime: now + windowMs });
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
 * Bascule automatiquement sur checkRateLimit (mémoire bornée) si Redis n'est pas configuré.
 */
export async function checkRateLimitAsync(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const safeId = identifier.substring(0, 160);

  if (redisUrl && redisToken) {
    try {
      const windowKey = Math.floor(Date.now() / windowMs);
      const key = `aetheris:rl:${safeId}:${windowKey}`;
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
        signal: AbortSignal.timeout(3000),
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

  return checkRateLimit(safeId, maxRequests, windowMs);
}

export function getRateLimitMemorySize(): number {
  return rateLimitMap.size;
}

export function clearRateLimitMemory(): void {
  rateLimitMap.clear();
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
