'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  supabase,
  LAST_ACTIVITY_KEY,
  resetSessionActivityTimer,
  performCleanLogout,
} from '@/lib/supabase';

// Durée maximale d'inactivité avant déconnexion automatique de sécurité (4 heures = 14 400 000 ms)
const MAX_INACTIVITY_MS = 4 * 60 * 60 * 1000;

export default function SessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    // Dès qu'une connexion est établie, réinitialiser le compteur d'activité pour éviter toute fausse expiration
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        resetSessionActivityTimer();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Ne pas exécuter le guard d'expiration sur les pages publiques
    const publicPages = ['/', '/login', '/marche-live', '/offline', '/console'];
    if (publicPages.includes(pathname) || pathname?.startsWith('/auth')) return;

    let isUnmounted = false;

    // 1. Vérifier si l'inactivité maximale est dépassée (uniquement si une session est active)
    const checkInactivity = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isUnmounted) return;

        // Si pas de session active, ne pas déclencher de fausse expiration
        if (!session) {
          return;
        }

        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        const now = Date.now();

        if (lastActivity) {
          const parsedLast = parseInt(lastActivity, 10);
          if (Number.isFinite(parsedLast) && now - parsedLast > MAX_INACTIVITY_MS) {
            console.warn(
              '[SessionGuard] Session expirée après inactivité de',
              Math.round((now - parsedLast) / 60000),
              'minutes.'
            );
            await performCleanLogout('/login?reason=expired');
            return;
          }
        }

        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      } catch (err) {
        console.error('[SessionGuard] Erreur lors de la vérification de session:', err);
      }
    };

    checkInactivity();

    const updateActivity = () => {
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      } catch {
        // Ignorer
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          updateActivity();
          throttleTimeout = null;
        }, 30000);
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isUnmounted = true;
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [pathname]);

  return null;
}
