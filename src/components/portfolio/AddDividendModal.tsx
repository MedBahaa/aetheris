'use client';

import React from 'react';
import { X, Gift } from 'lucide-react';

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
}

export const AddDividendModal: React.FC<AddDividendModalProps> = ({
  showDivModal,
  setShowDivModal,
  newDiv,
  setNewDiv,
  handleAddDividend,
}) => {
  if (!showDivModal) return null;

  return (
    <div className="modal-overlay glass-heavy animate-fade-in" onClick={() => setShowDivModal(false)}>
      <div className="modal-content glass-heavy animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="mono">ENREGISTRER UN DIVIDENDE</h2>
          <button onClick={() => setShowDivModal(false)} className="close-modal"><X size={20} /></button>
        </div>
        <form onSubmit={handleAddDividend} className="modal-form">
          <div className="form-grid">
            <div className="form-group">
              <label className="mono">SYMBOLE</label>
              <input type="text" value={newDiv.symbol} onChange={e => setNewDiv({ ...newDiv, symbol: e.target.value.toUpperCase() })} placeholder="EX: IAM" className="terminal-input-field" required />
            </div>
            <div className="form-group">
              <label className="mono">MONTANT / TITRE (MAD)</label>
              <input type="number" step="0.01" value={newDiv.amount_per_share} onChange={e => setNewDiv({ ...newDiv, amount_per_share: e.target.value })} placeholder="Ex: 7.50" className="terminal-input-field" required />
            </div>
            <div className="form-group full-span">
              <label className="mono">DATE DU DIVIDENDE</label>
              <input type="date" value={newDiv.dividend_date} onChange={e => setNewDiv({ ...newDiv, dividend_date: e.target.value })} className="terminal-input-field" required />
            </div>
          </div>
          <button type="submit" className="action-btn-terminal strategy full-width">
            <Gift size={16} /> <span>ENREGISTRER LE DIVIDENDE</span>
          </button>
        </form>
      </div>
    </div>
  );
};
