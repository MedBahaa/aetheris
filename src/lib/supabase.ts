import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Client public strictement réservé au navigateur (utilise @supabase/ssr pour synchroniser les cookies)
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);

/**
 * Purge exhaustive de toutes les données sensibles en localStorage et CacheStorage PWA lors de la déconnexion.
 */
export function purgeClientSessionData(): void {
  if (typeof window === 'undefined') return;
  const sensitiveKeys = [
    'aetheris_last_activity_time',
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
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_AUTH_CACHE' });
  }
}
