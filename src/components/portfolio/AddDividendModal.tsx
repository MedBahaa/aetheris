'use client';

import React, { useEffect } from 'react';
import { X, Gift, CheckCircle2 } from 'lucide-react';
import { PortfolioHolding } from '@/lib/schemas';
import {
  DIVIDEND_STATE_TAX,
  DIVIDEND_BROKER_FEE,
  DIVIDEND_TOTAL_TAX_RATE,
  DIVIDEND_NET_RATIO,
} from '@/lib/portfolio-constants';

interface AddDividendModalProps {
  showDivModal: boolean;
  setShowDivModal: (val: boolean) => void;
  newDiv: {
    symbol: string;
    amount_per_share: string;
    dividend_date: string;
  };
  setNewDiv: (val: any) => void;
  handleAddDividend: (e: React.FormEvent) => void;
  holdings?: PortfolioHolding[];
  suggestions: any[];
  showSuggestions: boolean;
  setShowSuggestions: (val: boolean) => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
}

export const AddDividendModal: React.FC<AddDividendModalProps> = ({
  showDivModal,
  setShowDivModal,
  newDiv,
  setNewDiv,
  handleAddDividend,
  holdings = [],
  suggestions,
  showSuggestions,
  setShowSuggestions,
  searchRef,
}) => {
  useEffect(() => {
    if (!showDivModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDivModal(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showDivModal, setShowDivModal]);

  if (!showDivModal) return null;

  const holding = holdings.find((h) => h.symbol.trim().toUpperCase() === newDiv.symbol.trim().toUpperCase());
  const qty = holding?.totalQuantity || 0;
  const amountPerShare = parseFloat(newDiv.amount_per_share) || 0;

  const grossTotal = qty * amountPerShare;
  const tpaStateTax = grossTotal * DIVIDEND_STATE_TAX; // 11.25%
  const wafaBrokerFee = grossTotal * DIVIDEND_BROKER_FEE; // 2.20% TTC
  const totalDeductions = grossTotal * DIVIDEND_TOTAL_TAX_RATE; // 13.45%
  const netReceived = grossTotal * DIVIDEND_NET_RATIO; // 86.55%

  const netPerShare = amountPerShare * DIVIDEND_NET_RATIO;

  return (
    <div
      className="modal-overlay glass-heavy animate-fade-in"
      onClick={() => setShowDivModal(false)}
      aria-modal="true"
      role="dialog"
      aria-label="Enregistrer un dividende"
    >
      <div className="modal-content glass-heavy animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />

        <div className="modal-header">
          <h2 className="mono">ENREGISTRER UN DIVIDENDE</h2>
          <button
            type="button"
            onClick={() => setShowDivModal(false)}
            className="close-modal touch-target"
            aria-label="Fermer la fenêtre"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleAddDividend} className="modal-form">
          <div className="form-grid">
            <div className="form-group" ref={searchRef}>
              <label className="mono">SYMBOLE</label>
              <div className="input-with-suggestions">
                <input
                  type="text"
                  value={newDiv.symbol}
                  onChange={(e) => setNewDiv({ ...newDiv, symbol: e.target.value.toUpperCase() })}
                  onFocus={() => newDiv.symbol.length >= 2 && setShowSuggestions(true)}
                  placeholder="EX: IAM, BCP..."
                  className="terminal-input-field"
                  required
                  autoComplete="off"
                  inputMode="text"
                  autoCapitalize="characters"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="modal-suggestions glass-heavy animate-slide-up" style={{ zIndex: 30 }}>
                    {suggestions.map((item, idx) => (
                      <div
                        key={idx}
                        className="s-item"
                        onClick={() => {
                          setNewDiv({ ...newDiv, symbol: item.symbol || item.name });
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="s-sym-badge mono">{item.symbol}</div>
                        <span className="s-name truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="mono">MONTANT BRUT / TITRE (MAD)</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={newDiv.amount_per_share}
                onChange={(e) => setNewDiv({ ...newDiv, amount_per_share: e.target.value })}
                placeholder="Ex: 7.50"
                className="terminal-input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="mono">DATE DU DIVIDENDE</label>
              <input
                type="date"
                value={newDiv.dividend_date}
                onChange={(e) => setNewDiv({ ...newDiv, dividend_date: e.target.value })}
                className="terminal-input-field"
                required
              />
            </div>
          </div>

          {/* LIVE FISCAL CALCULATOR SIMULATION (13.45% WITHHOLDING) */}
          {amountPerShare > 0 && (
            <div className="fiscal-sim-card animate-fade-in">
              <div className="fiscal-sim-top">
                <span className="fiscal-sim-title">
                  <CheckCircle2 size={15} /> DÉDUCTION FISCALE (13,45%)
                </span>
                <span className="fiscal-qty-badge mono">
                  {qty > 0 ? `${qty} TITRE(S)` : 'ESTIMATION'}
                </span>
              </div>

              {qty > 0 ? (
                <div className="fiscal-rows">
                  <div className="fiscal-row">
                    <span className="fiscal-label">Dividende Brut Total</span>
                    <span className="fiscal-val mono">
                      {grossTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </span>
                  </div>

                  <div className="fiscal-row">
                    <span className="fiscal-label-dot">
                      <span className="fiscal-dot rose" /> Impôt État (11,25%)
                    </span>
                    <span className="fiscal-val rose mono">
                      -{tpaStateTax.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </span>
                  </div>

                  <div className="fiscal-row">
                    <span className="fiscal-label-dot">
                      <span className="fiscal-dot amber" /> Frais Bourse (2,20%)
                    </span>
                    <span className="fiscal-val amber mono">
                      -{wafaBrokerFee.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </span>
                  </div>

                  <div className="fiscal-row fiscal-divider">
                    <span className="fiscal-label-strong">Total Prélèvements</span>
                    <span className="fiscal-val rose mono">
                      -{totalDeductions.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </span>
                  </div>

                  <div className="fiscal-net-box">
                    <span className="fiscal-net-label">
                      <span className="fiscal-net-dot" /> DIVIDENDE NET
                    </span>
                    <span className="fiscal-net-val mono">
                      +{netReceived.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                    </span>
                  </div>
                </div>
              ) : (
                <div className="fiscal-net-box">
                  <span className="fiscal-net-label">Net Estimé (86,55%)</span>
                  <span className="fiscal-net-val mono">
                    +{netPerShare.toFixed(2)} MAD <span className="fiscal-est-unit">/ titre</span>
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => setShowDivModal(false)}
              className="action-btn-terminal touch-target"
            >
              ANNULER
            </button>
            <button type="submit" className="action-btn-terminal strategy touch-target">
              <Gift size={15} /> <span>ENREGISTRER</span>
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .fiscal-sim-card {
          background: rgba(6, 10, 19, 0.85);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 14px;
          padding: 0.95rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .fiscal-sim-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 0.65rem;
        }

        .fiscal-sim-title {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          color: #34d399;
          font-size: 12px;
          font-weight: 800;
        }

        .fiscal-qty-badge {
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          font-size: 10px;
          font-weight: 800;
          padding: 0.25rem 0.6rem;
          border-radius: 8px;
        }

        .fiscal-rows {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 12.5px;
        }

        .fiscal-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .fiscal-divider {
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          padding-top: 0.45rem;
          margin-top: 0.1rem;
        }

        .fiscal-label {
          color: #94a3b8;
        }

        .fiscal-label-strong {
          color: #cbd5e1;
          font-weight: 700;
        }

        .fiscal-label-dot {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: #94a3b8;
          font-size: 12px;
        }

        .fiscal-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .fiscal-dot.rose { background: #fb7185; }
        .fiscal-dot.amber { background: #fbbf24; }

        .fiscal-val {
          font-weight: 700;
          color: #e2e8f0;
        }
        .fiscal-val.rose { color: #fb7185; }
        .fiscal-val.amber { color: #fbbf24; }

        .fiscal-net-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.45rem;
          background: rgba(6, 78, 59, 0.35);
          border: 1px solid rgba(16, 185, 129, 0.28);
          border-radius: 10px;
          padding: 0.7rem 0.85rem;
          margin-top: 0.25rem;
        }

        .fiscal-net-label {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          color: #34d399;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .fiscal-net-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 8px #34d399;
        }

        .fiscal-net-val {
          font-size: 1.05rem;
          font-weight: 900;
          color: #ffffff;
        }

        .fiscal-est-unit {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
