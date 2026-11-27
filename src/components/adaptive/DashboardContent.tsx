'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, Loader2, Sparkles, Activity, Zap, ShieldCheck, 
  AlertCircle, X, Globe, RefreshCcw, Landmark, Briefcase, Scale, ArrowRight,
  TrendingUp, ChevronRight, XCircle, FileDown, History, Keyboard
} from 'lucide-react';
import Link from 'next/link';
import AnalysisReport from '@/components/AnalysisReport';
import TechnicalReport from '@/components/TechnicalReport';
import StrategyReport from '@/components/StrategyReport';
import FundamentalReport from '@/components/FundamentalReport';
import RegulatoryDisclaimer from '@/components/RegulatoryDisclaimer';
import { getRecentAiSignals, type TrackedAiSignal } from '@/lib/signal-tracker';
import { downloadAgentReportPdf } from '@/lib/pdf-export-service';
import { DashboardProps } from '@/types/dashboard';

const AGENT_CAPABILITIES: Record<'STRATEGY' | 'TECHNICAL' | 'FUNDAMENTAL' | 'SENTIMENT', { title: string; subtitle: string; bullets: string[] }> = {
  STRATEGY: {
    title: 'Orchestrateur Alpha Multi-Agents',
    subtitle: 'Synthèse complète décisionnelle (Acheter / Attendre / Vendre)',
    bullets: ['Croisement Sentiment + Technique + Fondamentaux', 'Take-Profit, Stop-Loss & Risk/Reward validés', 'Scénarios multi-horizons (CT / MT / LT)'],
  },
  TECHNICAL: {
    title: 'Moteur Quantitatif & Pivots',
    subtitle: 'Structure de prix, momentum et seuils clés BVC',
    bullets: ['RSI (14), MACD, Bandes de Bollinger & MMS réelles', 'Points Pivots sur OHLC intraday ou plage glissante', 'Retracements Fibonacci & alerte liquidité'],
  },
  FUNDAMENTAL: {
    title: 'Audit Fondamental CSEMA',
    subtitle: 'Valorisation intrinsèque, multiples et rentabilité',
    bullets: ['PER, Rendement Dividende & Capitalisation en MAD', 'CROISSANCE CA, Marge nette, ROE & Bénéfices', 'Source tracking multi-sources (TradingView / Casabourse / BMCE)'],
  },
  SENTIMENT: {
    title: 'Veille Narrative & Flux Presse',
    subtitle: 'Surveillance AMMC, presse économique et dépêches BVC',
    bullets: ['Tri chronologique & dédoublonnage Jaccard multi-RSS', 'Filtrage strict par émetteur et alias officiels', 'Scoring pondéré par fiabilité de source'],
  },
};

