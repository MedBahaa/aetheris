'use client';

import React from 'react';
import { X, Gift, CheckCircle2 } from 'lucide-react';
import { PortfolioHolding } from '@/lib/schemas';
import { DIVIDEND_STATE_TAX, DIVIDEND_BROKER_FEE, DIVIDEND_TOTAL_TAX_RATE, DIVIDEND_NET_RATIO } from '@/lib/portfolio-constants';

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
  if (!showDivModal) return null;

  const holding = holdings.find(h => h.symbol.trim().toUpperCase() === newDiv.symbol.trim().toUpperCase());
  const qty = holding?.totalQuantity || 0;
  const amountPerShare = parseFloat(newDiv.amount_per_share) || 0;

  const grossTotal = qty * amountPerShare;
  const tpaStateTax = grossTotal * DIVIDEND_STATE_TAX; // 11.25%
  const wafaBrokerFee = grossTotal * DIVIDEND_BROKER_FEE; // 2.20% TTC
  const totalDeductions = grossTotal * DIVIDEND_TOTAL_TAX_RATE; // 13.45%
  const netReceived = grossTotal * DIVIDEND_NET_RATIO; // 86.55%

  const netPerShare = amountPerShare * DIVIDEND_NET_RATIO;

  return (
    <div className="modal-overlay glass-heavy animate-fade-in" onClick={() => setShowDivModal(false)} aria-modal="true" role="dialog">
      <div className="modal-content glass-heavy animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-3 md:hidden" />

        <div className="modal-header">
          <h2 className="mono">ENREGISTRER UN DIVIDENDE</h2>
          <button onClick={() => setShowDivModal(false)} className="close-modal touch-target" aria-label="Fermer la fenêtre"><X size={22} /></button>
        </div>

        <form onSubmit={handleAddDividend} className="modal-form">
          <div className="form-grid">
            <div className="form-group" ref={searchRef}>
              <label className="mono">SYMBOLE</label>
              <div className="input-with-suggestions">
                <input type="text" value={newDiv.symbol} onChange={e => setNewDiv({ ...newDiv, symbol: e.target.value.toUpperCase() })} onFocus={() => newDiv.symbol.length >= 2 && setShowSuggestions(true)} placeholder="EX: IAM, BCP..." className="terminal-input-field" required autoComplete="off" inputMode="text" autoCapitalize="characters" />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="modal-suggestions glass-heavy animate-slide-up">
                    {suggestions.map((item, idx) => (
                      <div key={idx} className="s-item" onClick={() => { setNewDiv({ ...newDiv, symbol: item.symbol || item.name }); setShowSuggestions(false); }}>
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
              <input type="number" step="0.01" inputMode="decimal" value={newDiv.amount_per_share} onChange={e => setNewDiv({ ...newDiv, amount_per_share: e.target.value })} placeholder="Ex: 7.50" className="terminal-input-field" required />
            </div>
            <div className="form-group full-span">
              <label className="mono">DATE DU DIVIDENDE</label>
              <input type="date" value={newDiv.dividend_date} onChange={e => setNewDiv({ ...newDiv, dividend_date: e.target.value })} className="terminal-input-field" required />
            </div>
          </div>

          {/* LIVE FISCAL CALCULATOR SIMULATION (13.45% WITHHOLDING) */}
          {amountPerShare > 0 && (
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-500/30 flex flex-col gap-2 my-1 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-bold border-b border-white/10 pb-2">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={14} /> DÉDUCTION FISCALE 2026 (13,45 %) :
                </span>
                <span className="mono text-white bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                  {qty > 0 ? `${qty} titre(s) détenu(s)` : 'Estimation / titre'}
                </span>
              </div>

              {qty > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dividende Brut Total :</span>
                    <span className="mono font-semibold text-slate-100">{grossTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>🔴 Impôt État (TPA 11,25 %) :</span>
                    <span className="mono">-{tpaStateTax.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>🏦 Frais Wafa Bourse (2,20 % TTC) :</span>
                    <span className="mono">-{wafaBrokerFee.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</span>
                  </div>
                  <div className="flex justify-between text-slate-400 border-t border-white/10 pt-1.5 font-semibold">
                    <span>Total Prélèvements (13,45 %) :</span>
                    <span className="mono text-rose-400">-{totalDeductions.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-500/40 font-bold mt-1">
                    <span>🟢 DIVIDENDE NET EN COMPTE (86,55 %) :</span>
                    <span className="mono text-base text-white">+{netReceived.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                  <span className="text-slate-300">Estimation Net par Titre (86,55 %) :</span>
                  <span className="mono font-bold text-white">+{netPerShare.toFixed(2)} MAD / titre</span>
                </div>
              )}
            </div>
          )}

          <button type="submit" className="action-btn-terminal strategy full-width touch-target">
            <Gift size={16} /> <span>ENREGISTRER LE DIVIDENDE</span>
          </button>
        </form>
      </div>
    </div>
  );
};
