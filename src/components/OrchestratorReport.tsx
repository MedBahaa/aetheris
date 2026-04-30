'use client';

import { useState } from 'react';
import { CompanyAnalysis } from '@/lib/agent-engine';
import { AlertCircle, CheckCircle2, Zap, ChevronDown, ChevronUp, BarChart3, Newspaper, Activity, ShieldCheck, Target, Crosshair, Clock } from 'lucide-react';
import AetherisChart from './AetherisChart';
import AnalysisReport from './AnalysisReport';
import TechnicalReport from './TechnicalReport';

interface OrchestratorReportProps {
  analysis: CompanyAnalysis;
}

export default function OrchestratorReport({ analysis }: OrchestratorReportProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [activeHorizon, setActiveHorizon] = useState<'shortTerm' | 'mediumTerm' | 'longTerm'>('shortTerm');

  // Unified data access logic
  const horizons = analysis.horizons;
  const data = horizons ? horizons[activeHorizon] : analysis.orchestrator;
  
  if (!data) return null;

  const isBuy = data.finalAction === 'ACHETER';
  const horizonLabel = {
    shortTerm: 'COURT TERME (1-5J)',
    mediumTerm: 'MOYEN TERME (2-4 SEM)',
    longTerm: 'LONG TERME (6-12 MOIS)'
  };

  return (
    <>
      {/* SÉLECTEUR D'HORIZON — Nouveau */}
      <div className="horizon-switcher glass-heavy">
        {(['shortTerm', 'mediumTerm', 'longTerm'] as const).map((h) => (
          <button 
            key={h}
            onClick={() => setActiveHorizon(h)}
            className={`horizon-btn ${activeHorizon === h ? 'active' : ''}`}
          >
            <Clock size={12} />
            <span>{horizonLabel[h].split(' ')[0]}</span>
            <span className="h-sub">{horizonLabel[h].split(' ')[1]}</span>
          </button>
        ))}
      </div>

      {/* BLOC 1 — Résumé Rapide Premium */}
      <div className="hero-stats-new">
        <div className={`recommendation-card glass-heavy ${isBuy ? 'buy' : 'wait'}`}>
          <div className="card-ambient-glow"></div>
          <div className="recommendation-content">
            <div className="expert-header">
              <ShieldCheck size={12} className="expert-icon" />
              <span className="mono-label">DÉCISION EXÉCUTIVE STRATÉGIQUE</span>

            </div>
            
            <div className="badge-row">
              <div className="action-badge-new">
                <span className="badge-bg-text">{data.finalAction}</span>
                <span className="badge-main-text">{data.finalAction}</span>
              </div>
              
              {data.idealEntryPoint && (
                <div className="tactical-badge glass-heavy animate-pulse">
                  <span className="t-label mono-label">SEUIL D'ENTRÉE OPTIMISÉ</span>

                  <span className="t-val mono">{data.idealEntryPoint}</span>
                </div>
              )}

              <div className="rationale-box">
                <p className="why-text">&ldquo;{data.why}&rdquo;</p>
                <div className="expert-seal">
                  {data.isAI ? <BarChart3 size={11} /> : <Zap size={11} />}
                  <span className="mono-label">{data.isAI ? 'ANALYSTE IA SENIOR' : 'MOTEUR AETHERIS CORE'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-heavy gauges-card">
          <div className="gauges-inner">
            <div className="gauge-group">
              <div className="gauge-header">
                <span className="gauge-label mono-label">INDEX DE CONFIANCE ALPHA</span>

                <span className={`gauge-value mono ${analysis.confidenceLevel === 'Élevé' ? 'emerald' : 'amber'}`}>
                  {analysis.confidenceLevel}
                </span>
              </div>
              <div className="segmented-bar">
                {[1, 2, 3, 4, 5].map((seg) => {
                  const isActive = analysis.confidenceLevel === 'Élevé' ? seg <= 5 : seg <= 3;
                  const status = analysis.confidenceLevel === 'Élevé' ? 'emerald' : 'amber';
                  return (
                    <div key={seg} className={`segment ${isActive ? 'active' : ''} ${status}`}></div>
                  );
                })}
              </div>
            </div>

            <div className="gauge-group">
              <div className="gauge-header">
                <span className="gauge-label mono-label">VECTEUR DE RISQUE ESTIMÉ</span>

                <span className={`gauge-value mono ${data.risk === 'Faible' ? 'emerald' : 'amber'}`}>
                  {data.risk}
                </span>
              </div>
              <div className="risk-scale">
                 <div className={`risk-glow-dot ${data.risk === 'Faible' ? 'emerald' : 'amber'}`}></div>
                 <div className="scale-line"></div>
                 <div className="scale-notches">
                    <span className="mono">BAS</span>
                    <span className="mono">MED</span>
                    <span className="mono">HAUT</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BLOC : CONTRADICTION / ALERTE */}
      {data.contradictionDetected && (
        <div className="alert-ribbon glass animate-pulse">
           <AlertCircle size={16} className="amber-icon" />
           <p className="mono-small"><strong>NOTE DE CONTEXTE :</strong> {data.contradictionDetected}</p>
        </div>
      )}

      {/* GRAPHIQUE INTERACTIF */}
      <div className="mb-6">
        <AetherisChart 
          company={analysis.companyName} 
          companyId={analysis.id} 
          isBullish={data.finalAction === 'ACHETER' || analysis.technicalTrend === 'Haussière' || analysis.technicalTrend === 'Haussier'} 
        />
      </div>

      {/* BLOC : TACTICAL SETUP BOARD */}
      <div className="tactical-board-new glass-heavy">
          <div className="board-header">
            <Target size={14} className="emerald-icon" />
            <span className="mono-label">CONFIGURATION TACTIQUE D'EXÉCUTION</span>

            <div className={`horizon-badge glass ${activeHorizon}`}>
               <Clock size={10} />
               <span className="mono">{horizonLabel[activeHorizon]}</span>
            </div>
          </div>
         
         <div className="tactical-grid">
            <div className="t-coord entry">
               <span className="c-label mono-label">SIGNAL D'ENTRÉE</span>

               <div className="val-box">
                  <span className="c-val mono">{data.idealEntryPoint || 'MARKET'}</span>
               </div>
            </div>
            <div className="t-coord tp">
               <span className="c-label mono-label">CIBLE DE PROFIT (TAKE PROFIT)</span>

               <div className="val-box">
                  <span className="c-val mono text-emerald">{data.takeProfit || 'N/A'}</span>
                  <span className="target-tick">▲</span>
               </div>
            </div>
            <div className="t-coord sl">
               <span className="c-label mono-label">ARRÊT DE PROTECTION (STOP LOSS)</span>

               <div className="val-box">
                  <span className="c-val mono text-rose">{data.stopLoss || 'N/A'}</span>
                  <span className="target-tick down">▼</span>
               </div>
            </div>
            <div className="t-coord rrr">
               <span className="c-label mono-label">PROFIL RISK/REWARD (R/R)</span>

               <div className="rrr-box">
                  <span className="c-val mono">{data.riskRewardRatio || '1:2.0'}</span>
                  <div className="rrr-track">
                     <div className="rrr-fill" style={{ width: '65%' }}></div>
                  </div>
               </div>
            </div>
         </div>

          <div className="strategy-narrative glass">
            <Crosshair size={12} className="opacity-30" />
            <p className="narrative-text">{data.strategyPlan || analysis.strategyPlan || 'Analyse tactique en cours...'}</p>
          </div>
      </div>

      {/* BLOC 2 — Facteurs Clés */}
      <div className="glass-heavy keys-card">
        <div className="keys-header">
          <Activity size={16} className="emerald-icon" />
          <h4 className="card-title">Facteurs de Décision Multi-Agents</h4>
        </div>
        <div className="keys-grid">
          {data.keyPoints.map((point, i) => (
            <div key={i} className="key-item glass">
               <div className="item-marker"></div>
               <p>{point}</p>
            </div>
          ))}
        </div>
      </div>

      {/* BLOC 3 — Exploration */}
      <div className="exploration-area">
        <button onClick={() => setShowDetails(!showDetails)} className="expert-toggle-btn glass-heavy">
          <span>{showDetails ? 'MASQUER DÉTAILS AVANCÉS' : 'EXPLORER LES DÉTAILS COMPLETS'}</span>
          {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showDetails && (
          <div className="drill-down-grid animate-fade-in">
             <div className="drill-section">
                <h5 className="drill-label"><Newspaper size={12} /> Synthèse Fondamentale</h5>
                <AnalysisReport analysis={analysis} />
             </div>
             <div className="drill-section">
                <h5 className="drill-label"><Activity size={12} /> Indicateurs Techniques</h5>
                <TechnicalReport analysis={analysis} />
             </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .report-container { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 4rem; }
        
        .horizon-switcher { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 0.5rem; 
          padding: 0.5rem; 
          border-radius: 100px; 
          border: 1px solid var(--border-glass); 
          background: rgba(255,255,255,0.02);
          margin-bottom: 0.5rem;
        }
        .horizon-btn { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 0.75rem; 
          padding: 0.75rem 1rem; 
          border-radius: 100px; 
          border: 1px solid transparent;
          background: transparent;
          color: #475569;
          cursor: pointer;
          transition: all 0.3s var(--ease);
          font-family: 'JetBrains Mono', monospace;
          font-weight: 950;
          font-size: 10px;
          text-transform: uppercase;
        }
        .horizon-btn .h-sub { opacity: 0.4; font-weight: 500; font-size: 9px; }
        .horizon-btn.active { 
          background: rgba(255,255,255,0.05); 
          border-color: var(--border-glass); 
          color: #fff; 
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .horizon-btn:hover:not(.active) { color: #fff; background: rgba(255,255,255,0.02); }

        .mono-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 950; color: #475569; letter-spacing: 0.15rem; text-transform: uppercase; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .mono-small { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }

        /* Recommendation Card */
        .recommendation-card { position: relative; overflow: hidden; border-radius: 1.5rem; padding: 2rem; border: 1px solid var(--border-glass); background: rgba(0,0,0,0.1); }
        .card-ambient-glow { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.1; pointer-events: none; }
        .buy .card-ambient-glow { background: radial-gradient(circle at 5% 5%, var(--accent-emerald) 0%, transparent 50%); }
        .wait .card-ambient-glow { background: radial-gradient(circle at 5% 5%, #f59e0b 0%, transparent 50%); }
        
        .expert-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
        .expert-icon { color: #475569; }

        .badge-row { display: flex; align-items: flex-end; gap: 2.5rem; flex-wrap: wrap; }
        
        .action-badge-new { position: relative; display: flex; align-items: center; justify-content: center; min-width: 220px; }
        .badge-bg-text { position: absolute; font-size: 5rem; font-weight: 950; opacity: 0.02; pointer-events: none; text-transform: uppercase; white-space: nowrap; letter-spacing: -2px; top: -0.5rem; }
        .badge-main-text { 
           font-family: 'Outfit', sans-serif;
           font-size: 3.5rem; 
           font-weight: 950; 
           letter-spacing: -0.05em; 
           text-transform: uppercase;
           line-height: 1;
        }
        .buy .badge-main-text { color: var(--accent-emerald); filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.3)); }
        .wait .badge-main-text { color: #f59e0b; filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.3)); }

        .tactical-badge { display: flex; flex-direction: column; gap: 6px; padding: 1.25rem 1.75rem; border-radius: 1.25rem; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0,0,0,0.2); min-width: 200px; }
        .t-label { font-size: 11px; font-weight: 950; color: var(--accent-emerald); opacity: 0.6; display: block; margin-bottom: 0.25rem; }
        .t-val { font-size: 1.15rem; font-weight: 800; color: #fff; letter-spacing: -0.01em; }

        .rationale-box { flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 1rem; }
        .why-text { font-size: 1.1rem; font-weight: 500; color: #e2e8f0; line-height: 1.5; letter-spacing: -0.01em; font-family: 'Outfit', sans-serif; }
        .expert-seal { display: flex; align-items: center; gap: 0.5rem; color: #334155; }

        /* Gauges */
        .gauges-card { padding: 2rem; display: flex; align-items: center; border-radius: 1.5rem; border: 1px solid var(--border-glass); background: linear-gradient(180deg, rgba(255,255,255,0.01) 0%, transparent 100%); }
        .gauges-inner { width: 100%; display: flex; flex-direction: column; gap: 2.5rem; }
        .gauge-group { display: flex; flex-direction: column; gap: 1rem; }
        .gauge-header { display: flex; justify-content: space-between; align-items: center; }
        .gauge-value { font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05rem; }
        .gauge-value.emerald { color: var(--accent-emerald); }
        .gauge-value.amber { color: #f59e0b; }

        .segmented-bar { display: flex; gap: 6px; }
        .segment { height: 4px; flex: 1; border-radius: 100px; background: rgba(255,255,255,0.03); transition: all 0.5s var(--ease); }
        .segment.active.emerald { background: var(--accent-emerald); box-shadow: 0 0 10px var(--accent-emerald); }
        .segment.active.amber { background: #f59e0b; box-shadow: 0 0 10px #f59e0b; }

        .risk-scale { position: relative; height: 16px; margin-top: 0.75rem; }
        .scale-line { width: 100%; height: 2px; background: rgba(255,255,255,0.03); border-radius: 100px; position: absolute; top: 7px; }
        .risk-glow-dot { position: absolute; top: 2px; width: 12px; height: 12px; border-radius: 50%; z-index: 2; transition: all 1s ease; }
        .risk-glow-dot.emerald { background: var(--accent-emerald); left: 15%; }
        .risk-glow-dot.amber { background: #f59e0b; left: 55%; }
        .scale-notches { display: flex; justify-content: space-between; margin-top: 20px; font-size: 7px; color: #334155; font-weight: 900; }

        /* Tactical Board */
        .tactical-board-new { padding: 2rem; border-radius: 1.5rem; border: 1px solid var(--border-glass); display: flex; flex-direction: column; gap: 2rem; background: linear-gradient(145deg, rgba(255,255,255,0.01) 0%, transparent 100%); }
        .board-header { display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 1.25rem; }
        .horizon-badge { margin-left: auto; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 100px; color: #fff; background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); font-size: 10px; font-weight: 800; }
        .horizon-badge.shortTerm { border-color: rgba(14, 165, 233, 0.4); color: #0ea5e9; }
        .horizon-badge.mediumTerm { border-color: rgba(16, 185, 129, 0.4); color: var(--accent-emerald); }
        .horizon-badge.longTerm { border-color: rgba(167, 139, 250, 0.4); color: #a78bfa; }
        
        .tactical-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
        @media (max-width: 1024px) { .tactical-grid { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; } }
        
        .t-coord { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
        .c-label { font-size: 11px; color: #475569; font-weight: 950; text-transform: uppercase; }
        .val-box { display: flex; align-items: baseline; gap: 0.5rem; white-space: nowrap; overflow: hidden; }
        .c-val { font-size: 1.15rem; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -0.01em; }
        .target-tick { font-size: 10px; color: var(--accent-emerald); flex-shrink: 0; }
        .target-tick.down { color: #f43f5e; }
        .text-rose { color: #f43f5e; }
        
        .rrr-box { display: flex; flex-direction: column; gap: 0.75rem; }
        .rrr-track { height: 6px; width: 100%; max-width: 120px; background: rgba(255,255,255,0.03); border-radius: 100px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        .rrr-fill { height: 100%; background: linear-gradient(to right, var(--accent-emerald), #bef264); box-shadow: 0 0 10px var(--accent-emerald); border-radius: 100px; }

        .strategy-narrative { display: flex; gap: 1.5rem; padding: 2rem; border-radius: 1.25rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-glass); align-items: flex-start; }
        .narrative-text { font-size: 1rem; color: #94a3b8; line-height: 1.6; margin: 0; font-weight: 500; font-family: 'Outfit', sans-serif; }

        /* Keys Card */
        .keys-card { padding: 2.5rem; border-radius: 1.5rem; border: 1px solid var(--border-glass); background: radial-gradient(circle at top right, rgba(16, 185, 129, 0.02), transparent 70%); }
        .keys-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
        .card-title { font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 900; color: #fff; margin: 0; letter-spacing: -0.03em; }
        .keys-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        @media (max-width: 768px) { .keys-grid { grid-template-columns: 1fr; } }
        .key-item { display: flex; gap: 1.25rem; align-items: flex-start; padding: 1.5rem; border-radius: 1.25rem; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.01); transition: all 0.3s var(--ease); }
        .key-item:hover { border-color: rgba(16, 185, 129, 0.2); transform: translateY(-3px); background: rgba(16, 185, 129, 0.02); }
        .item-marker { width: 3px; height: 1.5rem; border-radius: 100px; background: var(--accent-emerald); flex-shrink: 0; box-shadow: 0 0 10px var(--accent-emerald); margin-top: 3px; }
        .key-item p { font-size: 1rem; color: #cbd5e1; line-height: 1.5; font-weight: 500; margin: 0; font-family: 'Outfit', sans-serif; }

        /* Alert Ribbon */
        .alert-ribbon { display: flex; align-items: center; gap: 1.5rem; padding: 1.25rem 2rem; background: rgba(245, 158, 11, 0.04); border-left: 6px solid #f59e0b; border-radius: 1rem; color: #f59e0b; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }

        /* Exploration Toggle */
        .exploration-area { display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem; }
        .expert-toggle-btn { 
           align-self: center; 
           background: rgba(255,255,255,0.02); 
           border: 1px solid var(--border-glass); 
           padding: 1rem 3rem; 
           border-radius: 100px; 
           color: #475569; 
           font-weight: 900; 
           font-size: 9px; 
           letter-spacing: 0.2rem;
           display: flex; align-items: center; gap: 1rem; 
           cursor: pointer; transition: all 0.4s var(--ease); 
           font-family: 'JetBrains Mono', monospace;
        }
        .expert-toggle-btn:hover { border-color: #fff; color: #fff; transform: translateY(-2px); }

        .drill-down-grid { display: flex; flex-direction: column; gap: 4rem; width: 100%; border-top: 1px solid var(--border-glass); padding-top: 4rem; }
        .drill-label { font-size: 9px; font-weight: 950; color: #1e293b; text-transform: uppercase; letter-spacing: 0.4rem; margin-bottom: 2rem; text-align: center; }
        .amber-icon { color: #f59e0b; }
        .emerald-icon { color: var(--accent-emerald); }
        
        .drill-section { width: 100%; }
      `}</style>
    </>
  );
}
