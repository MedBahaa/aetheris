'use client';

import React, { useState } from 'react';
import { Sparkles, ShieldCheck, RefreshCw, FileDown, Loader2 } from 'lucide-react';
import { PortfolioHolding } from '@/lib/schemas';
import { downloadRoboAdvisorPdf } from '@/lib/pdf-export-service';

interface RoboAdvisorPanelProps {
  holdings: PortfolioHolding[];
  onOptimize: (options?: { shariaOnly?: boolean }) => Promise<any>;
  isVirtualMode?: boolean;
}

export const RoboAdvisorPanel: React.FC<RoboAdvisorPanelProps> = ({ holdings, onOptimize, isVirtualMode }) => {
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [shariaOnly, setShariaOnly] = useState(false);

  const handleExportPdf = async () => {
    if (!recommendation || exportingPdf) return;
    try {
      setExportingPdf(true);
      await downloadRoboAdvisorPdf(recommendation, { holdings, isVirtualMode });
    } catch (err: any) {
      console.error('RoboAdvisor PDF Export Error:', err);
      setError(err?.message || "Impossible de générer le rapport PDF du Robo-Advisor.");
    } finally {
      setExportingPdf(false);
    }
  };

  const triggerOptimization = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onOptimize({ shariaOnly });
      if (!result) {
        throw new Error("L'optimisation a retourné un résultat vide.");
      }
      setRecommendation(result);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Une erreur s'est produite lors de l'optimisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="robo-advisor-container glass-heavy animate-fade-in">
      <div className="panel-header-robo">
        <div className="robo-title-group">
          <Sparkles className="robo-icon text-purple animate-pulse" size={20} />
          <h3 className="mono white">ROBO-ADVISOR & OPTIMISATION PORTFOLIO</h3>
        </div>
        <div className="robo-badges-row">
          {recommendation?.shariaMode && (
            <span className="sharia-tag-mini mono-tiny">
              <ShieldCheck size={11} /> MODE SHARIA AAOIFI
            </span>
          )}
          {recommendation?.shariaMode && Number(recommendation?.blockedHaramOrdersCount || 0) > 0 && (
            <span className="haram-blocked-mini mono-tiny">
              {recommendation.blockedHaramOrdersCount} HARAM BLOQUÉ(S)
            </span>
          )}
          {recommendation && (
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="robo-pdf-btn mono-tiny no-print"
              title="Exporter le plan de rééquilibrage en PDF"
            >
              {exportingPdf ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
              <span>{exportingPdf ? 'PDF...' : 'EXPORTER PDF'}</span>
            </button>
          )}
          <span className="premium-tag-mini mono-tiny">PREMIUM ACTIF</span>
        </div>
      </div>

      {!recommendation ? (
        <div className="robo-intro">
          <p className="intro-text">
            Optimisation IA basée sur la concentration sectorielle (HHI), les frais BVC réels et les pondérations de votre portefeuille.
          </p>
          <label className="sharia-toggle-label mono-tiny">
            <input
              type="checkbox"
              checked={shariaOnly}
              onChange={(e) => setShariaOnly(e.target.checked)}
              disabled={loading}
            />
            <ShieldCheck size={14} />
            <span>Mode Sharia strict (AAOIFI — exclut banques & assurances conventionnelles)</span>
          </label>
          <button 
            type="button" 
            className="optimize-btn mono" 
            onClick={triggerOptimization}
            disabled={loading || holdings.length === 0}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={14} />
                <span>ANALYSE ET OPTIMISATION EN COURS...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>LANCER L'OPTIMISATION IA</span>
              </>
            )}
          </button>
          {error && (
            <p className="error-text-mini mono-tiny animate-fade-in" style={{ color: '#ef4444', marginTop: '0.75rem', fontWeight: 'bold' }}>
              ⚠️ {error}
            </p>
          )}
          {holdings.length === 0 && (
            <span className="warning-empty-holdings mono-tiny">⚠️ Remplissez votre portefeuille de transactions d'abord.</span>
          )}
        </div>
      ) : (
        <div className="robo-results animate-fade-in">
          <div className="results-grid-robo">
            
            {/* Allocation Target Comparison */}
            <div className="alloc-comparison-card">
              <h4 className="mono title-sub">ALLOCATION SECTORIELLE PROPOSÉE</h4>
              <div className="comparison-list">
                {recommendation.allocations?.map((item: any, idx: number) => (
                  <div key={idx} className="comp-item">
                    <div className="comp-labels mono-tiny">
                      <span>{item.sector.toUpperCase()}</span>
                      <span>{item.current.toFixed(0)}% → <strong className="text-purple">{item.target.toFixed(0)}%</strong></span>
                    </div>
                    <div className="comp-bar-container">
                      <div className="comp-bar-current" style={{ width: `${item.current}%` }}></div>
                      <div className="comp-bar-target" style={{ width: `${item.target}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rebalancing Orders */}
            <div className="orders-card">
              <h4 className="mono title-sub">ORDRES DE REBALANCEMENT SUGGÉRÉS</h4>
              <div className="orders-list">
                {recommendation.orders?.map((order: any, idx: number) => (
                  <div key={idx} className={`order-row ${order.type.toLowerCase()}`}>
                    <div className="order-type-badge mono">{order.type}</div>
                    <div className="order-details">
                      <span className="order-asset mono">{order.symbol}</span>
                      <span className="order-desc">{order.reason}</span>
                      {order.estimatedAmountMAD !== undefined && (
                        <span className="order-costs mono-tiny">
                          Montant : {Number(order.estimatedAmountMAD).toLocaleString('fr-FR')} MAD
                          {order.estimatedFeeMAD !== undefined
                            ? ` · Frais : ${Number(order.estimatedFeeMAD).toLocaleString('fr-FR')} MAD`
                            : ''}
                        </span>
                      )}
                    </div>
                    <div className="order-qty mono">{order.quantity} titres</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {(recommendation.diversification || recommendation.feesSummary) && (
            <div className="robo-metrics-strip mono-tiny">
              {recommendation.diversification && (
                <div className="robo-metric-pill">
                  <span>DIVERSIFICATION HHI</span>
                  <strong>
                    {recommendation.diversification.scoreBefore}/100 → {recommendation.diversification.scoreAfter}/100 ({recommendation.diversification.concentrationRisk})
                  </strong>
                </div>
              )}
              {recommendation.feesSummary && (
                <div className="robo-metric-pill">
                  <span>FRAIS BVC ESTIMÉS ({recommendation.feesSummary.feeRatePct}%)</span>
                  <strong>{recommendation.feesSummary.totalEstimatedFeesMAD.toLocaleString('fr-FR')} MAD</strong>
                </div>
              )}
              {recommendation.feesSummary && (
                <div className="robo-metric-pill">
                  <span>IMPACT TRÉSORERIE NET</span>
                  <strong>
                    {recommendation.feesSummary.netCashImpactMAD >= 0 ? '+' : ''}
                    {recommendation.feesSummary.netCashImpactMAD.toLocaleString('fr-FR')} MAD
                  </strong>
                </div>
              )}
            </div>
          )}

          <div className="ia-analysis-card">
            <h4 className="mono title-sub"><Sparkles size={12} className="inline-icon" /> RATIONNEL DE L'IA</h4>
            <p className="ia-text">{recommendation.rationale}</p>
          </div>

          <button type="button" className="reset-optimizer-btn mono-tiny" onClick={() => setRecommendation(null)}>
            <RefreshCw size={10} /> RE-LANCER UNE ANALYSE
          </button>
        </div>
      )}

      <style jsx>{`
        .robo-advisor-container {
          background: rgba(168, 85, 247, 0.02);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 1.5rem;
          padding: 2rem;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
        }
        .panel-header-robo {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid rgba(168, 85, 247, 0.15);
          padding-bottom: 0.75rem;
        }
        .robo-title-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .robo-icon {
          color: #a855f7;
        }
        .robo-badges-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .sharia-tag-mini {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: rgba(16, 185, 129, 0.14);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 800;
        }
        .haram-blocked-mini {
          display: inline-flex;
          align-items: center;
          background: rgba(244, 63, 94, 0.14);
          color: #fda4af;
          border: 1px solid rgba(244, 63, 94, 0.35);
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 800;
        }
        .robo-pdf-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(168, 85, 247, 0.16);
          border: 1px solid rgba(168, 85, 247, 0.35);
          color: #e9d5ff;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .robo-pdf-btn:hover:not(:disabled) {
          background: rgba(168, 85, 247, 0.28);
          color: #ffffff;
        }
        .robo-pdf-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .order-costs {
          font-size: 9.5px;
          color: #94a3b8;
        }
        .sharia-toggle-label {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 0.9rem;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.22);
          color: #a7f3d0;
          cursor: pointer;
        }
        .robo-metrics-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .robo-metric-pill {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(168, 85, 247, 0.2);
          color: #94a3b8;
        }
        .robo-metric-pill strong {
          color: #f8fafc;
          font-size: 0.78rem;
        }
        .premium-tag-mini {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
          border: 1px solid rgba(168, 85, 247, 0.3);
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 800;
        }
        .robo-intro {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.25rem;
          max-width: 600px;
          margin: 1.5rem auto;
        }
        .intro-text {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.6;
        }
        .optimize-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.8rem 1.75rem;
          border-radius: 100px;
          border: none;
          background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
          color: #fff;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.2);
        }
        .optimize-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.3);
        }
        .optimize-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .warning-empty-holdings {
          color: #f59e0b;
        }

        .results-grid-robo {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 2rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 1024px) {
          .results-grid-robo { grid-template-columns: 1fr; }
        }
        .title-sub {
          font-size: 0.8rem;
          color: #64748b;
          letter-spacing: 0.05rem;
          margin-bottom: 1rem;
          border-left: 2px solid #a855f7;
          padding-left: 0.5rem;
        }
        
        .comp-item {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 0.75rem;
        }
        .comp-labels {
          display: flex;
          justify-content: space-between;
          color: #94a3b8;
          font-size: 9px;
        }
        .comp-bar-container {
          height: 6px;
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }
        .comp-bar-current {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: #3b82f6;
          opacity: 0.4;
        }
        .comp-bar-target {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: #a855f7;
          border-radius: 10px;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .order-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-glass);
        }
        .order-row.buy { border-color: rgba(16,185,129,0.15); }
        .order-row.sell { border-color: rgba(239,68,68,0.15); }
        
        .order-type-badge {
          font-size: 9px;
          font-weight: 900;
          padding: 3px 6px;
          border-radius: 4px;
        }
        .buy .order-type-badge { background: rgba(16,185,129,0.1); color: #10b981; }
        .sell .order-type-badge { background: rgba(239,68,68,0.1); color: #ef4444; }
        
        .order-details {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 0.2rem;
        }
        .order-asset {
          font-size: 11px;
          font-weight: 800;
          color: #fff;
        }
        .order-desc {
          font-size: 10px;
          color: #64748b;
        }
        .order-qty {
          font-size: 11px;
          font-weight: 800;
        }
        .buy .order-qty { color: #10b981; }
        .sell .order-qty { color: #ef4444; }

        .ia-analysis-card {
          padding: 1.25rem;
          border-radius: 1rem;
          background: rgba(168, 85, 247, 0.03);
          border: 1px solid rgba(168, 85, 247, 0.1);
          margin-bottom: 1.5rem;
        }
        .inline-icon {
          color: #a855f7;
          display: inline;
          margin-right: 0.25rem;
        }
        .ia-text {
          font-size: 0.8rem;
          color: #d1d5db;
          line-height: 1.5;
          white-space: pre-line;
        }
        
        .reset-optimizer-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: color 0.2s;
        }
        .reset-optimizer-btn:hover {
          color: #fff;
        }

        @media (max-width: 640px) {
          .robo-advisor-container {
            padding: 1.25rem;
            border-radius: 1.25rem;
            margin-bottom: 1.25rem;
          }
          .panel-header-robo {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          .optimize-btn {
            width: 100%;
            min-height: 48px;
            justify-content: center;
          }
          .order-row {
            flex-wrap: wrap;
            gap: 0.6rem;
            padding: 0.75rem;
          }
          .order-details {
            min-width: 140px;
          }
          .reset-optimizer-btn {
            min-height: 40px;
          }
        }
      `}</style>
    </div>
  );
};
