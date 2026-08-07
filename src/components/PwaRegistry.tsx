'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X, Sparkles, Smartphone } from 'lucide-react';

// Extension du window pour TypeScript
declare global {
  interface Window {
    __pwaInstallEvent: any;
    __pwaInstallDismissed: boolean;
  }
}

export default function PwaRegistry() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  // Récupère l'event capturé globalement et affiche la bannière
  const activateBanner = useCallback((promptEvent: any) => {
    if (!promptEvent) return;
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;
    setInstallPrompt(promptEvent);
    // Afficher immédiatement (l'event a déjà préventé le comportement natif)
    setTimeout(() => setShowBanner(true), 1500);
  }, []);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    setIsIos(ios);
    setIsStandalone(standalone);

    // ── 1. Vérifier si l'event a déjà été capturé AVANT le montage React ──
    if (window.__pwaInstallEvent) {
      activateBanner(window.__pwaInstallEvent);
    }

    // ── 2. Écouter l'event custom au cas où le prompt arrive après le montage ──
    const onInstallAvailable = () => {
      activateBanner(window.__pwaInstallEvent);
    };
    window.addEventListener('pwa-install-available', onInstallAvailable);

    // ── 3. Enregistrement du Service Worker + détection de mise à jour ──
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setNewWorker(installing);
              setUpdateAvailable(true);
            }
          });
        });
      }).catch((err) => console.warn('[PWA] SW registration failed:', err));
    }

    // ── 4. iOS : afficher le guide après 2s ──
    if (ios && !standalone) {
      const iosDismissed = sessionStorage.getItem('pwa-ios-dismissed');
      if (!iosDismissed) {
        setTimeout(() => setShowIosBanner(true), 2000);
      }
    }

    return () => {
      window.removeEventListener('pwa-install-available', onInstallAvailable);
    };
  }, [activateBanner]);

  // ── Handlers ────────────────────────────────────────────────
  const handleInstall = useCallback(async () => {
    const prompt = installPrompt || window.__pwaInstallEvent;
    if (!prompt) return;
    setShowBanner(false);
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    window.__pwaInstallEvent = null;
    setInstallPrompt(null);
  }, [installPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  }, []);

  const handleUpdate = useCallback(() => {
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [newWorker]);

  if (isStandalone) return null;

  return (
    <>
      {/* ── Bannière d'installation Android/Desktop ─────────── */}
      {showBanner && (
        <div style={{
          position: 'fixed',
          bottom: '1.25rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9998,
          width: 'calc(100% - 2rem)',
          maxWidth: '480px',
          animation: 'pwa-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(13, 17, 23, 0.97)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '1rem',
            padding: '0.9rem 1rem',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 40px rgba(168,85,247,0.12)',
          }}>
            {/* Icône */}
            <div style={{
              width: 44, height: 44,
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(6,182,212,0.12))',
              border: '1px solid rgba(168,85,247,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#a855f7', flexShrink: 0,
            }}>
              <Sparkles size={20} />
            </div>

            {/* Texte */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <strong style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9' }}>
                Installer Aetheris
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                Accès rapide · Hors-ligne · Alertes push
              </span>
            </div>

            {/* CTA Installer */}
            <button
              onClick={handleInstall}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.55rem 1rem',
                borderRadius: '0.6rem', border: 'none',
                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                color: '#fff', fontWeight: 700, fontSize: '0.78rem',
                cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(168,85,247,0.35)',
                transition: 'all 0.2s',
              }}
            >
              <Download size={13} />
              Installer
            </button>

            {/* Fermer */}
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent', border: 'none',
                color: '#475569', cursor: 'pointer',
                padding: '0.25rem', display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <style>{`
            @keyframes pwa-slide-up {
              from { opacity: 0; transform: translateX(-50%) translateY(24px); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* ── Guide iOS Add to Home Screen ────────────────────── */}
      {isIos && showIosBanner && (
        <div style={{
          position: 'fixed',
          bottom: '1.25rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9997,
          width: 'calc(100% - 2rem)',
          maxWidth: '480px',
          animation: 'pwa-slide-up 0.4s ease both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            background: 'rgba(13,17,23,0.97)',
            border: '1px solid rgba(6,182,212,0.3)',
            borderRadius: '1rem',
            padding: '0.85rem 1rem',
            backdropFilter: 'blur(20px)',
            fontSize: '0.8rem', color: '#94a3b8',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <Smartphone size={16} style={{ color: '#06b6d4', flexShrink: 0 }} />
            <span style={{ flex: 1 }}>
              Pour installer : appuyez sur{' '}
              <strong style={{ color: '#f1f5f9' }}>⎙ Partager</strong>{' '}
              puis{' '}
              <strong style={{ color: '#f1f5f9' }}>Sur l'écran d'accueil</strong>
            </span>
            <button
              onClick={() => {
                setShowIosBanner(false);
                sessionStorage.setItem('pwa-ios-dismissed', '1');
              }}
              style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Bannière mise à jour SW ──────────────────────────── */}
      {updateAvailable && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'rgba(13,17,23,0.97)',
          border: '1px solid rgba(168,85,247,0.4)',
          borderRadius: '0.75rem', padding: '0.75rem 1rem',
          fontSize: '0.82rem', color: '#f1f5f9',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'pwa-slide-down 0.3s ease both',
        }}>
          <style>{`
            @keyframes pwa-slide-down {
              from { opacity: 0; transform: translateY(-10px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <span>🚀 Nouvelle version disponible</span>
          <button
            onClick={handleUpdate}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: 'none',
              background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
              color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
            }}
          >
            Mettre à jour
          </button>
          <button
            onClick={() => setUpdateAvailable(false)}
            style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex' }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
