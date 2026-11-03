import 'server-only';
import crypto from 'crypto';

/**
 * Vérification cryptographique à temps constant du secret Cron.
 * Comportement strictement FAIL-CLOSED dans tous les environnements :
 * si `CRON_SECRET` est absent ou vide, l'accès est systématiquement refusé.
 */
export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || cronSecret.length < 16) {
    return false;
  }

  const authHeader = request.headers.get('authorization') || '';
  const expected = `Bearer ${cronSecret}`;
  const authBuf = Buffer.from(authHeader, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (authBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(authBuf, expectedBuf);
}
