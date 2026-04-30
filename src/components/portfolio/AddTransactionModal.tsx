'use client';

import React from 'react';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface AddTransactionModalProps {
  showAddModal: boolean;
  setShowAddModal: (val: boolean) => void;
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
  newTx,
  setNewTx,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  searchRef,
  handleAddTransaction,
}) => {
  if (!showAddModal) return null;

  return (
    <div className="modal-overlay glass-heavy animate-fade-in" onClick={() => setShowAddModal(false)}>
      <div className="modal-content glass-heavy animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="mono">ENREGISTRER UN ORDRE</h2>
          <button onClick={() => setShowAddModal(false)} className="close-modal"><X size={20} /></button>
        </div>
        <form onSubmit={handleAddTransaction} className="modal-form">
          <div className="tx-type-toggle">
            <button type="button" className={`type-btn buy ${newTx.type === 'BUY' ? 'active' : ''}`} onClick={() => setNewTx({ ...newTx, type: 'BUY' })}>
              <ArrowUpRight size={14} /> ACHAT
            </button>
            <button type="button" className={`type-btn sell ${newTx.type === 'SELL' ? 'active' : ''}`} onClick={() => setNewTx({ ...newTx, type: 'SELL' })}>
              <ArrowDownLeft size={14} /> VENTE
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group" ref={searchRef}>
              <label className="mono">SYMBOLE ACTION</label>
              <div className="input-with-suggestions">
                <input type="text" value={newTx.symbol} onChange={e => setNewTx({ ...newTx, symbol: e.target.value.toUpperCase() })} onFocus={() => newTx.symbol.length >= 2 && setShowSuggestions(true)} placeholder="EX: IAM, BCP..." className="terminal-input-field" required autoComplete="off" />
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
              <input type="number" value={newTx.quantity} onChange={e => setNewTx({ ...newTx, quantity: e.target.value })} placeholder="0" className="terminal-input-field" required />
            </div>
            <div className="form-group">
              <label className="mono">{newTx.type === 'BUY' ? "PRIX D'ACHAT" : "PRIX DE VENTE"} (MAD)</label>
              <input type="number" step="0.01" value={newTx.buy_price} onChange={e => setNewTx({ ...newTx, buy_price: e.target.value })} placeholder="0.00" className="terminal-input-field" required />
            </div>
            <div className="form-group">
              <label className="mono">DATE D'EXÉCUTION</label>
              <input type="date" value={newTx.buy_date} onChange={e => setNewTx({ ...newTx, buy_date: e.target.value })} className="terminal-input-field" required />
            </div>
          </div>
          <button type="submit" className={`action-btn-terminal ${newTx.type === 'SELL' ? 'sell-btn' : 'strategy'} full-width`}>
            {newTx.type === 'BUY' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
            <span>{newTx.type === 'BUY' ? "CONFIRMER L'ACHAT" : "CONFIRMER LA VENTE"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
