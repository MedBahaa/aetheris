'use client';

import { Menu, Zap } from 'lucide-react';
import Link from 'next/link';
import MacroWidget from './MacroWidget';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export default function Header({ onOpenSidebar }: HeaderProps) {
  return (
    <header className="fixed-header glass-heavy">
      <div className="header-inner">
        {/* Logo à GAUCHE */}
        <Link href="/" style={{ textDecoration: 'none' }}>
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

        {/* Menu Burger à DROITE */}
        <button onClick={onOpenSidebar} className="menu-toggle-btn" aria-label="Open Menu">
          <Menu size={24} />
          <span className="menu-dot"></span>
        </button>
      </div>

      <style jsx>{`
        .fixed-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--header-height);
          z-index: 900;
          border-bottom: 1px solid var(--border-glass);
          display: flex;
          align-items: center;
        }

        .header-inner {
          width: 100%;
          max-width: var(--max-width);
          margin: 0 auto;
          padding: 0 1.5rem;
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
        }

        .header-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: transform 0.3s var(--ease);
        }

        .header-logo:hover {
          transform: translateY(-1px);
        }

        .logo-icon-box {
          width: 2.2rem;
          height: 2.2rem;
          background: #fff;
          color: #000;
          border-radius: 0.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
        }

        .logo-text {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 1.4rem;
          color: #fff;
          letter-spacing: -0.04em;
        }

        .menu-toggle-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          color: #fff;
          width: 3rem;
          height: 3rem;
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
