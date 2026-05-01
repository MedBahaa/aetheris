'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Briefcase, TrendingUp, TrendingDown, ShieldCheck, 
  Percent, Gift, DollarSign, AlertTriangle, PieChart, Info, Zap
} from 'lucide-react';

// ─────────────────────────────────────────────
// Tooltip flottant via Portal (échappe overflow:hidden)
// ─────────────────────────────────────────────
interface TooltipProps {
  content: React.ReactNode;
}

const KpiTooltip: React.FC<TooltipProps> = ({ content }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY - 8,   // juste au-dessus de l'icône
        left: rect.left + rect.width / 2,
      });
    }
    setVisible(true);
  };

  const hide = () => {
    hideTimer.current = setTimeout(() => setVisible(false), 120);
  };

  const cancelHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  const tooltip = visible && mounted ? createPortal(
    <div
      className="kpi-tooltip-portal"
      style={{ top: coords.top, left: coords.left }}
      onMouseEnter={cancelHide}
      onMouseLeave={hide}
    >
      {content}
      <div className="kpi-tooltip-arrow" />
    </div>,
    document.body
  ) : null;

  return (
    <>
      <span
        ref={iconRef}
        className="kpi-tooltip-trigger"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <Info size={11} />
      </span>
      {tooltip}
    </>
  );
};

