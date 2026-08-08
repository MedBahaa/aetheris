'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Durée maximale d'inactivité avant déconnexion automatique de sécurité (4 heures = 14 400 000 ms)
const MAX_INACTIVITY_MS = 4 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'aetheris_last_activity_time';

export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Ne pas exécuter le guard d'expiration sur les pages publiques
    const publicPages = ['/', '/login', '/marche-live', '/offline'];
    if (publicPages.includes(pathname)) return;

    // 1. Vérifier si l'inactivité maximale est dépassée
    const checkInactivity = async () => {
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      const now = Date.now();

      if (lastActivity) {
        const inactiveTime = now - parseInt(lastActivity, 10);
        if (inactiveTime > MAX_INACTIVITY_MS) {
          console.warn('[SessionGuard] Session expirée après inactivité de', Math.round(inactiveTime / 60000), 'minutes.');
          
          try {
            await supabase.auth.signOut();
          } catch (err) {
            console.error('[SessionGuard] Erreur signOut:', err);
          }
          
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          localStorage.removeItem('aetheris_user_profile');
          
          window.location.href = '/login?reason=expired';
          return;
        }
      }

      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    };

    checkInactivity();

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
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

    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [pathname, router]);

  return null;
}
