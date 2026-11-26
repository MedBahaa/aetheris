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
          {/* Mobile Summary Strip (< 1024px) */}
          {(() => {
            const totalGross = dividends.reduce((acc, div) => {
              const h = holdings.find((item) => item.symbol === div.symbol);
              return acc + ((h?.totalQuantity || 0) * div.amount_per_share);
            }, 0);
            const totalTax = totalGross * DIVIDEND_TOTAL_TAX_RATE;
            const totalNet = totalGross * DIVIDEND_NET_RATIO;
            return (
              <div className="mobile-summary-strip">
                <div className="mobile-summary-item">
                  <span className="mobile-summary-label">Brut Total</span>
                  <span className="mobile-summary-val">{totalGross.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</span>
                </div>
                <div className="mobile-summary-item">
                  <span className="mobile-summary-label">Retenues</span>
                  <span className="mobile-summary-val text-rose">-{totalTax.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</span>
                </div>
                <div className="mobile-summary-item">
                  <span className="mobile-summary-label">Net Reçu</span>
                  <span className="mobile-summary-val text-emerald">+{totalNet.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</span>
                </div>
              </div>
            );
          })()}

          {/* Mobile Cards View (< 1024px) */}
          <div className="mobile-cards-list">
            {dividends.map((div, i) => {
              const holding = holdings.find((h: PortfolioHolding) => h.symbol === div.symbol);
              const qty = holding?.totalQuantity || 0;
              const grossRevenue = qty * div.amount_per_share;
              const totalTax = grossRevenue * DIVIDEND_TOTAL_TAX_RATE; // 13.45%
              const netRevenue = grossRevenue * DIVIDEND_NET_RATIO; // 86.55%

              return (
                <div key={div.id || i} className="history-mobile-card">
                  <div className="history-card-head">
                    <div className="history-card-badges">
                      <span className="history-card-symbol">{div.symbol}</span>
                      <span className="date-pill">{new Date(div.dividend_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <button
                      type="button"
                      className="mobile-icon-danger-btn"
                      onClick={() => { if(confirm('Supprimer ?')) onDeleteDividend(div.id); }}
                      aria-label="Supprimer le dividende"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="history-metrics-box">
                    <div className="history-metric-row">
                      <span className="label">Brut / Titre</span>
                      <span className="val">{div.amount_per_share.toFixed(2)} MAD</span>
                    </div>
                    <div className="history-metric-row">
                      <span className="label">Quantité Détenue</span>
                      <span className="val">{qty} pcs</span>
                    </div>
                    <div className="history-metric-row">
                      <span className="label text-rose">Retenue (13,45%)</span>
                      <span className="val text-rose">-{totalTax.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</span>
                    </div>
                    <div className="history-total-row">
                      <span>Net Encaissé (86,55%)</span>
                      <span className="mono text-emerald">+{netRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD</span>
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
              <tfoot className="glass-heavy border-t border-white/10">
                <tr>
                  <td colSpan={3} className="text-right text-slate-400 text-xs font-bold tracking-widest pr-4 uppercase py-4">TOTAL DES DIVIDENDES :</td>
                  <td className="mono text-slate-200 font-bold">
                    {dividends.reduce((acc, div) => {
                      const holding = holdings.find((h) => h.symbol === div.symbol);
                      return acc + ((holding?.totalQuantity || 0) * div.amount_per_share);
                    }, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} MAD
                  </td>
                  <td className="mono text-rose-400 font-bold">
                    -{dividends.reduce((acc, div) => {
                      const holding = holdings.find((h) => h.symbol === div.symbol);
                      return acc + ((holding?.totalQuantity || 0) * div.amount_per_share * DIVIDEND_TOTAL_TAX_RATE);
                    }, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} MAD
                  </td>
                  <td>
                    <div className="momentum-box bull" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                      <span className="m-abs mono text-emerald font-bold" style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}>
                        +{dividends.reduce((acc, div) => {
                          const holding = holdings.find((h) => h.symbol === div.symbol);
                          return acc + ((holding?.totalQuantity || 0) * div.amount_per_share * DIVIDEND_NET_RATIO);
                        }, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} MAD
                      </span>
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
