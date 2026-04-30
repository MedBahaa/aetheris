'use client';

import React from 'react';
import { Gift, Plus, Trash2 } from 'lucide-react';
import { DividendTransaction, PortfolioHolding } from '@/lib/schemas';

interface DividendTableProps {
  dividends: DividendTransaction[];
  holdings: PortfolioHolding[];
  setShowDivModal: (val: boolean) => void;
  onDeleteDividend: (id: string) => void;
}

export const DividendTable: React.FC<DividendTableProps> = ({
  dividends,
  holdings,
  setShowDivModal,
  onDeleteDividend,
}) => {
  return (
    <div className="data-terminal glass-heavy animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="section-header">
        <div className="header-labels">
          <h3 className="mono">HISTORIQUE DES DIVIDENDES</h3>
          <div className="header-subtitle mono-tiny opacity-40">REVENUS PERÇUS SUR POSITIONS</div>
        </div>
        <button onClick={() => setShowDivModal(true)} className="action-btn-terminal strategy">
          <Plus size={14} /> <span>ENREGISTRER DIVIDENDE</span>
        </button>
      </div>
      {dividends.length === 0 ? (
        <div className="empty-state"><Gift size={40} className="opacity-20" /><p className="mono-small">AUCUN DIVIDENDE ENREGISTRÉ.</p></div>
      ) : (
        <div className="table-scroll">
          <table className="institutional-table">
            <thead>
              <tr className="glass-heavy">
                <th>SYMBOLE</th>
                <th>DATE</th>
                <th>MAD / TITRE</th>
                <th>REVENUS TOTAUX</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {dividends.map((div, i) => {
                const holding = holdings.find((h: PortfolioHolding) => h.symbol === div.symbol);
                const qty = holding?.totalQuantity || 0;
                const revenue = qty * div.amount_per_share;
                return (
                  <tr key={i} className="inst-row">
                    <td>
                      <div className="symbol-cell">
                        <div className="s-status"></div>
                        <span className="s-name">{div.symbol}</span>
                      </div>
                    </td>
                    <td className="mono">{new Date(div.dividend_date).toLocaleDateString('fr-FR')}</td>
                    <td className="mono text-emerald">{div.amount_per_share.toFixed(2)} MAD</td>
                    <td>
                      <div className="momentum-box bull">
                        <span className="m-abs mono">+{revenue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="delete-tx-btn" onClick={() => { if(confirm('Supprimer ?')) onDeleteDividend(div.id); }}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
