'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { 
  XCircle, Search, Sparkles, Key, Calculator, BookOpen, ExternalLink, RefreshCw,
  AlertTriangle, ShieldCheck, Copy, Check, Coins, Sliders, FileText, X
} from 'lucide-react';

interface ShariaResult {
  companyName: string;
  ticker: string;
  sector?: string;
  isHaramSector?: boolean;
  fiscalYear: string;
  isCompliant: boolean | null;
  estimatedCompliance?: boolean;
  dataQuality: 'MANUAL' | 'UNVERIFIED' | 'INSUFFICIENT';
  dataWarning?: string;
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
  confidenceScore?: number;
  explanation?: string;
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
  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingDebounce, setIsSearchingDebounce] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  // Kept only to avoid breaking the existing layout while it is being removed.
  // It is neither persisted nor transmitted to the server.
  const [customApiKey, setCustomApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const saveApiKey = (key: string) => setCustomApiKey(key);

  // Fetch suggestions when query changes
  useEffect(() => {
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setIsSearchingDebounce(true);
      try {
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Error fetching suggestions:', err);
      } finally {
        if (!controller.signal.aborted) setIsSearchingDebounce(false);
      }
    };
    
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  // Dividend Calculator Input
  const [dividendAmount, setDividendAmount] = useState<string>('0');
  const [dividendType, setDividendType] = useState<'BRUT' | 'NET'>('BRUT');
  const [copied, setCopied] = useState(false);

  // Manual Input State
  const [denominatorType, setDenominatorType] = useState<'MARKET_CAP' | 'TOTAL_ASSETS'>('MARKET_CAP');
  const [manualForm, setManualForm] = useState({
    companyName: '', ticker: '', totalRevenue: '', interestIncome: '',
    interestDebt: '', interestCash: '', marketCap: ''
  });

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
      const formData = new FormData();
      formData.append('query', searchQuery.trim());
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      const res = await fetch('/api/sharia-screener', {
        method: 'POST',
        body: formData
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
    const parseAmount = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.'));
    const revenue = parseAmount(manualForm.totalRevenue);
    const interestInc = parseAmount(manualForm.interestIncome);
    const debt = parseAmount(manualForm.interestDebt);
    const cash = parseAmount(manualForm.interestCash);
    const cap = parseAmount(manualForm.marketCap);

    if (![revenue, interestInc, debt, cash, cap].every(Number.isFinite) || revenue <= 0 || cap <= 0 || interestInc < 0 || debt < 0 || cash < 0) {
      setError('Saisissez uniquement des montants positifs ou nuls ; le chiffre d’affaires et le dénominateur doivent être supérieurs à zéro.');
      return;
    }

    setError(null);

    const purifRate = revenue > 0 ? (interestInc / revenue) * 100 : 0;
    const debtR = (debt / cap) * 100;
    const cashR = (cash / cap) * 100;

    const isCompliant = purifRate <= 5.0 && debtR <= 33.0 && cashR <= 33.0;

    setResult({
      companyName: manualForm.companyName || 'Saisie Manuelle',
      ticker: manualForm.ticker.toUpperCase() || 'CUSTOM',
      sector: 'Saisie Manuelle',
      fiscalYear: '2025/2026',
      dataQuality: 'MANUAL',
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
      summary: `Calcul manuels effectués selon les ratios AAOIFI (Dénominateur: ${denominatorType === 'MARKET_CAP' ? 'Capitalisation Boursière' : 'Total Actif'}). Taux de purification: ${purifRate.toFixed(2)}%, Endettement: ${debtR.toFixed(2)}%, Trésorerie: ${cashR.toFixed(2)}%.`,
      sources: ['Saisie Manuelle']
    });
  };

  // Calculator computations. It is intentionally available only after a
  // validated manual calculation; AI estimates never create a donation amount.
  const numericDividend = Math.max(0, parseFloat(dividendAmount) || 0);
  const purifRate = result?.purificationRate ?? 0;
  const debtRatio = result?.debtRatio ?? 0;
  const cashRatio = result?.cashRatio ?? 0;
  const canCalculate = result?.dataQuality === 'MANUAL';
  
  // PART 2: Application de l'arrondi mathématique à l'unité supérieure par précaution
  const rawPurificationAmount = (numericDividend * purifRate) / 100;
  const purificationAmount = Math.ceil(rawPurificationAmount);
  const halalAmount = numericDividend - purificationAmount;
  
  const isManualResult = result?.dataQuality === 'MANUAL';
  const complianceLabel = !result || (!isManualResult && !result.isHaramSector)
    ? 'DONNÉES À VÉRIFIER'
    : result.isCompliant ? 'HALAL (CONFORME)' : 'NON CONFORME';

  const copyToClipboard = () => {
    if (!result || !canCalculate || !navigator.clipboard) return;
    const text = `ANALYSE SHARIA & PURIFICATION DES DIVIDENDES (${result.companyName} - ${result.ticker})
- Statut: ${result.isCompliant ? 'CONFORME (HALAL)' : 'NON CONFORME'}
- Secteur: ${result.sector || 'N/A'}
- Taux de Purification: ${result.purificationRate}%
- Dividende (${dividendType === 'BRUT' ? 'Brut avant impôts' : "Net d'impôts"}): ${numericDividend.toLocaleString('fr-FR')} MAD
- Part Halal: ${halalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
- Montant à Purifier (Aumône arrondie à l'unité supérieure): ${purificationAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
-- Généré via Aetheris Sharia Screener (AAOIFI 2026)`;

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setError('La copie automatique est indisponible sur cet appareil.'));
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
          <div className="tab-strip mb-8">
            <button 
              className={`tab-btn ${activeTab === 'AI_SEARCH' ? 'active' : ''}`}
              onClick={() => setActiveTab('AI_SEARCH')}
            >
              <Sparkles size={13} /> <span className="hidden md:inline">Estimation IA (à vérifier)</span><span className="md:hidden">IA</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'MANUAL' ? 'active' : ''}`}
              onClick={() => setActiveTab('MANUAL')}
            >
              <Sliders size={13} /> <span className="hidden md:inline">Calculateur Manuel (Saisie CPC)</span><span className="md:hidden">Saisie Manuelle</span>
            </button>
          </div>

          {/* SEARCH SECTION */}
          {activeTab === 'AI_SEARCH' ? (
            <div className="glass-heavy animate-fade-in flex flex-col gap-4" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '1rem' }}>
              <div className="controls-bar" style={{ padding: 0, background: 'transparent', border: 'none' }}>
                <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="search-box relative flex items-center w-full" style={{ paddingRight: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Search size={18} className="opacity-40 flex-shrink-0" />
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
                  style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
                />
                
                <button 
                  type="submit" 
                  disabled={loading || !query.trim()}
                  className="action-btn-terminal strategy flex-shrink-0"
                  style={{ height: '36px', padding: '0 20px', whiteSpace: 'nowrap', borderRadius: '12px' }}
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  <span>ANALYSER CONFORMITÉ</span>
                </button>

                {showSuggestions && query.length >= 2 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', zIndex: 50, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                    {isSearchingDebounce ? (
                      <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', textAlign: 'center' }}>Recherche en cours...</div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((s, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            setQuery(s.symbol);
                            setShowSuggestions(false);
                            handleSearch(s.symbol);
                          }}
                          style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ fontWeight: 'bold', color: 'white', fontSize: '11px', fontFamily: 'monospace' }}>{s.symbol}</span>
                          <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: '8px' }}>{s.name}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', textAlign: 'center' }}>Aucune action trouvée.</div>
                    )}
                  </div>
                )}
              </form>
              </div>

              {/* PDF UPLOAD AREA */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-2 p-4 rounded-xl border border-white/5 bg-white/5">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className="mono-tiny text-white font-bold mb-1">RAPPORT FINANCIER (OPTIONNEL)</h4>
                    <p className="text-xs text-slate-400">Fournissez le PDF officiel pour garantir 100% de précision sans hallucinations IA.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 relative">
                  {!pdfFile ? (
                    <label className="action-btn-terminal white cursor-pointer" style={{ height: '32px', padding: '0 12px', fontSize: '11px' }}>
                      <span>IMPORTER PDF</span>
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setPdfFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs mono">
                      <span className="truncate max-w-[150px]">{pdfFile.name}</span>
                      <button type="button" onClick={() => setPdfFile(null)} className="hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
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
                  <div className="flex justify-between items-center mb-2">
                    <label className="mono-tiny opacity-70">DÉNOMINATEUR POUR LES RATIOS D'ENDETTEMENT/TRÉSORERIE</label>
                    <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-white/5">
                      <button type="button" onClick={() => setDenominatorType('MARKET_CAP')} className={`text-xs px-2 py-1 rounded ${denominatorType === 'MARKET_CAP' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white'}`}>Capitalisation</button>
                      <button type="button" onClick={() => setDenominatorType('TOTAL_ASSETS')} className={`text-xs px-2 py-1 rounded ${denominatorType === 'TOTAL_ASSETS' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white'}`}>Total Actif</button>
                    </div>
                  </div>
                  <input type="number" placeholder={denominatorType === 'MARKET_CAP' ? "Capitalisation Boursière (MAD)" : "Total Actif au Bilan (MAD)"} value={manualForm.marketCap} onChange={e => setManualForm({ ...manualForm, marketCap: e.target.value })} className="terminal-input-field" required />
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
            <div className="data-terminal glass-heavy animate-fade-in mt-6" style={{ padding: '2rem' }}>
              
              {/* HARAM SECTOR ALERT */}
              {result.isHaramSector && (
                <div className="mb-8 bg-rose-500/10 border border-rose-500/30 p-6 rounded-xl flex items-start gap-4 text-rose-300">
                  <AlertTriangle size={32} className="text-rose-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg text-rose-400 mb-1">SECTEUR ILLICITE PAR NATURE</h3>
                    <p className="text-sm opacity-90 mb-2">L'entreprise appartient à un secteur d'activité non conforme à la Sharia ({result.sector}). Les activités telles que la banque conventionnelle, l'assurance conventionnelle, l'alcool, le tabac et les jeux de hasard sont proscrites.</p>
                    <p className="text-sm font-bold opacity-100">Aucun calcul de purification n'est applicable car l'investissement principal est illicite.</p>
                  </div>
                </div>
              )}

              {/* COMPLIANCE HERO BADGE */}
              <div className="flex flex-col items-center justify-center mb-8 pb-8 border-b border-white/5">
                <div className={`p-4 rounded-full mb-3 ${isManualResult && result.isCompliant ? 'bg-emerald-500/20 text-emerald-400' : (isManualResult || result.isHaramSector) ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {isManualResult && result.isCompliant ? <ShieldCheck size={48} /> : <XCircle size={48} />}
                </div>
                <h2 className={`text-4xl font-black mb-1 text-center ${isManualResult && result.isCompliant ? 'text-emerald-400' : (isManualResult || result.isHaramSector) ? 'text-rose-400' : 'text-amber-400'}`}>
                  {complianceLabel}
                </h2>
                <span className="mono-tiny text-slate-400 text-center">ANALYSE SHARIA • {result.companyName} ({result.ticker}) {result.sector ? `• Secteur: ${result.sector}` : ''}</span>
                
                {result.dataWarning && (
                  <div className={`mt-4 ${!isManualResult ? 'bg-amber-950/30 border-amber-500/50' : 'bg-slate-900/50 border-slate-700/50'} border p-5 rounded-xl max-w-2xl text-left text-sm text-slate-300`}>
                    <div className="flex items-center gap-2 mb-2 text-amber-500 font-bold">
                      <AlertTriangle size={16} />
                      <span>{isManualResult ? 'Avertissement :' : "Analyse Estimée par l'IA"}</span>
                      {!isManualResult && result.confidenceScore !== undefined && (
                        <span className="ml-auto text-xs bg-amber-500/20 px-2 py-1 rounded">Confiance : {result.confidenceScore}%</span>
                      )}
                    </div>
                    <p className="mb-2">{result.dataWarning}</p>
                    {!isManualResult && result.explanation && (
                      <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-white/5 border-dashed">
                        <span className="font-bold text-slate-300">Note de synthèse :</span> {result.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TABLE DESKTOP */}
              <h3 className="mono-tiny opacity-70 mb-4">MÉTRIQUES DE CONFORMITÉ AAOIFI</h3>
              <div className="table-scroll desktop-only-container mb-8">
                <table className="institutional-table" style={{ width: '100%', textAlign: 'left' }}>
                  <thead>
                    <tr className="glass-heavy">
                      <th style={{ padding: '1rem', verticalAlign: 'middle' }}>MÉTRIQUE AAOIFI</th>
                      <th style={{ padding: '1rem', verticalAlign: 'middle' }}>VALEUR FINANCIÈRE BRUTE</th>
                      <th style={{ padding: '1rem', verticalAlign: 'middle' }}>RATIO EXTRAIT</th>
                      <th style={{ padding: '1rem', verticalAlign: 'middle' }}>LIMITE AUTORISÉE</th>
                      <th style={{ padding: '1rem', textAlign: 'right', verticalAlign: 'middle' }}>STATUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="inst-row border-b border-white/5">
                      <td data-label="MÉTRIQUE AAOIFI" style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <div className="stock-titles"><span className="stock-symbol-title">Revenus Illicites (Riba) <span title="AAOIFI: Les revenus issus d'activités non conformes (intérêts, pénalités de retard...) ne doivent pas dépasser 5% des revenus totaux." className="cursor-help opacity-50 hover:opacity-100">ℹ️</span></span></div>
                      </td>
                      <td data-label="VALEUR BRUTE" style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <span className="mono text-rose-400">{result.financialData.interestIncome}</span>
                        <div className="text-xs text-slate-500">CA: {result.financialData.totalRevenue}</div>
                      </td>
                      <td data-label="RATIO EXTRAIT" style={{ padding: '1rem', verticalAlign: 'middle' }}><span className="t-price text-white font-bold">{result.purificationRate.toFixed(2)}%</span></td>
                      <td data-label="LIMITE AUTORISÉE" style={{ padding: '1rem', verticalAlign: 'middle' }}><span className="mono-tiny text-slate-500 bg-slate-800 px-2 py-1 rounded">MAX 5%</span></td>
                      <td data-label="STATUT" style={{ padding: '1rem', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div className={`inline-block pnl-hero-pill ${result.purificationRate <= 5 ? 'bull' : 'bear'}`}>
                          <span className="pnl-percentage font-bold">{result.purificationRate <= 5 ? 'CONFORME' : 'DÉPASSÉ'}</span>
                        </div>
                      </td>
                    </tr>
                    
                    <tr className="inst-row border-b border-white/5">
                      <td data-label="MÉTRIQUE AAOIFI" style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <div className="stock-titles"><span className="stock-symbol-title">Endettement Bancaire <span title="AAOIFI: Les dettes portant intérêt (emprunts) ne doivent pas dépasser 33% de la capitalisation boursière (ou Total Actif)." className="cursor-help opacity-50 hover:opacity-100">ℹ️</span></span></div>
                      </td>
                      <td data-label="VALEUR BRUTE" style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <span className="mono text-amber-400">{result.financialData.interestDebt}</span>
                        <div className="text-xs text-slate-500">Cap: {result.financialData.marketCap}</div>
                      </td>
                      <td data-label="RATIO EXTRAIT" style={{ padding: '1rem', verticalAlign: 'middle' }}><span className="t-price text-white font-bold">{result.debtRatio.toFixed(2)}%</span></td>
                      <td data-label="LIMITE AUTORISÉE" style={{ padding: '1rem', verticalAlign: 'middle' }}><span className="mono-tiny text-slate-500 bg-slate-800 px-2 py-1 rounded">MAX 33%</span></td>
                      <td data-label="STATUT" style={{ padding: '1rem', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div className={`inline-block pnl-hero-pill ${result.debtRatio <= 33 ? 'bull' : 'bear'}`}>
                          <span className="pnl-percentage font-bold">{result.debtRatio <= 33 ? 'CONFORME' : 'DÉPASSÉ'}</span>
                        </div>
                      </td>
                    </tr>

                    <tr className="inst-row border-b border-white/5">
                      <td data-label="MÉTRIQUE AAOIFI" style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <div className="stock-titles"><span className="stock-symbol-title">Trésorerie Placée <span title="AAOIFI: Les liquidités placées à intérêt ne doivent pas dépasser 33% de la capitalisation boursière (ou Total Actif)." className="cursor-help opacity-50 hover:opacity-100">ℹ️</span></span></div>
                      </td>
                      <td data-label="VALEUR BRUTE" style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <span className="mono text-emerald-400">{result.financialData.interestCash}</span>
                        <div className="text-xs text-slate-500">Cap: {result.financialData.marketCap}</div>
                      </td>
                      <td data-label="RATIO EXTRAIT" style={{ padding: '1rem', verticalAlign: 'middle' }}><span className="t-price text-white font-bold">{result.cashRatio.toFixed(2)}%</span></td>
                      <td data-label="LIMITE AUTORISÉE" style={{ padding: '1rem', verticalAlign: 'middle' }}><span className="mono-tiny text-slate-500 bg-slate-800 px-2 py-1 rounded">MAX 33%</span></td>
                      <td data-label="STATUT" style={{ padding: '1rem', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div className={`inline-block pnl-hero-pill ${result.cashRatio <= 33 ? 'bull' : 'bear'}`}>
                          <span className="pnl-percentage font-bold">{result.cashRatio <= 33 ? 'CONFORME' : 'DÉPASSÉ'}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* MOBILE TABLE CARDS */}
              <div className="mobile-only-container gap-3 mb-8">
                {[
                  { label: "Revenus Illicites", val: result.purificationRate, limit: 5, tip: "AAOIFI: Max 5% des revenus totaux" },
                  { label: "Endettement Bancaire", val: result.debtRatio, limit: 33, tip: "AAOIFI: Max 33% de la capitalisation boursière" },
                  { label: "Trésorerie Placée", val: result.cashRatio, limit: 33, tip: "AAOIFI: Max 33% de la capitalisation boursière" }
                ].map((metric, i) => {
                  const isOk = metric.val <= metric.limit;
                  return (
                    <div key={i} className="live-market-mobile-card p-4 bg-slate-900/50 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="stock-titles">
                          <span className="stock-symbol-title font-bold text-white flex items-center gap-1">{metric.label} <span title={metric.tip} className="cursor-help opacity-50 hover:opacity-100 text-xs">ℹ️</span></span>
                          <span className="mono-tiny text-slate-500">MAX {metric.limit}%</span>
                        </div>
                        <div className="price-hero-block flex flex-col items-end">
                          <div className="hero-price font-bold mono text-lg">{metric.val.toFixed(2)}%</div>
                          <div className={`pnl-hero-pill mt-1 px-2 py-0.5 rounded text-xs font-bold ${isOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {isOk ? 'CONFORME' : 'DÉPASSÉ'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. CALCULATEUR D'AUMÔNE */}
              {canCalculate && <div className="glass p-6 rounded-2xl bg-slate-900 border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Coins size={18} />
                    <span className="font-bold tracking-wide">CALCULATEUR DE PURIFICATION</span>
                  </div>
                  <button onClick={copyToClipboard} className="action-btn-terminal white" style={{ padding: '6px 12px', fontSize: '11px', height: 'auto' }}>
                    {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    <span>{copied ? 'COPIÉ' : 'COPIER RÉSULTAT'}</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="mono-tiny text-slate-400">MON DIVIDENDE REÇU (MAD)</label>
                      <div className="flex items-center gap-1 bg-slate-800 rounded px-1 py-0.5">
                        <button onClick={() => setDividendType('BRUT')} className={`text-[10px] px-2 py-0.5 rounded font-bold ${dividendType === 'BRUT' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>BRUT</button>
                        <button onClick={() => setDividendType('NET')} className={`text-[10px] px-2 py-0.5 rounded font-bold ${dividendType === 'NET' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>NET</button>
                      </div>
                    </div>
                    <input 
                      type="number" 
                      value={dividendAmount} 
                      onChange={e => setDividendAmount(e.target.value)}
                      placeholder="Ex: 6024"
                      className="terminal-input"
                      style={{ fontSize: '1.5rem', fontWeight: 800, padding: '1rem', width: '100%', borderRadius: '0.75rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                    />
                    {dividendType === 'NET' && (
                      <p className="text-[10px] text-amber-500 mt-2 leading-tight">
                        <AlertTriangle size={10} className="inline mr-1" />
                        La majorité des comités Sharia exigent de purifier sur la base du dividende <strong>BRUT</strong> (avant retenue à la source).
                      </p>
                    )}
                  </div>

                  <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-500 font-bold text-xs uppercase tracking-wider block mb-1">PART HALAL CONSERVÉE ({(100 - result.purificationRate).toFixed(2)}%)</span>
                    <span className="mono text-2xl font-black text-white">
                      +{halalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-slate-400">MAD</span>
                    </span>
                  </div>

                  <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-rose-500 font-bold text-xs uppercase tracking-wider block mb-1">À PURIFIER / AUMÔNE ({result.purificationRate.toFixed(2)}%)</span>
                    <span className="mono text-2xl font-black text-rose-500">
                      -{purificationAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-rose-500/50">MAD</span>
                    </span>
                    <p className="text-[10px] text-rose-400/70 mt-2 italic">*Arrondi à l'unité supérieure par précaution religieuse</p>
                  </div>
                </div>
              </div>}

            </div>
          )}
</div>
      </main>

      <BottomNav />
    </div>
  );
}
