'use client';

import React, { useState } from 'react';
import { 
  Plus, Trash2, Target, AlertTriangle, 
  ArrowUpRight, ArrowDownLeft, ShieldCheck, X, ChevronDown, ChevronUp, Bell,
  ArrowUp, ArrowDown, ChevronsUpDown
} from 'lucide-react';
import { PortfolioHolding, PriceAlert } from '@/lib/schemas';

interface PortfolioTableProps {
  holdings: PortfolioHolding[];
  alerts: PriceAlert[];
  totalMarketValue: number;
  expandedSymbol: string | null;
  setExpandedSymbol: (val: string | null) => void;
  alertSymbol: string | null;
  setAlertSymbol: (val: string | null) => void;
  alertForm: { sl_price: string; tp_price: string };
  setAlertForm: React.Dispatch<React.SetStateAction<{ sl_price: string; tp_price: string }>>;
  handleSaveAlert: (symbol: string) => void;
  deletePortfolioTransactionAction: (id: string) => Promise<void>;
  loadData: () => Promise<void>;
  setShowAddModal: (val: boolean) => void;
  onNavigateToStock: (symbol: string) => void;
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({
  holdings,
  alerts,
  totalMarketValue,
  expandedSymbol,
  setExpandedSymbol,
  alertSymbol,
  setAlertSymbol,
  alertForm,
  setAlertForm,
  handleSaveAlert,
  deletePortfolioTransactionAction,
  loadData,
  setShowAddModal,
  onNavigateToStock,
}) => {
  // ────────────────── TRI INTERACTIF ──────────────────
  type SortKey = 'symbol' | 'totalQuantity' | 'weightedAveragePrice' | 'curPrice' | 'valuation' | 'poids' | 'pvNette' | 'perf';
  type SortDir = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey>('valuation');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={10} className="opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp size={10} className="text-emerald" /> : <ArrowDown size={10} className="text-emerald" />;
  };

