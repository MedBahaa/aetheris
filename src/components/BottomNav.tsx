'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Briefcase, Activity, BrainCircuit, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

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
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 950;
          background: rgba(8, 12, 18, 0.88);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.5);
          transition: transform 0.3s ease;
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

        .nav-tab-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          min-height: 48px;
          min-width: 48px;
          color: #64748b;
          text-decoration: none;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          border-radius: 12px;
          -webkit-tap-highlight-color: transparent;
        }

        .nav-tab-item:active {
          transform: scale(0.94);
        }

        .nav-tab-item.is-active {
          color: #10b981;
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

        .nav-tab-item.is-active .tab-icon {
          transform: translateY(-1px);
        }

        .active-glow-dot {
          position: absolute;
          bottom: -4px;
          width: 4px;
          height: 4px;
          background-color: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px #10b981, 0 0 12px #10b981;
        }

        .tab-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1;
          transition: color 0.25s ease;
        }

        .nav-tab-item.is-active .tab-label {
          color: #ffffff;
          font-weight: 800;
        }
      `}</style>
    </nav>
  );
}
