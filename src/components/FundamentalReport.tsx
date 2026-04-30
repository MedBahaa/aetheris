'use client';

import { CompanyAnalysis } from '@/lib/agent-engine';
import { Landmark, TrendingUp, PieChart, BarChart3, Globe, Shield, Zap, Activity } from 'lucide-react';

interface FundamentalReportProps {
  analysis: CompanyAnalysis;
}

export default function FundamentalReport({ analysis }: FundamentalReportProps) {
  const fundamentals = analysis.fundamentals || {
    peRatio: 'N/A',
    dividendYield: 'N/A',
    marketCap: 'N/A',
    netProfit: 'N/A',
    roe: 'N/A',
    margin: 'N/A',
    revenueGrowth: 'N/A',
    profitGrowth: 'N/A',
    sector: analysis.sector || 'N/A'
  };

  return (
    <div className="fundamental-root animate-fade-in">
      <div className="report-header-fund">
        <div className="agent-identity">
          <div className="identity-pulse emerald"></div>
          <Landmark size={12} className="text-emerald" />
          <span className="mono-label">RAPPORT D'ANALYSE FONDAMENTALE v1.0</span>

        </div>
        <div className="header-main">
          <h2 className="company-title">{analysis.companyName}</h2>
          <div className="sector-badge glass-heavy">
            <Globe size={14} className="opacity-40" />
            <span className="mono-label">{fundamentals.sector || 'MARCHÉ ACTIONS'}</span>
          </div>
        </div>
      </div>

      <div className="fund-grid">
        {/* VALUATION CARD */}
        <div className="fund-card glass-heavy">
          <div className="card-tag">
            <BarChart3 size={14} className="text-emerald" />
            <span className="mono-label">INDICATEURS DE VALORISATION</span>

          </div>
          <div className="metric-box">
            <span className="m-label">PER (PRICE-TO-EARNINGS RATIO)</span>

            <div className="m-val-row">
              <span className={`m-val mono ${fundamentals.peRatio === 'N/A' ? 'text-dim' : ''}`}>
                {fundamentals.peRatio}
              </span>
              <div className="m-status glass">VALORISATION MODÈLE</div>
            </div>
            <p className="m-desc">Multiple de valorisation basé sur les derniers bénéfices déclarés.</p>
          </div>
        </div>

        {/* YIELD CARD */}
        <div className="fund-card glass-heavy">
          <div className="card-tag">
            <PieChart size={14} className="text-emerald" />
            <span className="mono-label">RENDEMENT ACTIONNARIAL</span>

          </div>
          <div className="metric-box">
            <span className="m-label">TAUX DE DIVIDENDE (BRUT)</span>

            <div className="m-val-row">
              <span className={`m-val mono ${fundamentals.dividendYield === 'N/A' ? 'text-dim' : 'text-emerald'}`}>
                {fundamentals.dividendYield}
              </span>
              <div className="m-status glass green">DIVIDENDE ACTIF</div>
            </div>
            <p className="m-desc">Rendement annuel brut distribué aux actionnaires.</p>
          </div>
        </div>

        {/* CAP CARD */}
        <div className="fund-card glass-heavy">
          <div className="card-tag">
            <Shield size={14} className="text-emerald" />
            <span className="mono-label">CAPITALISATION & POIDS BOURSIER</span>

          </div>
          <div className="metric-box">
            <span className="m-label">CAPITALISATION BOURSIÈRE</span>

            <div className="m-val-row">
              <span className="m-val mono">
                {fundamentals.marketCap && fundamentals.marketCap !== 'N/A' 
                  ? `${fundamentals.marketCap.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}` 
                  : 'N/A'}
                <span className="m-cur">MAD</span>
              </span>
              <div className="m-status glass">POIDS INSTITUTIONNEL</div>
            </div>
            <p className="m-desc">Valeur totale de la société sur le marché d'actions.</p>
          </div>
        </div>

        {/* ROE CARD */}
        <div className="fund-card glass-heavy">
          <div className="card-tag">
            <Zap size={14} className="text-emerald" />
            <span className="mono-label">INDICES DE PROFITABILITÉ</span>

          </div>
          <div className="metric-box">
            <span className="m-label">ROE (RENTABILITÉ DES FONDS PROPRES)</span>

            <div className="m-val-row">
              <span className={`m-val mono ${fundamentals.roe === 'N/A' ? 'text-dim' : 'text-emerald'}`}>
                {fundamentals.roe}
              </span>
              <div className="m-status glass green">RATIO D'EFFICACITÉ</div>
            </div>
            <p className="m-desc">Capacité de la société à générer des profits avec l'argent des actionnaires.</p>
          </div>
        </div>

        {/* NET PROFIT CARD */}
        <div className="fund-card glass-heavy">
          <div className="card-tag">
            <TrendingUp size={14} className="text-emerald" />
            <span className="mono-label">RÉSULTAT NET ANNUEL</span>

          </div>
          <div className="metric-box">
            <span className="m-label">BÉNÉFICE NET CONSOLIDÉ</span>

            <div className="m-val-row">
              <span className={`m-val mono ${fundamentals.netProfit === 'N/A' ? 'text-dim' : ''}`}>
                {fundamentals.netProfit}
              </span>
              <div className="m-status glass">RÉSULTAT NET</div>
            </div>
            <p className="m-desc">Bénéfice net total après impôts et charges sur le dernier exercice.</p>
          </div>
        </div>

        {/* GROWTH SECTION */}
        <div className="fund-card glass-heavy span-2">
          <div className="card-tag">
            <Activity size={14} className="text-emerald" />
            <span className="mono-label">CROISSANCE & DYNAMIQUE DE MARGE</span>

          </div>
          <div className="growth-grid">
            <div className="growth-item">
              <span className="m-label mono-label">CROISSANCE CA</span>

              <div className={`growth-badge ${fundamentals.revenueGrowth?.includes('-') ? 'down' : 'up'}`}>
                {fundamentals.revenueGrowth || 'N/A'}
              </div>
            </div>
            <div className="growth-item">
              <span className="m-label mono-label">CROISSANCE RÉSULTAT</span>

              <div className={`growth-badge ${fundamentals.profitGrowth?.includes('-') ? 'down' : 'up'}`}>
                {fundamentals.profitGrowth || 'N/A'}
              </div>
            </div>
            <div className="growth-item">
              <span className="m-label mono-label">MARGE NETTE</span>

              <div className="growth-badge neutral">
                {fundamentals.margin || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fund-footer glass-heavy">
        <TrendingUp size={16} className="text-emerald" />
        <p className="footer-text">
          L'analyse fondamentale confirme un profil de type <strong>{parseFloat(fundamentals.peRatio || '0') < 15 ? 'Value' : 'Growth'}</strong>
          {" "}pour cette valeur au sein du secteur <strong>{fundamentals.sector}</strong>.
        </p>
      </div>

      <style jsx>{`
        .fundamental-root { display: flex; flex-direction: column; gap: 3.5rem; width: 100%; padding-bottom: 4rem; }
        
        .report-header-fund { border-bottom: 1px solid var(--border-glass); padding-bottom: 3rem; margin-bottom: 1rem; }
        .agent-identity { position: relative; display: flex; align-items: center; gap: 0.75rem; color: var(--accent-emerald); margin-bottom: 1.5rem; }
        .identity-pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-emerald); box-shadow: 0 0 12px var(--accent-emerald); }
        
        .header-main { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; }
        .company-title { font-family: 'Outfit', sans-serif; font-size: 3.5rem; font-weight: 950; color: #fff; line-height: 0.9; letter-spacing: -0.05em; margin: 0; }
        .sector-badge { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; border-radius: 100px; border: 1px solid var(--border-glass); }
        
        .fund-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; }
        @media (max-width: 1024px) { .fund-grid { grid-template-columns: 1fr; } }
        
        .fund-card { padding: 2.5rem; border-radius: 2rem; border: 1px solid var(--border-glass); display: flex; flex-direction: column; gap: 2.5rem; }
        .fund-card.span-2 { grid-column: span 2; }
        @media (max-width: 1024px) { .fund-card.span-2 { grid-column: span 1; } }
        .card-tag { display: flex; align-items: center; gap: 1rem; }
        
        .growth-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-top: 1rem; }
        .growth-item { display: flex; flex-direction: column; gap: 1rem; }
        .growth-badge { font-family: 'JetBrains Mono', monospace; font-size: 1.25rem; font-weight: 800; padding: 0.5rem 1rem; border-radius: 0.75rem; text-align: center; }
        .growth-badge.up { color: var(--accent-emerald); background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.1); }
        .growth-badge.down { color: #f43f5e; background: rgba(244, 63, 94, 0.05); border: 1px solid rgba(244, 63, 94, 0.1); }
        .growth-badge.neutral { color: #fff; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); }

        .metric-box { display: flex; flex-direction: column; gap: 1rem; }
        .m-label { font-size: 11px; font-weight: 850; color: var(--text-dim); letter-spacing: 0.15rem; text-transform: uppercase; }

        .m-val-row { display: flex; align-items: center; justify-content: space-between; }
        .m-val { font-size: 1.75rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em; }
        .m-status { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 850; color: var(--text-dim); padding: 4px 10px; border-radius: 4px; border: 1px solid var(--border-glass); }
        .m-status.green { color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.05); }
        .m-desc { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; font-weight: 500; }

        
        .fund-footer { padding: 2.5rem; border-radius: 2rem; display: flex; align-items: center; gap: 2rem; border: 1px solid var(--border-glass); background: linear-gradient(to right, rgba(16, 185, 129, 0.03), transparent); }
        .footer-text { font-size: 1.1rem; color: #94a3b8; font-weight: 500; }
        .footer-text strong { color: #fff; }

        .mono-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 850; color: var(--text-dim); letter-spacing: 0.15rem; text-transform: uppercase; }

        .mono { font-family: 'JetBrains Mono', monospace; }
        .m-cur { font-size: 10px; color: #334155; margin-left: 0.75rem; vertical-align: middle; }
        .text-emerald { color: var(--accent-emerald); }
        .text-dim { color: #334155 !important; }
      `}</style>
    </div>
  );
}
