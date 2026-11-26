'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Briefcase, Activity, BrainCircuit, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  // Masquer sur la landing page, la page de connexion, les callbacks auth et la page hors-ligne
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/offline' ||
    pathname?.startsWith('/auth')
  ) {
    return null;
  }

  const navItems = [
    { label: 'Console', href: '/console', icon: Zap },
    { label: 'Portefeuille', href: '/portfolio', icon: Briefcase },
    { label: 'Marché', href: '/marche-live', icon: Activity },
    { label: 'IA Hub', href: '/intelligence', icon: BrainCircuit },
    { label: 'Profil', href: '/profile', icon: User },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigation mobile principale">
      <div className="bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-tab-item ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="icon-wrapper">
                <Icon size={19} className="tab-icon" strokeWidth={isActive ? 2.4 : 1.9} />
              </div>
              <span className="tab-label">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: var(--z-bottom-nav, 1000);
          background: rgba(8, 12, 20, 0.92);
          backdrop-filter: blur(22px) saturate(180%);
          -webkit-backdrop-filter: blur(22px) saturate(180%);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          box-shadow: 0 -10px 36px rgba(0, 0, 0, 0.72);
        }

        @media (min-width: 1024px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }

        .bottom-nav-inner {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          height: var(--bottom-nav-height, 68px);
          max-width: 560px;
          margin: 0 auto;
          padding: 0 0.35rem;
          gap: 0.15rem;
        }

        :global(.nav-tab-item),
        :global(.nav-tab-item:visited),
        :global(.nav-tab-item:hover),
        :global(.nav-tab-item:active),
        :global(.nav-tab-item:focus) {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 50px;
          min-width: 0;
          padding: 4px 2px;
          color: #94a3b8 !important;
          text-decoration: none !important;
          transition: transform 0.2s var(--ease-spring), color 0.2s ease;
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
        }

        .icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 28px;
          border-radius: 14px;
          transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
          border: 1px solid transparent;
        }

        :global(.nav-tab-item.is-active) .icon-wrapper {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
        }

        .tab-icon {
          transition: transform 0.25s var(--ease-spring), color 0.2s ease;
        }

        :global(.nav-tab-item.is-active) .tab-icon {
          color: #10b981 !important;
          transform: scale(1.04);
        }

        .tab-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.1;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          transition: color 0.2s ease;
        }

        :global(.nav-tab-item.is-active) .tab-label {
          color: #ffffff;
          font-weight: 800;
        }
      `}</style>
    </nav>
  );
}
