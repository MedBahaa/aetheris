'use client';

import React from 'react';
import { Gift, Plus, Trash2 } from 'lucide-react';
import { DividendTransaction, PortfolioHolding } from '@/lib/schemas';
import { DIVIDEND_TOTAL_TAX_RATE, DIVIDEND_NET_RATIO } from '@/lib/portfolio-constants';

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
          <div className="header-subtitle mono-tiny opacity-40">REVENUS PERÇUS NETS (DÉDUCTIONS 13,45 % INCLUSES)</div>
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
              const grossRevenue = qty * div.amount_per_share;
              const totalTax = grossRevenue * DIVIDEND_TOTAL_TAX_RATE; // 13.45%
              const netRevenue = grossRevenue * DIVIDEND_NET_RATIO; // 86.55%

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
                      <span className="text-slate-400 text-[11px]">Brut / Titre :</span>
                      <span className="mono font-semibold text-slate-200">{div.amount_per_share.toFixed(2)} MAD</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Quantité Détenue :</span>
                      <span className="mono font-semibold text-slate-200">{qty} pcs</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-400 text-[11px]">
                      <span>Retenue (13,45 % = 11,25% TPA + 2,20% Wafa) :</span>
                      <span className="mono font-semibold">-{totalTax.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-0.5">
                      <span className="text-slate-100 text-[11px] font-bold">🟢 Revenu Net Encaissé (86,55 %) :</span>
                      <span className="mono font-bold text-emerald-400">+{netRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD</span>
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
                  <th>BRUT / TITRE</th>
                  <th>REVENUS BRUTS</th>
                  <th>RETENUES (13,45%)</th>
                  <th>NET EN COMPTE (86,55%)</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((div, i) => {
                  const holding = holdings.find((h: PortfolioHolding) => h.symbol === div.symbol);
                  const qty = holding?.totalQuantity || 0;
                  const grossRevenue = qty * div.amount_per_share;
                  const itemTax = grossRevenue * DIVIDEND_TOTAL_TAX_RATE; // 13.45%
                  const itemNet = grossRevenue * DIVIDEND_NET_RATIO; // 86.55%

                  return (
                    <tr key={i} className="inst-row">
                      <td>
                        <div className="symbol-cell">
                          <div className="s-status"></div>
                          <span className="s-name">{div.symbol}</span>
                        </div>
                      </td>
                      <td className="mono">{new Date(div.dividend_date).toLocaleDateString('fr-FR')}</td>
                      <td className="mono text-slate-300">{div.amount_per_share.toFixed(2)} MAD</td>
                      <td className="mono text-slate-300">{grossRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD</td>
                      <td className="mono text-rose-400">-{itemTax.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD</td>
                      <td>
                        <div className="momentum-box bull">
                          <span className="m-abs mono text-emerald font-bold">+{itemNet.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD</span>
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
          
          {/* TOTALS SUMMARY */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 p-4 glass-heavy rounded-xl border border-white/5">
            <div className="text-slate-400 text-sm mono">RÉCAPITULATIF</div>
            <div className="flex flex-wrap items-center gap-6 md:gap-8">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold tracking-wider">TOTAL BRUT</span>
                <span className="mono text-slate-200 font-medium">
                  {dividends.reduce((acc, div) => {
                    const holding = holdings.find((h) => h.symbol === div.symbol);
                    return acc + ((holding?.totalQuantity || 0) * div.amount_per_share);
                  }, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-rose-400/70 font-bold tracking-wider">TOTAL RETENUES</span>
                <span className="mono text-rose-400 font-medium">
                  -{dividends.reduce((acc, div) => {
                    const holding = holdings.find((h) => h.symbol === div.symbol);
                    return acc + ((holding?.totalQuantity || 0) * div.amount_per_share * DIVIDEND_TOTAL_TAX_RATE);
                  }, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD
                </span>
              </div>
              <div className="flex flex-col gap-1 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <span className="text-[10px] text-emerald-500/70 font-bold tracking-wider">TOTAL NET ENCAISSÉ</span>
                <span className="mono text-emerald-400 font-bold text-lg">
                  +{dividends.reduce((acc, div) => {
                    const holding = holdings.find((h) => h.symbol === div.symbol);
                    return acc + ((holding?.totalQuantity || 0) * div.amount_per_share * DIVIDEND_NET_RATIO);
                  }, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
