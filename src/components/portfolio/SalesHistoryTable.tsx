'use client';

import React, { useState } from 'react';
import { History, Plus, Trash2, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react';
import { PortfolioTransaction } from '@/lib/schemas';
import { RealizedSaleEvent } from '@/lib/portfolio-service';
import { BROKERAGE_FEE } from '@/lib/portfolio-constants';

interface SalesHistoryTableProps {
  salesHistory: RealizedSaleEvent[];
  transactions: PortfolioTransaction[];
  setShowAddModal: (val: boolean) => void;
  onDeleteTransaction: (id: string) => void;
}

export const SalesHistoryTable: React.FC<SalesHistoryTableProps> = ({
  salesHistory,
  transactions,
  setShowAddModal,
  onDeleteTransaction,
}) => {
  const [viewMode, setViewMode] = useState<'sales' | 'all'>('sales');

  const sortedAllTransactions = [...transactions].sort(
    (a, b) => new Date(b.buy_date).getTime() - new Date(a.buy_date).getTime()
  );

  const totalGrossProceeds = salesHistory.reduce((acc, s) => acc + s.grossProceeds, 0);
  const totalDeductions = salesHistory.reduce((acc, s) => acc + s.sellFee + s.tpvTax, 0);
  const totalNetRealizedPnL = salesHistory.reduce((acc, s) => acc + s.netPnL, 0);

  return (
    <div className="data-terminal glass-heavy animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="header-labels">
          <h3 className="mono">HISTORIQUE DES CESSIONS & OPÉRATIONS</h3>
          <div className="header-subtitle mono-tiny opacity-40">
            SUIVI DES POSITIONS VENDUES, PMP HISTORIQUE, FRAIS (0,99%) & TPV (15%)
          </div>
        </div>

        <div className="sales-controls-bar">
          <div className="sales-view-toggle">
            <button
              type="button"
              onClick={() => setViewMode('sales')}
              className={`sales-toggle-btn mono ${viewMode === 'sales' ? 'active-sales' : ''}`}
            >
              VENTES ({salesHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`sales-toggle-btn mono ${viewMode === 'all' ? 'active-all' : ''}`}
            >
              JOURNAL ({transactions.length})
            </button>
          </div>

          <button type="button" onClick={() => setShowAddModal(true)} className="action-btn-terminal strategy">
            <Plus size={14} /> <span>NOUVEL ORDRE</span>
          </button>
        </div>
      </div>

      {viewMode === 'sales' ? (
        salesHistory.length === 0 ? (
          <div className="empty-state">
            <History size={40} className="opacity-20" />
            <p className="mono-small">AUCUNE POSITION VENDUE POUR LE MOMENT.</p>
          </div>
        ) : (
          <>
            {/* Mobile Summary Strip */}
            <div className="mobile-summary-strip">
              <div className="mobile-summary-item">
                <span className="mobile-summary-label">Brut Cédé</span>
                <span className="mobile-summary-val">{totalGrossProceeds.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</span>
              </div>
              <div className="mobile-summary-item">
                <span className="mobile-summary-label">Frais &amp; TPV</span>
                <span className="mobile-summary-val text-rose">-{totalDeductions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</span>
              </div>
              <div className="mobile-summary-item">
                <span className="mobile-summary-label">PV Nette</span>
                <span className={`mobile-summary-val ${totalNetRealizedPnL >= 0 ? 'text-emerald' : 'text-rose'}`}>
                  {totalNetRealizedPnL >= 0 ? '+' : ''}{totalNetRealizedPnL.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD
                </span>
              </div>
            </div>

            {/* ────────────────── MOBILE CARDS VIEW (< 1024px) ────────────────── */}
            <div className="mobile-cards-list">
              {salesHistory.map((sale) => {
                const isPositive = sale.netPnL >= 0;
                const totalFeesAndTax = sale.sellFee + sale.tpvTax;

                return (
                  <div key={sale.id} className="history-mobile-card">
                    <div className="history-card-head">
                      <div className="history-card-badges">
                        <span className="history-card-symbol">{sale.symbol}</span>
                        <span className={`status-pill ${sale.status === 'CLÔTURÉE' ? 'closed' : 'partial'}`}>
                          {sale.status}
                        </span>
                        <span className="date-pill">
                          {new Date(sale.sellDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="mobile-icon-danger-btn"
                        onClick={() => {
                          if (confirm('Supprimer cette vente de l’historique ?')) onDeleteTransaction(sale.id);
                        }}
                        aria-label="Supprimer la vente"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="history-metrics-box">
                      <div className="history-metric-row">
                        <span className="label">Quantité Vendue</span>
                        <span className="val">{sale.quantity} pcs</span>
                      </div>
                      <div className="history-metric-row">
                        <span className="label">PMP → Vente</span>
                        <span className="val">
                          {sale.pmpAtSale.toFixed(2)} → {sale.sellPrice.toFixed(2)} MAD
                        </span>
                      </div>
                      <div className="history-metric-row">
                        <span className="label">Montant Brut Cédé</span>
                        <span className="val">
                          {sale.grossProceeds.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                        </span>
                      </div>
                      <div className="history-metric-row">
                        <span className="label text-rose">Frais (0,99%) + TPV (15%)</span>
                        <span className="val text-rose">
                          -{totalFeesAndTax.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                        </span>
                      </div>
                      <div className="history-total-row">
                        <span>PV Réalisée Nette</span>
                        <span className={`mono ${isPositive ? 'text-emerald' : 'text-rose'}`}>
                          {isPositive ? '+' : ''}
                          {sale.netPnL.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD ({isPositive ? '+' : ''}{sale.netPnLPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ────────────────── DESKTOP TABLE VIEW (>= 1024px) ────────────────── */}
            <div className="table-scroll desktop-only-container">
              <table className="institutional-table">
                <thead>
                  <tr className="glass-heavy">
                    <th>VALEUR / STATUT</th>
                    <th>DATE VENTE</th>
                    <th>QTÉ VENDUE</th>
                    <th>PMP ACHAT (NET)</th>
                    <th>PRIX VENTE</th>
                    <th>MONTANT BRUT</th>
                    <th>FRAIS &amp; TPV (15%)</th>
                    <th>PV RÉALISÉE (NET)</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((sale) => {
                    const isPositive = sale.netPnL >= 0;
                    const totalFeesAndTax = sale.sellFee + sale.tpvTax;

                    return (
                      <tr key={sale.id} className="inst-row">
                        <td>
                          <div className="symbol-cell" style={{ gap: '8px' }}>
                            <div className="s-status"></div>
                            <span className="s-name">{sale.symbol}</span>
                            <span
                              className="mono"
                              style={{
                                fontSize: '9px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 800,
                                background:
                                  sale.status === 'CLÔTURÉE' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: sale.status === 'CLÔTURÉE' ? '#c084fc' : '#60a5fa',
                                border:
                                  sale.status === 'CLÔTURÉE'
                                    ? '1px solid rgba(168, 85, 247, 0.3)'
                                    : '1px solid rgba(59, 130, 246, 0.3)',
                              }}
                            >
                              {sale.status}
                            </span>
                          </div>
                        </td>
                        <td className="mono">{new Date(sale.sellDate).toLocaleDateString('fr-FR')}</td>
                        <td className="mono font-bold">{sale.quantity} pcs</td>
                        <td className="mono text-slate-300">{sale.pmpAtSale.toFixed(2)} MAD</td>
                        <td className="mono text-white font-bold">{sale.sellPrice.toFixed(2)} MAD</td>
                        <td className="mono text-slate-300">
                          {sale.grossProceeds.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                        </td>
                        <td className="mono text-rose-400">
                          <div className="flex flex-col">
                            <span>-{totalFeesAndTax.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD</span>
                            <span className="mono-tiny opacity-50">
                              Courtage: {sale.sellFee.toFixed(0)} | TPV: {sale.tpvTax.toFixed(0)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={`momentum-box ${isPositive ? 'bull' : 'bear'}`}>
                            <span className="m-abs mono font-bold">
                              {isPositive ? '+' : ''}
                              {sale.netPnL.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                            </span>
                            <span className="mono-tiny opacity-70">
                              {isPositive ? '+' : ''}
                              {sale.netPnLPct.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="delete-tx-btn"
                            onClick={() => {
                              if (confirm('Supprimer cette vente de l’historique ?')) onDeleteTransaction(sale.id);
                            }}
                            aria-label="Supprimer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="glass-heavy border-t border-white/10">
                  <tr>
                    <td colSpan={5} className="text-right text-slate-400 text-xs font-bold tracking-widest pr-4 uppercase py-4">
                      BILAN TOTAL DES CESSIONS :
                    </td>
                    <td className="mono text-slate-200 font-bold">
                      {totalGrossProceeds.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                    </td>
                    <td className="mono text-rose-400 font-bold">
                      -{totalDeductions.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                    </td>
                    <td>
                      <div
                        className={`momentum-box ${totalNetRealizedPnL >= 0 ? 'bull' : 'bear'}`}
                        style={{
                          background: totalNetRealizedPnL >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                          borderColor: totalNetRealizedPnL >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
                        }}
                      >
                        <span className="m-abs mono font-bold">
                          {totalNetRealizedPnL >= 0 ? '+' : ''}
                          {totalNetRealizedPnL.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                        </span>
                      </div>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )
      ) : sortedAllTransactions.length === 0 ? (
        <div className="empty-state">
          <History size={40} className="opacity-20" />
          <p className="mono-small">AUCUN ORDRE ENREGISTRÉ DANS LE JOURNAL.</p>
        </div>
      ) : (
        <>
          {/* ────────────────── JOURNAL COMPLET (ACHATS & VENTES) ────────────────── */}
          <div className="mobile-cards-list">
            {sortedAllTransactions.map((tx) => {
              const isBuy = (tx.type || 'BUY') === 'BUY';
              const gross = tx.quantity * tx.buy_price;
              const fee = gross * BROKERAGE_FEE;
              const totalWithFees = isBuy ? gross + fee : gross - fee;

              return (
                <div key={tx.id} className="history-mobile-card">
                  <div className="history-card-head">
                    <div className="history-card-badges">
                      <span className={`mobile-tx-badge ${isBuy ? 'buy' : 'sell'}`}>
                        {isBuy ? 'ACHAT' : 'VENTE'}
                      </span>
                      <span className="history-card-symbol">{tx.symbol}</span>
                      <span className="date-pill">
                        {new Date(tx.buy_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mobile-icon-danger-btn"
                      onClick={() => {
                        if (confirm('Supprimer cet ordre ?')) onDeleteTransaction(tx.id);
                      }}
                      aria-label="Supprimer l'ordre"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="history-metrics-box">
                    <div className="history-metric-row">
                      <span className="label">{tx.quantity} pcs @ {tx.buy_price.toFixed(2)} MAD</span>
                      <span className={`val ${isBuy ? 'text-emerald' : 'text-rose'}`}>
                        {totalWithFees.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="table-scroll desktop-only-container">
            <table className="institutional-table">
              <thead>
                <tr className="glass-heavy">
                  <th>TYPE D&apos;ORDRE</th>
                  <th>SYMBOLE</th>
                  <th>DATE D&apos;EXÉCUTION</th>
                  <th>QUANTITÉ</th>
                  <th>PRIX UNITAIRE</th>
                  <th>FRAIS COURTAGE (0,99%)</th>
                  <th>MONTANT NET OPÉRATION</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sortedAllTransactions.map((tx) => {
                  const isBuy = (tx.type || 'BUY') === 'BUY';
                  const gross = tx.quantity * tx.buy_price;
                  const fee = gross * BROKERAGE_FEE;
                  const netAmount = isBuy ? gross + fee : gross - fee;

                  return (
                    <tr key={tx.id} className="inst-row">
                      <td>
                        <div className={`tx-type-badge ${isBuy ? 'buy' : 'sell'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {isBuy ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                          {isBuy ? 'ACHAT (BUY)' : 'VENTE (SELL)'}
                        </div>
                      </td>
                      <td>
                        <div className="symbol-cell">
                          <div className="s-status"></div>
                          <span className="s-name">{tx.symbol}</span>
                        </div>
                      </td>
                      <td className="mono">{new Date(tx.buy_date).toLocaleDateString('fr-FR')}</td>
                      <td className="mono font-bold">{tx.quantity} pcs</td>
                      <td className="mono text-slate-300">{tx.buy_price.toFixed(2)} MAD</td>
                      <td className="mono text-rose-400">-{fee.toFixed(2)} MAD</td>
                      <td className="mono font-bold text-white">
                        {netAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="delete-tx-btn"
                          onClick={() => {
                            if (confirm('Supprimer cet ordre ?')) onDeleteTransaction(tx.id);
                          }}
                          aria-label="Supprimer"
                        >
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

      <style jsx>{`
        .sales-controls-bar {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }
        .sales-view-toggle {
          display: inline-flex;
          background: rgba(0, 0, 0, 0.45);
          padding: 3px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .sales-toggle-btn {
          padding: 0.45rem 0.85rem;
          min-height: 36px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          background: transparent;
          color: #94a3b8;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .sales-toggle-btn.active-sales {
          background: rgba(16, 185, 129, 0.16);
          color: #34d399;
        }
        .sales-toggle-btn.active-all {
          background: rgba(59, 130, 246, 0.16);
          color: #60a5fa;
        }
        @media (max-width: 767px) {
          .sales-controls-bar {
            width: 100%;
          }
          .sales-view-toggle {
            display: grid;
            grid-template-columns: 1fr 1fr;
            flex: 1;
          }
          .sales-toggle-btn {
            min-height: 40px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};
