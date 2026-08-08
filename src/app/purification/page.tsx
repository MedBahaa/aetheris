'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { 
  CheckCircle2, XCircle, Search, Sparkles, Key, Calculator, 
  BookOpen, ExternalLink, RefreshCw, AlertTriangle, ShieldCheck, 
  Copy, Check, Coins, ArrowLeft, Sliders, DollarSign, HelpCircle, Scale
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
  const [dividendAmount, setDividendAmount] = useState<string>('6024');
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
          <div className="tab-strip mb-6">
            <button 
              className={`tab-btn ${activeTab === 'AI_SEARCH' ? 'active' : ''}`}
              onClick={() => setActiveTab('AI_SEARCH')}
            >
              <Sparkles size={14} /> <span>Recherche IA Automatique (Web & Rapports)</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'MANUAL' ? 'active' : ''}`}
              onClick={() => setActiveTab('MANUAL')}
            >
              <Sliders size={14} /> <span>Calculateur Manuel (Saisie CPC / Bilan)</span>
            </button>
          </div>

          {/* SEARCH SECTION */}
          {activeTab === 'AI_SEARCH' ? (
            <div className="controls-bar glass-heavy animate-fade-in p-4 mb-6">
              <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex flex-col md:flex-row gap-3">
                <div className="search-box flex-1 relative">
                  <Search size={18} className="opacity-40" />
                  <input 
                    type="text" 
                    placeholder="RECHERCHER UNE ACTION (EX: DHO, IAM, DELTA HOLDING, AAPL...)"
                    value={query}
                    onChange={e => {
                      setQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    disabled={loading}
                    autoCapitalize="characters"
                  />
                  {/* SUGGESTIONS DROPDOWN */}
                  {showSuggestions && query.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden z-50 shadow-2xl">
                      {isSearchingDebounce ? (
                        <div className="p-3 text-xs text-slate-400 font-mono">Recherche en cours...</div>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((s, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                              setQuery(s.symbol);
                              setShowSuggestions(false);
                              handleSearch(s.symbol);
                            }}
                            className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800/50 last:border-0 flex justify-between items-center transition-colors"
                          >
                            <span className="font-bold text-white mono-tiny">{s.symbol}</span>
                            <span className="text-xs text-slate-400 truncate ml-2">{s.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-slate-400 font-mono">Aucune action trouvée dans la base de données.</div>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  disabled={loading || !query.trim()}
                  className="action-btn-terminal strategy h-12 px-6 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  <span>ANALYSER LA CONFORMITÉ</span>
                </button>
              </form>

              {/* QUICK TICKER CHIPS */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="mono-tiny opacity-40">EXEMPLES RAPIDES :</span>
                {[
                  { symbol: 'DHO', name: 'Delta Holding' },
                  { symbol: 'IAM', name: 'Maroc Telecom' },
                  { symbol: 'AKT', name: 'Akdital' },
                  { symbol: 'ATW', name: 'Attijariwafa' },
                  { symbol: 'ADI', name: 'Alliances' },
                  { symbol: 'AAPL', name: 'Apple Inc.' }
                ].map(item => (
                  <button 
                    key={item.symbol}
                    onClick={() => { setQuery(item.symbol); handleSearch(item.symbol); }}
                    className="action-chip white"
                  >
                    <span className="mono-tiny font-bold">{item.symbol}</span>
                    <span className="opacity-60 text-[10px]">({item.name})</span>
                  </button>
                ))}
              </div>
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
            <div className="flex flex-col gap-6 animate-fade-in">
              
              {/* CREDIBILITY DISCLAIMER */}
              <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 text-amber-200/90">
                <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-sm text-amber-400">AVERTISSEMENT : DONNÉES GÉNÉRÉES PAR INTELLIGENCE ARTIFICIELLE</h4>
                  <p className="text-xs">
                    Les montants financiers ci-dessous ont été extraits automatiquement par l'IA à partir des ressources disponibles sur le web. 
                    Les calculs de conformité AAOIFI ont ensuite été appliqués mathématiquement. <strong>Avant toute décision d'investissement Halal, vous devez impérativement vérifier ces chiffres avec les rapports financiers officiels publiés par l'AMMC</strong>.
                  </p>
                </div>
              </div>

              {/* COMPLIANCE STATUS & HERO PURIFICATION RATE */}
              <div className={`glass-heavy p-8 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden ${result.isCompliant ? 'border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-rose-500/50 bg-rose-950/10 shadow-[0_0_30px_rgba(244,63,94,0.1)]'}`}>
                {/* Glow effect background */}
                <div className={`absolute -top-20 -left-20 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none ${result.isCompliant ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                <div className="flex items-center gap-5 z-10">
                  <div className={`p-4 rounded-2xl flex-shrink-0 ${result.isCompliant ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                    {result.isCompliant ? <CheckCircle2 size={42} /> : <XCircle size={42} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="mono-tiny opacity-70 tracking-wider">ANALYSE SHARIA • {result.fiscalYear}</span>
                    <h2 className={`font-black text-3xl md:text-4xl tracking-tight ${result.isCompliant ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {result.isCompliant ? 'HALAL (CONFORME)' : 'NON CONFORME'}
                    </h2>
                    <span className="text-sm text-slate-300 font-bold">{result.companyName} ({result.ticker})</span>
                  </div>
                </div>

                {/* HERO PURIFICATION RATE BADGE */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-white/10 flex flex-col items-center md:items-end gap-1 min-w-[240px] z-10 relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  <span className="mono-tiny text-slate-400 tracking-wider">TAUX DE PURIFICATION</span>
                  <div className="text-4xl font-black mono text-emerald-400 tracking-tighter">
                    {result.purificationRate.toFixed(2)} %
                  </div>
                  <span className="text-[10px] text-slate-500 text-center md:text-right uppercase font-bold mt-1">
                    Fraction d'intérêts (Riba)
                  </span>
                </div>
              </div>

              {/* INTERACTIVE DIVIDEND PURIFICATION CALCULATOR */}
              <div className="glass-heavy p-6 rounded-2xl border border-emerald-500/30">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="mono font-bold text-base text-emerald-400 flex items-center gap-2">
                    <Coins size={18} /> CALCULATEUR D'AUMÔNE / PURIFICATION DES DIVIDENDES
                  </h3>
                  <button onClick={copyToClipboard} className="action-btn-terminal white">
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? 'COPIÉ !' : 'COPIER LE BILAN'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-4">
                  <div className="form-group md:col-span-1">
                    <label className="mono-tiny opacity-70">MON DIVIDENDE BRUT REÇU (MAD)</label>
                    <input 
                      type="number" 
                      value={dividendAmount} 
                      onChange={e => setDividendAmount(e.target.value)}
                      placeholder="Ex: 6024"
                      className="terminal-input-field text-lg font-mono font-bold text-white"
                    />
                  </div>

                  {/* COMPUTED RESULT BOXES */}
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/30 flex flex-col gap-1">
                    <span className="mono-tiny text-emerald-400 font-bold">🟢 PART HALAL CONSERVÉE ({(100 - result.purificationRate).toFixed(2)} %)</span>
                    <span className="text-xl font-bold mono text-white">
                      +{halalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                    </span>
                    <span className="text-[10px] text-slate-400">Revenu net utilisable sans restriction</span>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-xl border border-rose-500/40 flex flex-col gap-1">
                    <span className="mono-tiny text-rose-400 font-bold">🤲 MONTANT À PURIFIER / AUMÔNE ({result.purificationRate.toFixed(2)} %)</span>
                    <span className="text-xl font-bold mono text-rose-400">
                      -{purificationAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                    </span>
                    <span className="text-[10px] text-slate-400">À distribuer aux œuvres caritatives</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 bg-slate-950/50 p-3 rounded-lg border border-white/5">
                  💡 <strong>Principe AAOIFI :</strong> La purification consiste à verser la fraction du dividende provenant d'intérêts bancaires (Riba) à des œuvres caritatives sans chercher de récompense spirituelle, afin de nettoyer le reste de vos gains.
                </p>
              </div>

              {/* AAOIFI RATIOS TABLE / METRICS GRID */}
              <div className="glass-heavy p-6 rounded-2xl border border-white/10">
                <h3 className="mono font-bold text-sm text-slate-200 mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} /> DÉTAILS DES 3 RATIOS DE CONFORMITÉ AAOIFI
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* RATIO 1: INTÉRÊTS / REVENUS */}
                  <div className="bg-slate-900 p-5 rounded-2xl border border-white/5 flex flex-col gap-3 relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">1. Revenus Non Conformes</span>
                      <span className="mono text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded">MAX 5%</span>
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                      <span className="text-3xl font-black mono text-white">{result.purificationRate.toFixed(2)}<span className="text-xl text-slate-500">%</span></span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${result.purificationRate <= 5.0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {result.purificationRate <= 5.0 ? '✓ OK' : '✗ DÉPASSÉ'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                      <div 
                        className={`h-full transition-all duration-1000 ${result.purificationRate <= 5.0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                        style={{ width: `${Math.min((result.purificationRate / 5) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Ratio Riba / Chiffre d'Affaires</span>
                  </div>

                  {/* RATIO 2: ENDETTEMENT */}
                  <div className="bg-slate-900 p-5 rounded-2xl border border-white/5 flex flex-col gap-3 relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">2. Endettement Bancaire</span>
                      <span className="mono text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded">MAX 33%</span>
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                      <span className="text-3xl font-black mono text-white">{result.debtRatio.toFixed(2)}<span className="text-xl text-slate-500">%</span></span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${result.debtRatio <= 33.0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {result.debtRatio <= 33.0 ? '✓ OK' : '✗ DÉPASSÉ'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                      <div 
                        className={`h-full transition-all duration-1000 ${result.debtRatio <= 33.0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                        style={{ width: `${Math.min((result.debtRatio / 33) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Dettes à intérêts / Capitalisation</span>
                  </div>

                  {/* RATIO 3: TRÉSORERIE */}
                  <div className="bg-slate-900 p-5 rounded-2xl border border-white/5 flex flex-col gap-3 relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">3. Trésorerie Placée</span>
                      <span className="mono text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded">MAX 33%</span>
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                      <span className="text-3xl font-black mono text-white">{result.cashRatio.toFixed(2)}<span className="text-xl text-slate-500">%</span></span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${result.cashRatio <= 33.0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {result.cashRatio <= 33.0 ? '✓ OK' : '✗ DÉPASSÉ'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                      <div 
                        className={`h-full transition-all duration-1000 ${result.cashRatio <= 33.0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                        style={{ width: `${Math.min((result.cashRatio / 33) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Placements rémunérés / Capitalisation</span>
                  </div>
                </div>
              </div>

              {/* EXTRACTED FINANCIAL DATA & SUMMARY */}
              <div className="glass-heavy p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
                <h3 className="mono font-bold text-sm text-slate-200 flex items-center gap-2">
                  <BookOpen size={16} /> DONNÉES FINANCIÈRES EXTRAITES DU CPC ET BILAN
                </h3>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Chiffre d'Affaires</span>
                    <span className="mono font-bold text-slate-100 text-sm">{result.financialData.totalRevenue}</span>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Produits d'Intérêts</span>
                    <span className="mono font-bold text-rose-400 text-sm">{result.financialData.interestIncome}</span>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Dettes Bancaires</span>
                    <span className="mono font-bold text-amber-400 text-sm">{result.financialData.interestDebt}</span>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Trésorerie Placée</span>
                    <span className="mono font-bold text-slate-200 text-sm">{result.financialData.interestCash}</span>
                  </div>
                  <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/20 flex flex-col justify-center col-span-2 lg:col-span-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                    <span className="text-emerald-500/70 text-[10px] uppercase font-bold tracking-wider mb-1">Capitalisation Base</span>
                    <span className="mono font-bold text-emerald-400 text-sm z-10">{result.financialData.marketCap}</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-xl border border-white/5 text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-emerald-400 block mb-1">RÉSUMÉ EXPLICATIF :</span>
                  {result.summary}
                </div>

                {result.sources && result.sources.length > 0 && (
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="text-slate-400 font-bold">SOURCES :</span>
                    {result.sources.map((src, i) => (
                      <a 
                        key={i} 
                        href={src.startsWith('http') ? src : '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1 bg-slate-950/60 px-2 py-1 rounded border border-white/5"
                      >
                        <ExternalLink size={10} /> <span>{src.replace('https://', '').replace('http://', '').split('/')[0]}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}
