'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Globe,
  LayoutGrid,
  Briefcase,
  Landmark,
  Scale,
  BrainCircuit,
  User,
  Sparkles,
  TrendingUp,
  X,
  CornerDownLeft,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StockEntry {
  symbol: string;
  name: string;
  sector?: string;
}

const NAV_PAGES = [
  { href: '/marche-live', label: 'Marché Live BVC', desc: 'Cours en direct, variations et palmarès séance', icon: Globe },
  { href: '/console', label: 'Console Alpha Multi-Agents', desc: 'Orchestrateur IA, technique, fonda et veille', icon: LayoutGrid },
  { href: '/portfolio', label: 'Mon Portefeuille', desc: 'Positions, PMP, P&L, Robo-Advisor et alertes', icon: Briefcase },
  { href: '/dividendes', label: 'Palmarès Dividendes', desc: 'Rendements et détachements 2026 BVC', icon: Landmark },
  { href: '/purification', label: 'Sharia Screener & Purification', desc: 'Conformité AAOIFI et calculateur Sadaqah', icon: Scale },
  { href: '/intelligence', label: 'Hub Intelligence IA', desc: 'Vue d’ensemble des moteurs analytiques', icon: BrainCircuit },
  { href: '/profile', label: 'Profil & Abonnement', desc: 'Capital, canaux Telegram/WhatsApp et offre Pro', icon: User },
];