export default function DashboardContent(props: DashboardProps) {
  const {
    query, setQuery, loading, analysis, activeAgent, history, terminalLogs, error, setError,
    suggestions, showSuggestions, setShowSuggestions, selectedIndex, setSelectedIndex,
    handleSearch, executeSearch, handleSelectFromHistory, searchRef, logContainerRef, setActiveAgent, handleAgentChange
  } = props;

  const activeMeta = AGENT_CAPABILITIES[activeAgent];
  const [recentSignals, setRecentSignals] = useState<TrackedAiSignal[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    setRecentSignals(getRecentAiSignals());
  }, [analysis]);

  const handleExportPdf = async () => {
    if (!analysis || exportingPdf) return;
    try {
      setExportingPdf(true);
      await downloadAgentReportPdf(analysis);
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      setError(err?.message || 'Erreur lors de la génération du fichier PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* AGENT SELECTOR STRIP */}
      <div className="agent-switcher-strip animate-fade-in no-print" role="tablist" aria-label="Sélectionner l'agent d'analyse IA">
        {[
          { id: 'STRATEGY' as const, label: 'Stratégie', icon: Sparkles },
          { id: 'TECHNICAL' as const, label: 'Technique', icon: TrendingUp },
          { id: 'FUNDAMENTAL' as const, label: 'Fondamentaux', icon: Landmark },
          { id: 'SENTIMENT' as const, label: 'Sentiment', icon: Globe },
        ].map((ag) => {
          const Icon = ag.icon;
          const isActive = activeAgent === ag.id;
          return (
            <button
              key={ag.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleAgentChange ? handleAgentChange(ag.id) : setActiveAgent(ag.id)}
              className={`agent-switch-pill ${ag.id.toLowerCase()} ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} />
              <span>{ag.label}</span>
            </button>
          );
        })}
      </div>

      {/* INSTITUTIONAL SEARCH CONSOLE */}
      <div className="search-console-wrapper animate-fade-in no-print" ref={searchRef}>
        <form onSubmit={(e) => handleSearch(e, undefined, false)} className="terminal-search-form glass-heavy">
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
              placeholder={`RECHERCHER UN ACTIF MASI (ex: ATW, IAM, BCP)...`}
              className="terminal-input"
              spellCheck="false"
              disabled={loading}
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
            disabled={loading}
            className={`action-btn-terminal ${activeAgent.toLowerCase()}`}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : (activeAgent === 'STRATEGY' ? <Sparkles size={16} /> : <Zap size={16} />)}
            <span className="btn-label-text">
              {activeAgent === 'SENTIMENT' ? 'Analyse Sentiment' : 
               activeAgent === 'TECHNICAL' ? 'Analyse Technique' : 
               activeAgent === 'FUNDAMENTAL' ? 'Analyse Fondamentale' : 
               'Lancer Stratégie'}
            </span>
          </button>
        </form>

        <div className="input-glow-bar"></div>



        {/* SUGGESTION DROPDOWN */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestion-dropdown glass-heavy animate-slide-up">
            <div className="suggestion-header">
              <Globe size={12} className="text-dim" />
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

      {/* DYNAMIC DISPLAY AREA */}
      <div className="display-area">
        {error && (
          <div className={`error-banner glass-heavy ${typeof error === 'string' && error.includes('quota') ? 'quota' : ''} animate-fade-in`}>
            <div className="error-icon">
              <AlertCircle size={24} />
            </div>
            <div className="error-content">
              <h4>{typeof error === 'string' && error.includes('quota') ? 'Limite de Capacité Atteinte' : 'Une erreur est survenue'}</h4>
              <p>{typeof error === 'string' ? error : JSON.stringify(error)}</p>
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
                <span className="circle-pulse"></span>
                <span className="mono term-status-txt">MOTEUR ACTIF</span>
              </div>
              <span className="mono term-agent-tag">{activeAgent} AGENT</span>
            </div>
            
            <div className="terminal-content-grid">
              {/* Left Column: Terminal Logs */}
              <div className="terminal-logs-column">
                <div className="terminal-body" ref={logContainerRef}>
                  {terminalLogs.filter(log => log && log.trim().length > 0).map((log, i, arr) => {
                    const isLast = i === arr.length - 1;
                    const isValidation = typeof log === 'string' && (log.includes('VALIDATION') || log.includes('SYNTHÈSE') || log.includes('SUCCÈS') || log.includes('RAPPORT'));
                    return (
                      <div key={i} className={`log-line mono ${isLast ? 'current' : ''} ${isValidation ? 'system-log' : ''}`}>
                        <span className="log-icon">{isLast ? '✦' : '✓'}</span>
                        <span className="log-text">{log}</span>
                      </div>
                    );
                  })}
                  {loading && (
                    <div className="log-line current mono pending-line">
                      <span className="log-icon loading-spin">⚡</span>
                      <span className="log-text">SYNTHÈSE MULTI-SOURCES IA EN COURS...</span>
                      <span className="terminal-cursor"></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Engine stats & scanning animation */}
              <div className="engine-stats-panel">
                <div className="stat-row">
                  <span className="stat-label">AGENT CORE</span>
                  <span className="stat-val stat-val-emerald">{activeAgent}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">LLM ENGINE</span>
                  <span className="stat-val stat-val-muted">GEMINI 3.8 FLASH</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">ENGINE STATUS</span>
                  <span className="stat-val badge-processing">COMPILING</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">CONNECTION</span>
                  <span className="stat-val stat-val-cyan">SECURED SSL</span>
                </div>
                
                <div className="radar-animation-box">
                  <div className="radar-sweep"></div>
                  <span className="radar-text mono">SCANNING MASI DATASTREAM</span>
                </div>
              </div>
            </div>

            <div className="loader-meta-group">
              <div className="progress-info-row">
                <span className="mono progress-meta-dim">GÉNÉRATION DU RAPPORT BOURSIER</span>
                <span className="mono progress-meta-live animate-pulse">ANALYSE SÉCURISÉE</span>
              </div>
              <div className="progress-bar-container">
                <div className={`p-bar-fill ${activeAgent.toLowerCase()}`}></div>
              </div>
            </div>
          </div>
        ) : analysis ? (
          <div className="report-root animate-fade-in">
            <div className="report-toolbar no-print">
              <div className="report-meta-pill mono">
                <span className="meta-dot"></span>
                <span>RAPPORT {analysis.type}</span>
                <span className="meta-sep">•</span>
                <span>{analysis.date}</span>
              </div>

              <div className="report-toolbar-actions">
                <button
                  type="button"
                  className="toolbar-action-btn glass"
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  title="Télécharger le rapport complet en PDF institutionnel"
                >
                  {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                  <span className="mono">{exportingPdf ? 'GÉNÉRATION PDF...' : 'EXPORTER PDF'}</span>
                </button>
                <button 
                  type="button"
                  className="global-refresh-btn glass"
                  onClick={() => executeSearch(analysis.companyName, true)}
                  title="Rafraîchir l'analyse (Bypasser le cache)"
                >
                  <RefreshCcw size={13} className="text-emerald" />
                  <span className="mono">ACTUALISER</span>
                </button>
              </div>
            </div>

            {analysis.isPremiumSignal && (
              <div className="convergence-alert-box animate-pulse glass">
                <div className="alert-side-accent"></div>
                <Zap size={18} className="text-emerald" />
                <div className="alert-diag-body">
                  <strong>CONVERGENCE DE SIGNAUX DÉTECTÉE</strong>
                  <span className="mono convergence-sub">SCORE SENTIMENT IA ({Number(analysis.globalScore || 0).toFixed(2)}) & INDICATEURS TECHNIQUES VALIDÉS</span>
                </div>
              </div>
            )}
            
            {analysis.type === 'SENTIMENT' && <AnalysisReport analysis={analysis} />}
            {analysis.type === 'TECHNICAL' && <TechnicalReport analysis={analysis} />}
            {analysis.type === 'FUNDAMENTAL' && <FundamentalReport analysis={analysis} />}
            {analysis.type === 'STRATEGY' && <StrategyReport analysis={analysis} />}
          </div>
        ) : (
          <div className="console-welcome-grid animate-fade-in">
            {/* LEFT COLUMN: Active Engine Capabilities & MASI Blue-Chips */}
            <div className="welcome-primary-card glass-heavy">
              <div className="welcome-head">
                <div className="welcome-badge mono">
                  <Activity size={13} className="text-emerald" />
                  <span>CONSOLE D&apos;ANALYSE MULTI-AGENTS PRÊTE</span>
                </div>
                <h2 className="welcome-title">{activeMeta.title}</h2>
                <p className="welcome-subtitle">{activeMeta.subtitle}</p>
              </div>

              <div className="welcome-bullets">
                {activeMeta.bullets.map((b, i) => (
                  <div key={i} className="welcome-bullet">
                    <span className="bullet-dot" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="welcome-section-label mono">VALEURS MASI POPULAIRES (LANCEMENT DIRECT)</div>
              <div className="masi-spotlight-grid">
                {[
                  { sym: 'ATW', name: 'Attijariwafa Bank', sector: 'Banques' },
                  { sym: 'IAM', name: 'Maroc Telecom', sector: 'Télécoms' },
                  { sym: 'BCP', name: 'Banque Populaire', sector: 'Banques' },
                  { sym: 'MSA', name: 'Marsa Maroc', sector: 'Ports' },
                  { sym: 'LBV', name: "Label'Vie", sector: 'Distribution' },
                  { sym: 'MNG', name: 'Managem', sector: 'Mines' },
                ].map((item) => (
                  <button
                    key={item.sym}
                    type="button"
                    onClick={() => executeSearch(item.sym)}
                    className="spotlight-stock-card"
                  >
                    <div className="spot-top">
                      <span className="mono spot-sym">{item.sym}</span>
                      <span className="mono spot-sec">{item.sector}</span>
                    </div>
                    <div className="spot-bottom">
                      <span className="spot-name">{item.name}</span>
                      <ArrowRight size={13} className="spot-arrow" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Recent History & Keyboard Shortcuts */}
            <div className="welcome-secondary-stack">
              <div className="welcome-history-card glass-heavy">
                <div className="wh-header">
                  <History size={14} className="text-emerald" />
                  <span className="mono wh-title">ANALYSES RÉCENTES ({activeAgent})</span>
                </div>

                {history && history.length > 0 ? (
                  <div className="wh-list">
                    {history.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectFromHistory(item)}
                        className="wh-item"
                      >
                        <div className="wh-item-left">
                          <span className="wh-company">{item.companyName}</span>
                          <span className="mono wh-date">{item.date}</span>
                        </div>
                        <span className="mono wh-action">OUVRIR →</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="wh-empty">
                    Aucune analyse {activeAgent.toLowerCase()} en mémoire. Lancez une valeur ci-contre pour enregistrer votre journal.
                  </p>
                )}
              </div>

              <div className="welcome-shortcuts-card glass-heavy">
                <div className="wh-header">
                  <Keyboard size={14} className="text-emerald" />
                  <span className="mono wh-title">RACCOURCIS CLAVIER</span>
                </div>
                <div className="shortcuts-list mono">
                  <div className="shortcut-row">
                    <span>Palette de recherche globale</span>
                    <kbd>Ctrl K</kbd>
                  </div>
                  <div className="shortcut-row">
                    <span>Naviguer les suggestions</span>
                    <span><kbd>↑</kbd> <kbd>↓</kbd></span>
                  </div>
                  <div className="shortcut-row">
                    <span>Exécuter l&apos;agent sélectionné</span>
                    <kbd>Entrée</kbd>
                  </div>
                </div>
              </div>

              {recentSignals.length > 0 && (
                <div className="welcome-shortcuts-card glass-heavy">
                  <div className="wh-header">
                    <Sparkles size={14} className="text-emerald" />
                    <span className="mono wh-title">JOURNAL DES SIGNAUX IA RÉCENTS</span>
                  </div>
                  <div className="signals-mini-list">
                    {recentSignals.slice(0, 4).map((sig) => (
                      <button
                        key={sig.id}
                        type="button"
                        onClick={() => executeSearch(sig.symbol)}
                        className="signal-mini-row"
                      >
                        <div className="sig-left">
                          <span className="sig-sym mono">{sig.symbol}</span>
                          <span className="sig-price mono">{sig.priceAtSignal}</span>
                        </div>
                        <span
                          className={`sig-verdict mono ${
                            sig.action === 'ACHETER' ? 'buy' : sig.action === 'VENDRE' ? 'sell' : 'hold'
                          }`}
                        >
                          {sig.action}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <RegulatoryDisclaimer
          compact
          sources={['Gemini 3.8 Flash', 'TradingView CSEMA', 'BMCE Capital Bourse']}
        />
      </div>

      {/* CSS STYLING */}
      <style jsx>{`
        .mono { font-family: 'JetBrains Mono', monospace; font-size: 10px; }
        .dashboard-container { width: 100%; max-width: var(--max-width); margin: 0 auto; }

        /* Agent Switcher Strip */
        .agent-switcher-strip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          margin-bottom: 0.85rem;
          padding-bottom: 2px;
        }
        .agent-switcher-strip::-webkit-scrollbar { display: none; }
        .agent-switch-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          min-height: 40px;
          padding: 0 0.95rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.65);
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .agent-switch-pill.active.strategy { background: rgba(255, 255, 255, 0.14); border-color: rgba(255, 255, 255, 0.35); color: #fff; }
        .agent-switch-pill.active.technical { background: rgba(56, 189, 248, 0.16); border-color: rgba(56, 189, 248, 0.4); color: #38bdf8; }
        .agent-switch-pill.active.fundamental { background: rgba(245, 158, 11, 0.16); border-color: rgba(245, 158, 11, 0.4); color: #fbbf24; }
        .agent-switch-pill.active.sentiment { background: rgba(16, 185, 129, 0.16); border-color: rgba(16, 185, 129, 0.4); color: #34d399; }

        /* Search Console */
        .search-console-wrapper { margin-bottom: 2rem; position: relative; z-index: 50; }
        .terminal-search-form { display: flex; align-items: stretch; gap: 1rem; padding: 0.5rem; border-radius: 1rem; position: relative; z-index: 2; transition: all 0.4s var(--ease); }
        .terminal-search-form:focus-within { border-color: rgba(16, 185, 129, 0.3); box-shadow: 0 0 30px rgba(16, 185, 129, 0.1); }
        
        .input-glow-bar { position: absolute; bottom: -1px; left: 10%; right: 10%; height: 1px; background: linear-gradient(to right, transparent, var(--accent-emerald), transparent); opacity: 0.3; filter: blur(2px); }

        .input-terminal-group { display: flex; align-items: center; gap: 0.75rem; flex: 1; padding: 0 1rem; min-width: 0; }
        .search-symbol { color: #475569; flex-shrink: 0; }
        .terminal-input { background: none; border: none; color: var(--text-main); width: 100%; min-width: 0; outline: none; font-family: 'Inter', sans-serif; font-weight: 500; font-size: 0.95rem; padding: 0.75rem 0; letter-spacing: -0.01em; }
        .terminal-input::placeholder { color: #64748b; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; letter-spacing: 0.05rem; }
        
        .clear-query-btn { background: transparent; border: none; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; transition: color 0.2s; }
        .clear-query-btn:hover { color: #ef4444; }

        .action-btn-terminal { display: flex; align-items: center; gap: 0.75rem; padding: 0 1.75rem; border-radius: 0.6rem; border: none; font-size: 10px; font-weight: 950; letter-spacing: 0.15rem; cursor: pointer; transition: all 0.3s var(--ease); font-family: 'JetBrains Mono', monospace; }
        .action-btn-terminal.strategy { background: #fff; color: #000; }
        .action-btn-terminal.sentiment { background: var(--accent-emerald); color: #000; }
        .action-btn-terminal.technical { background: var(--accent-blue); color: #000; }
        .action-btn-terminal.fundamental { background: #f59e0b; color: #000; }
        .action-btn-terminal:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.4); }

        /* Quick Chips Row */
        .quick-chips-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.85rem;
          overflow-x: auto;
          padding-bottom: 0.35rem;
        }
        .chips-label { color: #475569; font-weight: 800; font-size: 9px; letter-spacing: 0.08rem; flex-shrink: 0; }
        .chips-list { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .chip-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          padding: 0.25rem 0.6rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chip-btn:hover {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.3);
          transform: translateY(-1px);
        }
        .chip-symbol { color: #10b981; font-weight: 900; font-size: 9.5px; }
        .chip-name { color: #94a3b8; font-size: 10.5px; font-weight: 500; }

        /* Suggestions */
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

        /* Display Area */
        .display-area { min-height: 500px; width: 100%; display: flex; flex-direction: column; justify-content: flex-start; position: relative; }
        
        .error-banner { display: flex; align-items: flex-start; gap: 1.5rem; padding: 1.75rem; margin-bottom: 3rem; border-radius: 1.5rem; position: relative; }
        .error-banner.quota { border-color: rgba(245, 158, 11, 0.3); }
        .error-icon { color: #f43f5e; }
        .error-content h4 { color: #fff; font-size: 1rem; font-weight: 800; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif; }
        .error-content p { color: #94a3b8; font-size: 0.85rem; line-height: 1.6; font-family: 'Inter', sans-serif; }
        
        .report-root { position: relative; }
        .report-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }
        .report-meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          font-size: 10.5px;
          font-weight: 700;
        }
        .meta-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-emerald);
          box-shadow: 0 0 8px var(--accent-emerald);
        }
        .meta-sep { opacity: 0.4; }
        .report-toolbar-actions { display: flex; align-items: center; gap: 0.55rem; }
        .toolbar-action-btn, .global-refresh-btn {
          position: static;
          padding: 0.48rem 0.95rem;
          min-height: 36px;
          border-radius: 10px;
          border: 1px solid var(--border-glass);
          background: rgba(15, 23, 42, 0.75);
          color: #f8fafc;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          cursor: pointer;
          transition: all 0.2s var(--ease);
          font-size: 10.5px;
          font-weight: 700;
        }
        .toolbar-action-btn:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.22); }
        .global-refresh-btn:hover { background: rgba(16, 185, 129, 0.14); border-color: rgba(16, 185, 129, 0.4); }
        .convergence-sub { font-size: 11px; color: #cbd5e1; }

        /* 2-Column Desktop Command Center */
        .console-welcome-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 1.35rem;
          margin-top: 0.75rem;
          align-items: start;
        }
        .welcome-primary-card {
          padding: 1.75rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.09);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .welcome-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 10px;
          font-weight: 800;
          color: #34d399;
          letter-spacing: 0.08em;
          margin-bottom: 0.4rem;
        }
        .welcome-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.55rem;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 0.35rem;
          letter-spacing: -0.02em;
        }
        .welcome-subtitle {
          font-size: 0.9rem;
          color: #94a3b8;
          margin: 0;
          line-height: 1.5;
        }
        .welcome-bullets {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.9rem 1rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .welcome-bullet {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.85rem;
          color: #cbd5e1;
        }
        .bullet-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-emerald);
          flex-shrink: 0;
        }
        .welcome-section-label {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.1em;
        }
        .masi-spotlight-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.7rem;
        }
        .spotlight-stock-card {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          padding: 0.85rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
        }
        .spotlight-stock-card:hover {
          background: rgba(16, 185, 129, 0.09);
          border-color: rgba(16, 185, 129, 0.38);
          transform: translateY(-2px);
        }
        .spot-top { display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; }
        .spot-sym { font-size: 12px; font-weight: 900; color: #34d399; }
        .spot-sec { font-size: 9px; color: #94a3b8; }
        .spot-bottom { display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; }
        .spot-name { font-size: 0.82rem; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        :global(.spot-arrow) { color: #64748b; flex-shrink: 0; transition: transform 0.2s ease, color 0.2s ease; }
        .spotlight-stock-card:hover :global(.spot-arrow) { color: #34d399; transform: translateX(2px); }

        .welcome-secondary-stack { display: flex; flex-direction: column; gap: 1.15rem; }
        .welcome-history-card, .welcome-shortcuts-card {
          padding: 1.35rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.09);
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .wh-header { display: flex; align-items: center; gap: 0.55rem; }
        .wh-title { font-size: 10.5px; font-weight: 800; color: #e2e8f0; letter-spacing: 0.08em; }
        .wh-list { display: flex; flex-direction: column; gap: 0.45rem; }
        .wh-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          transition: all 0.18s ease;
          text-align: left;
        }
        .wh-item:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(16, 185, 129, 0.3); }
        .wh-item-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .wh-company { font-size: 0.86rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wh-date { font-size: 10px; color: #94a3b8; }
        .wh-action { font-size: 10px; font-weight: 800; color: #34d399; flex-shrink: 0; }
        .wh-empty { font-size: 0.84rem; color: #94a3b8; line-height: 1.5; margin: 0; }

        .shortcuts-list { display: flex; flex-direction: column; gap: 0.55rem; }
        .shortcut-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; font-size: 11px; color: #94a3b8; }
        .shortcut-row kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 7px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #f8fafc;
          font-size: 10px;
          font-weight: 700;
        }

        /* Terminal System Loader */
        .terminal-system-loader { width: 100%; max-width: 760px; margin: 2.5rem auto; border-radius: 0.75rem; overflow: hidden; border: 1px solid var(--border-glass); box-shadow: 0 30px 60px rgba(0,0,0,0.5); background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(10px); }
        .terminal-header { background: rgba(255,255,255,0.02); padding: 0.85rem 1.25rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-glass); }
        .term-circles { display: flex; align-items: center; gap: 0.6rem; }
        .term-status-txt { font-size: 10px; font-weight: 800; color: var(--accent-emerald); letter-spacing: 0.08em; }
        .term-agent-tag { font-size: 10px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.12em; }
        
        .terminal-content-grid { display: grid; grid-template-columns: 1.8fr 1fr; border-bottom: 1px solid var(--border-glass); }
        .terminal-logs-column { border-right: 1px solid var(--border-glass); background: rgba(0,0,0,0.15); }
        
        .engine-stats-panel { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.85rem; background: rgba(0,0,0,0.25); }
        .stat-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 0.6rem; }
        .stat-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #94a3b8; font-weight: 800; letter-spacing: 0.05rem; }
        .stat-val { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #cbd5e1; }
        .stat-val-emerald { color: var(--accent-emerald); font-weight: 800; text-transform: uppercase; }
        .stat-val-muted { color: #cbd5e1; font-weight: 600; }
        .stat-val-cyan { color: var(--accent-cyan); font-weight: 700; }
        .badge-processing { background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); color: var(--accent-emerald); font-size: 8.5px; font-weight: 900; padding: 0.15rem 0.5rem; border-radius: 4px; letter-spacing: 0.05rem; animation: blink 1.5s infinite; }
        
        .radar-animation-box { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 0.5rem; margin-top: 0.5rem; min-height: 85px; position: relative; overflow: hidden; }
        .radar-sweep { position: absolute; inset: 0; background: linear-gradient(180deg, transparent, rgba(16, 185, 129, 0.05) 50%, transparent); animation: sweep 2s linear infinite; }
        .radar-text { z-index: 1; color: #64748b; font-weight: 900; letter-spacing: 0.1rem; font-size: 8.5px; }
        
        @keyframes sweep { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        
        .terminal-body { padding: 1.5rem; height: 320px; overflow-y: auto; position: relative; scroll-behavior: smooth; }
        .log-line { display: flex; align-items: flex-start; gap: 0.75rem; color: #64748b; font-size: 10.5px; margin-bottom: 0.75rem; line-height: 1.5; }
        .log-icon { color: var(--accent-emerald); font-weight: bold; width: 12px; flex-shrink: 0; }
        .log-text { flex: 1; }
        .log-line.current { color: #f1f5f9; font-weight: 600; }
        .log-line.system-log { color: var(--accent-cyan); }
        .circle-pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-emerald); box-shadow: 0 0 8px var(--accent-emerald); animation: pulse-glow 1.5s infinite; }
        
        .loader-meta-group { padding: 1.25rem 1.5rem; background: rgba(255,255,255,0.01); }
        .progress-info-row { display: flex; justify-content: space-between; margin-bottom: 0.6rem; }
        .progress-meta-dim { font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
        .progress-meta-live { font-size: 9px; color: var(--accent-emerald); font-weight: 700; letter-spacing: 0.08em; }
        .progress-bar-container { height: 3px; width: 100%; background: rgba(255,255,255,0.04); border-radius: 2px; overflow: hidden; }
        .p-bar-fill { height: 100%; transition: width 0.3s var(--ease); }
        .p-bar-fill.strategy { background: var(--accent-blue); width: 100%; animation: load-progress 15s linear; }
        .p-bar-fill.sentiment { background: var(--accent-emerald); width: 100%; animation: load-progress 10s linear; }
        .p-bar-fill.technical { background: var(--accent-cyan); width: 100%; animation: load-progress 12s linear; }
        .p-bar-fill.fundamental { background: #f59e0b; width: 100%; animation: load-progress 12s linear; }

        @media (max-width: 1023px) {
          .console-welcome-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .masi-spotlight-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .welcome-primary-card { padding: 1.2rem; }
        }

        @keyframes load-progress { from { width: 0%; } to { width: 95%; } }

        /* SAAS LANDING MAIN CONTAINER */
        .saas-landing-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding-bottom: 4rem;
        }

        .hero-saas-card {
          padding: 2.5rem;
          border-radius: 1.25rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(59, 130, 246, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          overflow: hidden;
        }

        .hero-top-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.75rem;
          border-radius: 100px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #10b981;
          margin-bottom: 1.25rem;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .hero-title {
          font-family: 'Outfit', sans-serif;
          font-size: 2.5rem;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin-bottom: 1rem;
        }

        .hero-highlight {
          background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 0.95rem;
          color: #94a3b8;
          max-width: 750px;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          font-family: 'Inter', sans-serif;
        }

        .hero-btn-primary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: #000000;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.25s var(--ease);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }
        .hero-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
        }

        .hero-btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s var(--ease);
        }
        .hero-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        .hero-metrics-strip {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          flex-wrap: wrap;
        }

        .h-metric-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .hm-label {
          font-size: 8.5px;
          color: #475569;
          font-weight: 850;
          letter-spacing: 0.08rem;
        }

        .hm-val {
          font-size: 0.9rem;
          font-weight: 800;
          font-family: 'JetBrains Mono', monospace;
        }

        .h-metric-divider {
          width: 1px;
          height: 24px;
          background: rgba(255, 255, 255, 0.08);
        }

        /* SAAS Section Header */
        .saas-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .section-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.1rem;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -0.01em;
          margin: 0;
        }

        .section-sub {
          color: #475569;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08rem;
        }

        /* Services Grid */
        .services-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }

        .service-card {
          padding: 1.5rem;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(13, 17, 23, 0.6);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.3s var(--ease);
        }

        .service-card:hover {
          transform: translateY(-4px);
          border-color: rgba(16, 185, 129, 0.25);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
        }

        .service-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }

        .service-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .service-icon-box.emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .service-icon-box.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
        .service-icon-box.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
        .service-icon-box.purple { background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2); }

        .service-badge {
          font-size: 8px;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05rem;
        }

        .service-badge.emerald { color: #10b981; background: rgba(16, 185, 129, 0.08); }
        .service-badge.blue { color: #3b82f6; background: rgba(59, 130, 246, 0.08); }
        .service-badge.amber { color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
        .service-badge.purple { color: #a855f7; background: rgba(168, 85, 247, 0.08); }

        .service-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.05rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.5rem;
        }

        .service-desc {
          font-size: 0.8rem;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 1.5rem;
          flex: 1;
        }

        .service-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.65rem 1rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .service-btn:hover {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          color: #ffffff;
        }

        /* Agent Showcase Box */
        .agent-showcase-box {
          padding: 1.75rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(9, 13, 22, 0.7);
        }

        .showcase-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }

        .sh-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          color: #ffffff;
          font-size: 1rem;
        }

        .sh-sub { color: #475569; font-size: 8.5px; font-weight: 800; letter-spacing: 0.08rem; }

        .agent-tabs-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        .agent-select-card {
          padding: 1.25rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          text-align: left;
          cursor: pointer;
          transition: all 0.25s;
        }

        .agent-select-card:hover {
          background: rgba(255, 255, 255, 0.04);
          transform: translateY(-2px);
        }

        .agent-select-card.active {
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .ac-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .ac-badge {
          font-size: 7.5px;
          color: #64748b;
          font-weight: 900;
          letter-spacing: 0.05rem;
        }

        .ac-name {
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.35rem;
        }

        .ac-desc {
          font-size: 0.75rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        /* Featured Stocks Box */
        .featured-stocks-box {
          padding: 1.75rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(9, 13, 22, 0.7);
        }

        .fs-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }

        .fs-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .featured-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .featured-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          transition: all 0.2s;
        }

        .featured-card:hover {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.25);
          transform: translateY(-2px);
        }

        .fc-main {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .fc-symbol {
          font-size: 0.9rem;
          font-weight: 900;
          color: #10b981;
        }

        .fc-name {
          font-size: 0.8rem;
          color: #e2e8f0;
          font-weight: 600;
        }

        .fc-action {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .fc-sector {
          font-size: 8px;
          color: #64748b;
          font-weight: 800;
        }

        .fc-go-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          transition: all 0.2s;
        }

        .featured-card:hover .fc-go-btn {
          background: #10b981;
          color: #000000;
        }
        .signals-mini-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          margin-top: 0.5rem;
        }
        .signal-mini-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.5rem 0.65rem;
          border-radius: 0.6rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: #e2e8f0;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .signal-mini-row:hover {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.3);
        }
        .sig-left {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }
        .sig-sym {
          font-size: 11px;
          font-weight: 800;
          color: #ffffff;
        }
        .sig-price {
          font-size: 10.5px;
          color: #94a3b8;
        }
        .sig-verdict {
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 999px;
        }
        .sig-verdict.buy {
          background: rgba(16, 185, 129, 0.14);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .sig-verdict.sell {
          background: rgba(244, 63, 94, 0.14);
          color: #fda4af;
          border: 1px solid rgba(244, 63, 94, 0.3);
        }
        .sig-verdict.hold {
          background: rgba(245, 158, 11, 0.14);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        @media (max-width: 1024px) {
          .services-grid { grid-template-columns: repeat(2, 1fr); }
          .agent-tabs-grid { grid-template-columns: repeat(2, 1fr); }
          .featured-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 1.8rem; }
          .services-grid { grid-template-columns: 1fr; }
          .agent-tabs-grid { grid-template-columns: 1fr; }
          .featured-grid { grid-template-columns: 1fr; }
          .search-console-wrapper { margin-bottom: 1.25rem; }
          .terminal-search-form { flex-direction: column; gap: 0.65rem; padding: 0.5rem; }
          .input-terminal-group { padding: 0 0.75rem; }
          .terminal-input { font-size: 16px; }
          .action-btn-terminal { padding: 0.85rem; min-height: 46px; justify-content: center; width: 100%; }
          .chip-btn { min-height: 38px; padding: 0.35rem 0.75rem; }
          .suggestion-item { min-height: 48px; padding: 0.85rem 1rem; }
          .report-toolbar { justify-content: flex-end; margin-bottom: 0.75rem; }
          .global-refresh-btn { position: static; }
          .terminal-system-loader { margin: 1.5rem auto; }
          .terminal-content-grid { grid-template-columns: 1fr; }
          .terminal-logs-column { border-right: none; border-bottom: 1px solid var(--border-glass); }
          .terminal-body { height: 220px; padding: 1rem; }
          .engine-stats-panel { padding: 1rem; }
          .console-empty-state { padding: 2rem 1.15rem; margin-top: 1rem; }
        }
      `}</style>
    </div>
  );
}

function BrainIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 0 5.61 4 4 0 0 0 2.526 5.77 3 3 0 1 0 5.997.125" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1 0 5.61 4 4 0 0 1-2.526 5.77 3 3 0 1 1-5.997.125" />
      <path d="M12 3v18" />
      <path d="M12 7.5h4" />
      <path d="M12 12h5" />
      <path d="M12 16.5h4" />
      <path d="M8 7.5h4" />
      <path d="M7 12h5" />
      <path d="M8 16.5h4" />
    </svg>
  );
}