// ─────────────────────────────────────────────
// Contenus des tooltips
// ─────────────────────────────────────────────
const tooltips = {
  capitalInvesti: (
    <>
      <strong>Capital Investi (NET)</strong>
      <p>Somme totale déboursée pour acquérir vos positions actuelles, incluant les frais de courtage (0.6%).</p>
      <code>Σ (Quantité × Prix d'achat × 1.006)</code>
    </>
  ),
  valeurLiquidative: (
    <>
      <strong>Valeur Liquidative</strong>
      <p>Valeur marchande actuelle de toutes vos positions ouvertes aux prix en temps réel.</p>
      <code>Σ (Quantité × Cours actuel)</code>
    </>
  ),
  pvLatente: (
    <>
      <strong>Plus-Value Latente (Nette)</strong>
      <p>Gain ou perte non réalisé sur vos positions encore ouvertes, après déduction de la TVP 15% sur les profits.</p>
      <code>PV Brute = VL − Capital Investi</code>
      <code>PV Nette = PV Brute × (1 − 15%) si &gt; 0</code>
    </>
  ),
  pvRealisee: (
    <>
      <strong>Plus-Value Réalisée (Nette)</strong>
      <p>Gain définitivement encaissé sur les positions clôturées (ventes), net de frais et TVP 15%.</p>
      <code>PV = (Prix vente × (1−0.6%)) − (PMP × Qté)</code>
      <code>Net = PV × (1 − 15%) si profit</code>
    </>
  ),
  performance: (
    <>
      <strong>Performance Nette Globale</strong>
      <p>Rendement total de votre portefeuille par rapport au capital investi, après tous frais et TVP.</p>
      <code>Perf = PV Nette / Capital Investi × 100</code>
    </>
  ),
  dividendes: (
    <>
      <strong>Dividendes Reçus</strong>
      <p>Total des dividendes encaissés, calculés selon les quantités détenues à la date de détachement.</p>
      <code>Total = Σ (Montant/action × Qté détenue)</code>
    </>
  ),
  liquidites: (
    <>
      <strong>Liquidités Disponibles</strong>
      <p>Capital non investi. Cliquez sur la card pour définir votre capital total de référence.</p>
      <code>Liquidités = Capital Total − Capital Investi</code>
      <p className="tt-note">💡 Ce paramètre est sauvegardé sur votre compte.</p>
    </>
  ),
  risque: (
    <>
      <strong>Risque de Concentration</strong>
      <p>Mesure la concentration du portefeuille sur une seule valeur. Plus une position est dominante, plus le risque est élevé.</p>
      <code>&gt; 60% → CRITIQUE &nbsp;·&nbsp; &gt; 40% → ÉLEVÉ</code>
      <code>&gt; 25% → MODÉRÉ &nbsp;·&nbsp; ≤ 25% → SAIN</code>
      <p className="tt-note">⚡ Recommandation : aucune position ne devrait dépasser 25%.</p>
    </>
  ),
  alpha: (
    <>
      <strong>Alpha (Surperformance)</strong>
      <p>Mesure l'écart entre la performance de votre portefeuille et celle de l'indice MASI.</p>
      <code>Alpha = Perf. Portefeuille − Perf. MASI</code>
      <p className="tt-note">🚀 Un Alpha positif signifie que vous battez le marché.</p>
    </>
  ),
  rendementReel: (
    <>
      <strong>Rendement Réel (vs Inflation)</strong>
      <p>Performance de votre portefeuille après déduction de l'inflation annuelle au Maroc (0.9% à fin mars 2026).</p>
      <code>Rendement Réel ≈ Rendement Nominal − Inflation</code>
      <p className="tt-note">💡 Un rendement réel positif signifie que vous gagnez du pouvoir d'achat.</p>
    </>
  ),
};

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface PortfolioStatsProps {
  totalInvestedNet: number;
  totalMarketValue: number;
  totalPvNette: number;
  realizedPnL: number;
  totalPerformance: number;
  totalDividends: number;
  initialCapital: number;
  liquidites: number | null;
  investmentRate: number | null;
  riskScore: { score: number; label: string; color: string };
  inflationRate: number;
  masiReturn: number;
  showCapitalInput: boolean;
  capitalInput: string;
  setCapitalInput: (val: string) => void;
  setShowCapitalInput: (val: boolean) => void;
  handleSaveCapital: () => void;
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({
  totalInvestedNet,
  totalMarketValue,
  totalPvNette,
  realizedPnL,
  totalPerformance,
  totalDividends,
  initialCapital,
  liquidites,
  investmentRate,
  riskScore,
  inflationRate,
  masiReturn,
  showCapitalInput,
  capitalInput,
  setCapitalInput,
  setShowCapitalInput,
  handleSaveCapital
}) => {
  const realReturn = totalPerformance - inflationRate;
  const alpha = totalPerformance - masiReturn;
  
  return (
    <div className="stats-grid animate-fade-in" style={{ animationDelay: '0.1s' }}>

      <div className="stat-card glass-heavy">
        <div className="stat-icon-box"><Briefcase size={18} /></div>
        <div className="stat-info">
          <span className="stat-label mono">CAPITAL INVESTI (NET) <KpiTooltip content={tooltips.capitalInvesti} /></span>
          <div className="stat-value">{totalInvestedNet.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="currency">MAD</span></div>
        </div>
      </div>

      <div className="stat-card glass-heavy highlighted">
        <div className="liquid-glow"></div>
        <div className="stat-icon-box white"><PieChart size={18} /></div>
        <div className="stat-info">
          <span className="stat-label mono white opacity-70">VALEUR LIQUIDATIVE <KpiTooltip content={tooltips.valeurLiquidative} /></span>
          <div className="stat-value white">{totalMarketValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="currency white">MAD</span></div>
        </div>
      </div>

      <div className={`stat-card glass-heavy ${totalPvNette >= 0 ? 'bull' : 'bear'}`}>
        <div className="stat-icon-box">{totalPvNette >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}</div>
        <div className="stat-info">
          <span className="stat-label mono">PV NETTE LATENTE <KpiTooltip content={tooltips.pvLatente} /></span>
          <div className="stat-value">{totalPvNette >= 0 ? '+' : ''}{totalPvNette.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className={`stat-card glass-heavy ${realizedPnL >= 0 ? 'bull' : 'bear'}`}>
        <div className="stat-icon-box"><ShieldCheck size={18} /></div>
        <div className="stat-info">
          <span className="stat-label mono">PV RÉALISÉE (NET) <KpiTooltip content={tooltips.pvRealisee} /></span>
          <div className="stat-value">{realizedPnL >= 0 ? '+' : ''}{realizedPnL.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className={`stat-card glass-heavy ${totalPerformance >= 0 ? 'bull' : 'bear'}`}>
        <div className="stat-icon-box"><Percent size={18} /></div>
        <div className="stat-info">
          <span className="stat-label mono">PERFORMANCE NETTE <KpiTooltip content={tooltips.performance} /></span>
          <div className="stat-value">{totalPerformance >= 0 ? '+' : ''}{totalPerformance.toFixed(2)}<span className="pct">%</span></div>
        </div>
      </div>

      <div className="stat-card glass-heavy">
        <div className="stat-icon-box"><Gift size={18} /></div>
        <div className="stat-info">
          <span className="stat-label mono">DIVIDENDES REÇUS <KpiTooltip content={tooltips.dividendes} /></span>
          <div className="stat-value">{totalDividends.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="currency">MAD</span></div>
        </div>
      </div>

      <div className="stat-card glass-heavy clickable" onClick={() => { setCapitalInput(initialCapital.toString()); setShowCapitalInput(!showCapitalInput); }}>
        <div className="stat-icon-box"><DollarSign size={18} /></div>
        <div className="stat-info">
          <span className="stat-label mono">
            LIQUIDITÉS DISPO {investmentRate ? `(${investmentRate.toFixed(0)}% investi)` : ''} <KpiTooltip content={tooltips.liquidites} />
          </span>
          {showCapitalInput ? (
            <div className="capital-input-row" onClick={e => e.stopPropagation()}>
              <input type="number" value={capitalInput} onChange={e => setCapitalInput(e.target.value)} placeholder="Capital total (MAD)" className="capital-input" autoFocus />
              <button onClick={handleSaveCapital} className="capital-save-btn">OK</button>
            </div>
          ) : (
            <div className="stat-value">{liquidites !== null ? liquidites.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '— Définir →'} <span className="currency">MAD</span></div>
          )}
        </div>
      </div>

      <div className="stat-card glass-heavy">
        <div className="stat-icon-box" style={{ color: riskScore.color }}><AlertTriangle size={18} /></div>
        <div className="stat-info">
          <span className="stat-label mono">RISQUE CONCENTRATION <KpiTooltip content={tooltips.risque} /></span>
          <div className="stat-value" style={{ color: riskScore.color, fontSize: '1.2rem' }}>{riskScore.label}</div>
          <div className="risk-gauge-bar">
            <div className="risk-gauge-fill" style={{ width: `${riskScore.score}%`, background: riskScore.color }}></div>
          </div>
        </div>
      </div>

      <div className={`stat-card glass-heavy ${alpha >= 0 ? 'bull' : 'bear'}`}>
        <div className="stat-icon-box"><Zap size={18} /></div>
        <div className="stat-info">
          <span className="stat-label mono">ALPHA VS MASI <KpiTooltip content={tooltips.alpha} /></span>
          <div className="stat-value">{alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}<span className="pct">%</span></div>
          <span className="m-sub">Vs Marché {masiReturn.toFixed(2)}%</span>
        </div>
      </div>

      <div className={`stat-card glass-heavy ${realReturn >= 0 ? 'bull' : 'bear'}`}>
        <div className="stat-icon-box"><TrendingUp size={18} /></div>
        <div className="stat-info">
          <span className="stat-label mono">RENDEMENT RÉEL (NET) <KpiTooltip content={tooltips.rendementReel} /></span>
          <div className="stat-value">{realReturn >= 0 ? '+' : ''}{realReturn.toFixed(2)}<span className="pct">%</span></div>
          <span className="m-sub">Vs Inflation {inflationRate}%</span>
        </div>
      </div>

    </div>
  );
};