const POPULAR_STOCKS: StockEntry[] = [
  { symbol: 'IAM', name: 'Itissalat Al-Maghrib (Maroc Telecom)', sector: 'Télécoms' },
  { symbol: 'ATW', name: 'Attijariwafa Bank', sector: 'Banques' },
  { symbol: 'BCP', name: 'Banque Centrale Populaire', sector: 'Banques' },
  { symbol: 'MNG', name: 'Managem', sector: 'Mines' },
  { symbol: 'MSA', name: 'Marsa Maroc (SODEP)', sector: 'Transport & Ports' },
  { symbol: 'HPS', name: 'Hightech Payment Systems', sector: 'Technologie' },
  { symbol: 'LBV', name: "Label'Vie", sector: 'Distribution' },
  { symbol: 'LHM', name: 'LafargeHolcim Maroc', sector: 'Matériaux' },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [remoteStocks, setRemoteStocks] = useState<StockEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setRemoteStocks([]);
      setActiveIndex(0);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setRemoteStocks([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    fetch(`/api/companies/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!controller.signal.aborted && Array.isArray(data)) {
          setRemoteStocks(data.slice(0, 8));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setRemoteStocks([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, isOpen]);

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_PAGES;
    return NAV_PAGES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.href.toLowerCase().includes(q)
    );
  }, [query]);

  const displayedStocks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length >= 2) {
      if (remoteStocks.length > 0) return remoteStocks;
      return POPULAR_STOCKS.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.sector || '').toLowerCase().includes(q)
      );
    }
    if (q.length === 1) {
      return POPULAR_STOCKS.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }
    return POPULAR_STOCKS;
  }, [query, remoteStocks]);

  type PaletteItem =
    | { kind: 'stock'; stock: StockEntry }
    | { kind: 'page'; page: (typeof NAV_PAGES)[number] };

  const flatItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = displayedStocks.map((stock) => ({ kind: 'stock', stock }));
    for (const page of filteredPages) {
      items.push({ kind: 'page', page });
    }
    return items;
  }, [displayedStocks, filteredPages]);

  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems.length, query]);

  const navigateTo = (url: string) => {
    onClose();
    router.push(url);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (flatItems.length > 0 ? (prev + 1) % flatItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (flatItems.length > 0 ? (prev - 1 + flatItems.length) % flatItems.length : 0));
      } else if (e.key === 'Enter' && flatItems[activeIndex]) {
        e.preventDefault();
        const item = flatItems[activeIndex];
        if (item.kind === 'stock') {
          navigateTo(`/console?q=${encodeURIComponent(item.stock.symbol)}&agent=STRATEGY`);
        } else {
          navigateTo(item.page.href);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, flatItems, activeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="cmd-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes Aetheris"
    >
      <div className="cmd-modal glass-heavy" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-row">
          <Search size={17} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une valeur MASI (IAM, ATW, HPS...) ou ouvrir une page..."
            className="cmd-input"
            aria-label="Recherche rapide de commande ou titre boursier"
          />
          {searching && <span className="cmd-searching mono">SYNCHRO…</span>}
          <button type="button" onClick={onClose} className="cmd-close-btn" aria-label="Fermer la palette">
            <X size={16} />
          </button>
        </div>

        <div className="cmd-body">
          {displayedStocks.length > 0 && (
            <div className="cmd-section">
              <div className="cmd-section-title mono">
                {query.trim().length >= 2 ? 'VALEURS BVC CORRESPONDANTES' : 'ACCÈS RAPIDE VALEURS MASI'}
              </div>
              <div className="cmd-list">
                {displayedStocks.map((stock, idx) => {
                  const isActive = activeIndex === idx;
                  return (
                    <div
                      key={`${stock.symbol}-${idx}`}
                      className={`cmd-row ${isActive ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => navigateTo(`/console?q=${encodeURIComponent(stock.symbol)}&agent=STRATEGY`)}
                      role="button"
                      tabIndex={-1}
                    >
                      <div className="cmd-row-main">
                        <span className="cmd-ticker mono">{stock.symbol}</span>
                        <span className="cmd-name">{stock.name}</span>
                        {stock.sector && <span className="cmd-sector mono">{stock.sector}</span>}
                      </div>
                      <div className="cmd-quick-pills" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="cmd-pill tech"
                          onClick={() => navigateTo(`/console?q=${encodeURIComponent(stock.symbol)}&agent=TECHNICAL`)}
                          title="Analyse Technique"
                        >
                          <TrendingUp size={11} />
                          <span>Tech</span>
                        </button>
                        <button
                          type="button"
                          className="cmd-pill fonda"
                          onClick={() => navigateTo(`/console?q=${encodeURIComponent(stock.symbol)}&agent=FUNDAMENTAL`)}
                          title="Fondamentaux"
                        >
                          <Landmark size={11} />
                          <span>Fonda</span>
                        </button>
                        <button
                          type="button"
                          className="cmd-pill sharia"
                          onClick={() => navigateTo('/purification')}
                          title="Screener Sharia AAOIFI"
                        >
                          <Scale size={11} />
                          <span>Charia</span>
                        </button>
                        <span className="cmd-enter-hint mono">
                          <Sparkles size={11} /> Stratégie
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredPages.length > 0 && (
            <div className="cmd-section">
              <div className="cmd-section-title mono">NAVIGATION ESPACES DE TRAVAIL</div>
              <div className="cmd-list">
                {filteredPages.map((page, idx) => {
                  const flatIdx = displayedStocks.length + idx;
                  const isActive = activeIndex === flatIdx;
                  const Icon = page.icon;
                  return (
                    <div
                      key={page.href}
                      className={`cmd-row ${isActive ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(flatIdx)}
                      onClick={() => navigateTo(page.href)}
                      role="button"
                      tabIndex={-1}
                    >
                      <div className="cmd-row-main">
                        <span className="cmd-page-icon">
                          <Icon size={15} />
                        </span>
                        <div className="cmd-page-labels">
                          <span className="cmd-name">{page.label}</span>
                          <span className="cmd-page-desc">{page.desc}</span>
                        </div>
                      </div>
                      <span className="cmd-path mono">{page.href}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {flatItems.length === 0 && (
            <div className="cmd-empty">
              Aucun résultat pour &laquo; {query} &raquo;. Essayez un ticker BVC (IAM, ATW, MNG) ou le nom d&apos;une page.
            </div>
          )}
        </div>

        <div className="cmd-footer mono">
          <div className="cmd-hints">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Naviguer</span>
            <span><kbd><CornerDownLeft size={10} /></kbd> Ouvrir Stratégie / Page</span>
            <span><kbd>Esc</kbd> Fermer</span>
          </div>
          <span className="cmd-brand-tag">AETHERIS TERMINAL</span>
        </div>
      </div>

      <style jsx>{`
        .cmd-backdrop {
          position: fixed;
          inset: 0;
          z-index: var(--z-modal, 3010);
          background: rgba(2, 6, 14, 0.78);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 9vh 1.25rem 2rem;
          overscroll-behavior: contain;
        }

        .cmd-modal {
          width: 100%;
          max-width: 720px;
          border-radius: 18px;
          background: rgba(9, 13, 22, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.78), 0 0 0 1px rgba(16, 185, 129, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .cmd-input-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.95rem 1.15rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        :global(.cmd-search-icon) {
          color: #10b981;
          flex-shrink: 0;
        }

        .cmd-input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          color: #ffffff;
          font-size: 0.96rem;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
        }

        .cmd-input::placeholder {
          color: #64748b;
        }

        .cmd-searching {
          font-size: 10px;
          color: #10b981;
          font-weight: 700;
        }

        .cmd-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #94a3b8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cmd-close-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .cmd-body {
          max-height: 58vh;
          overflow-y: auto;
          padding: 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .cmd-section-title {
          padding: 0.35rem 0.65rem 0.4rem;
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.12em;
        }

        .cmd-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .cmd-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          padding: 0.6rem 0.75rem;
          border-radius: 10px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.14s ease;
        }

        .cmd-row.active {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.32);
        }

        .cmd-row-main {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          min-width: 0;
          flex: 1;
        }

        .cmd-ticker {
          font-size: 11px;
          font-weight: 800;
          color: #34d399;
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid rgba(16, 185, 129, 0.28);
          padding: 2px 7px;
          border-radius: 6px;
          min-width: 52px;
          text-align: center;
          flex-shrink: 0;
        }

        .cmd-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cmd-sector {
          font-size: 10px;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 7px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .cmd-quick-pills {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-shrink: 0;
        }

        .cmd-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 7px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cmd-pill.tech:hover { border-color: rgba(56, 189, 248, 0.5); color: #38bdf8; background: rgba(56, 189, 248, 0.14); }
        .cmd-pill.fonda:hover { border-color: rgba(245, 158, 11, 0.5); color: #fbbf24; background: rgba(245, 158, 11, 0.14); }
        .cmd-pill.sharia:hover { border-color: rgba(16, 185, 129, 0.5); color: #34d399; background: rgba(16, 185, 129, 0.14); }

        .cmd-enter-hint {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #34d399;
          padding-left: 0.25rem;
        }

        .cmd-page-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
          flex-shrink: 0;
        }
        .cmd-row.active .cmd-page-icon {
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.35);
          background: rgba(16, 185, 129, 0.12);
        }

        .cmd-page-labels {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .cmd-page-desc {
          font-size: 11.5px;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cmd-path {
          font-size: 10.5px;
          color: #64748b;
          flex-shrink: 0;
        }

        .cmd-empty {
          padding: 2.25rem 1rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .cmd-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(0, 0, 0, 0.35);
          font-size: 10px;
          color: #64748b;
        }

        .cmd-hints {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .cmd-hints span {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .cmd-hints kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 5px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #e2e8f0;
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
        }

        .cmd-brand-tag {
          color: #475569;
          font-weight: 800;
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  );
}
