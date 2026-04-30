'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { Activity, RefreshCw, Clock, Search, Zap, ChevronUp, ChevronDown, AlertCircle, Sparkles, BarChart3, Building2, Newspaper } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { LiveStockData } from '@/lib/scrapers/market-list-scraper';
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
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nextRefresh, setNextRefresh] = useState(60);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'variationValue', direction: 'desc' });
  const [openMenuSymbol, setOpenMenuSymbol] = useState<string | null>(null);
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
    window.location.href = `/?q=${encodeURIComponent(symbol)}&agent=${agentType}`;
  }, []);

  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    if (data.status !== 'success') throw new Error('API Error');
    
    // Amélioration 2 : Pré-parsing des données pour alléger le tri
    return data.stocks.map((s: LiveStockData) => ({
      ...s,
      _parsedPrice: typeof s.price === 'string' ? parseFloat(s.price.replace(',', '.').replace(/\s/g, '')) : s.price,
      _parsedVariationValue: typeof s.variationValue === 'string' ? parseFloat(s.variationValue.toString().replace(',', '.').replace(/\s/g, '')) : s.variationValue,
    }));
  };

  // Amélioration 1 : Utilisation de SWR pour la gestion des requêtes, du cache et de l'état asynchrone
  const { data: stocksData, error, isValidating, mutate } = useSWR('/api/market-live', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  const stocks = stocksData || [];
  const loading = !stocksData && !error;
  const isRefreshing = isValidating && !!stocksData;

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
      
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

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

  // Amélioration 2 : Mémoïsation du filtrage
  const filteredStocks = useMemo(() => {
    if (!debouncedSearchTerm) return sortedStocks;
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return sortedStocks.filter(s => 
      s.symbol.toLowerCase().includes(lowerSearch)
    );
  }, [sortedStocks, debouncedSearchTerm]);

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

      <Header onOpenSidebar={() => setIsSidebarOpen(true)} />

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
                <div className="market-badge opacity-70">BOURSE DE CASABLANCA (LIVE)</div>
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
            </div>
          </header>

          <div className="controls-bar glass-heavy animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="search-box">
              <Search size={18} className="opacity-40" />
              <input 
                type="text" 
                placeholder="RECHERCHER UN SYMBOLE OU ISIN..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
              <div className="table-scroll">
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
                    {filteredStocks.map((stock, i) => (
                      <tr key={i} className="inst-row">
                        <td data-label="VALEUR">
                          <div className="symbol-cell">
                            <div className="s-status"></div>
                            <span className="s-name">{stock.symbol}</span>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
