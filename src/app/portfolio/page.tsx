'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Briefcase, Plus, Download, Upload, Gift, BarChart2, RefreshCw
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { PortfolioHolding, PortfolioTransaction, DividendTransaction, PriceAlert } from '@/lib/schemas';
import { 
  getPortfolioTransactionsAction, 
  deletePortfolioTransactionAction,
  addPortfolioTransactionAction,
  getDividendsAction,
  deleteDividendAction,
  addDividendAction,
  bulkImportAction,
  getAlertsAction,
  upsertAlertAction,
  getUserProfileAction,
  upsertUserProfileAction,
} from '@/lib/portfolio-actions';
import { PortfolioStats } from '@/components/portfolio/PortfolioStats';
import { SectorAllocationDonut } from '@/components/portfolio/SectorAllocationDonut';
import { PortfolioEvolutionChart } from '@/components/portfolio/PortfolioEvolutionChart';
import { PortfolioTable } from '@/components/portfolio/PortfolioTable';
import { DividendTable } from '@/components/portfolio/DividendTable';
import { AddTransactionModal } from '@/components/portfolio/AddTransactionModal';
import { AddDividendModal } from '@/components/portfolio/AddDividendModal';
import { PortfolioService } from '@/lib/portfolio-service';
import { BROKERAGE_FEE, TAX_ON_PROFIT } from '@/lib/portfolio-constants';
import { SymbolMapper } from '@/lib/symbol-mapper';
import { useRouter } from 'next/navigation';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function PortfolioPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [dividends, setDividends] = useState<DividendTransaction[]>([]);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [masiBenchmark, setMasiBenchmark] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'positions' | 'dividends'>('positions');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDivModal, setShowDivModal] = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // Capital Settings
  const [initialCapital, setInitialCapital] = useState<number>(0);
  const [showCapitalInput, setShowCapitalInput] = useState(false);
  const [capitalInput, setCapitalInput] = useState('');

  // Alert Settings
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);
  const [alertForm, setAlertForm] = useState({ sl_price: '', tp_price: '' });

  // Add Tx State
  const [newTx, setNewTx] = useState({
    symbol: '',
    quantity: '',
    buy_price: '',
    buy_date: new Date().toISOString().split('T')[0],
    type: 'BUY' as 'BUY' | 'SELL'
  });

  // Add Dividend State
  const [newDiv, setNewDiv] = useState({
    symbol: '',
    amount_per_share: '',
    dividend_date: new Date().toISOString().split('T')[0]
  });

  // Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read localStorage AS FALLBACK, then Supabase
  useEffect(() => {
    const saved = localStorage.getItem('aetheris_capital');
    if (saved) setInitialCapital(parseFloat(saved));
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, divs, als, profile] = await Promise.all([
        getPortfolioTransactionsAction(),
        getDividendsAction().catch(() => []),
        getAlertsAction().catch(() => []),
        getUserProfileAction().catch(() => null),
      ]);
      setTransactions(txs);
      setDividends(divs);
      setAlerts(als);
      if (profile?.initial_capital) {
        setInitialCapital(profile.initial_capital);
      }

      const calculatedHoldings = PortfolioService.calculateHoldings(txs);
      
      // Fetch prices and sectors in parallel
      const [pricesRes, sectorsRes] = await Promise.all([
        fetch('/api/market-live'),
        fetch('/api/companies/sectors').catch(() => null)
      ]);
      
      const [pricesData, sectorMap] = await Promise.all([
        pricesRes.json(),
        sectorsRes ? sectorsRes.json() : {}
      ]);
      
      const liveData = (pricesData.status === 'success' && pricesData.stocks) ? pricesData.stocks : [];
      
      const holdingsWithPrice = calculatedHoldings.map(h => {
        // Find match using SymbolMapper for normalization
        const live = liveData.find((l: { symbol: string; price: any; sector?: string }) => {
          const normalizedLive = SymbolMapper.resolve(l.symbol);
          const normalizedHolding = SymbolMapper.resolve(h.symbol);
          return normalizedLive === normalizedHolding || l.symbol === h.symbol;
        });

        return {
          ...h,
          curPrice: live ? (typeof live.price === 'string' ? parseFloat(live.price.replace(/\s/g, '').replace(',', '.')) : live.price) : 0,
          sector: sectorMap[h.symbol] || (live ? live.sector : 'Inconnu')
        };
      });

      setHoldings(holdingsWithPrice);

      // Fetch MASI for benchmark
      const masiRes = await fetch('/api/market-index');
      const masiData = await masiRes.json();
      if (masiData.status === 'success') setMasiBenchmark(masiData.data);

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Search Suggestions
  useEffect(() => {
    if (newTx.symbol.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/companies/search?q=${newTx.symbol}`);
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [newTx.symbol]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addPortfolioTransactionAction({
        symbol: newTx.symbol,
        quantity: parseInt(newTx.quantity),
        buy_price: parseFloat(newTx.buy_price),
        buy_date: newTx.buy_date,
        type: newTx.type
      });
      setShowAddModal(false);
      setNewTx({ symbol: '', quantity: '', buy_price: '', buy_date: new Date().toISOString().split('T')[0], type: 'BUY' });
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleAddDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDividendAction({
        symbol: newDiv.symbol,
        amount_per_share: parseFloat(newDiv.amount_per_share),
        dividend_date: newDiv.dividend_date
      });
      setShowDivModal(false);
      setNewDiv({ symbol: '', amount_per_share: '', dividend_date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveAlert = async (symbol: string) => {
    try {
      await upsertAlertAction({
        symbol,
        sl_price: alertForm.sl_price ? parseFloat(alertForm.sl_price) : null,
        tp_price: alertForm.tp_price ? parseFloat(alertForm.tp_price) : null
      });
      setAlertSymbol(null);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveCapital = async () => {
    const val = parseFloat(capitalInput);
    if (!isNaN(val) && val > 0) {
      setInitialCapital(val);
      localStorage.setItem('aetheris_capital', val.toString());
      try {
        await upsertUserProfileAction({ initial_capital: val });
      } catch (err) {
        console.error('Error saving capital to DB:', err);
      }
    }
    setShowCapitalInput(false);
  };

  const exportToCsv = (txs: any[], divs: any[]) => {
    const rows = [
      ["TYPE", "SYMBOLE", "QUANTITÉ", "PRIX", "DATE"],
      ...txs.map(t => [t.type || 'BUY', t.symbol, t.quantity, t.buy_price, t.buy_date]),
      ["DIVIDENDE", "SYMBOLE", "-", "MONTANT_UNIT", "DATE"],
      ...divs.map(d => ["DIV", d.symbol, "-", d.amount_per_share, d.dividend_date])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aetheris_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      const importedTransactions = [];
      const importedDividends = [];
      
      // Skip headers
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('DIVIDENDE') && line.includes('SYMBOLE')) continue; 
        if (line.includes('TYPE') && line.includes('SYMBOLE')) continue;
        
        const cols = line.split(',');
        if (cols.length < 5) continue;
        
        const type = cols[0].trim();
        const symbol = cols[1].trim();
        
        if (type === 'DIV') {
          importedDividends.push({
            symbol,
            amount_per_share: parseFloat(cols[3]),
            dividend_date: cols[4].trim()
          });
        } else {
          importedTransactions.push({
            type: type as 'BUY' | 'SELL',
            symbol,
            quantity: parseInt(cols[2]),
            buy_price: parseFloat(cols[3]),
            buy_date: cols[4].trim()
          });
        }
      }
      
      try {
        setLoading(true);
        await bulkImportAction({ transactions: importedTransactions, dividends: importedDividends });
        loadData();
      } catch (err: any) {
        alert("Erreur lors de l'import: " + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // ─────────────────────────────────────────────
  // CALCULS FINANCIERS
  // ─────────────────────────────────────────────
  
  const holdingsStats = holdings.map(h => {
    const valuation = h.totalQuantity * h.curPrice;
    const pvBrute = valuation - h.totalCost;
    const pvNette = pvBrute > 0 ? pvBrute * (1 - TAX_ON_PROFIT) : pvBrute;
    const alert = alerts.find((a: PriceAlert) => a.symbol === h.symbol);
    const slHit = alert?.sl_price && h.curPrice <= alert.sl_price;
    const tpHit = alert?.tp_price && h.curPrice >= alert.tp_price;
    
    return { ...h, valuation, pvNette, slHit, tpHit, alert };
  });

  const totalInvestedNet = holdingsStats.reduce((s, h) => s + h.totalCost, 0);
  const totalMarketValue = holdingsStats.reduce((s, h) => s + h.valuation, 0);
  const totalPvNette = holdingsStats.reduce((s, h) => s + h.pvNette, 0);
  const realizedPnL = PortfolioService.calculateRealizedPnL(transactions);
  const dividendIncome = PortfolioService.calculateDividendIncome(dividends, holdings, transactions);
  const totalDividends = Object.values(dividendIncome).reduce((s, v) => s + v, 0);
  
  const totalPerformance = totalInvestedNet > 0 ? (totalPvNette / totalInvestedNet) * 100 : 0;
  const liquidites = initialCapital > 0 ? initialCapital - totalInvestedNet : null;
  const investmentRate = initialCapital > 0 ? (totalInvestedNet / initialCapital) * 100 : null;

  const sectorBreakdown: Record<string, number> = {};
  holdingsStats.forEach(h => {
    sectorBreakdown[h.sector] = (sectorBreakdown[h.sector] || 0) + h.valuation;
  });
  const sectors = Object.entries(sectorBreakdown)
    .map(([name, val], i) => ({ name, val, pct: totalMarketValue > 0 ? (val / totalMarketValue) * 100 : 0, color: COLORS[i % COLORS.length] }))
    .sort((a, b) => b.val - a.val);

  const calcRiskScore = (stats: any[]) => {
    if (stats.length === 0) return { score: 0, label: 'FAIBLE', color: '#10b981' };
    const maxWeight = Math.max(...stats.map(s => (s.valuation / totalMarketValue) * 100));
    if (maxWeight > 60) return { score: 90, label: 'CRITIQUE', color: '#ef4444' };
    if (maxWeight > 40) return { score: 60, label: 'ÉLEVÉ', color: '#f59e0b' };
    if (maxWeight > 25) return { score: 30, label: 'MODÉRÉ', color: '#3b82f6' };
    return { score: 10, label: 'SAIN', color: '#10b981' };
  };
  const riskScore = calcRiskScore(holdingsStats);

  return (
    <div className="app-container">
      <Sidebar history={[]} onSelect={() => {}} activeAgent="STRATEGY" onAgentChange={() => {}} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
      <main className="main-content">
        <div className="max-container">
          <header className="terminal-header animate-fade-in">
            <div className="header-identity">
              <div className="identity-block">
                <Briefcase size={14} className="text-emerald" />
                <span className="mono-tiny text-emerald">GESTIONNAIRE D'ACTIFS ALPHA</span>
              </div>
              <div className="title-row">
                <h1 className="title-h1">Mon Portefeuille</h1>
                <div className="market-badge opacity-70">VALEUR RÉELLE & PMP</div>
              </div>
            </div>
            <div className="header-actions-row">
              {masiBenchmark && (
                <div className={`benchmark-chip ${masiBenchmark.variationValue >= 0 ? 'bull' : 'bear'}`}>
                  <BarChart2 size={12} />
                  <span className="mono-tiny">MASI {masiBenchmark.variation}</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCsv} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} className="action-chip" title="Importer CSV">
                <Upload size={12} /> <span className="mono-tiny">IMPORT</span>
              </button>
              <button onClick={() => exportToCsv(transactions, dividends)} className="action-chip" title="Exporter CSV">
                <Download size={12} /> <span className="mono-tiny">EXPORT</span>
              </button>
              <button onClick={() => setShowDivModal(true)} className="action-chip emerald">
                <Gift size={12} /> <span className="mono-tiny">DIVIDENDE</span>
              </button>
              <button onClick={() => setShowAddModal(true)} className="action-chip white">
                <Plus size={12} /> <span className="mono-tiny">ORDRE</span>
              </button>
            </div>
          </header>

          <PortfolioStats 
            totalInvestedNet={totalInvestedNet}
            totalMarketValue={totalMarketValue}
            totalPvNette={totalPvNette}
            realizedPnL={realizedPnL}
            totalPerformance={totalPerformance}
            totalDividends={totalDividends}
            initialCapital={initialCapital}
            liquidites={liquidites}
            investmentRate={investmentRate}
            riskScore={riskScore}
            showCapitalInput={showCapitalInput}
            capitalInput={capitalInput}
            setCapitalInput={setCapitalInput}
            setShowCapitalInput={setShowCapitalInput}
            handleSaveCapital={handleSaveCapital}
          />

          <div className="portfolio-charts-grid">
            <PortfolioEvolutionChart 
              currentValue={totalMarketValue} 
              performancePct={totalPerformance}
              transactions={transactions}
              masiBenchmark={masiBenchmark}
            />
            <SectorAllocationDonut sectors={sectors} />
          </div>

          <div className="tab-strip">
            <button className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`} onClick={() => setActiveTab('positions')}>
              <Briefcase size={13} /> Positions
            </button>
            <button className={`tab-btn ${activeTab === 'dividends' ? 'active' : ''}`} onClick={() => setActiveTab('dividends')}>
              <Gift size={13} /> Dividendes
            </button>
          </div>

          {activeTab === 'positions' && (
            <PortfolioTable 
              holdings={holdingsStats}
              alerts={alerts}
              totalMarketValue={totalMarketValue}
              expandedSymbol={expandedSymbol}
              setExpandedSymbol={setExpandedSymbol}
              alertSymbol={alertSymbol}
              setAlertSymbol={setAlertSymbol}
              alertForm={alertForm}
              setAlertForm={setAlertForm}
              handleSaveAlert={handleSaveAlert}
              deletePortfolioTransactionAction={deletePortfolioTransactionAction}
              loadData={loadData}
              setShowAddModal={setShowAddModal}
              onNavigateToStock={(symbol) => router.push(`/stock/${symbol}`)}
            />
          )}

          {activeTab === 'dividends' && (
            <DividendTable 
              dividends={dividends}
              holdings={holdings}
              setShowDivModal={setShowDivModal}
              onDeleteDividend={(id) => deleteDividendAction(id).then(loadData)}
            />
          )}
        </div>
      </main>

      <AddTransactionModal 
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        newTx={newTx}
        setNewTx={setNewTx}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        searchRef={searchRef}
        handleAddTransaction={handleAddTransaction}
      />

      <AddDividendModal 
        showDivModal={showDivModal}
        setShowDivModal={setShowDivModal}
        newDiv={newDiv}
        setNewDiv={setNewDiv}
        handleAddDividend={handleAddDividend}
      />

      <style jsx>{`
        .max-container { width: 100%; max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem; }
        .terminal-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
        .header-identity { display: flex; flex-direction: column; gap: 0.75rem; }
        .identity-block { display: flex; align-items: center; gap: 0.5rem; }
        .title-row { display: flex; align-items: baseline; gap: 1rem; }
        .title-h1 { font-size: 2.2rem; font-weight: 900; letter-spacing: -0.04em; }
        .market-badge { background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
        .header-actions-row { display: flex; align-items: center; gap: 0.75rem; }
        .action-chip { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 100px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.03); color: #64748b; cursor: pointer; transition: all 0.2s; font-size: 10px; font-family: 'JetBrains Mono', monospace; font-weight: 800; }
        .action-chip:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .action-chip.emerald { color: #10b981; border-color: rgba(16,185,129,0.2); }
        .action-chip.white { color: #fff; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
        .benchmark-chip { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.85rem; border-radius: 100px; border: 1px solid; font-size: 10px; font-family: 'JetBrains Mono', monospace; font-weight: 800; }
        .benchmark-chip.bull { color: #10b981; border-color: rgba(16,185,129,0.2); background: rgba(16,185,129,0.05); }
        .benchmark-chip.bear { color: #ef4444; border-color: rgba(244,63,94,0.2); background: rgba(244,63,94,0.05); }

        .tab-strip { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .tab-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.25rem; border-radius: 0.75rem; border: 1px solid var(--border-glass); background: transparent; color: #64748b; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; }
        .tab-btn.active { background: rgba(255,255,255,0.05); color: #fff; border-color: rgba(255,255,255,0.1); }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } .header-actions-row { flex-wrap: wrap; } }
      `}</style>
    </div>
  );
}
