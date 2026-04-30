'use client';

import { CompanyAnalysis } from '@/lib/agent-engine';
import { Target, Zap, Activity, Shield, TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, Info } from 'lucide-react';

interface TechnicalReportProps {
  analysis: CompanyAnalysis;
}

const TrendBadge = ({ trend }: { trend: string }) => {
  const label = trend === 'POSITIF' || trend === 'Haussière' ? 'Haussière' : 
                trend === 'NEGATIF' || trend === 'Baissière' ? 'Baissière' : 'Neutre';
  
  const styleClass = trend === 'POSITIF' || trend === 'Haussière' ? 'trend-up' : 
                     trend === 'NEGATIF' || trend === 'Baissière' ? 'trend-down' : 'trend-neutral';

  const icon = styleClass === 'trend-up' ? <TrendingUp size={14} /> :
               styleClass === 'trend-down' ? <TrendingDown size={14} /> : <Minus size={14} />;

  return (
    <div className={`trend-badge ${styleClass}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
};

/**
 * Classifie intelligemment chaque signal pour déterminer son type et badge
 */
function classifySignal(signal: string): { type: 'bullish' | 'bearish' | 'warning' | 'info' | 'neutral'; label: string } {
  const s = signal.toLowerCase();
  
  // Signaux bearish / alertes
  if (s.includes('❌') || s.includes('indisponible') || s.includes('impossible') || s.includes('erreur')) {
    return { type: 'warning', label: 'ALERTE' };
  }
  if (s.includes('⚠️') || s.includes('insuffisant') || s.includes('non fiable') || s.includes('dégradé') || s.includes('illiquide')) {
    return { type: 'warning', label: 'PRUDENCE' };
  }
  if (s.includes('baissier') || s.includes('baissière') || s.includes('survente') || s.includes('surachat')) {
    return { type: 'bearish', label: 'BEARISH' };
  }
  
  // Signaux bullish
  if (s.includes('haussier') || s.includes('haussière') || s.includes('forte liquidité')) {
    return { type: 'bullish', label: 'BULLISH' };
  }
  
  // Signaux de contexte (volume, pivot, variation, SMA…)
  if (s.includes('volume') || s.includes('points de données') || s.includes('variation') || s.includes('pivot') || s.includes('mms')) {
    return { type: 'info', label: 'CONTEXTE' };
  }
  if (s.includes('macd') && (s.includes('insuffisant') || s.includes('indéterminé'))) {
    return { type: 'warning', label: 'LIMITÉ' };
  }
  if (s.includes('neutre')) {
    return { type: 'neutral', label: 'NEUTRE' };
  }

  return { type: 'info', label: 'CONTEXTE' };
}

export default function TechnicalReport({ analysis }: TechnicalReportProps) {
  const rsiValue = typeof analysis.rsi === 'object' ? analysis.rsi.value : '50';
  const rsiInterp = typeof analysis.rsi === 'object' ? analysis.rsi.interpretation : analysis.rsi;
  const dataQuality = analysis.dataQuality;
  const liquidityWarning = analysis.liquidityWarning;

  return (
    <div className="tech-analysis-root animate-fade-in">
      {/* Tech Header */}
      <div className="report-header-tech">
        <div className="agent-identity">
          <div className="identity-pulse blue"></div>
          <Activity size={12} className="text-blue-400" />
          <span className="mono-label">ANALYSE TECHNIQUE & QUANTITATIVE</span>

        </div>
        <div className="header-main">
          <h2 className="company-title">{analysis.companyName}</h2>
          <div className="live-price-box glass-heavy">
             <div className="price-info">
                <span className="p-label mono-label">PRIX DE MARCHÉ</span>
                <span className="p-val mono">{analysis.price} <span className="p-cur">MAD</span></span>
             </div>
             <div className="price-indicator">
                {analysis.variationValue !== undefined ? (
                  analysis.variationValue >= 0 ? 
                    <TrendingUp size={20} className="text-emerald animate-pulse" /> : 
                    <TrendingDown size={20} className="text-rose animate-pulse" />
                ) : (
                  analysis.globalSentiment === 'POSITIF' ? 
                    <TrendingUp size={20} className="text-emerald animate-pulse" /> : 
                    <TrendingDown size={20} className="text-rose animate-pulse" />
                )}
             </div>
          </div>
        </div>
      </div>

      {/* AUDIT FIX: Data Quality Banner */}
      {dataQuality && dataQuality.warnings.length > 0 && (
        <div className="data-quality-banner glass-heavy">
          <div className="dq-header">
            <AlertTriangle size={14} className="text-amber" />
            <span className="mono-label">QUALITÉ DES DONNÉES : {dataQuality.score}/100</span>
          </div>
          <div className="dq-bar-track">
            <div 
              className={`dq-bar-fill ${dataQuality.score > 70 ? 'good' : dataQuality.score > 40 ? 'medium' : 'low'}`} 
              style={{ width: `${dataQuality.score}%` }}
            ></div>
          </div>
          {dataQuality.warnings.map((w, i) => (
            <div key={i} className="dq-warning-item">
              <span className="dq-dot">•</span>
              <span className="dq-text">{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* AUDIT FIX: Liquidity Warning */}
      {liquidityWarning && !liquidityWarning.isLiquid && (
        <div className="liquidity-alert glass-heavy">
          <AlertTriangle size={16} className="text-amber" />
          <div className="liq-content">
            <span className="mono-label liq-title">ALERTE LIQUIDITÉ</span>
            <span className="liq-msg">{liquidityWarning.message}</span>
            {liquidityWarning.dailyVolume !== undefined && (
              <span className="liq-vol mono">Volume : {liquidityWarning.dailyVolume.toLocaleString('fr-FR')} titres</span>
            )}
          </div>
        </div>
      )}

      <div className="tech-dashboard-grid">
        {/* INDICATEURS ALPHA */}
        <div className="tech-card glass-heavy alpha">
           <div className="card-top-header">
              <Zap size={14} className="text-blue-400" />
              <span className="card-tag mono-label">INDICATEURS DE MOMENTUM ALPHA</span>

           </div>
           
           <div className="metrics-stack">
              <div className="metric-item">
                 <div className="m-header">
                    <span className="m-label mono-label">TENDANCE DIRECTIONNELLE</span>

                    <TrendBadge trend={(analysis.technicalTrend as any) || 'Neutre'} />
                 </div>
              </div>

              <div className="rsi-gauge-box">
                 <div className="m-header">
                    <span className="m-label mono-label" title="Relative Strength Index - Mesure la vitesse et le changement des mouvements de prix.">INDICE DE FORCE RELATIVE (RSI)</span>
                    <span className="m-val mono">{rsiValue} <span className="m-interp">{rsiInterp}</span></span>
                 </div>
                 <div className="rsi-gauge-track">
                    <div className="rsi-marker sell"></div>
                    <div className="rsi-marker buy"></div>
                    <div className="rsi-fill" style={{ width: `${rsiValue}%` }}>
                       <div className="rsi-cursor"></div>
                    </div>
                 </div>
                 <div className="rsi-labels mono-label">
                    <span>ZONE SURVENTE (30)</span>
                    <span>ZONE SURACHAT (70)</span>
                 </div>
              </div>

              <div className="levels-grid">
                 <div className="level-item glass-heavy support" title="Niveau de prix où la demande est assez forte pour arrêter une baisse.">
                    <span className="l-label mono-label">SUPPORT TECHNIQUE</span>

                    <span className="l-val mono">{analysis.support}</span>
                 </div>
                 <div className="level-item glass-heavy pivot" title="Niveau pivot central calculé sur la dernière séance (H+L+C)/3.">
                    <span className="l-label mono-label">PIVOT (DERNIÈRE SÉANCE)</span>

                    <span className="l-val mono text-blue-400">{analysis.pivot || 'N/A'}</span>
                 </div>
                 <div className="level-item glass-heavy resistance" title="Niveau de prix où l'offre est assez forte pour arrêter une hausse.">
                    <span className="l-label mono-label">RÉSISTANCE TECHNIQUE</span>

                    <span className="l-val mono">{analysis.resistance}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* MOMENTUM & AV_MOV_AVERAGES */}
        <div className="tech-card glass-heavy momentum">
           <div className="card-top-header">
              <Shield size={14} className="text-blue-400" />
              <span className="card-tag mono-label">MOYENNES MOBILES & MOMENTUM</span>

           </div>
           
           <div className="momentum-stack">
              <div className="m-av-row">
                 <div className="m-av-item">
                    <span className="m-label mono-label">MMS 20 (COURT TERME)</span>
                    <span className="m-val mono">{analysis.sma20 || 'N/A'}</span>
                 </div>
                 <div className="m-av-item">
                    <span className="m-label mono-label">MMS 50 (MOYEN TERME)</span>
                    <span className="m-val mono">{analysis.sma50 || 'N/A'}</span>
                 </div>
              </div>

              {/* AUDIT FIX: Afficher le vrai label SMA */}
              {analysis.smaLabel && (
                <div className="sma-label-info glass">
                  <Info size={12} className="text-blue-400" />
                  <span className="mono-label sma-real-label">{analysis.smaLabel}</span>
                </div>
              )}

              <div className="macd-box glass-heavy">
                 <div className="m-header">
                    <span className="m-label mono-label">OSCILLATEUR MACD (12, 26, 9)</span>
                    <div className={`macd-badge ${analysis.macd?.trend === 'Haussier' ? 'up' : analysis.macd?.trend?.includes('Indéterminé') ? 'na' : 'down'}`}>
                       {analysis.macd?.trend || 'NEUTRE'}
                    </div>
                 </div>
                 <div className="macd-values">
                    <div className="mv-item">
                       <span className="mv-label mono-label">HIST</span>
                       <span className={`mv-val mono ${analysis.macd && analysis.macd.histogram > 0 ? 'text-emerald' : 'text-rose'}`}>
                          {analysis.macd?.histogram || '0.00'}
                       </span>
                    </div>
                    <div className="mv-item">
                       <span className="mv-label mono-label">MACD</span>
                       <span className="mv-val mono">{analysis.macd?.macd || '0.00'}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* FLUX DE SIGNAUX — AUDIT FIX: Badges dynamiques au lieu de S_VALIDÉ */}
        <div className="tech-card glass-heavy signals">
           <div className="card-top-header">
              <Target size={14} className="text-blue-400" />
              <span className="card-tag mono-label">REGISTRE DE SIGNAUX</span>
              <div className="signal-count mono">{analysis.signals?.length || 0}</div>
           </div>

           {/* Légende des signaux */}
           <div className="signal-legend">
              <div className="legend-item">
                <div className="l-dot bullish"></div>
                <span>Signal d'achat</span>
              </div>
              <div className="legend-item">
                <div className="l-dot bearish"></div>
                <span>Signal de vente</span>
              </div>
              <div className="legend-item">
                <div className="l-dot warning"></div>
                <span>Attention requise</span>
              </div>
              <div className="legend-item">
                <div className="l-dot info"></div>
                <span>Contexte</span>
              </div>
           </div>

           <div className="signal-log-stack">
              {analysis.signals?.map((signal, idx) => {
                const classified = classifySignal(signal);
                return (
                  <div key={idx} className={`log-row glass log-${classified.type}`}>
                     <div className={`l-dot ${classified.type}`}></div>
                     <div className="l-content">{signal}</div>
                     <div className={`l-status ${classified.type}`}>{classified.label}</div>
                  </div>
                );
              })}
           </div>
        </div>
      </div>

      {/* RÉSULTANTE DU SITUATIONNEL */}
      <div className="market-context-card glass-heavy">
         <div className="context-header">
            <Shield size={16} className="text-blue-400" />
            <span className="context-label mono-label" title="Analyse probabiliste basée sur la convergence technique.">SYNTHÈSE DE CONVERGENCE TECHNIQUE</span>

         </div>
         <p className="context-body">&ldquo;{analysis.marketSituation}&rdquo;</p>
      </div>

      <style jsx>{`
        .tech-analysis-root { display: flex; flex-direction: column; gap: 3.5rem; width: 100%; padding-bottom: 4rem; }
        
        .mono-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 850; color: var(--text-dim); letter-spacing: 0.15rem; text-transform: uppercase; }


        /* Tech Header */
        .report-header-tech { border-bottom: 1px solid var(--border-glass); padding-bottom: 3rem; margin-bottom: 1rem; }
        .agent-identity { position: relative; display: flex; align-items: center; gap: 0.75rem; color: var(--accent-blue); margin-bottom: 1.5rem; }
        .identity-pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-blue); box-shadow: 0 0 12px var(--accent-blue); }
        
        .header-main { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; }
        .company-title { font-family: 'Outfit', sans-serif; font-size: 3.5rem; font-weight: 950; color: #fff; line-height: 0.9; letter-spacing: -0.05em; margin: 0; }
        
        .live-price-box { display: flex; align-items: center; gap: 2rem; padding: 1.5rem 2rem; border-radius: 1.25rem; border: 1px solid var(--border-glass); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .price-info { display: flex; flex-direction: column; gap: 4px; }
        .p-val { font-size: 2rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em; }
        .p-cur { font-size: 10px; color: var(--text-dim); margin-left: 0.5rem; }

        .text-emerald { color: var(--accent-emerald); }
        .text-rose { color: #f43f5e; }
        .text-amber { color: #f59e0b; }
        .text-blue-400 { color: #60a5fa; }

        /* Data Quality Banner */
        .data-quality-banner { 
          padding: 1.5rem 2rem; border-radius: 1.25rem; 
          border: 1px solid rgba(245, 158, 11, 0.15); 
          background: rgba(245, 158, 11, 0.03);
          display: flex; flex-direction: column; gap: 0.75rem;
        }
        .dq-header { display: flex; align-items: center; gap: 0.75rem; }
        .dq-bar-track { height: 4px; background: rgba(255,255,255,0.05); border-radius: 100px; overflow: hidden; }
        .dq-bar-fill { height: 100%; border-radius: 100px; transition: width 0.8s ease; }
        .dq-bar-fill.good { background: var(--accent-emerald); }
        .dq-bar-fill.medium { background: #f59e0b; }
        .dq-bar-fill.low { background: #f43f5e; }
        .dq-warning-item { display: flex; align-items: flex-start; gap: 0.5rem; padding-left: 0.25rem; }
        .dq-dot { color: #f59e0b; font-weight: 900; line-height: 1.3; }
        .dq-text { font-size: 0.8rem; color: #94a3b8; line-height: 1.4; }

        /* Liquidity Alert */
        .liquidity-alert {
          display: flex; align-items: flex-start; gap: 1.25rem;
          padding: 1.5rem 2rem; border-radius: 1.25rem;
          border: 1px solid rgba(245, 158, 11, 0.2);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent);
        }
        .liq-content { display: flex; flex-direction: column; gap: 0.35rem; }
        .liq-title { color: #f59e0b !important; }
        .liq-msg { font-size: 0.9rem; color: #e2e8f0; font-weight: 500; }
        .liq-vol { font-size: 0.8rem; color: #64748b; }

        /* Dashboard Items */
        .tech-dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        @media (max-width: 1024px) { .tech-dashboard-grid { grid-template-columns: 1fr; } }
        
        .tech-card { padding: 2.5rem; border-radius: 2rem; border: 1px solid var(--border-glass); }
        .card-top-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 3rem; }

        .metrics-stack { display: flex; flex-direction: column; gap: 3.5rem; }
        .m-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .m-val { font-size: 1rem; font-weight: 700; color: #fff; }
        .m-interp { color: var(--accent-blue); font-size: 0.75rem; margin-left: 0.75rem; }

        .rsi-gauge-box { display: flex; flex-direction: column; }
        .rsi-gauge-track { position: relative; height: 6px; background: rgba(255,255,255,0.03); border-radius: 100px; margin: 2rem 0; border: 1px solid rgba(255,255,255,0.05); }
        .rsi-marker { position: absolute; top: -6px; width: 1px; height: 18px; background: rgba(255,255,255,0.2); }
        .rsi-marker.buy { left: 30%; }
        .rsi-marker.sell { left: 70%; }
        .rsi-fill { position: absolute; left: 0; top: -1px; height: 6px; background: linear-gradient(to right, #10b981, #3b82f6, #f43f5e); border-radius: 100px; }
        .rsi-cursor { position: absolute; right: -8px; top: -7px; width: 18px; height: 18px; background: #fff; border: 4px solid var(--accent-blue); border-radius: 50%; box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
        .rsi-labels { display: flex; justify-content: space-between; margin-top: 0.5rem; opacity: 0.8; }

        .levels-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .level-item { display: flex; flex-direction: column; gap: 0.75rem; padding: 1.25rem; border-radius: 1rem; text-align: center; }
        .l-label { font-size: 9px; }
        .l-val { font-size: 1.15rem; font-weight: 800; }

        .support .l-val { color: var(--accent-emerald); }
        .resistance .l-val { color: #f43f5e; }
        .pivot .l-val { color: var(--accent-blue); }

        .m-av-row { display: flex; gap: 2rem; margin-bottom: 1rem; }
        .m-av-item { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
        
        /* SMA Label Info */
        .sma-label-info { 
          display: flex; align-items: center; gap: 0.75rem; 
          padding: 0.65rem 1rem; border-radius: 0.75rem; 
          margin-bottom: 1.5rem;
          border: 1px solid var(--border-glass);
          background: rgba(96, 165, 250, 0.03);
        }
        .sma-real-label { font-size: 10px; color: #60a5fa !important; }

        .macd-box { padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.02); }
        .macd-badge { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 950; padding: 4px 10px; border-radius: 4px; border: 1px solid var(--border-glass); }
        .macd-badge.up { color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.05); }
        .macd-badge.down { color: #f43f5e; border-color: rgba(244, 63, 94, 0.2); background: rgba(244, 63, 94, 0.05); }
        .macd-badge.na { color: #64748b; border-color: rgba(100, 116, 139, 0.2); background: rgba(100, 116, 139, 0.05); }
        .macd-values { display: flex; gap: 2rem; margin-top: 1rem; }
        .mv-item { display: flex; flex-direction: column; gap: 4px; }
        .mv-val { font-size: 1.1rem; font-weight: 700; }

        /* Signal Legend */
        .signal-legend {
          display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
          padding: 0.75rem 1rem; margin-bottom: 1.25rem;
          border-radius: 0.75rem; border: 1px solid var(--border-glass);
          background: rgba(255,255,255,0.015);
        }
        .legend-item { 
          display: flex; align-items: center; gap: 0.4rem; 
          font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700;
          color: #64748b; letter-spacing: 0.03em; text-transform: uppercase;
        }

        /* Signal Logs — REDESIGNED */
        .signal-count { 
          margin-left: auto; font-size: 10px; font-weight: 900; 
          color: #60a5fa; padding: 3px 8px; border-radius: 100px; 
          background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96, 165, 250, 0.15);
        }
        .signal-log-stack { display: flex; flex-direction: column; gap: 0.65rem; }
        .log-row { 
          display: flex; align-items: center; gap: 1rem; 
          padding: 1rem 1.25rem; border-radius: 0.85rem; 
          font-family: 'Inter', sans-serif; font-size: 0.85rem; 
          border: 1px solid var(--border-glass); 
          transition: all 0.3s ease; 
        }
        .log-row:hover { transform: translateX(4px); }
        .log-row.log-bullish:hover { border-color: rgba(16, 185, 129, 0.25); background: rgba(16, 185, 129, 0.03); }
        .log-row.log-bearish:hover { border-color: rgba(244, 63, 94, 0.25); background: rgba(244, 63, 94, 0.03); }
        .log-row.log-warning:hover { border-color: rgba(245, 158, 11, 0.25); background: rgba(245, 158, 11, 0.03); }
        .log-row.log-info:hover { border-color: rgba(96, 165, 250, 0.25); background: rgba(96, 165, 250, 0.03); }
        .log-row.log-neutral:hover { border-color: rgba(148, 163, 184, 0.2); background: rgba(148, 163, 184, 0.03); }

        .l-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .l-dot.bullish { background: var(--accent-emerald); box-shadow: 0 0 8px rgba(16, 185, 129, 0.4); }
        .l-dot.bearish { background: #f43f5e; box-shadow: 0 0 8px rgba(244, 63, 94, 0.4); }
        .l-dot.warning { background: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.4); }
        .l-dot.info { background: #60a5fa; box-shadow: 0 0 8px rgba(96, 165, 250, 0.4); }
        .l-dot.neutral { background: #f8fafc; box-shadow: 0 0 8px rgba(255, 255, 255, 0.2); }

        .l-content { flex: 1; color: #e2e8f0; font-weight: 500; line-height: 1.3; }
        .l-status { 
          font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 950; 
          padding: 3px 8px; border-radius: 4px; letter-spacing: 0.05em; flex-shrink: 0;
        }
        .l-status.bullish { color: var(--accent-emerald); background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.12); }
        .l-status.bearish { color: #f43f5e; background: rgba(244, 63, 94, 0.06); border: 1px solid rgba(244, 63, 94, 0.12); }
        .l-status.warning { color: #f59e0b; background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.12); }
        .l-status.info { color: #60a5fa; background: rgba(96, 165, 250, 0.06); border: 1px solid rgba(96, 165, 250, 0.12); }
        .l-status.neutral { color: #f8fafc; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); }

        /* Market Context */
        .market-context-card { background: linear-gradient(135deg, rgba(14, 165, 233, 0.03), transparent); border: 1px solid var(--border-glass); border-radius: 2rem; padding: 3.5rem; margin-top: 3rem; position: relative; overflow: hidden; }
        .context-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; justify-content: center; }
        .context-body { font-size: 1.5rem; color: #fff; font-style: italic; line-height: 1.6; position: relative; z-index: 1; text-align: center; font-family: 'Inter', sans-serif; font-weight: 500; letter-spacing: -0.01em; }
        
        .trend-badge { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1.25rem; border-radius: 100px; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1rem; }
        .trend-up { background: rgba(16, 185, 129, 0.05); color: var(--accent-emerald); border: 1px solid rgba(16, 185, 129, 0.1); }
        .trend-down { background: rgba(244, 63, 94, 0.05); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.1); }
        .trend-neutral { background: rgba(255, 255, 255, 0.03); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.1); }
        
        .mono { font-family: 'JetBrains Mono', monospace; }

        @media (max-width: 768px) {
          .levels-grid { grid-template-columns: 1fr; }
          .header-main { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
