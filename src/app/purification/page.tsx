'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { ShariaResult } from '@/lib/schemas';
import { getDividendsAction, getPortfolioTransactionsAction } from '@/lib/portfolio-actions';

// Import subcomponents
import ShariaSearchBox from './components/ShariaSearchBox';
import ManualCalculator, { ManualFormState } from './components/ManualCalculator';
import ResultDashboard from './components/ResultDashboard';

export default function PurificationPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'AI_SEARCH' | 'MANUAL'>('AI_SEARCH');
  
  // Search State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [loadingMessage, setLoadingMessage] = useState('Recherche des états financiers officiels sur le web...');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShariaResult | null>(null);

  // Local Storage for Results
  useEffect(() => {
    const saved = localStorage.getItem('aetheris_sharia_result');
    if (saved) {
      try {
        setResult(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (result) {
      localStorage.setItem('aetheris_sharia_result', JSON.stringify(result));
    }
  }, [result]);

  // Dividend Calculator Input
  const [dividendAmount, setDividendAmount] = useState<string>('0');
  const [dividendType, setDividendType] = useState<'BRUT' | 'NET'>('BRUT');
  
  // Perform AI Search
  const handleSearch = async (query: string, pdfFile: File | null) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStep(1);
    setLoadingMessage('Recherche des états financiers officiels sur le web...');

    try {
      const formData = new FormData();
      formData.append('query', query.trim());
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      const res = await fetch('/api/sharia-screener', {
        method: 'POST',
        body: formData
      });

      if (!res.ok || !res.body) {
        // Advanced Rate limit handling
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After') || '60';
          throw new Error(`Trop de requêtes. Veuillez patienter ${retryAfter} secondes.`);
        }
        throw new Error('Erreur réseau ou réponse invalide de l\'API.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let partialData = '';
      let finalResult = null;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          partialData += decoder.decode(value, { stream: true });
          const lines = partialData.split('\n\n');
          partialData = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '');
              try {
                const data = JSON.parse(dataStr);
                if (data.step) {
                   setLoadingStep(data.step);
                   if (data.message) setLoadingMessage(data.message);
                }
                if (data.status === 'success') {
                   finalResult = data.data;
                   setResult(data.data);
                } else if (data.status === 'error') {
                   throw new Error(data.message);
                } else if (data.status === 'rate_limit') {
                   throw new Error(`Trop de requêtes. Veuillez patienter ${data.retryAfter} secondes.`);
                }
              } catch (e: any) {
                if (e.message) throw e;
              }
            }
          }
        }
      }

      if (!finalResult) {
        throw new Error('Analyse interrompue ou résultat vide.');
      }

      const json = { data: finalResult as ShariaResult, ticker: finalResult.ticker };
      
      // Auto-fetch real dividends if available
      try {
        const divs = await getDividendsAction(false);
        const txs = await getPortfolioTransactionsAction(false);
        const tickerDivs = divs.filter(d => 
          d.symbol.toUpperCase() === json.data.ticker.toUpperCase() || 
          d.symbol.toUpperCase() === query.toUpperCase()
        );
        
        if (tickerDivs.length > 0) {
          let totalGross = 0;
          for (const div of tickerDivs) {
            const divDate = new Date(div.dividend_date).getTime();
            let qty = 0;
            const sorted = [...txs]
              .filter(tx => tx.symbol === div.symbol)
              .sort((a, b) => new Date(a.buy_date).getTime() - new Date(b.buy_date).getTime());
            
            for (const tx of sorted) {
              if (new Date(tx.buy_date).getTime() > divDate) break;
              const txType = tx.type || 'BUY';
              if (txType === 'BUY') qty += tx.quantity;
              else if (txType === 'SELL') qty = Math.max(0, qty - tx.quantity);
            }
            
            if (qty > 0) {
              totalGross += (qty * div.amount_per_share);
            }
          }
          setDividendAmount(totalGross > 0 ? totalGross.toString() : '0');
        } else {
          setDividendAmount('0');
        }
      } catch (err) {
        console.error('Error fetching user dividends', err);
        setDividendAmount('0');
      }

    } catch (err: any) {
      console.error('Sharia Search Error:', err);
      setError(err.message || 'Impossible d\'extraire les données financières. Essayez le mode de calcul manuel.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Manual AAOIFI Result
  const handleManualCalculate = (form: ManualFormState, denominatorType: 'MARKET_CAP' | 'TOTAL_ASSETS') => {
    const parseAmount = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.'));
    const revenue = parseAmount(form.totalRevenue);
    const interestInc = parseAmount(form.interestIncome);
    const debt = parseAmount(form.interestDebt);
    const cash = parseAmount(form.interestCash);
    const cap = parseAmount(form.marketCap);

    if (![revenue, interestInc, debt, cash, cap].every(Number.isFinite) || revenue <= 0 || cap <= 0 || interestInc < 0 || debt < 0 || cash < 0) {
      setError('Saisissez uniquement des montants positifs ou nuls ; le chiffre d’affaires et le dénominateur doivent être supérieurs à zéro.');
      return;
    }

    const puri = (interestInc / revenue) * 100;
    const dr = (debt / cap) * 100;
    const cr = (cash / cap) * 100;

    const isCompliant = puri <= 5 && dr <= 33.33 && cr <= 33.33;

    setResult({
      companyName: form.companyName || 'Société',
      ticker: form.ticker || 'N/A',
      fiscalYear: new Date().getFullYear().toString(),
      isCompliant,
      dataQuality: 'MANUAL',
      purificationRate: puri,
      debtRatio: dr,
      cashRatio: cr,
      financialData: {
        totalRevenue: form.totalRevenue,
        interestIncome: form.interestIncome,
        interestDebt: form.interestDebt,
        interestCash: form.interestCash,
        marketCap: form.marketCap
      },
      summary: 'Calcul basé sur vos données manuelles.',
      sources: []
    });
    setError(null);
  };

  const isManualResult = result?.dataQuality === 'MANUAL';
  const numericDividend = Number(dividendAmount.replace(/\s/g, '').replace(',', '.')) || 0;
  
  // Purification Calculation
  const canCalculate = !!result && result.purificationRate > 0 && !result.isHaramSector;
  const purificationAmount = canCalculate ? Math.ceil(numericDividend * (result.purificationRate / 100)) : 0;
  const halalAmount = numericDividend > 0 ? numericDividend - purificationAmount : 0;

  return (
    <div className="aetheris-app dark-theme min-h-screen pb-24 md:pb-10">
      <Sidebar 
        history={[]} 
        onSelect={() => {}} 
        activeAgent="SENTIMENT" 
        onAgentChange={() => {}} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <Header onOpenSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <main className="main-content">
        <div className="max-container">
          
          {/* HEADER */}
          <header className="terminal-header animate-fade-in no-print">
            <div className="header-identity">
              <div className="identity-block">
                <span className="status-light pulse"></span>
                <span className="mono-tiny text-emerald">SHARIA STOCK SCREENER & PURIFICATION (NORMES AAOIFI)</span>
              </div>
              <div className="title-row">
                <h1 className="title-h1">Purification Dividendes</h1>
                <div className="market-badge opacity-70">NORMES AAOIFI 2026</div>
              </div>
            </div>
          </header>

          <ShariaSearchBox 
            onSearch={handleSearch}
            loading={loading}
            loadingStep={loadingStep}
            loadingMessage={loadingMessage}
            error={error}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <ManualCalculator 
            onCalculate={handleManualCalculate} 
            activeTab={activeTab} 
          />

          <ResultDashboard
            result={result}
            isManualResult={isManualResult}
            dividendAmount={dividendAmount}
            setDividendAmount={setDividendAmount}
            dividendType={dividendType}
            setDividendType={setDividendType}
            canCalculate={canCalculate}
            halalAmount={halalAmount}
            purificationAmount={purificationAmount}
            numericDividend={numericDividend}
            dataQuality={result?.dataQuality}
            dataWarning={result?.dataWarning}
            sources={result?.sources}
            explanation={result?.explanation}
            confidenceScore={result?.confidenceScore}
            estimatedCompliance={result?.estimatedCompliance}
            isAIEstimated={result?.isAIEstimated}
          />
          
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
