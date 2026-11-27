'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X, Sparkles, Smartphone, WifiOff } from 'lucide-react';

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
  const [isOffline, setIsOffline] = useState(false);

  const activateBanner = useCallback((promptEvent: any) => {
    if (!promptEvent) return;
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;
    setInstallPrompt(promptEvent);
    setTimeout(() => setShowBanner(true), 1500);
  }, []);

  useEffect(() => {
    const syncNetworkState = () => setIsOffline(!navigator.onLine);
    syncNetworkState();
    window.addEventListener('online', syncNetworkState);
    window.addEventListener('offline', syncNetworkState);

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    setIsIos(ios);
    setIsStandalone(standalone);

    if (window.__pwaInstallEvent) {
      activateBanner(window.__pwaInstallEvent);
    }

    const onInstallAvailable = () => {
      activateBanner(window.__pwaInstallEvent);
    };
    window.addEventListener('pwa-install-available', onInstallAvailable);

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

    if (ios && !standalone) {
      const iosDismissed = sessionStorage.getItem('pwa-ios-dismissed');
      if (!iosDismissed) {
        setTimeout(() => setShowIosBanner(true), 2000);
      }
    }

    return () => {
      window.removeEventListener('online', syncNetworkState);
      window.removeEventListener('offline', syncNetworkState);
      window.removeEventListener('pwa-install-available', onInstallAvailable);
    };
  }, [activateBanner]);

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

  return (
    <>
      {/* ── Bannière Hors-Ligne globale (browser & standalone) ── */}
      {isOffline && (
        <div className="pwa-offline-banner no-print" role="status" aria-live="polite">
          <WifiOff size={14} style={{ flexShrink: 0 }} />
          <span>Mode hors-ligne — affichage du dernier snapshot marché disponible</span>
        </div>
      )}

      {/* ── Bannière d'installation Android/Desktop ─────────── */}
      {!isStandalone && showBanner && (
        <div className="pwa-banner-wrap">
          <div className="pwa-banner-card">
            <div className="pwa-icon-box">
              <Sparkles size={20} />
            </div>

            <div className="pwa-text-col">
              <strong className="pwa-title">Installer Aetheris</strong>
              <span className="pwa-sub">Accès rapide · Hors-ligne · Alertes</span>
            </div>

            <button onClick={handleInstall} className="pwa-cta-btn" type="button">
              <Download size={13} />
              <span>Installer</span>
            </button>

            <button onClick={handleDismiss} className="pwa-close-btn" type="button" aria-label="Fermer la bannière d'installation">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Guide iOS Add to Home Screen ────────────────────── */}
      {!isStandalone && isIos && showIosBanner && (
        <div className="pwa-banner-wrap">
          <div className="pwa-banner-card ios">
            <Smartphone size={18} className="pwa-ios-icon" />
            <span className="pwa-ios-text">
              Pour installer : appuyez sur <strong>⎙ Partager</strong> puis <strong>Sur l&apos;écran d&apos;accueil</strong>
            </span>
            <button
              type="button"
              className="pwa-close-btn"
              aria-label="Fermer le guide iOS"
              onClick={() => {
                setShowIosBanner(false);
                sessionStorage.setItem('pwa-ios-dismissed', '1');
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Bannière mise à jour SW ──────────────────────────── */}
      {updateAvailable && (
        <div className="pwa-update-banner">
          <span>🚀 Nouvelle version disponible</span>
          <button onClick={handleUpdate} className="pwa-update-btn" type="button">
            Mettre à jour
          </button>
          <button onClick={() => setUpdateAvailable(false)} className="pwa-close-btn" type="button" aria-label="Ignorer la mise à jour">
            <X size={15} />
          </button>
        </div>
      )}

      <style jsx>{`
        .pwa-offline-banner {
          position: fixed;
          top: calc(var(--header-height, 60px) + var(--sat, 0px) + 8px);
          left: 50%;
          transform: translateX(-50%);
          z-index: var(--z-pwa, 1100);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.95rem;
          border-radius: 999px;
          background: rgba(120, 53, 15, 0.95);
          border: 1px solid rgba(245, 158, 11, 0.45);
          color: #fef3c7;
          font-size: 0.78rem;
          font-weight: 700;
          max-width: calc(100vw - 1.5rem);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .pwa-banner-wrap {
          position: fixed;
          bottom: 1.25rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: var(--z-pwa, 1100);
          width: calc(100% - 1.5rem);
          max-width: 480px;
          animation: pwa-slide-up 0.4s var(--ease-spring, cubic-bezier(0.32, 0.72, 0, 1)) both;
        }

        @media (max-width: 1023px) {
          .pwa-banner-wrap {
            bottom: calc(var(--bottom-nav-height, 68px) + var(--sab, 0px) + 12px);
          }
        }

        .pwa-banner-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(11, 16, 26, 0.96);
          border: 1px solid rgba(168, 85, 247, 0.4);
          border-radius: 1rem;
          padding: 0.75rem 0.85rem;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.65), 0 0 40px rgba(168, 85, 247, 0.12);
        }

        .pwa-banner-card.ios {
          border-color: rgba(6, 182, 212, 0.35);
          gap: 0.65rem;
        }

        .pwa-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 0.75rem;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(6, 182, 212, 0.12));
          border: 1px solid rgba(168, 85, 247, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a855f7;
          flex-shrink: 0;
        }

        .pwa-text-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .pwa-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        .pwa-sub {
          font-size: 0.7rem;
          color: #94a3b8;
          font-family: 'JetBrains Mono', monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pwa-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          min-height: 40px;
          padding: 0.5rem 0.9rem;
          border-radius: 0.65rem;
          border: none;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          color: #fff;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.35);
          flex-shrink: 0;
        }

        .pwa-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          min-width: 40px;
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .pwa-ios-icon {
          color: #06b6d4;
          flex-shrink: 0;
        }

        .pwa-ios-text {
          flex: 1;
          font-size: 0.8rem;
          color: #cbd5e1;
          line-height: 1.4;
        }

        .pwa-ios-text strong {
          color: #ffffff;
        }

        .pwa-update-banner {
          position: fixed;
          top: calc(var(--header-height, 58px) + var(--sat, 0px) + 10px);
          right: 1rem;
          left: auto;
          z-index: var(--z-pwa, 1100);
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: rgba(11, 16, 26, 0.97);
          border: 1px solid rgba(168, 85, 247, 0.45);
          border-radius: 0.85rem;
          padding: 0.55rem 0.75rem 0.55rem 0.9rem;
          font-size: 0.82rem;
          color: #f1f5f9;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
          animation: pwa-slide-down 0.3s ease both;
        }

        @media (max-width: 640px) {
          .pwa-update-banner {
            left: 0.75rem;
            right: 0.75rem;
            justify-content: space-between;
          }
        }

        .pwa-update-btn {
          min-height: 36px;
          padding: 0.4rem 0.85rem;
          border-radius: 0.55rem;
          border: none;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          color: #fff;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          white-space: nowrap;
        }

        @keyframes pwa-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(24px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        @keyframes pwa-slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
