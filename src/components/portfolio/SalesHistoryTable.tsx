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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(0,0,0,0.4)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('sales')}
              className="mono"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'sales' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: viewMode === 'sales' ? '#10b981' : '#94a3b8',
              }}
            >
              VENTES RÉALISÉES ({salesHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className="mono"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'all' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: viewMode === 'all' ? '#60a5fa' : '#94a3b8',
              }}
            >
              JOURNAL COMPLET ({transactions.length})
            </button>
          </div>

          <button onClick={() => setShowAddModal(true)} className="action-btn-terminal strategy">
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
            {/* ────────────────── MOBILE CARDS VIEW (< 1024px) ────────────────── */}
            <div className="mobile-only-container gap-2.5 p-3">
              {salesHistory.map((sale) => {
                const isPositive = sale.netPnL >= 0;
                const totalFeesAndTax = sale.sellFee + sale.tpvTax;

                return (
                  <div key={sale.id} className="glass-heavy p-3.5 rounded-xl flex flex-col gap-2 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-white">{sale.symbol}</span>
                        <span
                          className="text-[9px] px-2 py-0.5 rounded font-mono font-bold"
                          style={{
                            background: sale.status === 'CLÔTURÉE' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: sale.status === 'CLÔTURÉE' ? '#c084fc' : '#60a5fa',
                            border: sale.status === 'CLÔTURÉE' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                          }}
                        >
                          {sale.status}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                          {new Date(sale.sellDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <button
                        className="text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg touch-target"
                        onClick={() => {
                          if (confirm('Supprimer cette vente de l’historique ?')) onDeleteTransaction(sale.id);
                        }}
                        aria-label="Supprimer la vente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs bg-slate-950/70 p-2.5 rounded-lg border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Quantité Vendue :</span>
                        <span className="mono font-semibold text-slate-200">{sale.quantity} pcs</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">PMP d&apos;achat → Prix Vente :</span>
                        <span className="mono font-semibold text-slate-200">
                          {sale.pmpAtSale.toFixed(2)} → {sale.sellPrice.toFixed(2)} MAD
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Montant Brut Cédé :</span>
                        <span className="mono font-semibold text-slate-200">
                          {sale.grossProceeds.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-rose-400 text-[11px]">
                        <span>Frais (0,99%) + TPV (15%) :</span>
                        <span className="mono font-semibold">
                          -{totalFeesAndTax.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-0.5">
                        <span className="text-slate-100 text-[11px] font-bold">PV Réalisée Nette :</span>
                        <span className={`mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}
                          {sale.netPnL.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD (
                          {isPositive ? '+' : ''}
                          {sale.netPnLPct.toFixed(2)}%)
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
          <div className="mobile-only-container gap-2.5 p-3">
            {sortedAllTransactions.map((tx) => {
              const isBuy = (tx.type || 'BUY') === 'BUY';
              const gross = tx.quantity * tx.buy_price;
              const fee = gross * BROKERAGE_FEE;
              const totalWithFees = isBuy ? gross + fee : gross - fee;

              return (
                <div key={tx.id} className="glass-heavy p-3.5 rounded-xl flex flex-col gap-2 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[9px] rounded-full font-extrabold ${
                          isBuy
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isBuy ? 'ACHAT' : 'VENTE'}
                      </span>
                      <span className="font-extrabold text-base text-white">{tx.symbol}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                        {new Date(tx.buy_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <button
                      className="text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg touch-target"
                      onClick={() => {
                        if (confirm('Supprimer cet ordre ?')) onDeleteTransaction(tx.id);
                      }}
                      aria-label="Supprimer l'ordre"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs bg-slate-950/70 p-2.5 rounded-lg border border-white/5 font-mono">
                    <span className="text-slate-300">
                      {tx.quantity} pcs @ {tx.buy_price.toFixed(2)} MAD
                    </span>
                    <span className={isBuy ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {totalWithFees.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                    </span>
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
    </div>
  );
};
