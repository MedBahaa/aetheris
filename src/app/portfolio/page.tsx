'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Briefcase, Plus, Download, Upload, Gift, BarChart2, RefreshCw, Sparkles, Zap, Trophy, Bell, Award, DollarSign, PieChart, AlertTriangle
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
  addVirtualTransactionAction,
  resetVirtualPortfolioAction,
  getLeaderboardAction,
  optimizePortfolioAction
} from '@/lib/portfolio-actions';
import { PortfolioStats } from '@/components/portfolio/PortfolioStats';
import { SectorAllocationDonut } from '@/components/portfolio/SectorAllocationDonut';
import { PortfolioEvolutionChart } from '@/components/portfolio/PortfolioEvolutionChart';
import { PortfolioTable } from '@/components/portfolio/PortfolioTable';
import { DividendTable } from '@/components/portfolio/DividendTable';
import { AddTransactionModal } from '@/components/portfolio/AddTransactionModal';
import { AddDividendModal } from '@/components/portfolio/AddDividendModal';
import { PremiumPaywallModal } from '@/components/portfolio/PremiumPaywallModal';
import { RoboAdvisorPanel } from '@/components/portfolio/RoboAdvisorPanel';
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
  const [macroData, setMacroData] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'positions' | 'dividends' | 'leaderboard' | 'alerts_settings'>('positions');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDivModal, setShowDivModal] = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showRoboPanel, setShowRoboPanel] = useState(false);

  // Mode Virtuel / Paper Trading & Social
  const [isVirtualMode, setIsVirtualMode] = useState<boolean>(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [alertChannel, setAlertChannel] = useState('EMAIL');
  const [username, setUsername] = useState('');
  const [virtualBalance, setVirtualBalance] = useState(100000);
  const [virtualInitialCapital, setVirtualInitialCapital] = useState(100000);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

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
        getPortfolioTransactionsAction(isVirtualMode),
        getDividendsAction(isVirtualMode).catch(() => []),
        getAlertsAction().catch(() => []),
        getUserProfileAction().then(res => (res && res.success) ? res.data : null).catch(() => null),
      ]);
      setTransactions(txs);
      setDividends(divs);
      setAlerts(als);
      if (profile) {
        if (isVirtualMode) {
          setInitialCapital(profile.virtual_initial_capital ?? 100000);
        } else {
          setInitialCapital(profile.initial_capital);
        }
        setSubscriptionTier(profile.subscription_tier || 'free');
        setTelegramChatId(profile.telegram_chat_id || '');
        setWhatsappPhone(profile.whatsapp_phone || '');
        setAlertChannel(profile.alert_channel || 'EMAIL');
        setUsername(profile.username || '');
        setVirtualBalance(profile.virtual_balance ?? 100000);
        setVirtualInitialCapital(profile.virtual_initial_capital ?? 100000);
      }

      const calculatedHoldings = PortfolioService.calculateHoldings(txs);
      
      // Fetch prices and sectors in parallel
      const [pricesRes, sectorsRes] = await Promise.all([
        fetch('/api/market-live'),
        fetch('/api/companies/sectors').catch(() => null)
      ]);
      
      const [pricesData, sectorMap]: [any, Record<string, string>] = await Promise.all([
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

      // Fetch Macro for inflation
      const macroRes = await fetch('/api/macro');
      const macroD = await macroRes.json();
      if (macroD && !macroD.error) setMacroData(macroD);

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [isVirtualMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Charger le classement uniquement à l'affichage de l'onglet Leaderboard
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      getLeaderboardAction().then(setLeaderboard).catch(console.error);
    }
  }, [activeTab]);

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
      const payload = {
        symbol: newTx.symbol.toUpperCase(),
        quantity: parseFloat(newTx.quantity),
        buy_price: parseFloat(newTx.buy_price),
        buy_date: newTx.buy_date,
        type: newTx.type,
        is_virtual: isVirtualMode
      };
      if (isVirtualMode) {
        await addVirtualTransactionAction(payload);
      } else {
        await addPortfolioTransactionAction(payload);
      }
      setShowAddModal(false);
      setNewTx({ symbol: '', quantity: '', buy_price: '', buy_date: new Date().toISOString().split('T')[0], type: 'BUY' });
      loadData();
    } catch (err: any) { alert(err.message || "Erreur lors de l'enregistrement de la transaction"); }
  };

  const handleAddDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDividendAction({
        symbol: newDiv.symbol.toUpperCase(),
        amount_per_share: parseFloat(newDiv.amount_per_share),
        dividend_date: newDiv.dividend_date,
        is_virtual: isVirtualMode
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
      if (isVirtualMode) {
        setVirtualInitialCapital(val);
        setVirtualBalance(val);
        try {
          await resetVirtualPortfolioAction(val);
          loadData();
        } catch (err) {
          console.error('Error resetting virtual portfolio:', err);
        }
      } else {
        setInitialCapital(val);
        localStorage.setItem('aetheris_capital', val.toString());
        try {
          await upsertUserProfileAction({ initial_capital: val });
          loadData();
        } catch (err) {
          console.error('Error saving capital to DB:', err);
        }
      }
    }
    setShowCapitalInput(false);
  };

  const handleUpgrade = async () => {
    try {
      setSubscriptionTier('premium');
      await upsertUserProfileAction({ initial_capital: initialCapital, subscription_tier: 'premium' });
      setShowPaywallModal(false);
      setShowRoboPanel(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOptimizePortfolio = async () => {
    return await optimizePortfolioAction(holdings);
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
            dividend_date: cols[4].trim(),
            is_virtual: isVirtualMode
          });
        } else {
          importedTransactions.push({
            type: type as 'BUY' | 'SELL',
            symbol,
            quantity: parseInt(cols[2]),
            buy_price: parseFloat(cols[3]),
            buy_date: cols[4].trim(),
            is_virtual: isVirtualMode
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
    const valuation = h.totalQuantity * (h.curPrice ?? 0);
    const pvBrute = valuation - h.totalCost;
    const pvNette = pvBrute > 0 ? pvBrute * (1 - TAX_ON_PROFIT) : pvBrute;
    const alert = alerts.find((a: PriceAlert) => a.symbol === h.symbol);
    const slHit = (alert?.sl_price && (h.curPrice ?? 0) <= alert.sl_price) || false;
    const tpHit = (alert?.tp_price && (h.curPrice ?? 0) >= alert.tp_price) || false;
    
    return { ...h, valuation, pvNette, slHit, tpHit, alert };
  });

  const totalInvestedNet = holdingsStats.reduce((s, h) => s + h.totalCost, 0);
  const totalMarketValue = holdingsStats.reduce((s, h) => s + h.valuation, 0);
  const totalPvNette = holdingsStats.reduce((s, h) => s + h.pvNette, 0);
  const realizedPnL = PortfolioService.calculateRealizedPnL(transactions);
  const dividendIncome = PortfolioService.calculateDividendIncome(dividends, holdings, transactions);
  const totalDividends = Object.values(dividendIncome).reduce((s, v) => s + v, 0);

  // Inject dividend stats into holdings
  const holdingsWithDividends = holdingsStats.map(h => {
    const totalDivs = dividendIncome[h.symbol] || 0;
    const yoc = h.totalCost > 0 ? (totalDivs / h.totalCost) * 100 : 0;
    
    // Attempt to get current dividend yield from masiBenchmark or similar if available
    // For now, we'll focus on YOC and Total Dividends
    return { 
      ...h, 
      totalDividends: totalDivs, 
      yieldOnCost: yoc 
    };
  });

  const filteredHoldings = selectedSector
    ? holdingsWithDividends.filter(h => h.sector === selectedSector)
    : holdingsWithDividends;

  const totalPerformance = totalInvestedNet > 0 ? (totalPvNette / totalInvestedNet) * 100 : 0;
  const liquidites = isVirtualMode ? virtualBalance : (initialCapital > 0 ? initialCapital - totalInvestedNet : null);
  const investmentRate = isVirtualMode 
    ? (virtualInitialCapital > 0 ? (totalInvestedNet / virtualInitialCapital) * 100 : null) 
    : (initialCapital > 0 ? (totalInvestedNet / initialCapital) * 100 : null);

  const sectorBreakdown: Record<string, number> = {};
  holdingsStats.forEach(h => {
    const sName = h.sector || 'Inconnu';
    sectorBreakdown[sName] = (sectorBreakdown[sName] || 0) + (h.valuation ?? 0);
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
                <div className="market-badge opacity-70">{isVirtualMode ? 'COMPTE DE PAPER TRADING' : 'VALEUR RÉELLE & PMP'}</div>
              </div>
            </div>
             <div className="header-actions-row">
               <button 
                 onClick={() => {
                   setIsVirtualMode(!isVirtualMode);
                 }} 
                 className="action-chip"
                 style={{
                   background: isVirtualMode ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' : 'rgba(255, 255, 255, 0.05)',
                   border: isVirtualMode ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                   color: '#fff',
                   fontWeight: 'bold',
                 }}
                 title="Basculez vers le mode Paper Trading (Portefeuille Virtuel)"
               >
                 <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                 <span className="mono-tiny">{isVirtualMode ? '🎮 MODE VIRTUEL (PAPER)' : '💰 MODE RÉEL'}</span>
               </button>

               {isVirtualMode && (
                 <button 
                   onClick={async () => {
                     if (confirm("Voulez-vous réinitialiser votre portefeuille virtuel à 100 000 MAD ? Toutes vos transactions virtuelles seront supprimées.")) {
                       try {
                         setLoading(true);
                         await resetVirtualPortfolioAction(100000);
                         await loadData();
                       } catch (err: any) {
                         alert(err.message);
                       } finally {
                         setLoading(false);
                       }
                     }
                   }} 
                   className="action-chip red"
                   style={{
                     background: 'rgba(239, 68, 68, 0.15)',
                     border: '1px solid rgba(239, 68, 68, 0.3)',
                     color: '#ef4444'
                   }}
                   title="Réinitialiser le portefeuille virtuel"
                 >
                   <RefreshCw size={12} /> <span className="mono-tiny">RÉINITIALISER</span>
                 </button>
               )}

              <button 
                onClick={() => {
                  if (subscriptionTier !== 'premium') {
                    setShowPaywallModal(true);
                  }
                }} 
                className={`action-chip ${subscriptionTier === 'premium' ? 'premium-gold' : 'free-badge'}`}
                title={subscriptionTier === 'premium' ? 'Abonnement Pro Actif' : "Souscrire à l'offre Pro"}
              >
                <Sparkles size={12} />
                <span className="mono-tiny">{subscriptionTier === 'premium' ? '👑 PRO ACTIVE' : '⭐ CLASSIQUE (FREE)'}</span>
              </button>
              
              <button 
                onClick={() => {
                  if (subscriptionTier !== 'premium') {
                    setShowPaywallModal(true);
                  } else {
                    setShowRoboPanel(!showRoboPanel);
                  }
                }} 
                className={`action-chip purple ${showRoboPanel ? 'active' : ''}`}
                title="Robo-Advisor"
              >
                <Zap size={12} />
                <span className="mono-tiny">ROBO-ADVISOR</span>
              </button>

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
            inflationRate={macroData?.inflation?.value || 0.9}
            masiReturn={masiBenchmark?.variationValue || 0}
            showCapitalInput={showCapitalInput}
            capitalInput={capitalInput}
            setCapitalInput={setCapitalInput}
            setShowCapitalInput={setShowCapitalInput}
            handleSaveCapital={handleSaveCapital}
          />

          {showRoboPanel && subscriptionTier === 'premium' && (
            <RoboAdvisorPanel 
              holdings={holdings} 
              onOptimize={handleOptimizePortfolio} 
            />
          )}

          <div className="portfolio-charts-grid">
            <PortfolioEvolutionChart 
              currentValue={totalMarketValue} 
              performancePct={totalPerformance}
              transactions={transactions}
              masiBenchmark={masiBenchmark}
            />
            <SectorAllocationDonut 
              sectors={sectors} 
              selectedSector={selectedSector} 
              onSelectSector={setSelectedSector} 
            />
          </div>

          <div className="tab-strip">
            <button className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`} onClick={() => setActiveTab('positions')}>
              <Briefcase size={13} /> Positions
            </button>
            <button className={`tab-btn ${activeTab === 'dividends' ? 'active' : ''}`} onClick={() => setActiveTab('dividends')}>
              <Gift size={13} /> Dividendes
            </button>
            <button className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
              <Trophy size={13} /> Classement (Paper)
            </button>
            <button className={`tab-btn ${activeTab === 'alerts_settings' ? 'active' : ''}`} onClick={() => setActiveTab('alerts_settings')}>
              <Bell size={13} /> Paramètres Alertes
            </button>
          </div>

          {activeTab === 'positions' && (
            <>
              {selectedSector && (
                <div className="active-filter-bar animate-fade-in">
                  <span className="mono-tiny filter-label">SECTEUR FILTRÉ : {selectedSector.toUpperCase()}</span>
                  <button className="clear-filter-btn mono-tiny" onClick={() => setSelectedSector(null)}>✕ EFFACER LE FILTRE</button>
                </div>
              )}
              <PortfolioTable 
                holdings={filteredHoldings}
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
                onNavigateToStock={(symbol) => router.push(`/?q=${symbol}`)}
              />
            </>
          )}

          {activeTab === 'dividends' && (
            <DividendTable 
              dividends={dividends}
              holdings={holdings}
              setShowDivModal={setShowDivModal}
              onDeleteDividend={(id) => deleteDividendAction(id).then(loadData)}
            />
          )}

          {activeTab === 'alerts_settings' && (
            <div className="alerts-settings-panel glass-heavy animate-fade-in" style={{ padding: '2rem', borderRadius: '1rem', marginTop: '1rem', color: '#fff' }}>
              <h3 className="mono font-bold text-lg mb-4" style={{ color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} /> CONFIGURATION DES ALERTES (TELEGRAM / WHATSAPP)
              </h3>
              <p className="text-sm text-gray-400 mb-6" style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                Recevez des notifications instantanées sur votre téléphone lorsque les cours de la Bourse de Casablanca atteignent vos seuils de Stop-Loss (SL) ou Take-Profit (TP).
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setLoading(true);
                  await upsertUserProfileAction({
                    telegram_chat_id: telegramChatId,
                    whatsapp_phone: whatsappPhone,
                    alert_channel: alertChannel,
                    username: username
                  });
                  alert("Paramètres d'alertes enregistrés avec succès !");
                } catch (err: any) {
                  alert(err.message || "Erreur de sauvegarde");
                } finally {
                  setLoading(false);
                }
              }} className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="mono text-xs text-purple font-semibold" style={{ fontSize: '11px', color: '#a855f7' }}>NOM D'UTILISATEUR (COMPÉTITION)</label>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    placeholder="Saisissez un pseudo pour le classement" 
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.6rem', color: '#fff', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="mono text-xs text-purple font-semibold" style={{ fontSize: '11px', color: '#a855f7' }}>CANAL DE NOTIFICATION</label>
                  <select 
                    value={alertChannel} 
                    onChange={e => setAlertChannel(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.6rem', color: '#fff', fontSize: '13px' }}
                  >
                    <option value="EMAIL">📧 Email uniquement</option>
                    <option value="TELEGRAM">✈️ Telegram uniquement</option>
                    <option value="WHATSAPP">💬 WhatsApp uniquement</option>
                    <option value="ALL">🔥 Tous les canaux (Email + Telegram + WhatsApp)</option>
                  </select>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 className="mono font-bold text-sm" style={{ fontSize: '13px', color: '#3b82f6' }}>1. Configurer Telegram</h4>
                  <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                    1. Ouvrez l'application Telegram et cherchez le bot <b>@AetherisAlertBot</b> (ou le bot de votre entreprise).<br/>
                    2. Cliquez sur <b>Démarrer (/start)</b>.<br/>
                    3. Envoyez un message au bot <b>@userinfobot</b> ou <b>@getidsbot</b> pour récupérer votre <b>Chat ID</b> personnel.<br/>
                    4. Copiez et collez votre Chat ID ci-dessous.
                  </p>
                  <input 
                    type="text" 
                    value={telegramChatId} 
                    onChange={e => setTelegramChatId(e.target.value)} 
                    placeholder="Votre Chat ID Telegram (ex: 123456789)" 
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.6rem', color: '#fff', fontSize: '13px' }}
                  />
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 className="mono font-bold text-sm" style={{ fontSize: '13px', color: '#10b981' }}>2. Configurer WhatsApp (via CallMeBot)</h4>
                  <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                    1. Enregistrez le numéro de téléphone de CallMeBot dans vos contacts : <b>+34 644 97 50 14</b>.<br/>
                    2. Envoyez le message suivant par WhatsApp : <b>I allow callmebot to send me messages</b>.<br/>
                    3. Attendez de recevoir le message contenant votre clé d'API WhatsApp.<br/>
                    4. Renseignez votre numéro de téléphone (au format international, ex: 212600000000) ci-dessous.
                  </p>
                  <input 
                    type="text" 
                    value={whatsappPhone} 
                    onChange={e => setWhatsappPhone(e.target.value)} 
                    placeholder="Votre numéro de téléphone (ex: 212600000000)" 
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.6rem', color: '#fff', fontSize: '13px' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '1rem'
                  }}
                >
                  {loading ? 'Enregistrement en cours...' : 'ENREGISTRER LES CONFIGURATIONS'}
                </button>

              </form>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="leaderboard-panel glass-heavy animate-fade-in" style={{ padding: '2rem', borderRadius: '1rem', marginTop: '1rem', color: '#fff' }}>
              <h3 className="mono font-bold text-lg mb-4" style={{ color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={16} /> CLASSEMENT DES COMPÉTITORS (PAPER TRADING)
              </h3>
              <p className="text-sm text-gray-400 mb-6" style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                Découvrez les investisseurs les plus performants de la Bourse de Casablanca sur la base de leur portefeuille virtuel (Paper Trading).
              </p>

              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Chargement du classement...
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Rang</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Trader</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem' }}>Valeur Portefeuille</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem' }}>Trésorerie</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem' }}>Actions</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem' }}>Performance (ROI)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((item, index) => {
                      const isTop3 = index < 3;
                      const badgeColor = index === 0 ? '#f59e0b' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '';
                      const isCurrentUser = item.userId === (transactions[0]?.user_id || item.userId);
                      
                      return (
                        <tr 
                          key={item.userId} 
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.03)', 
                            fontSize: '13px', 
                            background: isCurrentUser ? 'rgba(168, 85, 247, 0.05)' : 'transparent',
                            fontWeight: isCurrentUser ? 'bold' : 'normal'
                          }}
                        >
                          <td style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isTop3 ? (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                width: '20px', 
                                height: '20px', 
                                borderRadius: '50%', 
                                background: badgeColor, 
                                color: '#000', 
                                fontWeight: 'bold',
                                fontSize: '11px' 
                              }}>
                                {index + 1}
                              </span>
                            ) : (
                              <span className="mono" style={{ color: '#64748b', paddingLeft: '6px' }}>{index + 1}</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {item.username} {isCurrentUser && <span className="mono-tiny" style={{ fontSize: '8px', padding: '2px 4px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', borderRadius: '4px', marginLeft: '4px' }}>VOUS</span>}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }} className="mono">
                            {item.totalValue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#64748b' }} className="mono">
                            {item.virtualBalance.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#64748b' }} className="mono">
                            {item.stockValuation.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: item.roi >= 0 ? '#10b981' : '#ef4444' }} className="mono">
                            {item.roi >= 0 ? '▲' : '▼'} {Math.abs(item.roi).toFixed(2)} %
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>

      <AddTransactionModal 
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        holdings={holdings}
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
        holdings={holdings}
      />

      <PremiumPaywallModal 
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        onUpgrade={handleUpgrade}
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

        .action-chip.premium-gold { color: #f59e0b; border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.05); }
        .action-chip.premium-gold:hover { background: rgba(245,158,11,0.15); }
        .action-chip.free-badge { color: #64748b; border-color: rgba(255,255,255,0.05); background: rgba(255,255,255,0.01); }
        .action-chip.free-badge:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .action-chip.purple { color: #a855f7; border-color: rgba(168,85,247,0.3); background: rgba(168,85,247,0.05); }
        .action-chip.purple:hover { background: rgba(168,85,247,0.15); }
        .action-chip.purple.active { background: rgba(168,85,247,0.25); color: #fff; border-color: #a855f7; }

        .active-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; border-radius: 0.75rem; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); margin-bottom: 1rem; }
        .clear-filter-btn { background: transparent; border: none; color: #3b82f6; cursor: pointer; font-weight: 800; font-family: 'JetBrains Mono', monospace; transition: color 0.2s; }
        .clear-filter-btn:hover { color: #fff; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } .header-actions-row { flex-wrap: wrap; } }
      `}</style>
    </div>
  );
}
