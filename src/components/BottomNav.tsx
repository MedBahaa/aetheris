'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  Briefcase,
  Activity,
  LayoutGrid,
  User,
  Landmark,
  Scale,
  BrainCircuit,
  X,
} from 'lucide-react';

const TOOL_LINKS = [
  {
    href: '/dividendes',
    label: 'Palmarès Dividendes',
    sub: 'Classement rendements & coupons BVC',
    icon: Landmark,
    tone: 'amber',
  },
  {
    href: '/purification',
    label: 'Purification AAOIFI',
    sub: 'Screening Sharia & calculateur dividende',
    icon: Scale,
    tone: 'emerald',
  },
  {
    href: '/intelligence',
    label: 'Hub Intelligence IA',
    sub: 'Espace multi-agents Gemini 3.8 Flash',
    icon: BrainCircuit,
    tone: 'purple',
  },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    setToolsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!toolsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToolsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toolsOpen]);

  // Masquer sur la landing page, la page de connexion, les callbacks auth et la page hors-ligne
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/offline' ||
    pathname?.startsWith('/auth')
  ) {
    return null;
  }

  const isToolRoute =
    pathname === '/dividendes' ||
    pathname === '/purification' ||
    pathname === '/intelligence';

  const navItems = [
    { label: 'Marché', href: '/marche-live', icon: Activity },
    { label: 'Console', href: '/console', icon: Zap },
    { label: 'Portefeuille', href: '/portfolio', icon: Briefcase },
  ];

  return (
    <>
      {toolsOpen && (
        <div
          className="tools-sheet-overlay no-print"
          onClick={() => setToolsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Outils BVC & IA"
        >
          <div className="tools-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grabber" />
            <div className="tools-sheet-head">
              <div>
                <div className="tools-kicker mono">BOÎTE À OUTILS BVC</div>
                <h3 className="tools-title">Modules spécialisés</h3>
              </div>
              <button
                type="button"
                onClick={() => setToolsOpen(false)}
                className="tools-close-btn"
                aria-label="Fermer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="tools-links-list">
              {TOOL_LINKS.map((tool) => {
                const Icon = tool.icon;
                const active = pathname === tool.href;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setToolsOpen(false)}
                    className={`tool-sheet-item ${active ? 'active' : ''}`}
                  >
                    <div className={`tool-icon-box ${tool.tone}`}>
                      <Icon size={18} />
                    </div>
                    <div className="tool-text-col">
                      <span className="tool-item-label">{tool.label}</span>
                      <span className="tool-item-sub">{tool.sub}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav no-print" aria-label="Navigation mobile principale">
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

          <button
            type="button"
            onClick={() => setToolsOpen((prev) => !prev)}
            className={`nav-tab-item nav-tab-btn ${isToolRoute || toolsOpen ? 'is-active' : ''}`}
            aria-expanded={toolsOpen}
          >
            <div className="icon-wrapper">
              <LayoutGrid size={19} className="tab-icon" strokeWidth={isToolRoute || toolsOpen ? 2.4 : 1.9} />
            </div>
            <span className="tab-label">Outils</span>
          </button>

          <Link
            href="/profile"
            className={`nav-tab-item ${pathname === '/profile' ? 'is-active' : ''}`}
            aria-current={pathname === '/profile' ? 'page' : undefined}
          >
            <div className="icon-wrapper">
              <User size={19} className="tab-icon" strokeWidth={pathname === '/profile' ? 2.4 : 1.9} />
            </div>
            <span className="tab-label">Profil</span>
          </Link>
        </div>
      </nav>

      <style jsx>{`
        .mono {
          font-family: var(--font-mono);
        }

        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: var(--z-bottom-nav, 1000);
          background: rgba(8, 12, 20, 0.94);
          backdrop-filter: blur(22px) saturate(180%);
          -webkit-backdrop-filter: blur(22px) saturate(180%);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          box-shadow: 0 -10px 36px rgba(0, 0, 0, 0.72);
        }

        @media (min-width: 1024px) {
          .mobile-bottom-nav,
          .tools-sheet-overlay {
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

        .nav-tab-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          width: 100%;
          font-family: inherit;
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

        /* Tools Slide-Up Bottom Sheet */
        .tools-sheet-overlay {
          position: fixed;
          inset: 0;
          z-index: calc(var(--z-bottom-nav, 1000) - 1);
          background: rgba(2, 6, 14, 0.68);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-end;
          padding-bottom: calc(var(--bottom-nav-height, 68px) + env(safe-area-inset-bottom, 0px) + 8px);
          animation: sheetFadeIn 0.2s ease;
        }

        .tools-sheet {
          width: calc(100% - 1rem);
          max-width: 480px;
          margin: 0 auto;
          background: rgba(11, 16, 27, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 0.75rem 1rem 1rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75);
          animation: sheetSlideUp 0.24s var(--ease-spring);
        }

        .sheet-grabber {
          width: 38px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 auto 0.75rem;
        }

        .tools-sheet-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
        }

        .tools-kicker {
          font-size: 9.5px;
          font-weight: 800;
          color: #10b981;
          letter-spacing: 0.08em;
        }

        .tools-title {
          margin: 2px 0 0;
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 800;
          color: #ffffff;
        }

        .tools-close-btn {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .tools-links-list {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        :global(.tool-sheet-item) {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.8rem 0.9rem;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          text-decoration: none;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        :global(.tool-sheet-item.active) {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.35);
        }

        .tool-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tool-icon-box.amber {
          background: rgba(245, 158, 11, 0.14);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.28);
        }

        .tool-icon-box.emerald {
          background: rgba(16, 185, 129, 0.14);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.28);
        }

        .tool-icon-box.purple {
          background: rgba(168, 85, 247, 0.14);
          color: #d8b4fe;
          border: 1px solid rgba(168, 85, 247, 0.28);
        }

        .tool-text-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .tool-item-label {
          font-size: 0.9rem;
          font-weight: 800;
          color: #f8fafc;
        }

        .tool-item-sub {
          font-size: 0.74rem;
          color: #94a3b8;
        }

        @keyframes sheetFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes sheetSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