  const sortedHoldings = [...holdings].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'symbol': return dir * a.symbol.localeCompare(b.symbol);
      case 'totalQuantity': return dir * (a.totalQuantity - b.totalQuantity);
      case 'weightedAveragePrice': return dir * (a.weightedAveragePrice - b.weightedAveragePrice);
      case 'curPrice': return dir * (a.curPrice - b.curPrice);
      case 'valuation': return dir * ((a.totalQuantity * a.curPrice) - (b.totalQuantity * b.curPrice));
      case 'poids': return dir * ((a.totalQuantity * a.curPrice) - (b.totalQuantity * b.curPrice));
      case 'pvNette': return dir * ((a.pvNette || 0) - (b.pvNette || 0));
      case 'perf': {
        const perfA = a.totalCost > 0 ? (a.pvNette || 0) / a.totalCost : 0;
        const perfB = b.totalCost > 0 ? (b.pvNette || 0) / b.totalCost : 0;
        return dir * (perfA - perfB);
      }
      default: return 0;
    }
  });

  return (
    <div className="data-terminal glass-heavy animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="section-header">
        <div className="header-labels">
          <h3 className="mono">ÉTAT DES POSITIONS</h3>
          <div className="header-subtitle mono-tiny opacity-40">INSTITUTIONAL GRADE VIEW</div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="action-btn-terminal strategy">
          <Plus size={14} /> <span>NOUVEL ORDRE</span>
        </button>
      </div>

      {holdings.length === 0 ? (
        <div className="empty-state">
          <Target size={40} className="opacity-20" />
          <p className="mono-small">AUCUNE POSITION OUVERTE.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="institutional-table">
            <thead>
              <tr className="glass-heavy">
                <th style={{ width: '250px', cursor: 'pointer' }} onClick={() => handleSort('symbol')}>
                  <span className="th-sort">SYMBOLE <SortIcon col="symbol" /></span>
                </th>
                <th style={{ width: '80px', cursor: 'pointer' }} onClick={() => handleSort('totalQuantity')}>
                  <span className="th-sort">QTÉ <SortIcon col="totalQuantity" /></span>
                </th>
                <th style={{ width: '120px', cursor: 'pointer' }} onClick={() => handleSort('weightedAveragePrice')}>
                  <span className="th-sort">PMP (NET) <SortIcon col="weightedAveragePrice" /></span>
                </th>
                <th style={{ width: '120px', cursor: 'pointer' }} onClick={() => handleSort('curPrice')}>
                  <span className="th-sort">COURS <SortIcon col="curPrice" /></span>
                </th>
                <th style={{ width: '120px', cursor: 'pointer' }} onClick={() => handleSort('valuation')}>
                  <span className="th-sort">VALEUR <SortIcon col="valuation" /></span>
                </th>
                <th style={{ width: '80px', cursor: 'pointer' }} onClick={() => handleSort('poids')}>
                  <span className="th-sort">POIDS <SortIcon col="poids" /></span>
                </th>
                <th style={{ width: '120px', cursor: 'pointer' }} onClick={() => handleSort('pvNette')}>
                  <span className="th-sort">PL LATENTE <SortIcon col="pvNette" /></span>
                </th>
                <th style={{ width: '100px', cursor: 'pointer' }} onClick={() => handleSort('perf')}>
                  <span className="th-sort">PERF. <SortIcon col="perf" /></span>
                </th>
                <th>ALERTES</th>
                <th style={{ textAlign: 'right', width: '120px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {sortedHoldings.map((s) => {
                const isExpanded = expandedSymbol === s.symbol;
                const isSettingAlert = alertSymbol === s.symbol;
                const alert = alerts.find((a: PriceAlert) => a.symbol === s.symbol);
                const isSlTriggered = alert?.sl_price && s.curPrice <= alert.sl_price;
                const isTpTriggered = alert?.tp_price && s.curPrice >= alert.tp_price;

                return (
                  <React.Fragment key={s.symbol}>
                    <tr className={`inst-row ${isSlTriggered ? 'sl-alert' : ''} ${isTpTriggered ? 'tp-alert' : ''}`}>
                      <td onClick={() => onNavigateToStock(s.symbol)} style={{ cursor: 'pointer' }}>
                        <div className="symbol-cell">
                          <div className="s-status"></div>
                          <div className="flex flex-col">
                            <span className="s-name">{s.symbol}</span>
                            <span className="mono-tiny opacity-40">{s.sector}</span>
                          </div>
                        </div>
                      </td>
                      <td className="mono">{s.totalQuantity}</td>
                      <td className="mono">{s.weightedAveragePrice.toFixed(2)}</td>
                      <td className="mono font-bold">{s.curPrice.toFixed(2)}</td>
                      <td className="mono">{(s.totalQuantity * s.curPrice).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                      <td className="mono">
                        <span className="poids-badge">
                          {totalMarketValue > 0 ? ((s.totalQuantity * s.curPrice) / totalMarketValue * 100).toFixed(1) : '0.0'}%
                        </span>
                      </td>
                      <td>
                        <div className={`momentum-box ${s.pvNette >= 0 ? 'bull' : 'bear'}`}>
                          <span className="m-abs mono">{s.pvNette >= 0 ? '+' : ''}{s.pvNette.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`mono font-bold ${s.pvNette >= 0 ? 'text-emerald' : 'text-rose'}`}>
                          {s.pvNette >= 0 ? '+' : ''}{((s.pvNette / s.totalCost) * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {alert ? (
                            <div className="flex gap-1">
                              {alert.sl_price && <span className={`alert-badge ${isSlTriggered ? 'bear' : 'opacity-40'}`}>SL {alert.sl_price}</span>}
                              {alert.tp_price && <span className={`alert-badge ${isTpTriggered ? 'bull' : 'opacity-40'}`}>TP {alert.tp_price}</span>}
                            </div>
                          ) : <span className="mono-tiny opacity-20">AUCUNE</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setAlertForm({ sl_price: alert?.sl_price?.toString() || '', tp_price: alert?.tp_price?.toString() || '' }); setAlertSymbol(isSettingAlert ? null : s.symbol); }} className={`terminal-btn-sm ${isSettingAlert ? 'active' : ''}`} title="Alertes (SL/TP)"><Bell size={12} /></button>
                          <button onClick={() => setExpandedSymbol(isExpanded ? null : s.symbol)} className={`terminal-btn-sm ${isExpanded ? 'active' : ''}`} title="Historique">{isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
                        </div>
                      </td>
                    </tr>

                    {/* ── ALERT FORM ROW ── */}
                    {isSettingAlert && (
                      <tr className="expansion-row">
                        <td colSpan={10}>
                          <div className="alert-form-row glass animate-slide-up">
                            <div className="alert-form-inner">
                              <span className="mono-tiny" style={{ color: '#ef4444' }}>🔴 STOP-LOSS</span>
                              <input type="number" step="0.01" value={alertForm.sl_price} onChange={e => setAlertForm(f => ({ ...f, sl_price: e.target.value }))} placeholder={`< ${s.curPrice.toFixed(2)}`} className="alert-input bear" />
                              <span className="mono-tiny" style={{ color: '#10b981' }}>🟢 TAKE-PROFIT</span>
                              <input type="number" step="0.01" value={alertForm.tp_price} onChange={e => setAlertForm(f => ({ ...f, tp_price: e.target.value }))} placeholder={`> ${s.curPrice.toFixed(2)}`} className="alert-input bull" />
                              <button onClick={() => handleSaveAlert(s.symbol)} className="alert-save-btn"><ShieldCheck size={12} /> SAUVEGARDER</button>
                              <button onClick={() => setAlertSymbol(null)} className="alert-cancel-btn"><X size={12} /></button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* ── HISTORY ROW ── */}
                    {isExpanded && (
                      <tr className="expansion-row">
                      <td colSpan={10}>
                          <div className="expansion-content glass-heavy animate-slide-up">
                            <div className="expansion-header">
                              <span className="mono">HISTORIQUE DES TRANSACTIONS : {s.symbol}</span>
                            </div>
                            <div className="tx-list">
                              {s.transactions.map((tx) => (
                                <div key={tx.id} className="tx-item glass">
                                  <div className="tx-meta">
                                    <div className={`tx-type-badge ${(tx.type || 'BUY') === 'BUY' ? 'buy' : 'sell'}`}>
                                      {(tx.type || 'BUY') === 'BUY' ? <ArrowUpRight size={11}/> : <ArrowDownLeft size={11}/>}
                                      {tx.type || 'BUY'}
                                    </div>
                                    <span className="mono">{new Date(tx.buy_date).toLocaleDateString('fr-FR')}</span>
                                  </div>
                                  <div className="tx-data mono">
                                    <span>{tx.quantity} pcs</span>
                                    <span>@ {tx.buy_price.toFixed(2)} MAD</span>
                                    <span className="opacity-40">= {(tx.quantity * tx.buy_price).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</span>
                                  </div>
                                  <button className="delete-tx-btn" onClick={() => { if (confirm('Supprimer ?')) deletePortfolioTransactionAction(tx.id).then(loadData); }}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* ── TOTAL ROW ── */}
            {holdings.length > 0 && (() => {
              const totalVal = holdings.reduce((s, h) => s + h.totalQuantity * h.curPrice, 0);
              const totalCost = holdings.reduce((s, h) => s + h.totalCost, 0);
              const totalPvNette = holdings.reduce((s, h) => {
                const pv = h.totalQuantity * h.curPrice - h.totalCost;
                return s + (pv > 0 ? pv * (1 - 0.15) : pv);
              }, 0);
              const totalPerfPct = totalCost > 0 ? (totalPvNette / totalCost) * 100 : 0;
              return (
                <tfoot>
                  <tr className="total-row">
                    <td><span className="mono font-bold opacity-60">TOTAL PORTEFEUILLE</span></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="mono font-bold">{totalVal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</td>
                    <td className="mono font-bold">100%</td>
                    <td>
                      <div className={`momentum-box ${totalPvNette >= 0 ? 'bull' : 'bear'}`}>
                        <span className="m-abs mono">{totalPvNette >= 0 ? '+' : ''}{totalPvNette.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`mono font-bold ${totalPerfPct >= 0 ? 'text-emerald' : 'text-rose'}`}>
                        {totalPerfPct >= 0 ? '+' : ''}{totalPerfPct.toFixed(2)}%
                      </span>
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
      )}
    </div>
  );
};
