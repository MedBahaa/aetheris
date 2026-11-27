'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Trophy, RefreshCw, AlertCircle, Coins, Search, ArrowUpRight, X, Zap } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { DividendYieldData } from '@/lib/scrapers/dividend-scraper';
import { useDebounce } from '@/hooks/useDebounce';

interface DividendApiResponse {
  success: boolean;
  data: DividendYieldData[];
  source?: string;
  updatedAt?: string;
  error?: string;
}

const fetcher = async (url: string): Promise<DividendApiResponse> => {
  const res = await fetch(url);
  let json: DividendApiResponse | null = null;
  try {
    json = await res.json();
  } catch {
    throw new Error('Réponse serveur invalide lors du chargement des dividendes.');
  }
  if (!res.ok || !json || json.success === false) {
    throw new Error(json?.error || `Erreur serveur (${res.status}) lors du chargement des dividendes.`);
  }
  return json;
};

export default function DividendesPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'rank' | 'yield' | 'amount' | 'price'>('rank');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data, error, isLoading, isValidating, mutate } = useSWR<DividendApiResponse>(
    '/api/dividendes',
    fetcher
  );

  const dividends = data?.data || [];
  const sourceLabel =
    data?.source === 'tradingview'
      ? 'TRADINGVIEW CSEMA'
      : data?.source === 'casablancabourse'
        ? 'CASABLANCABOURSE'
        : null;

  const parseNumeric = (val?: string | number) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const num = parseFloat(String(val).replace(',', '.').replace(/[^\d.-]/g, ''));
    return Number.isNaN(num) ? 0 : num;
  };

  const filteredDividends = useMemo(() => {
    const q = debouncedSearchTerm.toLowerCase().trim();
    const list = q
      ? dividends.filter(
          (d) =>
            d.symbol.toLowerCase().includes(q) ||
            d.name.toLowerCase().includes(q) ||
            (d.sector ? d.sector.toLowerCase().includes(q) : false)
        )
      : [...dividends];

    if (sortBy === 'yield') {
      return [...list].sort((a, b) => parseNumeric(b.yield) - parseNumeric(a.yield));
    }
    if (sortBy === 'amount') {
      return [...list].sort((a, b) => parseNumeric(b.amountDH) - parseNumeric(a.amountDH));
    }
    if (sortBy === 'price') {
      return [...list].sort((a, b) => parseNumeric(b.price) - parseNumeric(a.price));
    }
    return list;
  }, [dividends, debouncedSearchTerm, sortBy]);

  const dividendSummary = useMemo(() => {
    if (dividends.length === 0) {
      return { count: 0, topYield: null as DividendYieldData | null, avgYield: 0, topAmount: null as DividendYieldData | null };
    }
    const yields = dividends.map((d) => parseNumeric(d.yield)).filter((v) => v > 0);
    const avgYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;
    const byYield = [...dividends].sort((a, b) => parseNumeric(b.yield) - parseNumeric(a.yield));
    const byAmt = [...dividends].sort((a, b) => parseNumeric(b.amountDH) - parseNumeric(a.amountDH));
    return {
      count: dividends.length,
      topYield: byYield[0] || null,
      avgYield,
      topAmount: byAmt[0] || null,
    };
  }, [dividends]);

  const handleAnalyze = (symbol: string) => {
    router.push(`/console?q=${encodeURIComponent(symbol)}&agent=FUNDAMENTAL`);
  };

  const handleRefresh = () => {
    void mutate(() => fetcher('/api/dividendes?refresh=1'), { revalidate: false });
  };

  return (
    <div className="app-container">
      <Sidebar history={[]} onSelect={() => {}} activeAgent="STRATEGY" onAgentChange={() => {}} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <Header onOpenSidebar={() => setIsSidebarOpen(true)} />

      <main className="main-content">
        <div className="max-container">
          {/* Header Section */}
          <header className="div-header animate-fade-in">
            <div className="header-identity">
              <div className="identity-block">
                <div className="status-light pulse"></div>
                <span className="mono-tiny text-emerald">PALMARÈS RENDEMENTS BVC</span>
              </div>
              <div className="title-row">
                <h1 className="title-h1">
                  <Coins size={28} className="title-icon" />
                  Dividendes 2026
                </h1>
                <div className="market-badge">
                  {dividends.length > 0 ? `${dividends.length} VALEURS CLASSÉES` : 'BOURSE DE CASABLANCA'}
                </div>
                {sourceLabel && (
                  <div className="source-badge mono">
                    SOURCE : {sourceLabel}
                  </div>
                )}
              </div>
              <p className="div-subtitle">
                Classement des entreprises cotées à la Bourse de Casablanca offrant les meilleurs rendements (Dividend Yield) en temps réel.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isValidating}
              className="div-refresh-btn glass"
            >
              <RefreshCw size={15} className={isLoading || isValidating ? 'icon-spin' : ''} />
              <span className="mono">ACTUALISER</span>
            </button>
          </header>

          {/* Error State */}
          {error && (
            <div className="div-error-banner animate-fade-in">
              <AlertCircle size={20} style={{ color: '#fb7185', flexShrink: 0 }} />
              <p>{error.message || 'Erreur lors du chargement des données de dividendes. Veuillez réessayer plus tard.'}</p>
            </div>
          )}

          {/* Bandeau KPI Résumé Dividendes Desktop (>= 1024px) */}
          {!isLoading && dividends.length > 0 && (
            <section className="div-desktop-kpis animate-fade-in" aria-label="Synthèse dividendes BVC">
              <div className="div-kpi-card">
                <span className="div-kpi-label mono">RENDEMENT RECORD</span>
                <span className="div-kpi-val emerald mono">{dividendSummary.topYield?.yield || '--'}</span>
                <span className="div-kpi-sub">{dividendSummary.topYield ? `${dividendSummary.topYield.symbol} — ${dividendSummary.topYield.name}` : '—'}</span>
              </div>
              <div className="div-kpi-card">
                <span className="div-kpi-label mono">MOYENNE PALMARÈS</span>
                <span className="div-kpi-val mono">{dividendSummary.avgYield.toFixed(2)}%</span>
                <span className="div-kpi-sub">Yield moyen distribué</span>
              </div>
              <div className="div-kpi-card">
                <span className="div-kpi-label mono">PLUS GROS COUPON</span>
                <span className="div-kpi-val amber mono">{dividendSummary.topAmount?.amountDH || '--'}</span>
                <span className="div-kpi-sub">{dividendSummary.topAmount ? `${dividendSummary.topAmount.symbol} — ${dividendSummary.topAmount.name}` : '—'}</span>
              </div>
              <div className="div-kpi-card">
                <span className="div-kpi-label mono">SOCIÉTÉS CLASSÉES</span>
                <span className="div-kpi-val mono">{dividendSummary.count}</span>
                <span className="div-kpi-sub">Valeurs à dividende BVC</span>
              </div>
            </section>
          )}

          {/* Search & Sort Controls */}
          <div className="div-controls glass-heavy animate-fade-in">
            <div className="div-controls-top">
              <div className="div-title-badge">
                <Trophy size={16} style={{ color: '#fbbf24' }} />
                <span>Top Rendements BVC</span>
              </div>

              <div className="div-search-wrap">
                <Search size={16} className="div-search-icon" />
                <input
                  type="text"
                  placeholder="Rechercher (ex: IAM, ATW, Attijari...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="div-search-input"
                  aria-label="Rechercher une valeur à dividende"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="div-clear-btn"
                    aria-label="Effacer la recherche"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="div-sort-strip" role="toolbar" aria-label="Trier les dividendes">
              {[
                { key: 'rank' as const, label: 'Par Rang' },
                { key: 'yield' as const, label: 'Rendement (%)' },
                { key: 'amount' as const, label: 'Dividende (DH)' },
                { key: 'price' as const, label: 'Cours' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`mobile-sort-pill ${sortBy === opt.key ? 'active' : ''}`}
                  onClick={() => setSortBy(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Container */}
          <div className="data-terminal glass-heavy animate-fade-in">
            {isLoading ? (
              <div className="div-loading-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="div-skeleton-row skeleton-pulse" />
                ))}
              </div>
            ) : dividends.length === 0 ? (
              <div className="div-empty-card">
                <AlertCircle size={26} style={{ color: '#fbbf24' }} />
                <div className="div-empty-title">Données de dividendes indisponibles pour le moment</div>
                <p className="div-empty-desc">
                  Les flux BVC / TradingView n&apos;ont pas encore répondu. Cliquez ci-dessous pour relancer la synchronisation.
                </p>
                <button type="button" onClick={handleRefresh} className="div-retry-btn mono">
                  <RefreshCw size={14} className={isValidating ? 'icon-spin' : ''} />
                  <span>Réessayer le chargement</span>
                </button>
              </div>
            ) : filteredDividends.length === 0 ? (
              <div className="div-empty-card">
                <Search size={24} style={{ color: '#94a3b8' }} />
                <div className="div-empty-title">
                  Aucun résultat trouvé pour &laquo; {searchTerm} &raquo;
                </div>
                <button type="button" onClick={() => setSearchTerm('')} className="div-retry-btn mono">
                  <X size={14} />
                  <span>Effacer la recherche</span>
                </button>
              </div>
            ) : (
              <>
                {/* ── VUE MOBILE CARTES (< 1024px) ── */}
                <div className="mobile-cards-list">
                  {filteredDividends.map((item, idx) => {
                    const isTop3 = idx < 3 && sortBy === 'rank';
                    return (
                      <div key={item.symbol} className={`live-market-mobile-card div-mobile-card ${isTop3 ? 'top3' : ''}`}>
                        <div className="div-card-top">
                          <div className="card-identity">
                            <div className={`div-rank-badge mono ${isTop3 ? 'gold' : ''}`}>
                              #{item.rank}
                            </div>
                            <div className="stock-avatar-badge">
                              {item.symbol.substring(0, 3)}
                            </div>
                            <div className="stock-titles">
                              <span className="stock-symbol-title">{item.symbol}</span>
                              <span className="div-company-name">
                                {item.name}
                                {item.sector ? ` · ${item.sector}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="div-yield-pill">
                            <ArrowUpRight size={14} />
                            <span className="mono">{item.yield}</span>
                          </div>
                        </div>

                        <div className="div-metrics-2col">
                          <div className="metric-box">
                            <span className="metric-label">DIVIDENDE UNITAIRE</span>
                            <span className="metric-primary-val">{item.amountDH}</span>
                          </div>
                          <div className="metric-box">
                            <span className="metric-label">COURS ACTUEL</span>
                            <span className="metric-primary-val">{item.price}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAnalyze(item.symbol)}
                          className="div-analyze-btn"
                        >
                          <Zap size={13} />
                          <span>Analyser les Fondamentaux</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* ── VUE TABLEAU DESKTOP (>= 1024px) ── */}
                <div className="desktop-only-container table-scroll">
                  <table className="institutional-table div-table">
                    <thead>
                      <tr className="glass-heavy">
                        <th className={`th-clickable ${sortBy === 'rank' ? 'active' : ''}`} onClick={() => setSortBy('rank')}>
                          Rang {sortBy === 'rank' && <span className="th-active-dot">•</span>}
                        </th>
                        <th>Valeur</th>
                        <th className={`num th-clickable ${sortBy === 'yield' ? 'active' : ''}`} onClick={() => setSortBy('yield')}>
                          Yield (%) {sortBy === 'yield' && <span className="th-active-dot">•</span>}
                        </th>
                        <th className={`num th-clickable ${sortBy === 'amount' ? 'active' : ''}`} onClick={() => setSortBy('amount')}>
                          Dividende (DH) {sortBy === 'amount' && <span className="th-active-dot">•</span>}
                        </th>
                        <th className={`num th-clickable ${sortBy === 'price' ? 'active' : ''}`} onClick={() => setSortBy('price')}>
                          Cours {sortBy === 'price' && <span className="th-active-dot">•</span>}
                        </th>
                        <th className="num">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDividends.map((item, idx) => (
                        <tr key={item.symbol} className="inst-row">
                          <td>
                            <span className={`mono div-rank-text ${idx < 3 ? 'gold' : ''}`}>
                              #{item.rank}
                            </span>
                          </td>
                          <td>
                            <div className="div-sym-cell">
                              <div className="div-avatar">{item.symbol.substring(0, 3)}</div>
                              <div>
                                <div className="div-sym">{item.symbol}</div>
                                <div className="div-subname-row">
                                  <span className="div-subname">{item.name}</span>
                                  {item.sector && <span className="div-sector-tag">{item.sector}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="num">
                            <span className="div-yield-pill inline">
                              <ArrowUpRight size={14} />
                              <span className="mono">{item.yield}</span>
                            </span>
                          </td>
                          <td className="num mono div-amount">{item.amountDH}</td>
                          <td className="num mono div-price">{item.price}</td>
                          <td className="num">
                            <button
                              type="button"
                              onClick={() => handleAnalyze(item.symbol)}
                              className="terminal-btn-sm glass"
                            >
                              <Zap size={12} />
                              <span>ANALYSER</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .max-container { width: 100%; max-width: 1320px; margin: 0 auto; padding: 1.5rem 1rem; }
        .div-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1.25rem;
          flex-wrap: wrap;
          border-bottom: 1px solid var(--border-glass);
          padding-bottom: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .header-identity { display: flex; flex-direction: column; gap: 0.65rem; min-width: 0; flex: 1; }
        .identity-block { display: flex; align-items: center; gap: 0.65rem; }
        .title-row { display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; }
        .title-h1 {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          font-family: 'Outfit', sans-serif;
          font-size: 2.25rem;
          font-weight: 950;
          letter-spacing: -0.04em;
          color: #fff;
          margin: 0;
        }
        :global(.title-icon) { color: #10b981; flex-shrink: 0; }
        .market-badge {
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          font-family: 'JetBrains Mono', monospace;
          color: #94a3b8;
        }
        .source-badge {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
          padding: 4px 9px;
          border-radius: 6px;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        :global(.icon-spin) {
          animation: divSpin 0.9s linear infinite;
        }
        @keyframes divSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .skeleton-pulse {
          animation: divPulse 1.5s ease-in-out infinite;
        }
        @keyframes divPulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.9; }
        }
        .div-subtitle { font-size: 0.9rem; color: #94a3b8; max-width: 640px; line-height: 1.5; margin: 0; }
        .div-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 44px;
          padding: 0 1.1rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(15, 23, 42, 0.7);
          color: #f8fafc;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .div-refresh-btn:hover:not(:disabled) { border-color: rgba(16, 185, 129, 0.4); color: #34d399; }
        .div-refresh-btn:disabled { opacity: 0.5; cursor: wait; }

        .div-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 14px;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.28);
          color: #fda4af;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        .div-error-banner p { margin: 0; }

        .div-controls {
          padding: 1rem 1.25rem;
          border-radius: 1rem;
          border: 1px solid var(--border-glass);
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .div-controls-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .div-title-badge { display: flex; align-items: center; gap: 0.55rem; color: #e2e8f0; font-weight: 700; font-size: 0.95rem; }
        .div-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 240px;
          max-width: 380px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 0 0.75rem;
        }
        :global(.div-search-icon) { color: #64748b; flex-shrink: 0; }
        .div-search-input {
          flex: 1;
          min-width: 0;
          min-height: 42px;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-size: 14px;
          padding: 0.5rem 0.6rem;
        }
        .div-clear-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: none;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
          color: #94a3b8;
          cursor: pointer;
        }
        .div-sort-strip {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .div-sort-strip::-webkit-scrollbar { display: none; }

        .div-loading-grid { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; }
        .div-skeleton-row { height: 56px; border-radius: 12px; background: rgba(255, 255, 255, 0.04); }
        .div-empty-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 0.75rem;
          padding: 3rem 1.5rem;
        }
        .div-empty-title { color: #f8fafc; font-size: 1rem; font-weight: 700; }
        .div-empty-desc { color: #94a3b8; font-size: 0.875rem; max-width: 440px; margin: 0; line-height: 1.5; }
        .div-retry-btn {
          margin-top: 0.25rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 40px;
          padding: 0 1rem;
          border-radius: 10px;
          border: 1px solid rgba(16, 185, 129, 0.35);
          background: rgba(16, 185, 129, 0.14);
          color: #34d399;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .div-retry-btn:hover { background: rgba(16, 185, 129, 0.22); }

        .div-mobile-card.top3 { border-color: rgba(245, 158, 11, 0.28) !important; }
        .div-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
        .div-rank-badge {
          min-width: 28px;
          height: 28px;
          padding: 0 6px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.06);
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .div-rank-badge.gold { background: rgba(245, 158, 11, 0.16); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }
        .div-company-name { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 155px; }
        .div-yield-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .div-metrics-2col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .div-analyze-btn {
          width: 100%;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 10px;
          border: 1px solid rgba(56, 189, 248, 0.3);
          background: rgba(56, 189, 248, 0.12);
          color: #38bdf8;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .div-desktop-kpis { display: none; }
        @media (min-width: 1024px) {
          .div-desktop-kpis {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0.85rem;
            margin-bottom: 1rem;
          }
        }
        .div-kpi-card {
          padding: 0.9rem 1.1rem;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(13, 19, 31, 0.72);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
        }
        .div-kpi-label { font-size: 9.5px; font-weight: 800; color: #94a3b8; letter-spacing: 0.08em; }
        .div-kpi-val { font-size: 1.25rem; font-weight: 900; color: #fff; font-variant-numeric: tabular-nums; }
        .div-kpi-val.emerald { color: #34d399; }
        .div-kpi-val.amber { color: #fbbf24; }
        .div-kpi-sub { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .div-table th.num, .div-table td.num { text-align: right; }
        .div-table th.th-clickable { cursor: pointer; transition: color 0.18s ease; }
        .div-table th.th-clickable:hover { color: #ffffff; }
        .div-table th.th-clickable.active { color: #34d399; }
        .th-active-dot { margin-left: 4px; color: #10b981; }
        .div-rank-text { color: #94a3b8; font-weight: 700; }
        .div-rank-text.gold { color: #fbbf24; font-weight: 900; }
        .div-sym-cell { display: flex; align-items: center; gap: 0.75rem; }
        .div-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: #fff;
        }
        .div-sym { font-weight: 800; color: #f8fafc; font-size: 13px; }
        .div-subname-row { display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; margin-top: 2px; }
        .div-subname { font-size: 11.5px; color: #94a3b8; }
        .div-sector-tag {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1px 7px;
          border-radius: 999px;
        }
        .div-amount { color: #e2e8f0; font-weight: 700; }
        .div-price { color: #94a3b8; }

        @media (max-width: 768px) {
          .max-container { padding: 0.5rem 0; }
          .title-h1 { font-size: 1.5rem; }
          .div-controls { padding: 0.85rem; }
          .div-search-wrap { max-width: none; width: 100%; }
          .div-search-input { font-size: 16px; }
        }
      `}</style>
    </div>
  );
}
