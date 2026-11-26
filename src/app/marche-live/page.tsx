'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Activity, RefreshCw, Clock, Search, Zap, ChevronUp, ChevronDown, AlertCircle, Sparkles, BarChart3, Building2, Newspaper, CheckCircle2, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { LiveStockData } from '@/lib/scrapers/market-list-scraper';
import { SymbolMapper } from '@/lib/symbol-mapper';
import { useDebounce } from '@/hooks/useDebounce';
import './marche-live.css';

const TickerTape = ({ stocks }: { stocks: LiveStockData[] }) => {
  const topGainers = [...stocks].sort((a,b) => b.variationValue - a.variationValue).slice(0, 10);
  
  return (
    <div className="ticker-wrapper glass-heavy">
      <div className="ticker-label mono" style={{ fontSize: '11px' }}>FLUX MARCHÉ DIRECT</div>
      <div className="ticker-scroll">
        <div className="ticker-content">
          {[...topGainers, ...topGainers].map((s, i) => (
            <div key={i} className="ticker-item">
              <span className="t-sym">{s.symbol}</span>
              <span className="t-price">{s.price}</span>
              <span className={`t-var ${s.variationValue >= 0 ? 'text-emerald' : 'text-rose'}`}>
                {s.variationValue >= 0 ? '▲' : '▼'} {s.variation}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ANALYSIS_OPTIONS = [
  { key: 'STRATEGY',    label: 'STRATÉGIE GLOBALE',   icon: Sparkles,   className: 'strategy' },
  { key: 'TECHNICAL',   label: 'ANALYSE TECHNIQUE',   icon: BarChart3,  className: 'technical' },
  { key: 'FUNDAMENTAL', label: 'FONDAMENTAUX',         icon: Building2,  className: 'fundamental' },
  { key: 'SENTIMENT',   label: 'ACTUALITÉS & VEILLE',  icon: Newspaper,  className: 'sentiment' },
] as const;

export default function MarcheLive() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nextRefresh, setNextRefresh] = useState(60);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'variationValue', direction: 'desc' });
  const [trendFilter, setTrendFilter] = useState<'ALL' | 'UP' | 'DOWN'>('ALL');
  const [openMenuSymbol, setOpenMenuSymbol] = useState<string | null>(null);
  const [isCheckingIpo, setIsCheckingIpo] = useState(false);
  const [ipoCheckStatus, setIpoCheckStatus] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu contextuel si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuSymbol(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAnalyze = useCallback((symbol: string, agentType: string) => {
    setOpenMenuSymbol(null);
    router.push(`/console?q=${encodeURIComponent(symbol)}&agent=${encodeURIComponent(agentType)}`);
  }, [router]);

  const enrichStocks = (rawStocks: LiveStockData[]) => {
    return rawStocks.map((s: LiveStockData) => ({
      ...s,
      ticker: s.ticker || SymbolMapper.resolve(s.symbol),
      name: s.name || SymbolMapper.getCanonicalName(s.symbol),
      sector: s.sector || SymbolMapper.getSector(s.ticker || s.symbol, s.symbol),
      _parsedPrice: typeof s.price === 'string' ? parseFloat(s.price.replace(',', '.').replace(/\s/g, '')) : s.price,
      _parsedVariationValue: s.variationValue,
    }));
  };

  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    if (data.status !== 'success') throw new Error('API Error');
    return enrichStocks(data.stocks);
  };

  // Amélioration 1 : Utilisation de SWR pour la gestion des requêtes, du cache et de l'état asynchrone
  const { data: stocksData, error, isValidating, mutate } = useSWR('/api/market-live', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  // Vérification forcée des nouvelles introductions (IPO) multi-sources
  const handleForceIpoCheck = async () => {
    if (isCheckingIpo) return;
    setIsCheckingIpo(true);
    setIpoCheckStatus(null);
    try {
      const res = await fetch('/api/market-live?discover=1');
      if (!res.ok) throw new Error('Discovery failed');
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.stocks)) {
        await mutate(enrichStocks(data.stocks), false);
        setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
        setNextRefresh(60);
        const addedCount = data.ipoSync?.added?.length || data.newIposDiscovered?.length || 0;
        if (addedCount > 0) {
          const names = (data.ipoSync?.added || data.newIposDiscovered || []).join(', ');
          setIpoCheckStatus(`🆕 ${addedCount} nouvelle(s) introduction(s) détectée(s) : ${names}`);
        } else {
          setIpoCheckStatus(`✓ Marché à jour (${data.stocks.length} valeurs BVC vérifiées)`);
        }
        setTimeout(() => setIpoCheckStatus(null), 6000);
      }
    } catch {
      setIpoCheckStatus('⚠️ Vérification momentanément indisponible');
      setTimeout(() => setIpoCheckStatus(null), 4000);
    } finally {
      setIsCheckingIpo(false);
    }
  };

  const stocks = stocksData || [];
  const loading = !stocksData && !error;
  const isRefreshing = (isValidating && !!stocksData) || isCheckingIpo;

  useEffect(() => {
    if (stocksData) {
      setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
      setNextRefresh(60);
    }
  }, [stocksData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNextRefresh((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' 
        ? <ChevronUp size={12} className="inline ml-1 text-emerald-500" /> 
        : <ChevronDown size={12} className="inline ml-1 text-rose-500" />;
    }
    return null;
  };

  // Amélioration 2 : Mémoïsation du tri et utilisation des valeurs pré-parsées
  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => {
      if (!sortConfig) return 0;
      
      let aValue: any = (a as any)[sortConfig.key];
      let bValue: any = (b as any)[sortConfig.key];

      if (sortConfig.key === 'price') {
         aValue = a._parsedPrice;
         bValue = b._parsedPrice;
      } else if (sortConfig.key === 'variationValue') {
         aValue = a._parsedVariationValue;
         bValue = b._parsedVariationValue;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [stocks, sortConfig]);

  // Compteurs hausse / baisse pour filtres rapides
  const marketCounts = useMemo(() => {
    let up = 0;
    let down = 0;
    for (const s of stocks) {
      if (s.variationValue >= 0) up++;
      else down++;
    }
    return { all: stocks.length, up, down };
  }, [stocks]);

  // Amélioration 2 : Mémoïsation du filtrage (supporte Nom, Ticker officiel, Alias, Secteur et Tendance)
  const filteredStocks = useMemo(() => {
    const baseList = trendFilter === 'ALL'
      ? sortedStocks
      : sortedStocks.filter(s => trendFilter === 'UP' ? s.variationValue >= 0 : s.variationValue < 0);

    if (!debouncedSearchTerm) return baseList;
    const lowerSearch = debouncedSearchTerm.toLowerCase().trim();
    const resolvedSearch = SymbolMapper.resolve(debouncedSearchTerm).toLowerCase();

    return baseList.filter(s => {
      const symLower = s.symbol.toLowerCase();
      const tickerLower = (s.ticker || SymbolMapper.resolve(s.symbol)).toLowerCase();
      const nameLower = (s.name || SymbolMapper.getCanonicalName(s.symbol)).toLowerCase();
      const sectorLower = (s.sector || '').toLowerCase();
      return (
        symLower.includes(lowerSearch) ||
        tickerLower.includes(lowerSearch) ||
        nameLower.includes(lowerSearch) ||
        sectorLower.includes(lowerSearch) ||
        (resolvedSearch.length > 0 && tickerLower === resolvedSearch)
      );
    });
  }, [sortedStocks, debouncedSearchTerm, trendFilter]);

  return (
    <div className="app-container">
      <Sidebar 
        history={[]} 
        onSelect={() => {}} 
        activeAgent="TECHNICAL" 
        onAgentChange={() => {}} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <Header onOpenSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <main className="main-content">
        <TickerTape stocks={stocks} />


        <div className="max-container">
          <header className="terminal-header animate-fade-in">
            <div className="header-identity">
              <div className="identity-block">
                <div className="status-light pulse"></div>
                <span className="mono-tiny text-emerald">TERMINAL DE MARCHÉ INSTITUTIONNEL</span>
              </div>
              <div className="title-row">
                <h1 className="title-h1">Marché Live</h1>
                <div className="market-badge opacity-70">
                  BOURSE DE CASABLANCA ({stocks.length > 0 ? `${stocks.length} VALEURS` : 'LIVE'})
                </div>
              </div>
            </div>

            <div className="connectivity-group">
              <div className="conn-stat">
                <Clock size={14} className="opacity-40" />
                <span className="mono-small">SYNCHRO : {lastUpdate || 'ÉTABLISSEMENT...'}</span>
              </div>
              <div className={`conn-stat refresh ${isRefreshing ? 'active' : ''}`}>
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="mono-small">{isRefreshing ? 'ACQUISITION DES DONNÉES...' : `PROCHAIN FLUX : ${nextRefresh}s`}</span>
              </div>
              <button
                type="button"
                onClick={handleForceIpoCheck}
                disabled={isCheckingIpo}
                className="ipo-scan-btn"
                title="Scanner le marché et indexer automatiquement les nouvelles introductions en bourse (IPO)"
              >
                <RefreshCw size={12} className={isCheckingIpo ? 'animate-spin' : ''} />
                <span>{isCheckingIpo ? 'SCAN IPO...' : 'VÉRIFIER IPO'}</span>
              </button>
            </div>
          </header>

          {ipoCheckStatus && (
            <div className="glass-heavy animate-fade-in ipo-status-banner">
              <CheckCircle2 size={15} />
              <span>{ipoCheckStatus}</span>
            </div>
          )}

          <div className="controls-bar glass-heavy animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="search-box">
              <Search size={18} className="opacity-40" />
              <input 
                type="text" 
                placeholder="Rechercher par nom, ticker (IAM, ATW) ou secteur..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Rechercher une valeur boursière"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="search-clear-btn"
                  aria-label="Effacer la recherche"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Barre filtres tendance + tri rapide */}
          <div className="market-filter-bar" role="toolbar" aria-label="Filtrer et trier les actions">
            <div className="filter-pills-group">
              <button
                type="button"
                className={`filter-pill ${trendFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setTrendFilter('ALL')}
              >
                Tous <span className="pill-count">{marketCounts.all}</span>
              </button>
              <button
                type="button"
                className={`filter-pill up ${trendFilter === 'UP' ? 'active' : ''}`}
                onClick={() => setTrendFilter('UP')}
              >
                ▲ Hausses <span className="pill-count">{marketCounts.up}</span>
              </button>
              <button
                type="button"
                className={`filter-pill down ${trendFilter === 'DOWN' ? 'active' : ''}`}
                onClick={() => setTrendFilter('DOWN')}
              >
                ▼ Baisses <span className="pill-count">{marketCounts.down}</span>
              </button>
            </div>

            <div className="mobile-sort-group">
              {[
                { key: 'variationValue', label: 'Var.' },
                { key: 'price', label: 'Cours' },
                { key: 'symbol', label: 'Nom' },
              ].map((opt) => {
                const isActive = sortConfig?.key === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`mobile-sort-pill ${isActive ? 'active' : ''}`}
                    onClick={() => requestSort(opt.key)}
                  >
                    <span>{opt.label}</span>
                    {isActive && (
                      sortConfig?.direction === 'asc'
                        ? <ChevronUp size={12} />
                        : <ChevronDown size={12} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`data-terminal glass-heavy animate-fade-in ${isRefreshing ? 'scanning' : ''}`} style={{ animationDelay: '0.2s' }}>
            {/* Sonar Effect Overlay */}
            {isRefreshing && <div className="sonar-bar"></div>}

            {error ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center' }}>
                <AlertCircle size={32} className="text-rose-500" style={{ marginBottom: '1rem', color: '#f43f5e' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>Liaison Perdue avec le Flux</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '28rem' }}>
                  Impossible de récupérer les données du marché en direct. Le serveur est peut-être indisponible ou votre connexion a été interrompue.
                </p>
                <button 
                  onClick={() => mutate()} 
                  style={{ padding: '0.5rem 1.5rem', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', borderRadius: '9999px', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                >
                  <RefreshCw size={14} className={isValidating ? 'animate-spin' : ''} />
                  Forcer la Reconnexion
                </button>
              </div>
            ) : loading ? (
              <div className="terminal-loading">
                <div className="cyber-spinner"></div>
                <p className="mono-small opacity-40">LIAISON AU FLUX DE DONNÉES EN COURS...</p>
              </div>
            ) : (
              <>
                {/* ────────────────── MOBILE LIVE MARKET CARDS (< 1024px) ────────────────── */}
                <div className="mobile-cards-list">
                  {filteredStocks.length === 0 ? (
                    <div className="empty-market-filter">
                      Aucune valeur ne correspond aux filtres actuels.
                    </div>
                  ) : filteredStocks.map((stock) => {
                    const isPositive = stock.variationValue >= 0;
                    const displayTicker = stock.ticker && stock.ticker !== stock.symbol.toUpperCase() ? stock.ticker : null;
                    const parseVal = (v: unknown) => parseFloat(String(v ?? '').replace(',', '.').replace(/[^\d.-]/g, ''));
                    const lowNum = parseVal(stock.low);
                    const highNum = parseVal(stock.high);
                    const curNum = parseVal(stock.price);
                    const hasRange = !Number.isNaN(lowNum) && !Number.isNaN(highNum) && !Number.isNaN(curNum) && highNum > lowNum;
                    const rangePct = hasRange ? Math.max(0, Math.min(100, ((curNum - lowNum) / (highNum - lowNum)) * 100)) : 50;

                    return (
                      <div key={stock.symbol} className="live-market-mobile-card">
                        {/* TOP ROW: Avatar Badge + Symbol + Price & Variation Hero Pill */}
                        <div className="card-top-row">
                          <div className="card-identity" onClick={() => handleAnalyze(stock.symbol, 'STRATEGY')} role="button" tabIndex={0}>
                            <div className="stock-avatar-badge">
                              {(stock.ticker || stock.symbol).substring(0, 3)}
                            </div>
                            <div className="stock-titles">
                              <span className="stock-symbol-title">
                                {stock.symbol}
                                {displayTicker && (
                                  <span className="mono ticker-tag">
                                    [{displayTicker}]
                                  </span>
                                )}
                                {stock.isIpo && (
                                  <span className="mono ipo-tag">
                                    IPO
                                  </span>
                                )}
                              </span>
                              <span className="stock-sector-pill">{stock.sector || 'CASABLANCA LIVE'}</span>
                            </div>
                          </div>

                          <div className="price-hero-block">
                            <div className="hero-price">
                              {stock.price} <span className="currency">MAD</span>
                            </div>
                            <div className={`pnl-hero-pill ${isPositive ? 'bull' : 'bear'}`}>
                              <span className="pnl-amount">{stock.variationAbs}</span>
                              <span className="pnl-percentage">{isPositive ? '▲' : '▼'} {stock.variation}</span>
                            </div>
                          </div>
                        </div>

                        {/* 3-COLUMN METRIC GRID */}
                        <div className="live-metrics-3col">
                          <div className="metric-box">
                            <span className="metric-label">OUVERTURE</span>
                            <span className="metric-primary-val">{stock.opening} <span className="unit">MAD</span></span>
                          </div>

                          <div className="metric-box">
                            <span className="metric-label">PLUS HAUT</span>
                            <span className="metric-primary-val text-emerald">{stock.high} <span className="unit">MAD</span></span>
                          </div>

                          <div className="metric-box">
                            <span className="metric-label">PLUS BAS</span>
                            <span className="metric-primary-val text-rose">{stock.low} <span className="unit">MAD</span></span>
                          </div>
                        </div>

                        {/* BARRE DE PLAGE INTRADAY */}
                        {hasRange && (
                          <div className="intraday-range">
                            <div className="range-labels mono">
                              <span>BAS {stock.low}</span>
                              <span className="range-title">PLAGE INTRADAY</span>
                              <span>HAUT {stock.high}</span>
                            </div>
                            <div className="range-track">
                              <div className={`range-fill ${isPositive ? 'bull' : 'bear'}`} style={{ width: `${rangePct}%` }} />
                              <div className={`range-thumb ${isPositive ? 'bull' : 'bear'}`} style={{ left: `${rangePct}%` }} />
                            </div>
                          </div>
                        )}

                        {/* QUICK AGENT ACTION BAR (2x2) */}
                        <div className="market-card-actions grid-2x2">
                          <button 
                            type="button"
                            className="card-action-chip strategy"
                            onClick={() => handleAnalyze(stock.symbol, 'STRATEGY')}
                          >
                            <Sparkles size={13} /> <span>Stratégie</span>
                          </button>
                          <button 
                            type="button"
                            className="card-action-chip technical"
                            onClick={() => handleAnalyze(stock.symbol, 'TECHNICAL')}
                          >
                            <BarChart3 size={13} /> <span>Technique</span>
                          </button>
                          <button 
                            type="button"
                            className="card-action-chip fundamental"
                            onClick={() => handleAnalyze(stock.symbol, 'FUNDAMENTAL')}
                          >
                            <Building2 size={13} /> <span>Fondamentaux</span>
                          </button>
                          <button 
                            type="button"
                            className="card-action-chip sentiment"
                            onClick={() => handleAnalyze(stock.symbol, 'SENTIMENT')}
                          >
                            <Newspaper size={13} /> <span>Veille</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ────────────────── DESKTOP LIVE MARKET TABLE (>= 1024px) ────────────────── */}
                <div className="table-scroll desktop-only-container">
                  <table className="institutional-table">
                    <thead>
                      <tr className="glass-heavy">
                        <th onClick={() => requestSort('symbol')} className="sortable">VALEUR {renderSortIcon('symbol')}</th>
                        <th onClick={() => requestSort('price')} className="sortable">DERNIER COURS {renderSortIcon('price')}</th>
                        <th onClick={() => requestSort('variationValue')} className="sortable">VARIATION {renderSortIcon('variationValue')}</th>
                        <th onClick={() => requestSort('opening')} className="sortable">OUV. {renderSortIcon('opening')}</th>
                        <th onClick={() => requestSort('high')} className="sortable">PLUS HAUT {renderSortIcon('high')}</th>
                        <th onClick={() => requestSort('low')} className="sortable">PLUS BAS {renderSortIcon('low')}</th>
                        <th style={{ textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStocks.map((stock, i) => {
                        const displayTicker = stock.ticker && stock.ticker !== stock.symbol.toUpperCase() ? stock.ticker : null;
                        return (
                          <tr key={i} className="inst-row">
                            <td data-label="VALEUR">
                              <div className="symbol-cell">
                                <div className="s-status"></div>
                                <span className="s-name">{stock.symbol}</span>
                                {displayTicker && (
                                  <span
                                    className="mono"
                                    style={{
                                      fontSize: '10px',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(255,255,255,0.05)',
                                      color: '#94a3b8',
                                      marginLeft: '6px',
                                    }}
                                  >
                                    {displayTicker}
                                  </span>
                                )}
                                {stock.isIpo && (
                                  <span
                                    className="mono"
                                    style={{
                                      fontSize: '9px',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      color: '#10b981',
                                      border: '1px solid rgba(16, 185, 129, 0.35)',
                                      marginLeft: '6px',
                                      fontWeight: 800,
                                    }}
                                  >
                                    IPO
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="price-cell-inst" data-label="DERNIER COURS">
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                 <span className="p-val mono">{stock.price}</span>
                                 <span className="p-cur">MAD</span>
                              </div>
                            </td>
                            <td data-label="MOMENTUM">
                              <div className={`momentum-box ${stock.variationValue >= 0 ? 'bull' : 'bear'}`}>
                                <div className="m-main">
                                   <span className="m-abs mono">{stock.variationAbs}</span>
                                   <span className="m-pct mono">{stock.variation}</span>
                                </div>
                                <div className="m-bar">
                                   <div className="m-fill" style={{ width: `${Math.min(Math.abs(stock.variationValue) * 15, 100)}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="data-cell mono" data-label="OUVERTURE">{stock.opening}</td>
                            <td className="data-cell high mono" data-label="PLUS HAUT">{stock.high}</td>
                            <td className="data-cell low mono" data-label="PLUS BAS">{stock.low}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-dropdown-container" ref={openMenuSymbol === stock.symbol ? menuRef : undefined}>
                                <button 
                                  className="terminal-btn-sm glass"
                                  onClick={() => setOpenMenuSymbol(prev => prev === stock.symbol ? null : stock.symbol)}
                                >
                                  <Zap size={12} />
                                  <span>ANALYSER</span>
                                </button>
                                {openMenuSymbol === stock.symbol && (
                                  <div className="action-dropdown-menu">
                                    {ANALYSIS_OPTIONS.map(opt => (
                                      <button
                                        key={opt.key}
                                        className={`dropdown-item ${opt.className}`}
                                        onClick={() => handleAnalyze(stock.symbol, opt.key)}
                                      >
                                        <opt.icon size={14} />
                                        <span>{opt.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
