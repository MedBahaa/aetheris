'use client';

import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

export interface ManualFormState {
  companyName: string;
  ticker: string;
  totalRevenue: string;
  interestIncome: string;
  interestDebt: string;
  interestCash: string;
  marketCap: string;
}

interface ManualCalculatorProps {
  onCalculate: (form: ManualFormState, denominatorType: 'MARKET_CAP' | 'TOTAL_ASSETS') => void;
  activeTab: 'AI_SEARCH' | 'MANUAL';
}

export default function ManualCalculator({ onCalculate, activeTab }: ManualCalculatorProps) {
  const [denominatorType, setDenominatorType] = useState<'MARKET_CAP' | 'TOTAL_ASSETS'>('MARKET_CAP');
  const [manualForm, setManualForm] = useState<ManualFormState>({
    companyName: '', ticker: '', totalRevenue: '', interestIncome: '',
    interestDebt: '', interestCash: '', marketCap: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(manualForm, denominatorType);
  };

  if (activeTab !== 'MANUAL') return null;

  return (
    <form onSubmit={handleSubmit} className="manual-calc-form glass-heavy animate-fade-in">
      <div className="manual-header">
        <h3 className="manual-title">Saisie Manuelle des États Financiers</h3>
        <div className="denom-switch">
          <button
            type="button"
            onClick={() => setDenominatorType('MARKET_CAP')}
            className={`denom-btn ${denominatorType === 'MARKET_CAP' ? 'active' : ''}`}
          >
            CAPITALISATION
          </button>
          <button
            type="button"
            onClick={() => setDenominatorType('TOTAL_ASSETS')}
            className={`denom-btn ${denominatorType === 'TOTAL_ASSETS' ? 'active' : ''}`}
          >
            TOTAL ACTIF
          </button>
        </div>
      </div>

      <div className="manual-grid-2">
        <div className="manual-field">
          <label className="mono-tiny manual-label">NOM ENTREPRISE</label>
          <input
            type="text"
            className="manual-input"
            placeholder="Ex: Itissalat Al-Maghrib"
            value={manualForm.companyName}
            onChange={e => setManualForm({ ...manualForm, companyName: e.target.value })}
            required
          />
        </div>
        <div className="manual-field">
          <label className="mono-tiny manual-label">TICKER (OPTIONNEL)</label>
          <input
            type="text"
            className="manual-input"
            placeholder="Ex: IAM"
            value={manualForm.ticker}
            onChange={e => setManualForm({ ...manualForm, ticker: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      <div className="manual-section">
        <h4 className="manual-section-title">COMPTE DE RÉSULTAT (MAD)</h4>
        <div className="manual-grid-2">
          <div className="manual-field">
            <label className="mono-tiny manual-label">CHIFFRE D&apos;AFFAIRES TOTAL</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              className="manual-input"
              placeholder="Ex: 35000000"
              value={manualForm.totalRevenue}
              onChange={e => setManualForm({ ...manualForm, totalRevenue: e.target.value })}
              required
            />
          </div>
          <div className="manual-field">
            <label className="mono-tiny manual-label">PRODUITS INTÉRÊTS ILLICITES</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              className="manual-input"
              placeholder="Ex: 500000"
              value={manualForm.interestIncome}
              onChange={e => setManualForm({ ...manualForm, interestIncome: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      <div className="manual-section">
        <h4 className="manual-section-title">BILAN &amp; MARCHÉ (MAD)</h4>
        <div className="manual-grid-3">
          <div className="manual-field">
            <label className="mono-tiny manual-label">DETTES PORTEUSES D&apos;INTÉRÊTS</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              className="manual-input"
              placeholder="Emprunts Bancaires..."
              value={manualForm.interestDebt}
              onChange={e => setManualForm({ ...manualForm, interestDebt: e.target.value })}
              required
            />
          </div>
          <div className="manual-field">
            <label className="mono-tiny manual-label">TRÉSORERIE &amp; PLACEMENTS</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              className="manual-input"
              placeholder="Cash, OPCVM..."
              value={manualForm.interestCash}
              onChange={e => setManualForm({ ...manualForm, interestCash: e.target.value })}
              required
            />
          </div>
          <div className="manual-field">
            <label className="mono-tiny manual-label">
              {denominatorType === 'MARKET_CAP' ? 'CAPITALISATION (36M MOY.)' : 'TOTAL ACTIF'}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              className="manual-input"
              placeholder="Dénominateur..."
              value={manualForm.marketCap}
              onChange={e => setManualForm({ ...manualForm, marketCap: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      <button type="submit" className="manual-submit-btn">
        <Calculator size={16} />
        <span>CALCULER LA CONFORMITÉ MANUELLE</span>
      </button>

      <style jsx>{`
        .manual-calc-form {
          padding: 1.5rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          position: relative;
          z-index: 10;
        }
        .manual-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .manual-title { font-size: 1.1rem; font-weight: 800; color: #fff; margin: 0; }
        .denom-switch {
          display: inline-flex;
          gap: 4px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 4px;
        }
        .denom-btn {
          min-height: 36px;
          padding: 0 0.75rem;
          border: none;
          border-radius: 7px;
          background: transparent;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .denom-btn.active { background: rgba(255, 255, 255, 0.14); color: #fff; }
        .manual-section {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .manual-section-title { font-size: 12px; font-weight: 800; color: #cbd5e1; margin: 0; letter-spacing: 0.04em; }
        .manual-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
        .manual-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
        .manual-field { display: flex; flex-direction: column; gap: 0.45rem; }
        .manual-label { color: #94a3b8; font-size: 10px; font-weight: 700; }
        .manual-input {
          width: 100%;
          min-height: 46px;
          padding: 0.7rem 0.9rem;
          border-radius: 0.75rem;
          background: rgba(0, 0, 0, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 14px;
          outline: none;
        }
        .manual-input:focus { border-color: rgba(16, 185, 129, 0.5); }
        .manual-submit-btn {
          width: 100%;
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          border: none;
          border-radius: 0.9rem;
          background: #fff;
          color: #020617;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.06em;
          cursor: pointer;
        }
        @media (max-width: 768px) {
          .manual-calc-form { padding: 1.1rem; }
          .manual-grid-2, .manual-grid-3 { grid-template-columns: 1fr; gap: 0.85rem; }
          .denom-switch { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
          .manual-input { font-size: 16px; }
        }
      `}</style>
    </form>
  );
}
