'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { 
  CheckCircle2, XCircle, Search, Sparkles, Key, Calculator, 
  BookOpen, ExternalLink, RefreshCw, AlertTriangle, ShieldCheck, 
  Copy, Check, Coins, ArrowLeft, Sliders, DollarSign, HelpCircle, Scale,
  Landmark, Globe, PieChart, Activity, Briefcase
} from 'lucide-react';

interface ShariaResult {
  companyName: string;
  ticker: string;
  fiscalYear: string;
  isCompliant: boolean;
  purificationRate: number;
  debtRatio: number;
  cashRatio: number;
  financialData: {
    totalRevenue: string;
    interestIncome: string;
    interestDebt: string;
    interestCash: string;
    marketCap: string;
  };
  summary: string;
  sources: string[];
}

import { getDividendsAction, getPortfolioTransactionsAction } from '@/lib/portfolio-actions';

export default function PurificationPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'AI_SEARCH' | 'MANUAL'>('AI_SEARCH');
  
  // Search State
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShariaResult | null>(null);

  // Suggestions State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingDebounce, setIsSearchingDebounce] = useState(false);

  // Fetch suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setIsSearchingDebounce(true);
      try {
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      } finally {
        setIsSearchingDebounce(false);
      }
    };
    
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Custom API Key State
  const [customApiKey, setCustomApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Dividend Calculator Input
  const [dividendAmount, setDividendAmount] = useState<string>('0');
  const [copied, setCopied] = useState(false);

  // Manual Input State
  const [manualForm, setManualForm] = useState({
    companyName: 'Ma Société',
    ticker: 'CUSTOM',
    totalRevenue: '1000000',
    interestIncome: '15000',
    interestDebt: '200000',
    interestCash: '100000',
    marketCap: '1000000'
  });

  // Load custom API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('aetheris_custom_gemini_key');
    if (savedKey) setCustomApiKey(savedKey);
  }, []);

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('aetheris_custom_gemini_key', key);
  };

  // Perform AI Search
  const handleSearch = async (searchTerm?: string) => {
    const searchQuery = searchTerm || query;
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStep(1);

    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 1500);

    try {
      const res = await fetch('/api/sharia-screener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          customApiKey: customApiKey.trim() || undefined
        })
      });

      const json = await res.json();

      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || 'Erreur lors de l\'analyse Sharia.');
      }

      setResult(json.data);
      
      // Auto-fetch real dividends if available
      try {
        const divs = await getDividendsAction(false);
        const txs = await getPortfolioTransactionsAction(false);
        const tickerDivs = divs.filter(d => 
          d.symbol.toUpperCase() === json.data.ticker.toUpperCase() || 
          d.symbol.toUpperCase() === searchQuery.toUpperCase()
        );
        
        if (tickerDivs.length > 0) {
          let totalGross = 0;
          for (const div of tickerDivs) {
            const divDate = new Date(div.dividend_date).getTime();
            let qty = 0;
            const sorted = [...txs]
              .filter(tx => tx.symbol === div.symbol)
              .sort((a, b) => new Date(a.buy_date).getTime() - new Date(b.buy_date).getTime());
            
            for (const tx of sorted) {
              if (new Date(tx.buy_date).getTime() > divDate) break;
              const txType = tx.type || 'BUY';
              if (txType === 'BUY') qty += tx.quantity;
              else if (txType === 'SELL') qty = Math.max(0, qty - tx.quantity);
            }
            
            // If they didn't have any transactions but have a dividend recorded, fallback to an assumed quantity?
            // Usually, dividend shouldn't exist without holding, but just in case:
            if (qty > 0) {
              totalGross += (qty * div.amount_per_share);
            }
          }
          setDividendAmount(totalGross > 0 ? totalGross.toString() : '0');
        } else {
          setDividendAmount('0');
        }
      } catch (err) {
        console.error('Error fetching user dividends', err);
        setDividendAmount('0');
      }

    } catch (err: any) {
      console.error('Sharia Search Error:', err);
      setError(err.message || 'Impossible d\'extraire les données financières. Essayez le mode de calcul manuel.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  // Calculate Manual AAOIFI Result
  const handleManualCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const revenue = parseFloat(manualForm.totalRevenue) || 0;
    const interestInc = parseFloat(manualForm.interestIncome) || 0;
    const debt = parseFloat(manualForm.interestDebt) || 0;
    const cash = parseFloat(manualForm.interestCash) || 0;
    const cap = parseFloat(manualForm.marketCap) || 1;

    const purifRate = revenue > 0 ? (interestInc / revenue) * 100 : 0;
    const debtR = (debt / cap) * 100;
    const cashR = (cash / cap) * 100;

    const isCompliant = purifRate <= 5.0 && debtR <= 33.0 && cashR <= 33.0;

    setResult({
      companyName: manualForm.companyName || 'Saisie Manuelle',
      ticker: manualForm.ticker.toUpperCase() || 'CUSTOM',
      fiscalYear: '2025/2026',
      isCompliant,
      purificationRate: parseFloat(purifRate.toFixed(2)),
      debtRatio: parseFloat(debtR.toFixed(2)),
      cashRatio: parseFloat(cashR.toFixed(2)),
      financialData: {
        totalRevenue: `${revenue.toLocaleString('fr-FR')} MAD`,
        interestIncome: `${interestInc.toLocaleString('fr-FR')} MAD`,
        interestDebt: `${debt.toLocaleString('fr-FR')} MAD`,
        interestCash: `${cash.toLocaleString('fr-FR')} MAD`,
        marketCap: `${cap.toLocaleString('fr-FR')} MAD`
      },
      summary: `Calcul manuels effectués selon les ratios AAOIFI. Taux de purification: ${purifRate.toFixed(2)}%, Endettement: ${debtR.toFixed(2)}%, Trésorerie: ${cashR.toFixed(2)}%.`,
      sources: ['Saisie Manuelle']
    });
  };

  // Calculator computations
  const numericDividend = parseFloat(dividendAmount) || 0;
  const purifRate = result ? result.purificationRate : 0;
  const purificationAmount = (numericDividend * purifRate) / 100;
  const halalAmount = numericDividend - purificationAmount;

  const copyToClipboard = () => {
    if (!result) return;
    const text = `ANALYSE SHARIA & PURIFICATION DES DIVIDENDES (${result.companyName} - ${result.ticker})
- Statut: ${result.isCompliant ? 'CONFORME (HALAL)' : 'NON CONFORME'}
- Taux de Purification: ${result.purificationRate}%
- Dividende Brut: ${numericDividend.toLocaleString('fr-FR')} MAD
- Part Halal: ${halalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
- Montant à Purifier (Aumône): ${purificationAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
-- Généré via Aetheris Sharia Screener (AAOIFI 2026)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="aetheris-app dark-theme min-h-screen pb-24 md:pb-10">
      <Sidebar 
        history={[]} 
        onSelect={() => {}} 
        activeAgent="SENTIMENT" 
        onAgentChange={() => {}} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <Header onOpenSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <main className="main-content">
        <div className="max-container">
          
          {/* HEADER */}
          <header className="terminal-header animate-fade-in">
            <div className="header-identity">
              <div className="identity-block">
                <span className="status-light pulse"></span>
                <span className="mono-tiny text-emerald">SHARIA STOCK SCREENER & PURIFICATION (NORMES AAOIFI)</span>
              </div>
              <div className="title-row">
                <h1 className="title-h1">Purification Dividendes</h1>
                <div className="market-badge opacity-70">NORMES AAOIFI 2026</div>
              </div>
            </div>

            <div className="header-actions-row">
              <button 
                onClick={() => setShowKeyInput(!showKeyInput)} 
                className={`action-chip ${customApiKey ? 'emerald' : 'white'}`}
              >
                <Key size={13} />
                <span>{customApiKey ? 'CLÉ GEMINI CONFIGURÉE' : 'CLÉ API PERSONNALISÉE'}</span>
              </button>
            </div>
          </header>

          {/* CUSTOM GEMINI KEY INPUT COLLAPSIBLE */}
          {showKeyInput && (
            <div className="glass-heavy p-4 rounded-2xl mb-6 border border-emerald-500/30 flex flex-col gap-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="mono-tiny text-emerald font-bold flex items-center gap-1.5">
                  <Key size={14} /> CLÉ API GOOGLE GEMINI (OPTIONNELLE)
                </span>
                <button onClick={() => setShowKeyInput(false)} className="text-slate-400 text-xs">Fermer</button>
              </div>
              <p className="text-xs text-slate-400">
                Vous pouvez fournir votre propre clé API Gemini (`GEMINI_API_KEY`) si vous souhaitez outrepasser le quota système.
              </p>
              <div className="flex gap-2">
                <input 
                  type="password"
                  value={customApiKey}
                  onChange={e => saveApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="terminal-input-field flex-1"
                />
                <button onClick={() => saveApiKey(customApiKey)} className="action-btn-terminal strategy">
                  ENREGISTRER
                </button>
              </div>
            </div>
          )}

          {/* MODE SELECTOR TABS */}
          <div className="flex p-1 bg-slate-900/50 backdrop-blur-md rounded-2xl mb-8 border border-white/5 w-full md:w-max mx-auto shadow-inner">
            <button 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'AI_SEARCH' ? 'bg-slate-800 text-emerald-400 shadow-lg border border-white/5' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
              onClick={() => setActiveTab('AI_SEARCH')}
            >
              <Sparkles size={16} /> <span className="hidden md:inline">Recherche IA Automatique (Web & Rapports)</span><span className="md:hidden">IA Auto</span>
            </button>
            <button 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'MANUAL' ? 'bg-slate-800 text-emerald-400 shadow-lg border border-white/5' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
              onClick={() => setActiveTab('MANUAL')}
            >
              <Sliders size={16} /> <span className="hidden md:inline">Calculateur Manuel (Saisie CPC)</span><span className="md:hidden">Saisie Manuelle</span>
            </button>
          </div>

          {/* SEARCH SECTION */}
          {activeTab === 'AI_SEARCH' ? (
            <div className="search-console-wrapper animate-fade-in" style={{ marginBottom: '2rem' }}>
              <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="terminal-search-form glass-heavy">
                <div className="input-terminal-group">
                  <Search className="search-symbol" size={18} />
                  <input 
                    type="text" 
                    placeholder="RECHERCHER UNE ACTION (EX: DHO, IAM, AAPL...)"
                    value={query}
                    onChange={e => {
                      setQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    disabled={loading}
                    autoCapitalize="characters"
                    className="terminal-input"
                    spellCheck="false"
                    autoComplete="off"
                  />
                  {query && (
                    <button 
                      type="button" 
                      onClick={() => setQuery('')} 
                      className="clear-query-btn"
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading || !query.trim()}
                  className="action-btn-terminal strategy"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  <span className="btn-label-text">Analyser Conformité</span>
                </button>
              </form>

              <div className="input-glow-bar"></div>

              {/* SUGGESTIONS DROPDOWN */}
              {showSuggestions && query.length >= 2 && (
                <div className="suggestion-dropdown glass-heavy animate-slide-up" style={{ position: 'relative', marginTop: '0.5rem', zIndex: 50 }}>
                  {isSearchingDebounce ? (
                    <div className="p-4 text-xs text-slate-400 font-mono text-center">Recherche en cours...</div>
                  ) : suggestions.length > 0 ? (
                    <div className="suggestion-list">
                      {suggestions.map((s, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            setQuery(s.symbol);
                            setShowSuggestions(false);
                            handleSearch(s.symbol);
                          }}
                          className="suggestion-item"
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span className="font-bold text-white mono-tiny">{s.symbol}</span>
                          <span className="text-xs text-slate-400 truncate ml-2">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-xs text-slate-400 font-mono text-center">Aucune action trouvée.</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* MANUAL INPUT FORM */
            <form onSubmit={handleManualCalculate} className="glass-heavy p-6 rounded-2xl mb-6 animate-fade-in border border-white/10">
              <h3 className="mono font-bold text-sm text-emerald-400 mb-4 flex items-center gap-2">
                <Sliders size={16} /> SAISIE MANUELLE DES CHIFFRES DU COMPTE DE RÉSULTAT (CPC) ET BILAN
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="mono-tiny opacity-70">NOM DE LA SOCIÉTÉ</label>
                  <input type="text" value={manualForm.companyName} onChange={e => setManualForm({ ...manualForm, companyName: e.target.value })} className="terminal-input-field" required />
                </div>
                <div className="form-group">
                  <label className="mono-tiny opacity-70">TICKER / SYMBOLE</label>
                  <input type="text" value={manualForm.ticker} onChange={e => setManualForm({ ...manualForm, ticker: e.target.value })} className="terminal-input-field" required />
                </div>
                <div className="form-group">
                  <label className="mono-tiny opacity-70">CHIFFRE D'AFFAIRES TOTAL (MAD)</label>
                  <input type="number" value={manualForm.totalRevenue} onChange={e => setManualForm({ ...manualForm, totalRevenue: e.target.value })} className="terminal-input-field" required />
                </div>
                <div className="form-group">
                  <label className="mono-tiny opacity-70">PRODUITS D'INTÉRÊTS (RIBA / PLACEMENTS) (MAD)</label>
                  <input type="number" value={manualForm.interestIncome} onChange={e => setManualForm({ ...manualForm, interestIncome: e.target.value })} className="terminal-input-field" required />
                </div>
                <div className="form-group">
                  <label className="mono-tiny opacity-70">DETTES D'INTÉRÊTS (EMPRUNTS BANCAIRES) (MAD)</label>
                  <input type="number" value={manualForm.interestDebt} onChange={e => setManualForm({ ...manualForm, interestDebt: e.target.value })} className="terminal-input-field" required />
                </div>
                <div className="form-group">
                  <label className="mono-tiny opacity-70">TRÉSORERIE ET PLACEMENTS À INTÉRÊT (MAD)</label>
                  <input type="number" value={manualForm.interestCash} onChange={e => setManualForm({ ...manualForm, interestCash: e.target.value })} className="terminal-input-field" required />
                </div>
                <div className="form-group full-span">
                  <label className="mono-tiny opacity-70">CAPITALISATION BOURSIÈRE OU TOTAL ACTIF (MAD)</label>
                  <input type="number" value={manualForm.marketCap} onChange={e => setManualForm({ ...manualForm, marketCap: e.target.value })} className="terminal-input-field" required />
                </div>
              </div>
              <button type="submit" className="action-btn-terminal strategy full-width mt-4">
                <Calculator size={16} /> <span>CALCULER LA CONFORMITÉ MANUELLE</span>
              </button>
            </form>
          )}

          {/* LOADING STATE ANIMATION */}
          {loading && (
            <div className="glass-heavy p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-4 my-6 animate-pulse border border-emerald-500/20">
              <RefreshCw className="animate-spin text-emerald-400" size={36} />
              <div className="flex flex-col gap-1">
                <h3 className="mono font-bold text-base text-white">RECHERCHE ET ANALYSE SHARIA EN COURS...</h3>
                <p className="mono-tiny text-emerald-400">
                  {loadingStep === 1 && '🔍 Etape 1/3: Recherche des états financiers officiels sur le web...'}
                  {loadingStep === 2 && '📊 Etape 2/3: Extraction des données du Bilan et du Compte de Résultat (CPC)...'}
                  {loadingStep === 3 && '⚖️ Etape 3/3: Calcul des Ratios AAOIFI et du Taux de Purification...'}
                </p>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {error && !loading && (
            <div className="glass-heavy p-6 rounded-2xl my-6 border border-rose-500/40 bg-rose-950/20 text-rose-300 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={28} className="text-rose-400 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-white">Analyse automatique indisponible</h4>
                  <p className="text-xs text-rose-300/80">{error}</p>
                </div>
              </div>
              <button onClick={() => setActiveTab('MANUAL')} className="action-btn-terminal strategy">
                Saisir les chiffres manuellement
              </button>
            </div>
          )}

          {/* RESULTS SECTION */}
          {result && !loading && (
            <div className="fundamental-root animate-fade-in mt-4">
              
              {/* CREDIBILITY DISCLAIMER */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3 text-amber-400/90 mb-6">
                <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-sm">AVERTISSEMENT : DONNÉES GÉNÉRÉES PAR INTELLIGENCE ARTIFICIELLE</h4>
                  <p className="text-xs opacity-80 leading-relaxed">
                    Les montants financiers ci-dessous ont été extraits automatiquement par l'IA à partir des ressources disponibles sur le web. 
                    Les calculs de conformité AAOIFI ont ensuite été appliqués. <strong>Vérifiez ces chiffres avec les rapports de l'AMMC.</strong>
                  </p>
                </div>
              </div>

              {/* HEADER FUND */}
              <div className="report-header-fund">
                <div className="agent-identity">
                  <div className={`identity-pulse ${result.isCompliant ? 'emerald' : 'rose'}`} style={{ background: result.isCompliant ? 'var(--accent-emerald)' : '#f43f5e', boxShadow: result.isCompliant ? '0 0 12px var(--accent-emerald)' : '0 0 12px #f43f5e' }}></div>
                  <ShieldCheck size={12} className={result.isCompliant ? 'text-emerald' : 'text-rose-500'} />
                  <span className="mono-label">ANALYSE SHARIA v1.0 • {result.fiscalYear}</span>
                </div>
                <div className="header-main">
                  <div>
                    <h2 className="company-title" style={{ color: result.isCompliant ? 'var(--accent-emerald)' : '#f43f5e' }}>
                      {result.isCompliant ? 'HALAL (CONFORME)' : 'NON CONFORME'}
                    </h2>
                    <span className="text-xl text-white font-bold mt-2 block tracking-wide">{result.companyName} ({result.ticker})</span>
                  </div>
                  <div className="sector-badge glass-heavy">
                    <Scale size={14} className="opacity-40" />
                    <span className="mono-label">TAUX DE PURIFICATION: {result.purificationRate.toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* 1. DONNÉES FINANCIÈRES EXTRAITES (GRID STYLE) */}
              <div className="fund-grid">
                <div className="fund-card glass-heavy">
                  <div className="card-tag">
                    <BookOpen size={14} className="text-emerald" />
                    <span className="mono-label">CHIFFRE D'AFFAIRES & INTÉRÊTS</span>
                  </div>
                  <div className="metric-box">
                    <span className="m-label">CHIFFRE D'AFFAIRES</span>
                    <div className="m-val-row">
                      <span className="m-val mono">{result.financialData.totalRevenue}</span>
                      <div className="m-status glass">REVENU GLOBAL</div>
                    </div>
                  </div>
                  <div className="metric-box mt-4">
                    <span className="m-label">PRODUITS D'INTÉRÊTS (RIBA)</span>
                    <div className="m-val-row">
                      <span className="m-val mono text-rose-400" style={{ color: '#f43f5e' }}>{result.financialData.interestIncome}</span>
                      <div className="m-status glass" style={{ borderColor: 'rgba(244,63,94,0.2)', color: '#f43f5e' }}>REVENU ILLICITE</div>
                    </div>
                  </div>
                </div>

                <div className="fund-card glass-heavy">
                  <div className="card-tag">
                    <Landmark size={14} className="text-emerald" />
                    <span className="mono-label">DETTES & PLACEMENTS</span>
                  </div>
                  <div className="metric-box">
                    <span className="m-label">DETTES BANCAIRES</span>
                    <div className="m-val-row">
                      <span className="m-val mono text-amber-400" style={{ color: '#fbbf24' }}>{result.financialData.interestDebt}</span>
                      <div className="m-status glass">EMPRUNTS</div>
                    </div>
                  </div>
                  <div className="metric-box mt-4">
                    <span className="m-label">TRÉSORERIE PLACÉE</span>
                    <div className="m-val-row">
                      <span className="m-val mono">{result.financialData.interestCash}</span>
                      <div className="m-status glass">LIQUIDITÉS</div>
                    </div>
                  </div>
                </div>

                <div className="fund-card glass-heavy">
                  <div className="card-tag">
                    <Globe size={14} className="text-emerald" />
                    <span className="mono-label">ÉVALUATION GLOBALE</span>
                  </div>
                  <div className="metric-box">
                    <span className="m-label">CAPITALISATION BOURSIÈRE</span>
                    <div className="m-val-row">
                      <span className="m-val mono text-emerald">{result.financialData.marketCap}</span>
                      <div className="m-status glass green">BASE DE CALCUL</div>
                    </div>
                    <p className="m-desc mt-2">{result.summary}</p>
                  </div>
                </div>
              </div>

              {/* 2. RATIOS AAOIFI */}
              <div className="mt-8 mb-4">
                 <div className="agent-identity">
                  <ShieldCheck size={12} className="text-emerald" />
                  <span className="mono-label">RÉSULTATS DES 3 RATIOS AAOIFI</span>
                </div>
              </div>
              <div className="fund-grid">
                <div className="fund-card glass-heavy">
                   <div className="card-tag">
                    <PieChart size={14} className="text-emerald" />
                    <span className="mono-label">REVENUS ILLICITES (MAX 5%)</span>
                  </div>
                  <div className="metric-box">
                    <span className="m-label">RATIO RIBA / CHIFFRE D'AFFAIRES</span>
                    <div className="m-val-row">
                      <span className="m-val mono">{result.purificationRate.toFixed(2)}<span className="m-cur">%</span></span>
                      <div className={`m-status glass ${result.purificationRate <= 5 ? 'green' : ''}`} style={result.purificationRate > 5 ? { borderColor: 'rgba(244,63,94,0.2)', color: '#f43f5e', background: 'rgba(244,63,94,0.05)' } : {}}>
                        {result.purificationRate <= 5 ? 'CONFORME' : 'DÉPASSÉ'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="fund-card glass-heavy">
                   <div className="card-tag">
                    <Activity size={14} className="text-emerald" />
                    <span className="mono-label">ENDETTEMENT (MAX 33%)</span>
                  </div>
                  <div className="metric-box">
                    <span className="m-label">DETTES / CAPITALISATION</span>
                    <div className="m-val-row">
                      <span className="m-val mono">{result.debtRatio.toFixed(2)}<span className="m-cur">%</span></span>
                      <div className={`m-status glass ${result.debtRatio <= 33 ? 'green' : ''}`} style={result.debtRatio > 33 ? { borderColor: 'rgba(244,63,94,0.2)', color: '#f43f5e', background: 'rgba(244,63,94,0.05)' } : {}}>
                        {result.debtRatio <= 33 ? 'CONFORME' : 'DÉPASSÉ'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="fund-card glass-heavy">
                   <div className="card-tag">
                    <Briefcase size={14} className="text-emerald" />
                    <span className="mono-label">LIQUIDITÉS (MAX 33%)</span>
                  </div>
                  <div className="metric-box">
                    <span className="m-label">TRÉSORERIE / CAPITALISATION</span>
                    <div className="m-val-row">
                      <span className="m-val mono">{result.cashRatio.toFixed(2)}<span className="m-cur">%</span></span>
                      <div className={`m-status glass ${result.cashRatio <= 33 ? 'green' : ''}`} style={result.cashRatio > 33 ? { borderColor: 'rgba(244,63,94,0.2)', color: '#f43f5e', background: 'rgba(244,63,94,0.05)' } : {}}>
                        {result.cashRatio <= 33 ? 'CONFORME' : 'DÉPASSÉ'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. CALCULATEUR D'AUMÔNE */}
              <div className="fund-footer mt-8" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="flex justify-between items-center mb-4">
                  <div className="agent-identity" style={{ marginBottom: 0 }}>
                    <Coins size={12} className="text-emerald" />
                    <span className="mono-label">CALCULATEUR D'AUMÔNE / PURIFICATION</span>
                  </div>
                  <button onClick={copyToClipboard} className="action-btn-terminal white" style={{ padding: '8px 16px', minHeight: 'auto' }}>
                    {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    <span>{copied ? 'COPIÉ' : 'COPIER RAPPORT'}</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="metric-box">
                    <span className="m-label">MON DIVIDENDE BRUT REÇU (MAD)</span>
                    <input 
                      type="number" 
                      value={dividendAmount} 
                      onChange={e => setDividendAmount(e.target.value)}
                      placeholder="Ex: 6024"
                      className="terminal-input"
                      style={{ fontSize: '1.5rem', fontWeight: 800, padding: '1rem', width: '100%', borderRadius: '1rem' }}
                    />
                  </div>

                  <div className="fund-card glass" style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)' }}>
                    <span className="m-label" style={{ color: 'var(--accent-emerald)' }}>PART HALAL CONSERVÉE ({(100 - result.purificationRate).toFixed(2)} %)</span>
                    <span className="m-val mono mt-2">
                      +{halalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="m-cur">MAD</span>
                    </span>
                  </div>

                  <div className="fund-card glass" style={{ padding: '1.5rem', background: 'rgba(244, 63, 94, 0.05)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                    <span className="m-label" style={{ color: '#f43f5e' }}>À PURIFIER / AUMÔNE ({result.purificationRate.toFixed(2)} %)</span>
                    <span className="m-val mono mt-2" style={{ color: '#f43f5e' }}>
                      -{purificationAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="m-cur" style={{ color: 'rgba(244, 63, 94, 0.5)' }}>MAD</span>
                    </span>
                  </div>
                </div>
              </div>
              
              {/* STYLES COPIED FROM FUNDAMENTAL REPORT FOR PREMIUM CARDS */}
              <style jsx>{`
                .fundamental-root { display: flex; flex-direction: column; width: 100%; padding-bottom: 4rem; }
                
                .report-header-fund { border-bottom: 1px solid var(--border-glass); padding-bottom: 3rem; margin-bottom: 1rem; }
                .agent-identity { position: relative; display: flex; align-items: center; gap: 0.75rem; color: var(--accent-emerald); margin-bottom: 1.5rem; }
                .identity-pulse { width: 8px; height: 8px; border-radius: 50%; }
                
                .header-main { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; flex-wrap: wrap; }
                .company-title { font-family: 'Outfit', sans-serif; font-size: 3rem; font-weight: 950; line-height: 0.9; letter-spacing: -0.05em; margin: 0; }
                @media (min-width: 768px) { .company-title { font-size: 3.5rem; } }
                .sector-badge { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; border-radius: 100px; border: 1px solid var(--border-glass); }
                
                .fund-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
                @media (max-width: 1024px) { .fund-grid { grid-template-columns: 1fr; } }
                
                .fund-card { padding: 2rem; border-radius: 2rem; border: 1px solid var(--border-glass); display: flex; flex-direction: column; gap: 2rem; }
                .card-tag { display: flex; align-items: center; gap: 1rem; }
                
                .metric-box { display: flex; flex-direction: column; gap: 0.75rem; }
                .m-label { font-size: 11px; font-weight: 850; color: var(--text-dim); letter-spacing: 0.15rem; text-transform: uppercase; }

                .m-val-row { display: flex; align-items: center; justify-content: space-between; }
                .m-val { font-size: 1.5rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em; }
                @media (min-width: 768px) { .m-val { font-size: 1.75rem; } }
                
                .m-status { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 850; color: var(--text-dim); padding: 4px 10px; border-radius: 4px; border: 1px solid var(--border-glass); }
                .m-status.green { color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.05); }
                .m-desc { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; font-weight: 500; }
                
                .fund-footer { padding: 2.5rem; border-radius: 2rem; border: 1px solid var(--border-glass); background: linear-gradient(to right, rgba(16, 185, 129, 0.03), rgba(0,0,0,0.5)); }
                
                .mono-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 850; color: var(--text-dim); letter-spacing: 0.15rem; text-transform: uppercase; }
                .mono { font-family: 'JetBrains Mono', monospace; }
                .m-cur { font-size: 10px; color: #334155; margin-left: 0.5rem; vertical-align: middle; }
                .text-emerald { color: var(--accent-emerald); }
                .text-dim { color: #334155 !important; }
              `}</style>
            </div>
          )}
</div>
      </main>

      <BottomNav />
    </div>
  );
}
