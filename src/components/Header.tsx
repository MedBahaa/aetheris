'use client';

import { Menu, Zap, LogIn, UserPlus, User } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import MacroWidget from './MacroWidget';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export default function Header({ onOpenSidebar }: HeaderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
    <header className="fixed-header glass-heavy">
      <div className="header-inner">
        {/* Logo à GAUCHE */}
        <Link href="/" style={{ textDecoration: 'none' }} aria-label="Aetheris AI Accueil">
          <div className="header-logo">
            <div className="logo-icon-box">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="logo-text">AETHERIS</span>
          </div>
        </Link>

        {/* Console Macro au centre */}
        <div className="header-macro-center">
          <MacroWidget />
        </div>

        {/* Actions à DROITE */}
        <div className="header-right-actions">
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
      `}</style>
    </header>
  );
}
