'use client';

import { Menu, Zap, LogIn, UserPlus, User, Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import MacroWidget from './MacroWidget';
import CommandPalette from './CommandPalette';

interface HeaderProps {
  onOpenSidebar: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  '/marche-live': 'MARCHÉ LIVE',
  '/console': 'CONSOLE ALPHA',
  '/portfolio': 'PORTEFEUILLE',
  '/dividendes': 'DIVIDENDES',
  '/purification': 'PURIFICATION AAOIFI',
  '/intelligence': 'HUB IA',
  '/profile': 'PROFIL',
};

export default function Header({ onOpenSidebar }: HeaderProps) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const routeLabel = ROUTE_LABELS[pathname || ''] || 'TERMINAL';

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, []);

  useEffect(() => {
    let active = true;

    const checkUser = async () => {
      try {
        // 1. Lecture instantanée de la session locale pour éviter le clignotement d'UI
        const { data: { session } } = await supabase.auth.getSession();
        if (active && session?.user) {
          setIsAuthenticated(true);
        }

        // 2. Validation serveur en arrière-plan
        const { data: { user } } = await supabase.auth.getUser();
        if (active) {
          setIsAuthenticated(!!user);
        }
      } catch {
        if (active) setIsAuthenticated(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setIsAuthenticated(!!session?.user);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
    <header className="fixed-header glass-heavy">
      <div className="header-inner">
        {/* Logo mobile à GAUCHE + Fil d'Ariane Desktop */}
        <div className="header-left-slot">
          <Link href="/" className="header-logo-link" style={{ textDecoration: 'none' }} aria-label="Aetheris AI Accueil">
            <div className="header-logo">
              <div className="logo-icon-box">
                <Zap size={18} fill="currentColor" />
              </div>
              <span className="logo-text">AETHERIS</span>
            </div>
          </Link>

          <div className="header-breadcrumb mono">
            <span className="bc-root">AETHERIS</span>
            <ChevronRight size={12} className="bc-sep" />
            <span className="bc-current">{routeLabel}</span>
          </div>
        </div>

        {/* Console Macro au centre */}
        <div className="header-macro-center">
          <MacroWidget />
        </div>

        {/* Actions à DROITE */}
        <div className="header-right-actions">
          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            className="cmd-trigger-btn"
            title="Recherche rapide & navigation (Ctrl+K)"
            aria-label="Ouvrir la palette de commandes (Ctrl+K)"
          >
            <Search size={13} />
            <span className="cmd-trigger-label">Rechercher un titre…</span>
            <kbd className="cmd-kbd mono">Ctrl K</kbd>
          </button>

          {isAuthenticated === false ? (
            <div className="auth-nav-buttons">
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="auth-btn login-btn" type="button">
                  <LogIn size={14} />
                  <span>Connexion</span>
                </button>
              </Link>
              <Link href="/login?mode=signup" className="signup-link-desktop" style={{ textDecoration: 'none' }}>
                <button className="auth-btn signup-btn" type="button">
                  <UserPlus size={14} />
                  <span>S&apos;inscrire</span>
                </button>
              </Link>
            </div>
          ) : isAuthenticated === true ? (
            <Link href="/profile" style={{ textDecoration: 'none' }}>
              <button className="user-badge-btn" title="Mon Profil" type="button" aria-label="Mon Profil">
                <User size={15} />
                <span className="user-badge-label">Mon Espace</span>
              </button>
            </Link>
          ) : (
            <div className="auth-nav-placeholder" />
          )}

          <button 
            onClick={onOpenSidebar} 
            className="menu-toggle-btn" 
            type="button"
            aria-label="Ouvrir le menu principal"
          >
            <Menu size={20} />
            <span className="menu-dot"></span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .fixed-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: calc(var(--header-height) + var(--sat));
          padding-top: var(--sat);
          z-index: var(--z-header, 900);
          border-bottom: 1px solid var(--border-glass);
          display: flex;
          align-items: center;
          background: rgba(9, 13, 22, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .header-inner {
          width: 100%;
          max-width: var(--max-width);
          margin: 0 auto;
          padding: 0 0.85rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        @media (min-width: 1024px) {
          .header-inner {
            padding: 0 2rem;
          }
        }

        .header-macro-center {
          flex: 1;
          display: flex;
          justify-content: center;
          margin: 0 0.75rem;
          min-width: 0;
        }

        .header-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: transform 0.3s var(--ease);
          flex-shrink: 0;
        }

        .header-logo:hover {
          transform: translateY(-1px);
        }

        .logo-icon-box {
          width: 1.85rem;
          height: 1.85rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #000;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
        }

        .logo-text {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 1.1rem;
          color: #fff;
          letter-spacing: -0.04em;
        }

        .header-right-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .auth-nav-buttons {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .auth-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          height: 38px;
          padding: 0 0.8rem;
          border-radius: 10px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s var(--ease);
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }

        .login-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e2e8f0;
        }
        .login-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.22);
        }

        .signup-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: #000000;
          font-weight: 800;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
        }
        .signup-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }

        .user-badge-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          height: 38px;
          padding: 0 0.75rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #10b981;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .user-badge-btn:hover {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .menu-toggle-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-glass);
          color: #fff;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s var(--ease);
          position: relative;
        }

        .menu-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.22);
        }

        .menu-toggle-btn:active {
          transform: scale(0.94);
        }

        .menu-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 6px;
          height: 6px;
          background: var(--accent-emerald);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--accent-emerald);
        }

        .auth-nav-placeholder {
          width: 84px;
          height: 38px;
        }

        @media (max-width: 768px) {
          .header-macro-center {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .user-badge-label { display: none; }
          .user-badge-btn {
            width: 40px;
            height: 40px;
            padding: 0;
          }
          :global(.signup-link-desktop) { display: none; }
          .auth-btn {
            height: 38px;
            padding: 0 0.7rem;
            font-size: 11px;
          }
        }

        .header-left-slot {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .header-breadcrumb {
          display: none;
          align-items: center;
          gap: 0.45rem;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.09em;
        }
        .bc-root { color: #64748b; }
        :global(.bc-sep) { color: #475569; }
        .bc-current {
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 0.22rem 0.6rem;
          border-radius: 7px;
        }

        .cmd-trigger-btn {
          display: none;
          align-items: center;
          gap: 0.55rem;
          height: 36px;
          padding: 0 0.65rem 0 0.75rem;
          border-radius: 9px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .cmd-trigger-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(16, 185, 129, 0.35);
        }
        .cmd-trigger-label {
          font-family: 'Inter', sans-serif;
          padding-right: 0.35rem;
        }
        .cmd-kbd {
          font-size: 10px;
          font-weight: 700;
          color: #cbd5e1;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          padding: 2px 6px;
          border-radius: 5px;
        }

        @media (min-width: 1024px) {
          :global(.header-logo-link) { display: none; }
          .header-breadcrumb { display: flex; }
          .cmd-trigger-btn { display: inline-flex; }
          .menu-toggle-btn { display: none; }
        }
      `}</style>
    </header>
    <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  );
}
