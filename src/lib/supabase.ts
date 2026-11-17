import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const LAST_ACTIVITY_KEY = 'aetheris_last_activity_time';

// Client public strictement réservé au navigateur (utilise @supabase/ssr pour synchroniser les cookies)
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);

/**
 * Réinitialise le compteur d'activité de session (à appeler dès la connexion réussie)
 * pour éviter toute déconnexion immédiate par SessionGuard.
 */
export function resetSessionActivityTimer(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {
    // Ignorer en navigation privée restreinte
  }
}

/**
 * Purge exhaustive de toutes les données sensibles en localStorage, sessionStorage et CacheStorage PWA lors de la déconnexion.
 */
export function purgeClientSessionData(): void {
  if (typeof window === 'undefined') return;
  const sensitiveKeys = [
    LAST_ACTIVITY_KEY,
    'aetheris_user_profile',
    'agent_history',
    'aetheris_sharia_result',
    'aetheris_capital',
  ];
  for (const key of sensitiveKeys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignorer en navigation privée restreinte
    }
  }

  // Nettoyer également tout jeton sb-* résiduel en localStorage et sessionStorage
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('sb-')) {
        window.localStorage.removeItem(k);
      }
    }
  } catch {
    // Ignorer
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // Ignorer
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_AUTH_CACHE' });
  }
}

/**
 * Déconnexion complète et atomique (Client + Serveur + Cookies + Stockage local)
 */
export async function performCleanLogout(redirectUrl: string = '/login'): Promise<void> {
  purgeClientSessionData();

  await Promise.allSettled([
    // 1. Purge des cookies HTTP côté serveur
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }),
    // 2. Déconnexion du client navigateur avec timeout de sécurité (2.5s max)
    Promise.race([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]),
  ]);

  // 3. Deuxième passe de nettoyage après signOut
  purgeClientSessionData();

  if (typeof window !== 'undefined') {
    window.location.replace(redirectUrl);
  }
}
