'use client';

import { Menu, Zap, LogIn, UserPlus, User, LogOut } from 'lucide-react';
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
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
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
                <button className="auth-btn login-btn">
                  <LogIn size={14} />
                  <span>Se connecter</span>
                </button>
              </Link>
              <Link href="/login?mode=signup" style={{ textDecoration: 'none' }}>
                <button className="auth-btn signup-btn">
                  <UserPlus size={14} />
                  <span>S'inscrire</span>
                </button>
              </Link>
            </div>
          ) : isAuthenticated === true ? (
            <div className="user-nav-group">
              <Link href="/profile" style={{ textDecoration: 'none' }}>
                <button className="user-badge-btn" title="Mon Profil">
                  <User size={14} />
                  <span className="user-badge-label">Mon Espace</span>
                </button>
              </Link>

              <button 
                className="user-logout-btn touch-target"
                title="Se déconnecter"
                aria-label="Déconnexion"
                onClick={async () => {
                  const { supabase } = await import('@/lib/supabase');
                  await supabase.auth.signOut();
                  localStorage.removeItem('aetheris_last_activity_time');
                  localStorage.removeItem('aetheris_user_profile');
                  window.location.href = '/login';
                }}
              >
                <LogOut size={16} />
              </button>
              
              <button 
                onClick={onOpenSidebar} 
                className="menu-toggle-btn touch-target" 
                aria-label="Ouvrir le menu principal"
              >
                <Menu size={20} />
                <span className="menu-dot"></span>
              </button>
            </div>
          ) : (
            <div className="auth-nav-placeholder" />
          )}
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
          z-index: 900;
          border-bottom: 1px solid var(--border-glass);
          display: flex;
          align-items: center;
          background: rgba(9, 13, 22, 0.85);
          backdrop-filter: blur(20px);
        }

        .header-inner {
          width: 100%;
          max-width: var(--max-width);
          margin: 0 auto;
          padding: 0 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        @media (min-width: 1024px) {
          .header-inner {
            padding: 0 2rem;
          }
          
          .user-logout-btn {
            display: none;
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
          font-size: 1.15rem;
          color: #fff;
          letter-spacing: -0.04em;
        }

        .header-right-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .auth-nav-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .auth-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          height: 36px;
          padding: 0 0.85rem;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s var(--ease);
          font-family: 'Inter', sans-serif;
        }

        .login-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
        }
        .login-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.2);
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

        .user-nav-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-badge-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          height: 36px;
          padding: 0 0.75rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
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

        .user-logout-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          color: #ef4444;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s var(--ease);
        }

        .user-logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .menu-toggle-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          color: #fff;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s var(--ease);
          position: relative;
        }

        .menu-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .menu-dot {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 6px;
          height: 6px;
          background: var(--accent-emerald);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--accent-emerald);
        }

        .auth-nav-placeholder {
          width: 120px;
          height: 36px;
        }

        @media (max-width: 640px) {
          .user-badge-label { display: none; }
          .auth-btn span { display: none; }
          .auth-btn { padding: 0 0.6rem; }
        }
      `}</style>
    </header>
  );
}
