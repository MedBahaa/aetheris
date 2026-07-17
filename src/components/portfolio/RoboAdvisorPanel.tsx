'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { PortfolioHolding } from '@/lib/schemas';

interface RoboAdvisorPanelProps {
  holdings: PortfolioHolding[];
  onOptimize: () => Promise<any>;
}

export const RoboAdvisorPanel: React.FC<RoboAdvisorPanelProps> = ({ holdings, onOptimize }) => {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);

  const triggerOptimization = async () => {
    try {
      setLoading(true);
      const result = await onOptimize();
      setRecommendation(result);
    } catch (err) {
      console.error(err);
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
        <span className="premium-tag-mini mono-tiny">PREMIUM ACTIF</span>
      </div>

      {!recommendation ? (
        <div className="robo-intro">
          <p className="intro-text">
            Notre algorithme d'optimisation (Markowitz + IA Gemini) analyse la concentration sectorielle, la liquidité et la volatilité de vos positions pour concevoir une allocation cible équilibrée.
          </p>
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
                      <span>{item.current.toFixed(0)}% $\rightarrow$ <strong className="text-purple">{item.target.toFixed(0)}%</strong></span>
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
                    </div>
                    <div className="order-qty mono">{order.quantity} titres</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

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
      `}</style>
    </div>
  );
};
