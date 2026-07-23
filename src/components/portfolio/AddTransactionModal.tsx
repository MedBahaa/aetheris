'use client';

import React from 'react';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { PortfolioHolding } from '@/lib/schemas';

interface AddTransactionModalProps {
  showAddModal: boolean;
  setShowAddModal: (val: boolean) => void;
  holdings: PortfolioHolding[];
  newTx: {
    symbol: string;
    quantity: string;
    buy_price: string;
    buy_date: string;
    type: 'BUY' | 'SELL';
  };
  setNewTx: (val: any) => void;
  suggestions: any[];
  showSuggestions: boolean;
  setShowSuggestions: (val: boolean) => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
  handleAddTransaction: (e: React.FormEvent) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  showAddModal,
  setShowAddModal,
  holdings,
  newTx,
  setNewTx,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  searchRef,
  handleAddTransaction,
}) => {
  if (!showAddModal) return null;

  const quantityNum = parseFloat(newTx.quantity) || 0;
  const priceNum = parseFloat(newTx.buy_price) || 0;
  
  let showSimulation = false;
  let simulatedPmp = 0;
  let estimatedFees = 0;
  let simulatedQuantity = 0;
  let warningMessage = '';

  if (newTx.symbol && quantityNum > 0 && priceNum > 0) {
    const existing = holdings.find(h => h.symbol.toUpperCase() === newTx.symbol.toUpperCase());
    const BROKERAGE_FEE = 0.0099; // 0.99%

    if (newTx.type === 'BUY') {
      const currentQty = existing ? existing.totalQuantity : 0;
      const currentPmp = existing ? existing.weightedAveragePrice : 0;
      const currentCost = currentQty * currentPmp;
      
      const newCost = quantityNum * priceNum * (1 + BROKERAGE_FEE);
      simulatedQuantity = currentQty + quantityNum;
      simulatedPmp = simulatedQuantity > 0 ? (currentCost + newCost) / simulatedQuantity : 0;
      estimatedFees = quantityNum * priceNum * BROKERAGE_FEE;
      showSimulation = true;
    } else if (newTx.type === 'SELL') {
      const currentQty = existing ? existing.totalQuantity : 0;
      const currentPmp = existing ? existing.weightedAveragePrice : 0;
      
      if (quantityNum > currentQty) {
        warningMessage = `⚠️ Quantité insuffisante (détenu : ${currentQty})`;
      } else {
        simulatedQuantity = currentQty - quantityNum;
        simulatedPmp = currentPmp;
        estimatedFees = quantityNum * priceNum * BROKERAGE_FEE;
        showSimulation = true;
      }
    }
  }

  return (
    <div className="modal-overlay glass-heavy animate-fade-in" onClick={() => setShowAddModal(false)} aria-modal="true" role="dialog">
      <div className="modal-content glass-heavy animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-3 md:hidden" />

        <div className="modal-header">
          <h2 className="mono">ENREGISTRER UN ORDRE</h2>
          <button onClick={() => setShowAddModal(false)} className="close-modal touch-target" aria-label="Fermer la fenêtre"><X size={22} /></button>
        </div>
        <form onSubmit={handleAddTransaction} className="modal-form">
          <div className="tx-type-toggle">
            <button type="button" className={`type-btn buy touch-target ${newTx.type === 'BUY' ? 'active' : ''}`} onClick={() => setNewTx({ ...newTx, type: 'BUY' })}>
              <ArrowUpRight size={14} /> ACHAT
            </button>
            <button type="button" className={`type-btn sell touch-target ${newTx.type === 'SELL' ? 'active' : ''}`} onClick={() => setNewTx({ ...newTx, type: 'SELL' })}>
              <ArrowDownLeft size={14} /> VENTE
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group" ref={searchRef}>
              <label className="mono">SYMBOLE ACTION</label>
              <div className="input-with-suggestions">
                <input type="text" value={newTx.symbol} onChange={e => setNewTx({ ...newTx, symbol: e.target.value.toUpperCase() })} onFocus={() => newTx.symbol.length >= 2 && setShowSuggestions(true)} placeholder="EX: IAM, BCP..." className="terminal-input-field" required autoComplete="off" inputMode="text" autoCapitalize="characters" />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="modal-suggestions glass-heavy animate-slide-up">
                    {suggestions.map((item, idx) => (
                      <div key={idx} className="s-item" onClick={() => { setNewTx({ ...newTx, symbol: item.symbol || item.name }); setShowSuggestions(false); }}>
                        <div className="s-sym-badge mono">{item.symbol}</div>
                        <span className="s-name truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="mono">QUANTITÉ</label>
              <input type="number" inputMode="numeric" value={newTx.quantity} onChange={e => setNewTx({ ...newTx, quantity: e.target.value })} placeholder="0" className="terminal-input-field" required />
            </div>
            <div className="form-group">
              <label className="mono">{newTx.type === 'BUY' ? "PRIX D'ACHAT" : "PRIX DE VENTE"} (MAD)</label>
              <input type="number" step="0.01" inputMode="decimal" value={newTx.buy_price} onChange={e => setNewTx({ ...newTx, buy_price: e.target.value })} placeholder="0.00" className="terminal-input-field" required />
            </div>
            <div className="form-group">
              <label className="mono">DATE D'EXÉCUTION</label>
              <input type="date" value={newTx.buy_date} onChange={e => setNewTx({ ...newTx, buy_date: e.target.value })} className="terminal-input-field" required />
            </div>
          </div>

          {showSimulation && (
            <div className="simulator-box mono-tiny animate-fade-in" style={{ marginBottom: '1.5rem' }}>
              <div className="sim-title">📊 SIMULATION D'IMPACT</div>
              <div className="sim-row">
                <span>Frais de courtage estimés (0.99%) :</span>
                <span>{estimatedFees.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD</span>
              </div>
              <div className="sim-row">
                <span>Nouvelle Quantité :</span>
                <span>{simulatedQuantity} {newTx.type === 'BUY' ? `(+${quantityNum})` : `(-${quantityNum})`}</span>
              </div>
              {newTx.type === 'BUY' && (
                <div className="sim-row">
                  <span>Nouveau PMP estimé (frais inclus) :</span>
                  <span className="text-emerald">{simulatedPmp.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD</span>
                </div>
              )}
            </div>
          )}
          {warningMessage && (
            <div className="sim-warning mono-tiny" style={{ marginBottom: '1.5rem' }}>
              {warningMessage}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={() => setShowAddModal(false)} className="action-btn-terminal touch-target">ANNULER</button>
            <button type="submit" className="action-btn-terminal strategy touch-target" disabled={!!warningMessage}>CONFIRMER L'ORDRE</button>
          </div>
        </form>
      </div>
    </div>
  );
};
