'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X, Sparkles, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaRegistry() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Détection iOS / standalone
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsIos(ios);
    setIsStandalone(standalone);

    // Enregistrement du Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[PWA] SW enregistré, scope:', reg.scope);

        // Détection de mise à jour disponible
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
      }).catch((err) => {
        console.warn('[PWA] Échec enregistrement SW:', err);
      });
    }

    // Capture de l'événement d'installation natif
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);

      // Afficher la bannière après 3 secondes si pas déjà installé
      const dismissed = sessionStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    setShowBanner(false);
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

  // Ne rien afficher si déjà installé en standalone
  if (isStandalone) return null;

  return (
    <>
      {/* Bannière d'installation Android/Desktop */}
      {showBanner && installPrompt && (
        <div className="pwa-install-banner">
          <div className="pwa-install-inner">
            <div className="pwa-install-icon">
              <Sparkles size={20} />
            </div>
            <div className="pwa-install-text">
              <strong>Installer Aetheris</strong>
              <span>Accès rapide · Fonctionne hors-ligne</span>
            </div>
            <button className="pwa-install-btn" onClick={handleInstall}>
              <Download size={14} />
              Installer
            </button>
            <button className="pwa-dismiss-btn" onClick={handleDismiss}>
              <X size={16} />
            </button>
          </div>
          <style jsx>{`
            .pwa-install-banner {
              position: fixed;
              bottom: 1.25rem;
              left: 50%;
              transform: translateX(-50%);
              z-index: 9998;
              width: calc(100% - 2rem);
              max-width: 480px;
              animation: slide-up-banner 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            }

            @keyframes slide-up-banner {
              from { opacity: 0; transform: translateX(-50%) translateY(20px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }

            .pwa-install-inner {
              display: flex;
              align-items: center;
              gap: 0.75rem;
              background: rgba(13, 17, 23, 0.95);
              border: 1px solid rgba(168, 85, 247, 0.35);
              border-radius: 1rem;
              padding: 0.9rem 1rem;
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(168,85,247,0.1);
            }

            .pwa-install-icon {
              width: 40px;
              height: 40px;
              border-radius: 0.75rem;
              background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(6,182,212,0.1));
              border: 1px solid rgba(168,85,247,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #a855f7;
              flex-shrink: 0;
            }

            .pwa-install-text {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 0.15rem;
            }

            .pwa-install-text strong {
              font-size: 0.875rem;
              font-weight: 700;
              color: #f1f5f9;
            }

            .pwa-install-text span {
              font-size: 0.73rem;
              color: #64748b;
              font-family: 'Courier New', monospace;
              letter-spacing: 0.03em;
            }

            .pwa-install-btn {
              display: flex;
              align-items: center;
              gap: 0.35rem;
              padding: 0.55rem 1rem;
              border-radius: 0.6rem;
              border: none;
              background: linear-gradient(135deg, #a855f7, #7c3aed);
              color: #fff;
              font-weight: 700;
              font-size: 0.78rem;
              cursor: pointer;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(168,85,247,0.3);
              transition: all 0.2s;
            }

            .pwa-install-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(168,85,247,0.4); }

            .pwa-dismiss-btn {
              background: transparent;
              border: none;
              color: #475569;
              cursor: pointer;
              padding: 0.25rem;
              display: flex;
              align-items: center;
              transition: color 0.2s;
            }

            .pwa-dismiss-btn:hover { color: #94a3b8; }
          `}</style>
        </div>
      )}

      {/* Bannière d'instruction iOS (Add to Home Screen) */}
      {isIos && !isStandalone && (
        <div className="pwa-ios-banner">
          <div className="pwa-ios-inner">
            <Smartphone size={16} className="pwa-ios-icon" />
            <span>
              Pour installer Aetheris : appuyez sur <strong>⎙ Partager</strong> puis{' '}
              <strong>Sur l'écran d'accueil</strong>
            </span>
            <button className="pwa-ios-close" onClick={() => {
              const el = document.querySelector('.pwa-ios-banner') as HTMLElement;
              if (el) el.style.display = 'none';
            }}>
              <X size={14} />
            </button>
          </div>
          <style jsx>{`
            .pwa-ios-banner {
              position: fixed;
              bottom: 1.25rem;
              left: 50%;
              transform: translateX(-50%);
              z-index: 9997;
              width: calc(100% - 2rem);
              max-width: 480px;
              animation: slide-up-banner 0.4s ease both;
            }

            @keyframes slide-up-banner {
              from { opacity: 0; transform: translateX(-50%) translateY(20px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }

            .pwa-ios-inner {
              display: flex;
              align-items: center;
              gap: 0.6rem;
              background: rgba(13,17,23,0.95);
              border: 1px solid rgba(6,182,212,0.3);
              border-radius: 1rem;
              padding: 0.85rem 1rem;
              backdrop-filter: blur(20px);
              font-size: 0.78rem;
              color: #94a3b8;
              box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.08);
            }

            .pwa-ios-icon { color: #06b6d4; flex-shrink: 0; }

            .pwa-ios-inner strong { color: #f1f5f9; }

            .pwa-ios-close {
              background: transparent;
              border: none;
              color: #475569;
              cursor: pointer;
              margin-left: auto;
              flex-shrink: 0;
              display: flex;
            }
          `}</style>
        </div>
      )}

      {/* Bannière de mise à jour disponible */}
      {updateAvailable && (
        <div className="pwa-update-banner">
          <span>🚀 Nouvelle version disponible</span>
          <button onClick={handleUpdate}>Mettre à jour</button>
          <button onClick={() => setUpdateAvailable(false)}><X size={14} /></button>
          <style jsx>{`
            .pwa-update-banner {
              position: fixed;
              top: 1rem;
              right: 1rem;
              z-index: 9999;
              display: flex;
              align-items: center;
              gap: 0.75rem;
              background: rgba(13,17,23,0.95);
              border: 1px solid rgba(168,85,247,0.4);
              border-radius: 0.75rem;
              padding: 0.75rem 1rem;
              font-size: 0.82rem;
              color: #f1f5f9;
              backdrop-filter: blur(20px);
              box-shadow: 0 8px 32px rgba(0,0,0,0.5);
              animation: slide-down 0.3s ease both;
            }
            @keyframes slide-down {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .pwa-update-banner button:first-of-type {
              padding: 0.4rem 0.85rem;
              border-radius: 0.5rem;
              border: none;
              background: linear-gradient(135deg, #a855f7, #7c3aed);
              color: #fff;
              font-weight: 700;
              font-size: 0.78rem;
              cursor: pointer;
            }
            .pwa-update-banner button:last-of-type {
              background: transparent;
              border: none;
              color: #475569;
              cursor: pointer;
              display: flex;
            }
          `}</style>
        </div>
      )}
    </>
  );
}
