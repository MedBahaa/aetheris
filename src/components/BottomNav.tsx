'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Briefcase, Activity, BrainCircuit, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  // Ne pas afficher la barre de navigation mobile sur la page de connexion ou les callbacks auth
  if (pathname === '/login' || pathname?.startsWith('/auth')) {
    return null;
  }

  const navItems = [
    { label: 'Accueil', href: '/', icon: Zap },
    { label: 'Portefeuille', href: '/portfolio', icon: Briefcase },
    { label: 'Marché Live', href: '/marche-live', icon: Activity },
    { label: 'Intelligence', href: '/intelligence', icon: BrainCircuit },
    { label: 'Profil', href: '/profile', icon: User },
  ];

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Navigation mobile principale">
      <div className="bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-tab-item ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="icon-wrapper">
                <Icon size={20} className="tab-icon" />
                {isActive && <span className="active-glow-dot" />}
              </div>
              <span className="tab-label">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .mobile-bottom-nav {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 99999 !important;
          background: #090d14 !important;
          backdrop-filter: blur(24px) saturate(200%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(200%) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
          padding-bottom: env(safe-area-inset-bottom, 0px) !important;
          box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.9) !important;
        }

        @media (min-width: 1024px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }

        .bottom-nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-around;
          height: 64px;
          max-width: 500px;
          margin: 0 auto;
          padding: 0 0.5rem;
        }

        :global(.nav-tab-item),
        :global(.nav-tab-item:visited),
        :global(.nav-tab-item:hover),
        :global(.nav-tab-item:active),
        :global(.nav-tab-item:focus) {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          min-height: 48px;
          min-width: 48px;
          color: #94a3b8 !important;
          text-decoration: none !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          border-radius: 12px;
          -webkit-tap-highlight-color: transparent;
        }

        :global(.nav-tab-item:active) {
          transform: scale(0.92);
        }

        :global(.nav-tab-item.is-active),
        :global(.nav-tab-item.is-active:visited) {
          color: #10b981 !important;
          text-decoration: none !important;
        }

        .icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }

        .tab-icon {
          transition: transform 0.25s ease, color 0.25s ease;
        }

        :global(.nav-tab-item.is-active) .tab-icon {
          transform: translateY(-1px);
          color: #10b981 !important;
        }

        .active-glow-dot {
          position: absolute;
          bottom: -4px;
          width: 5px;
          height: 5px;
          background-color: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981, 0 0 14px #10b981;
        }

        .tab-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1;
          color: #94a3b8 !important;
          transition: color 0.25s ease;
        }

        :global(.nav-tab-item.is-active) .tab-label {
          color: #ffffff !important;
          font-weight: 800;
        }
      `}</style>
    </nav>
  );
}
