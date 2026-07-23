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
        <>
          {/* Mobile Cards View (< 1024px) */}
          <div className="mobile-only-container gap-2.5 p-3">
            {dividends.map((div, i) => {
              const holding = holdings.find((h: PortfolioHolding) => h.symbol === div.symbol);
              const qty = holding?.totalQuantity || 0;
              const revenue = qty * div.amount_per_share;
              return (
                <div key={i} className="glass-heavy p-3.5 rounded-xl flex flex-col gap-2 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-white">{div.symbol}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">{new Date(div.dividend_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <button className="text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg touch-target" onClick={() => { if(confirm('Supprimer ?')) onDeleteDividend(div.id); }} aria-label="Supprimer le dividende">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs bg-slate-950/70 p-2.5 rounded-lg border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Montant / Titre :</span>
                      <span className="mono font-semibold text-emerald-400">{div.amount_per_share.toFixed(2)} MAD</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Quantité Détenue :</span>
                      <span className="mono font-semibold text-slate-200">{qty} pcs</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-0.5">
                      <span className="text-slate-300 text-[11px] font-bold">Revenu Total Encaissé :</span>
                      <span className="mono font-bold text-emerald-400">+{revenue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= 1024px) */}
          <div className="table-scroll desktop-only-container">
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
                        <button className="delete-tx-btn" onClick={() => { if(confirm('Supprimer ?')) onDeleteDividend(div.id); }} aria-label="Supprimer">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
