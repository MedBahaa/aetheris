'use client';

import { useState, useEffect, useTransition, useRef, Suspense } from 'react';
import { Search, Loader2, Sparkles, Activity, Zap, ShieldCheck, Menu, AlertCircle, X, Globe, RefreshCcw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

import AnalysisReport from '@/components/AnalysisReport';
import TechnicalReport from '@/components/TechnicalReport';
import StrategyReport from '@/components/StrategyReport';
import FundamentalReport from '@/components/FundamentalReport';
import OrchestratorReport from '@/components/OrchestratorReport';
import Header from '@/components/Header';
import { CompanyAnalysis, AgentType } from '@/lib/agent-engine';

import { analyzeCompanyAction } from '@/lib/actions';
import { HistoryService } from '@/lib/history-service';

/**
 * Wrapper avec Suspense boundary — requis par Next.js 16 pour useSearchParams()
 * Sans ce wrapper, le build production échoue avec "Missing Suspense boundary"
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Home />
    </Suspense>
  );
}

function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [activeAgent, setActiveAgent] = useState<AgentType>('STRATEGY');
  const [history, setHistory] = useState<CompanyAnalysis[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Suggestion State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // ✅ Utilisation de Transition pour les Server Actions
  const [isPending, startTransition] = useTransition();

  // ✅ Lecture du paramètre d'agent initial
  const searchParams = useSearchParams();
  
  const autoSearchDone = useRef(false);

  useEffect(() => {
    const agentParam = searchParams.get('agent') as AgentType;
    const qParam = searchParams.get('q');

    if (agentParam && ['SENTIMENT', 'TECHNICAL', 'FUNDAMENTAL', 'STRATEGY'].includes(agentParam)) {
      setActiveAgent(agentParam);
    }

    if (qParam && !autoSearchDone.current) {
      autoSearchDone.current = true;
      setQuery(qParam);
      
      // Auto-trigger search after a short delay
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSearch(fakeEvent, qParam, false, agentParam);
      }, 100);
    }
  }, [searchParams]);

  useEffect(() => {
    setHistory(HistoryService.getFilteredHistory(activeAgent));
  }, [activeAgent]);


  // Scroll automatique des logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // ✅ Auto-fetch suggestions
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(query)}`);
        const contentType = res.headers.get('content-type');

        if (!res.ok || !contentType?.includes('application/json')) {
          console.error(`[SearchAPI] Invalid response: status=${res.status}, type=${contentType}`);
          setSuggestions([]);
          return;
        }

        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error("Search API Error:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // ✅ Click Outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeSearch = (ticker: string, forceRefresh: boolean = false) => {
    setQuery(ticker);
    setShowSuggestions(false);
    
    // Simulate form submission
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSearch(fakeEvent, ticker, forceRefresh);
  };

  const handleSearch = async (e: React.FormEvent, overrideQuery?: string, forceRefresh: boolean = false, overrideAgent?: AgentType) => {
    e.preventDefault();
    const finalQuery = (overrideQuery || query).toUpperCase().trim();
    if (!finalQuery || isPending) return;

    const agentToUse = overrideAgent || activeAgent;

    setLoading(true);
    setAnalysis(null); // On vide l'analyse pour laisser place au terminal
    setError(null);
    setActiveId(undefined);
    setShowSuggestions(false);
    setTerminalLogs([`> INITIALISATION DU MOTEUR POUR : ${finalQuery}`, `> ÉTABLISSEMENT DE LA CONNEXION SÉCURISÉE...`]);
    
    const steps = agentToUse === 'SENTIMENT' 
      ? ['RÉCUPÉRATION DES FLUX RSS', 'EXTRACTION DES NEWS BOURSIÈRES', 'TRAITEMENT DES SOURCES', 'ANALYSE SENTIMENTALE IA EN COURS']
      : agentToUse === 'TECHNICAL'
      ? ['CONNEXION AU MARCHÉ LIVE', 'RÉCUPÉRATION DES COURS HISTORIQUES', 'CALCUL DES INDICATEURS TECHNIQUES', 'GÉNÉRATION DES RETRACEMENTS']
      : ['LIAISON MULTI-AGENTS OK', 'RÉCUPÉRATION DES DONNÉES MARCHÉ', 'SCRAPING DES NEWS INSTITUTIONNELLES', 'CALCUL DES POINTS PIVOTS', 'AGENTS NEWS OPÉRATIONNELS', 'AGENTS MARCHÉ PRÊTS', 'SYNTHÈSE IA ÉLITE EN COURS'];

    // Simulation visuelle des étapes
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setTerminalLogs(prev => [...prev, `> ${steps[stepIdx]}`]);
        stepIdx++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    startTransition(async () => {
      try {
        // ✅ APPEL DE LA SERVER ACTION AVEC FORCEREFRESH
        const result = await analyzeCompanyAction(finalQuery, agentToUse, forceRefresh);
        
        // Logs de fin
        setTerminalLogs(prev => [...prev, `> VALIDATION DES DONNÉES TERMINÉE`, `> SYNTHÈSE CALCULÉE AVEC SUCCÈS`, `> GÉNÉRATION DU RAPPORT EN COURS...`]);
        
        setTimeout(() => {
          clearInterval(interval);
          setAnalysis(result);
          setActiveId(result.id);
          
          // ✅ PERSISTANCE CÔTÉ CLIENT
          HistoryService.saveToHistory(result);
          setHistory(HistoryService.getFilteredHistory(agentToUse));
          setQuery('');
          setLoading(false);
        }, 500);

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Une erreur est survenue lors de l'analyse.");
        setLoading(false);
        clearInterval(interval);
      }
    });
  };

  const handleSelectFromHistory = (a: CompanyAnalysis) => {
    setAnalysis(a);
    setActiveId(a.id);
  };

  return (
    <div className="app-container">
      <Sidebar 
        history={history} 
        onSelect={handleSelectFromHistory} 
        activeId={activeId}
        activeAgent={activeAgent}
        onAgentChange={(type) => { 
          setActiveAgent(type); 
          setAnalysis(null); 
          setActiveId(undefined); 
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <Header onOpenSidebar={() => setIsSidebarOpen(true)} />

      <main className="main-content">
        <div className="dashboard-container">

          
          {/* INSTITUTIONAL_SEARCH_CONSOLE */}
          <div className="search-console-wrapper animate-fade-in" ref={searchRef}>
            <form onSubmit={handleSearch} className="terminal-search-form glass-heavy">
              <div className="input-terminal-group">
                <Search className="search-symbol" size={18} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedIndex(prev => Math.max(prev - 1, -1));
                    } else if (e.key === 'Enter' && selectedIndex >= 0 && suggestions[selectedIndex]) {
                      e.preventDefault();
                      executeSearch(suggestions[selectedIndex].symbol);
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false);
                    }
                  }}
                  placeholder={`RECHERCHER UN ACTIF (${activeAgent === 'STRATEGY' ? 'STRATÉGIE' : activeAgent === 'SENTIMENT' ? 'SENTIMENTS' : 'TECHNIQUE'})...`}
                  className="terminal-input"
                  spellCheck="false"
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className={`action-btn-terminal ${activeAgent.toLowerCase()}`}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : (activeAgent === 'STRATEGY' ? <Sparkles size={16} /> : <Zap size={16} />)}
                <span>
                  {activeAgent === 'SENTIMENT' ? 'Historique Sentiments' : 
                   activeAgent === 'TECHNICAL' ? 'Historique Technique' : 
                   activeAgent === 'FUNDAMENTAL' ? 'Historique Fondamentaux' : 
                   'Historique Stratégies'}
                </span>
              </button>
            </form>

            <div className="input-glow-bar"></div>

            {/* SUGGESTION_DROPDOWN */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestion-dropdown glass-heavy animate-slide-up">
                <div className="suggestion-header">
                  <Globe size={10} className="text-dim" />
                  <span className="mono text-dim">RÉSULTATS DE RECHERCHE [{suggestions.length}]</span>
                </div>
                <div className="suggestion-list">
                  {suggestions.map((item, index) => (
                    <div 
                      key={index}
                      className={`suggestion-item ${selectedIndex === index ? 'active' : ''}`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => executeSearch(item.symbol)}
                    >
                      <div className="item-main">
                        <span className="item-symbol mono">{item.symbol}</span>
                        <span className="item-name truncate">{item.name}</span>
                      </div>
                      <div className="item-meta">
                        <span className="item-sector mono">{item.sector}</span>
                        <div className={`sector-dot ${activeAgent.toLowerCase()}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Display */}
          <div className="display-area">
            {error && (
              <div className={`error-banner glass-heavy ${error.includes('quota') ? 'quota' : ''} animate-fade-in`}>
                <div className="error-icon">
                  <AlertCircle size={24} />
                </div>
                <div className="error-content">
                  <h4>{error.includes('quota') ? 'Limite de Capacité Atteinte' : 'Une erreur est survenue'}</h4>
                  <p>{error}</p>
                </div>
                <button className="close-error" onClick={() => setError(null)}>
                  <X size={18} />
                </button>
              </div>
            )}

            {loading && !analysis ? (
              <div className="terminal-system-loader glass-heavy animate-fade-in">
                <div className="terminal-header">
                  <div className="term-circles">
                    <div className="circle red"></div>
                    <div className="circle yellow"></div>
                    <div className="circle green"></div>
                  </div>
                  <span className="mono text-xs">MOTEUR AETHERIS CORE</span>
                </div>
                <div className="terminal-body" ref={logContainerRef}>
                  {terminalLogs.map((log, i) => (
                    <div key={i} className={`log-line mono ${i === terminalLogs.length - 1 ? 'current' : ''}`}>
                      {log}
                    </div>
                  ))}
                  <div className="terminal-cursor"></div>
                </div>
                <div className="loader-meta-group">
                  <div className="progress-bar-container">
                    <div className={`p-bar-fill ${activeAgent.toLowerCase()}`}></div>
                  </div>
                </div>
              </div>
            ) : analysis ? (
              <div className="report-root animate-fade-in" style={{ position: 'relative' }}>
                <button 
                  className="global-refresh-btn glass"
                  onClick={() => executeSearch(analysis.companyName, true)}
                  title="Rafraîchir l'analyse (Bypasser le cache)"
                >
                  <RefreshCcw size={14} className="text-emerald" />
                  <span className="mono">ACTUALISER</span>
                </button>

                {analysis.isPremiumSignal && (
                  <div className="convergence-alert-box animate-pulse glass">
                    <div className="alert-side-accent"></div>
                    <Zap size={18} className="text-emerald" />
                    <div className="alert-diag-body">
                      <strong>CONVERGENCE DE SIGNAUX DÉTECTÉE</strong>
                      <span className="mono text-xs">SCORE SENTIMENT IA ({analysis.globalScore?.toFixed(2)}) & INDICATEURS TECHNIQUES VALIDÉS</span>
                    </div>
                  </div>
                )}
                
                {analysis.type === 'SENTIMENT' && <AnalysisReport analysis={analysis} />}
                {analysis.type === 'TECHNICAL' && <TechnicalReport analysis={analysis} />}
                {analysis.type === 'FUNDAMENTAL' && <FundamentalReport analysis={analysis} />}
                {analysis.type === 'STRATEGY' && <StrategyReport analysis={analysis} />}
              </div>
            ) : (
              <div className="empty-state-terminal">
                <div className="grid-watermark"></div>
                
                <div className="landing-title-group">
                  <h2 className="terminal-h1">AETHERIS</h2>
                  <div className="terminal-h2-group">
                     <span className="mono">SYSTÈME OPÉRATIONNEL | VERSION 2.0</span>
                     <div className="status-blink active"></div>
                  </div>
                </div>

                <div className="feature-terminal-grid">
                   {[
                     { label: 'STRATÉGIE ALPHA', icon: <ShieldCheck size={18}/> },
                     { label: 'ANALYSE NARRATIVE', icon: <Zap size={18}/> },
                     { label: 'FLUX QUANTITATIF', icon: <Activity size={18}/> }
                   ].map((item, i) => (
                     <div key={i} className="terminal-f-card glass">
                       <div className="f-icon-box">{item.icon}</div>
                       <span className="f-label mono">{item.label}</span>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .mobile-header-tech { display: none; }
        .mono { font-family: 'JetBrains Mono', monospace; font-size: 10px; }
        .bold { font-weight: 850; }

        .dashboard-container { width: 100%; max-width: var(--max-width); margin: 0 auto; padding: 2rem 1.5rem; }

        
        /* Search Console */
        .search-console-wrapper { margin-bottom: 5rem; position: relative; }
        .terminal-search-form { display: flex; align-items: stretch; gap: 1rem; padding: 0.5rem; border-radius: 1rem; position: relative; z-index: 2; transition: all 0.4s var(--ease); }
        .terminal-search-form:focus-within { border-color: rgba(16, 185, 129, 0.3); box-shadow: 0 0 30px rgba(16, 185, 129, 0.1); }
        
        .input-glow-bar { position: absolute; bottom: -1px; left: 10%; right: 10%; height: 1px; background: linear-gradient(to right, transparent, var(--accent-emerald), transparent); opacity: 0.3; filter: blur(2px); }

        .input-terminal-group { display: flex; align-items: center; gap: 1.25rem; flex: 1; padding: 0 1.25rem; }
        .search-symbol { color: #475569; }
        .terminal-input { background: none; border: none; color: var(--text-main); width: 100%; outline: none; font-family: 'Inter', sans-serif; font-weight: 500; font-size: 0.95rem; padding: 0.75rem 0; letter-spacing: -0.01em; }
        .terminal-input::placeholder { color: var(--text-dim); font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; letter-spacing: 0.05rem; }

        
        .action-btn-terminal { display: flex; align-items: center; gap: 0.75rem; padding: 0 1.75rem; border-radius: 0.6rem; border: none; font-size: 10px; font-weight: 950; letter-spacing: 0.15rem; cursor: pointer; transition: all 0.3s var(--ease); font-family: 'JetBrains Mono', monospace; }
        .action-btn-terminal.strategy { background: #fff; color: #000; }
        .action-btn-terminal.sentiment { background: var(--accent-emerald); color: #000; }
        .action-btn-terminal.technical { background: var(--accent-blue); color: #000; }
        .action-btn-terminal:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
        
        .suggestion-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.75rem;
          z-index: 100;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        }
        .suggestion-header {
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.01);
        }
        .text-dim { color: #475569; font-size: 8px; font-weight: 900; }
        
        .suggestion-list { max-height: 400px; overflow-y: auto; }
        .suggestion-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          cursor: pointer;
          transition: all 0.2s var(--ease);
          border-left: 3px solid transparent;
        }
        .suggestion-item:hover, .suggestion-item.active {
          background: rgba(255, 255, 255, 0.03);
          border-left-color: var(--accent-emerald);
        }
        
        .item-main { display: flex; align-items: center; gap: 1.25rem; flex: 1; }
        .item-symbol { font-size: 0.8rem; font-weight: 900; color: #64748b; width: 65px; }
        .item-name { font-size: 0.9rem; color: #f8fafc; font-weight: 600; font-family: 'Inter', sans-serif; letter-spacing: -0.01em; }
        .item-meta { display: flex; align-items: center; gap: 1rem; }
        .item-sector { font-size: 9px; color: #334155; font-weight: 700; letter-spacing: 0.05rem; }
        .sector-dot { width: 4px; height: 4px; border-radius: 50%; opacity: 0.5; }
        .sector-dot.strategy { background: var(--accent-blue); }
        .sector-dot.sentiment { background: var(--accent-emerald); }
        .sector-dot.technical { background: var(--accent-cyan); }

        .display-area { min-height: 500px; width: 100%; display: flex; flex-direction: column; justify-content: flex-start; position: relative; }
        
        .error-banner { display: flex; align-items: flex-start; gap: 1.5rem; padding: 1.75rem; margin-bottom: 3rem; border-radius: 1.5rem; position: relative; }
        .error-banner.quota { border-color: rgba(245, 158, 11, 0.3); }
        .error-icon { color: #f43f5e; }
        .error-content h4 { color: #fff; font-size: 1rem; font-weight: 800; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif; }
        .error-content p { color: #94a3b8; font-size: 0.85rem; line-height: 1.6; font-family: 'Inter', sans-serif; }
        
        /* Global Refresh Button */
        .global-refresh-btn { position: absolute; top: -1rem; right: 0; padding: 0.5rem 1rem; border-radius: 100px; border: 1px solid var(--border-glass); background: rgba(15, 23, 42, 0.4); display: flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: all 0.3s var(--ease); z-index: 10;}
        .global-refresh-btn:hover { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); transform: translateY(-2px); }
        .global-refresh-btn .mono { font-size: 9px; font-weight: 800; color: #fff; }

        /* Terminal Loader Improved */
        .terminal-system-loader { width: 100%; max-width: 600px; margin: 4rem auto; border-radius: 0.75rem; overflow: hidden; border: 1px solid var(--border-glass); box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        .terminal-header { background: rgba(255,255,255,0.03); padding: 0.75rem 1rem; display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid var(--border-glass); }
        .term-circles { display: flex; gap: 0.4rem; }
        .circle { width: 8px; height: 8px; border-radius: 50%; opacity: 0.6; }
        .circle.red { background: #ff5f56; }
        .circle.yellow { background: #ffbd2e; }
        .circle.green { background: #27c93f; }
        
        .terminal-body { padding: 1.5rem; height: 300px; overflow-y: auto; background: rgba(0,0,0,0.2); position: relative; scroll-behavior: smooth; }
        .terminal-body::-webkit-scrollbar { width: 4px; }
        .terminal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        
        .log-line { color: var(--text-dim); font-size: 11px; margin-bottom: 0.5rem; line-height: 1.4; opacity: 0.8; }
        .log-line.current { color: var(--text-main); opacity: 1; border-left: 2px solid var(--accent-emerald); padding-left: 0.5rem; }

        
        .terminal-cursor { width: 8px; height: 14px; background: var(--accent-emerald); display: inline-block; vertical-align: middle; animation: blink 1s step-end infinite; margin-left: 4px; }
        
        .loader-meta-group { padding: 1rem; background: rgba(255,255,255,0.01); }
        .progress-bar-container { height: 2px; width: 100%; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
        .p-bar-fill { height: 100%; transition: width 0.3s var(--ease); box-shadow: 0 0 10px currentColor; }
        .p-bar-fill.strategy { background: var(--accent-blue); width: 100%; animation: load-progress 15s linear; }
        .p-bar-fill.sentiment { background: var(--accent-emerald); width: 100%; animation: load-progress 10s linear; }
        .p-bar-fill.technical { background: var(--accent-cyan); width: 100%; animation: load-progress 12s linear; }

        @keyframes load-progress { from { width: 0%; } to { width: 95%; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        /* Empty State */
        .empty-state-terminal { position: relative; padding: 4rem 0 8rem; display: flex; flex-direction: column; align-items: center; gap: 6rem; }
        .grid-watermark { position: absolute; inset: -100px; background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0); background-size: 40px 40px; pointer-events: none; opacity: 0.5; }
        
        .landing-title-group { text-align: center; z-index: 1; transition: transform 0.8s var(--ease); }
        .empty-state-terminal:hover .landing-title-group { transform: scale(1.02); }
        .terminal-h1 { font-family: 'Outfit', sans-serif; font-size: 7.5rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.06em; line-height: 0.9; margin: 0; filter: drop-shadow(0 0 30px rgba(16, 185, 129, 0.1)); }
        .terminal-h2-group { display: flex; align-items: center; justify-content: center; gap: 1.5rem; color: var(--text-dim); margin-top: 1rem; }
        .status-blink.active { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-emerald); box-shadow: 0 0 10px var(--accent-emerald); }


        .feature-terminal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; width: 100%; max-width: 900px; z-index: 1; }
        .terminal-f-card { background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); padding: 2rem; border-radius: 1.25rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; transition: all 0.4s var(--ease); }
        .terminal-f-card:hover { background: rgba(255,255,255,0.03); transform: translateY(-5px); border-color: rgba(255,255,255,0.1); }
        .f-icon-box { color: #1e293b; transition: color 0.3s; }
        .terminal-f-card:hover .f-icon-box { color: #fff; }
        .f-label { font-size: 10px; color: #475569; font-weight: 900; letter-spacing: 0.15rem; }

        .background-sync-indicator { display: flex; align-items: center; gap: 1.25rem; padding: 0.85rem 1.5rem; border-radius: 100px; margin-bottom: 3rem; align-self: center; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
        
        @media (max-width: 768px) {
          .terminal-h1 { font-size: 4rem; }
          .feature-terminal-grid { grid-template-columns: 1fr; }
          .dashboard-container { padding: 1rem; }
        }
      `}</style>
    </div>
  );
}
