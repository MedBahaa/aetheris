/**
 * AUDIT FIX: Rate Limiter simple en mémoire pour les API Routes
 * Protège contre les abus sans dépendance externe
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Vérifie si une requête est autorisée par le rate limiter
 * @param identifier - Identifiant unique (ex: IP, route)
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
 * Nettoyage périodique des anciennes entrées (éviter les fuites mémoire)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime + 60000) { // 1 minute après expiration
      rateLimitMap.delete(key);
    }
  }
}, 120000); // Toutes les 2 minutes
