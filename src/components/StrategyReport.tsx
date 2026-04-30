'use client';

import { useState } from 'react';
import { CompanyAnalysis } from '@/lib/agent-engine';
import { ShieldCheck, Crosshair, AlertTriangle, ListFilter, ChevronDown, ChevronUp, BarChart3, Target, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import AnalysisReport from './AnalysisReport';
import TechnicalReport from './TechnicalReport';
import OrchestratorReport from './OrchestratorReport';

interface StrategyReportProps {
  analysis: CompanyAnalysis;
}

const TacticalPlan = ({ plan }: { plan?: string }) => {
  if (!plan) return <p className="tech-card-body">Observation en cours.</p>;

  try {
    if (plan.trim().startsWith('{')) {
      const data = JSON.parse(plan);
      return (
        <div className="tactical-list">
          {data.stopLoss && (
            <div className="tactical-item stop-loss">
              <div className="t-icon"><ArrowDownCircle size={16} /></div>
              <div className="t-content">
                <span className="t-label mono-label">SEUIL DE PROTECTION (STOP LOSS)</span>

                <div className="t-val-container">
                  <span className="t-val mono">{data.stopLoss}</span>
                  <div className="t-badge danger">CRITICAL</div>
                </div>
              </div>
            </div>
          )}
          {data.takeProfit && Array.isArray(data.takeProfit) && (
            <div className="tactical-item take-profit">
              <div className="t-icon"><ArrowUpCircle size={16} /></div>
              <div className="t-content">
                <span className="t-label mono-label">CIBLES D'OBJECTIFS (TAKE PROFIT)</span>

                <div className="tp-list">
                  {data.takeProfit.map((tp: string, i: number) => (
                    <div key={i} className="tp-item mono">
                      <span className="tp-idx">CIBLE {i+1}</span>
                      <span className="tp-val">{tp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
  } catch (e) {
    // Fallback
  }

  return <p className="tech-card-body">{plan}</p>;
};

export default function StrategyReport({ analysis }: StrategyReportProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="strategy-report animate-fade-in">
      {/* Technical Header */}
      <div className="tech-header">
        <div className="tech-header-left">
          <div className="status-indicator">
            <div className="pulse-dot"></div>
            <span className="mono-label text-emerald">FLUX DE DONNÉES TEMPS-RÉEL CRYPTÉ</span>

          </div>
          <h2 className="tech-main-title">
            Stratégie & Arbitrage Alpha : <span className="text-white">{analysis.companyName}</span>

          </h2>
          <div className="tech-meta">
            <div className="meta-pill glass">
              <span className="pill-key">RÉFÉRENCE RAPPORT</span>
              <span className="pill-val mono">#{analysis.id}</span>
            </div>
            <div className="meta-pill glass">
              <span className="pill-key">SYNCHRO TIMESTAMP</span>
              <span className="pill-val mono">{analysis.date}</span>
            </div>
            {analysis.orchestrator?.isAI && (
              <div className="meta-pill ai glass">
                <BarChart3 size={10} />
                <span className="pill-val mono">AETHERIS ENGINE CORE v3</span>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orchestrator Executive Summary */}
      <OrchestratorReport analysis={analysis} />

      {/* Actionable Plan Cards */}
      <div className="tech-plan-grid">
        <div className="tech-card glass-heavy plan">
          <div className="tech-card-glow"></div>
          <div className="tech-card-header">
            <ListFilter size={16} className="indigo-icon" />
            <span className="mono-label">CONFIGURATION TACTIQUE D'EXÉCUTION</span>

          </div>
          <div className="tech-card-body">
            <TacticalPlan plan={analysis.strategyPlan} />
          </div>
        </div>

        <div className="tech-card glass-heavy entry highlight">
          <div className="tech-card-glow"></div>
          <div className="tech-card-header">
            <Crosshair size={16} className="text-emerald" />
            <span className="mono-label">SEUIL D'ENTRÉE QUANTITATIF</span>

          </div>
          <div className="tech-card-body entry-body">
            <span className="price-primary mono">{analysis.idealEntryPoint?.split(' ')[0] || '---'}</span>
            <span className="price-currency">MAD</span>
          </div>
        </div>

        <div className="tech-card glass-heavy risk danger">
          <div className="tech-card-glow"></div>
          <div className="tech-card-header">
            <AlertTriangle size={16} className="rose-icon" />
            <span className="mono-label">ÉVALUATION DE L'EXPOSITION AU RISQUE</span>

          </div>
          <p className="tech-card-body">{analysis.riskExplication}</p>
        </div>
      </div>

      {/* System Drill-down Toggle */}
      <div className="system-explorer">
        <div className="explorer-divider">
          <span className="mono-label opacity-30">CONSOLIDATION ANALYTIQUE MULTI-AGENTS</span>

        </div>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="system-btn glass-heavy"
        >
          <div className="btn-inner">
            <span>{showDetails ? 'RÉDUIRE LA VUE DÉTAILLÉE' : 'DÉCOMPRESSER LES REGISTRES SOURCES'}</span>
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {showDetails && (
          <div className="system-drill-down animate-fade-in">
             <div className="drill-block">
                <header className="drill-header">
                  <div className="header-tag mono-label">MOTEUR VEILLE MARCHÉ & SENTIMENT</div>

                  <h3>Synthèse Fondamentale</h3>
                </header>
                <div className="drill-content glass-heavy">
                   {analysis.news && analysis.news.length > 0 ? (
                      <AnalysisReport analysis={analysis} />
                   ) : (
                      <div className="mono text-center opacity-50 p-8">AUCUNE DONNÉE FONDAMENTALE DISPONIBLE</div>
                   )}
                </div>
             </div>
             <div className="drill-block">
                <header className="drill-header">
                  <div className="header-tag mono-label">ANALYSE TECHNIQUE & QUANTITATIVE</div>

                  <h3>Indicateurs Propriétaires</h3>
                </header>
                <div className="drill-content glass-heavy">
                  <TechnicalReport analysis={analysis} />
                </div>
             </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .strategy-report { display: flex; flex-direction: column; gap: 4rem; width: 100%; padding-bottom: 8rem; max-width: 1400px; margin: 0 auto; }
        
        .mono-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 950; letter-spacing: 0.15rem; text-transform: uppercase; color: #475569; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        /* Tech Header */
        .tech-header { border-bottom: 1px solid var(--border-glass); padding-bottom: 3.5rem; margin-bottom: 1rem; }
        .status-indicator { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .pulse-dot { width: 8px; height: 8px; background: var(--accent-emerald); border-radius: 50%; box-shadow: 0 0 12px var(--accent-emerald); position: relative; }
        .pulse-dot::after { content: ''; position: absolute; width: 100%; height: 100%; background: inherit; border-radius: inherit; animation: pulse 2s infinite; opacity: 0.5; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(3); opacity: 0; } }

        .tech-main-title { font-family: 'Outfit', sans-serif; font-size: 2.25rem; font-weight: 900; color: #475569; letter-spacing: -0.02em; line-height: 1; margin-bottom: 2rem; }
        .text-white { color: #fff; }

        .tech-meta { display: flex; gap: 1rem; flex-wrap: wrap; }
        .meta-pill { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 1.25rem; border-radius: 8px; border: 1px solid var(--border-glass); }
        .meta-pill.ai { border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.03); color: var(--accent-emerald); }
        .pill-key { font-size: 11px; font-weight: 950; color: #334155; letter-spacing: 0.1rem; text-transform: uppercase; }
        .pill-val { font-size: 10px; font-weight: 700; color: #94a3b8; }
        .ai .pill-val { color: var(--accent-emerald); }

        /* Tech Plan Grid */
        .tech-plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        @media (max-width: 1024px) { .tech-plan-grid { grid-template-columns: 1fr; } }

        .tech-card { position: relative; border: 1px solid var(--border-glass); border-radius: 2rem; padding: 2.5rem; overflow: hidden; transition: all 0.4s var(--ease); min-height: 280px; }
        .tech-card:hover { transform: translateY(-8px); border-color: rgba(255,255,255,0.15); box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .tech-card-glow { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.08; pointer-events: none; }
        .plan .tech-card-glow { background: radial-gradient(circle at 0% 0%, #6366f1 0%, transparent 60%); }
        .entry .tech-card-glow { background: radial-gradient(circle at 0% 0%, var(--accent-emerald) 0%, transparent 60%); }
        .risk .tech-card-glow { background: radial-gradient(circle at 0% 0%, #f43f5e 0%, transparent 60%); }

        .tech-card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
        .tech-card-body { font-size: 1.05rem; color: #94a3b8; line-height: 1.7; position: relative; z-index: 1; font-weight: 500; height: 100%; }
        
        /* Tactical Plan Styles */
        .tactical-list { display: flex; flex-direction: column; gap: 2.5rem; }
        .tactical-item { display: flex; gap: 1.5rem; align-items: flex-start; }
        .t-icon { margin-top: 0.25rem; opacity: 0.9; }
        .stop-loss .t-icon { color: #f43f5e; box-shadow: 0 0 15px rgba(244, 63, 94, 0.2); }
        .take-profit .t-icon { color: var(--accent-emerald); box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
        
        .t-content { display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }
        .t-label { color: #334155; opacity: 0.8; display: block; }
        
        .t-val-container { display: flex; align-items: center; gap: 1rem; }
        .t-val { color: #fff; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; }
        
        .t-badge { font-size: 10px; font-weight: 950; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.05rem; }
        .t-badge.danger { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); }
        
        .tp-list { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
        .tp-item { 
          display: flex; 
          align-items: center; 
          gap: 1rem; 
          padding: 0.75rem 1rem; 
          background: rgba(255,255,255,0.02); 
          border-radius: 8px; 
          border: 1px solid rgba(255,255,255,0.03);
          font-size: 0.9rem;
          color: #f8fafc;
        }
        .tp-idx { color: var(--accent-emerald); opacity: 0.5; font-size: 10px; font-weight: 950; letter-spacing: 0.1rem; min-width: 65px; text-transform: uppercase; }
        .tp-val { font-weight: 600; letter-spacing: -0.01em; }

        .entry-body { display: flex; align-items: baseline; gap: 0.75rem; }
        .price-primary { font-size: 3rem; font-weight: 800; color: #fff; letter-spacing: -0.05em; }
        .price-currency { font-size: 10px; font-weight: 900; color: #334155; letter-spacing: 0.1rem; }

        /* System Explorer */
        .system-explorer { display: flex; flex-direction: column; gap: 4rem; margin-top: 5rem; }
        .explorer-divider { width: 100%; height: 1px; background: var(--border-glass); position: relative; display: flex; justify-content: center; align-items: center; }
        .explorer-divider span { background: var(--bg-dark); padding: 0 2rem; }

        .system-btn { 
           align-self: center; 
           background: #fff; border: none; padding: 1px; border-radius: 8px; cursor: pointer; transition: all 0.3s var(--ease); 
           filter: drop-shadow(0 0 15px rgba(255,255,255,0.1));
        }
        .btn-inner { background: #000; color: #fff; padding: 1.25rem 3.5rem; border-radius: 7px; display: flex; align-items: center; gap: 1.5rem; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 950; letter-spacing: 0.2rem; }
        .system-btn:hover { background: var(--accent-emerald); transform: scale(1.05); }
        .system-btn:hover .btn-inner { background: transparent; color: #000; }

        .system-drill-down { display: flex; flex-direction: column; gap: 8rem; padding-top: 5rem; }
        .drill-block { width: 100%; }
        .drill-header { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 3rem; align-items: center; }
        .drill-header h3 { font-family: 'Outfit', sans-serif; font-size: 2.25rem; font-weight: 900; color: #fff; margin: 0; letter-spacing: -0.02em; }
        .drill-content { padding: 4rem; border-radius: 3rem; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.01); }

        .indigo-icon { color: #6366f1; }
        .rose-icon { color: #f43f5e; }
        .text-emerald { color: var(--accent-emerald); }
      `}</style>
    </div>
  );
}
