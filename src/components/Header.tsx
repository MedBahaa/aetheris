'use client';

import { Menu, Zap, LogOut } from 'lucide-react';
import Link from 'next/link';
import MacroWidget from './MacroWidget';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export default function Header({ onOpenSidebar }: HeaderProps) {
  const handleLogout = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.auth.signOut();
      localStorage.removeItem('aetheris_last_activity_time');
      localStorage.removeItem('aetheris_user_profile');
      window.location.href = '/login';
    } catch (err) {
      console.error('Error logging out:', err);
      window.location.href = '/login';
    }
  };

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
          <button 
            onClick={handleLogout}
            className="header-logout-btn touch-target"
            title="Se déconnecter de votre session"
            aria-label="Se déconnecter"
          >
            <LogOut size={16} />
            <span className="logout-text-label">SORTIR</span>
          </button>

          {/* Menu Burger à DROITE (masqué sur desktop) */}
          <button 
            onClick={onOpenSidebar} 
            className="menu-toggle-btn touch-target lg:hidden" 
            aria-label="Ouvrir le menu principal"
            aria-expanded={false}
          >
            <Menu size={24} />
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
          z-index: 900;
          border-bottom: 1px solid var(--border-glass);
          display: flex;
          align-items: center;
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
          background: #fff;
          color: #000;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
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

        .header-logout-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #f87171;
          height: 34px;
          padding: 0 0.75rem;
          border-radius: 0.6rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .header-logout-btn:hover {
          background: rgba(239, 68, 68, 0.25);
          border-color: rgba(239, 68, 68, 0.5);
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
        }

        @media (max-width: 640px) {
          .logout-text-label {
            display: none;
          }
          .header-logout-btn {
            padding: 0;
            height: 44px;
            width: 44px;
            justify-content: center;
          }
        }

        .menu-toggle-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          color: #fff;
          width: 48px;
          height: 48px;
          border-radius: 0.75rem;
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
          transform: scale(1.05);
        }

        .menu-dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          background: var(--accent-emerald);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--accent-emerald);
          border: 2px solid var(--bg-dark);
        }
      `}</style>
    </header>
  );
}
