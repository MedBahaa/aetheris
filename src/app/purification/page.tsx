'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { ShariaResult } from '@/lib/schemas';
import { getDividendsAction, getPortfolioTransactionsAction } from '@/lib/portfolio-actions';
import { computeConsolidatedPurification, ConsolidatedPurificationSummary } from '@/lib/portfolio-service';

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
  const [prefillManualData, setPrefillManualData] = useState<Partial<ManualFormState> | null>(null);
  const [denominatorMethod, setDenominatorMethod] = useState<'MARKET_CAP' | 'TOTAL_ASSETS'>('MARKET_CAP');
  const [consolidatedPurification, setConsolidatedPurification] = useState<ConsolidatedPurificationSummary | null>(null);

  const handlePrefillManual = () => {
    if (!result) return;
    const extractDigits = (val?: string) => {
      if (!val) return '';
      const cleaned = String(val)
        .replace(/[\s\u00A0\u202F]/g, '')
        .replace(/(MAD|DH)$/i, '')
        .replace(',', '.');
      const num = Number(cleaned);
      return Number.isFinite(num) && num >= 0 ? String(num) : '';
    };
    setPrefillManualData({
      companyName: result.companyName || '',
      ticker: result.ticker || '',
      totalRevenue: extractDigits(result.financialData?.totalRevenue),
      interestIncome: '',
      interestDebt: extractDigits(result.financialData?.interestDebt),
      interestCash: extractDigits(result.financialData?.interestCash),
      marketCap: extractDigits(result.financialData?.marketCap),
    });
    setActiveTab('MANUAL');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Perform AI Search
  const handleSearch = async (query: string, pdfFile: File | null) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setConsolidatedPurification(null);
    setLoadingStep(1);
    setLoadingMessage('Recherche des états financiers officiels sur le web...');

    try {
      const formData = new FormData();
      formData.append('query', query.trim());
      formData.append('denominator', denominatorMethod);
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
      
      // Auto-fetch real dividends if available and compute consolidated purification
      try {
        const divs = await getDividendsAction(false);
        const txs = await getPortfolioTransactionsAction(false);
        const rateForTicker =
          !json.data.interestIncomeMissing &&
          !json.data.isHaramSector &&
          typeof json.data.purificationRate === 'number' &&
          json.data.purificationRate >= 0
            ? json.data.purificationRate
            : 0;
        const summary = computeConsolidatedPurification(divs, txs, {
          [json.data.ticker]: rateForTicker,
          [query.trim()]: rateForTicker,
        });
        setDividendAmount(summary.totalGrossMAD > 0 ? String(summary.totalGrossMAD) : '0');
        setConsolidatedPurification(rateForTicker > 0 && summary.items.length > 0 ? summary : null);
      } catch (err) {
        console.error('Error fetching user dividends', err);
        setDividendAmount('0');
        setConsolidatedPurification(null);
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
  const canCalculate = !!result && !result.interestIncomeMissing && result.purificationRate > 0 && !result.isHaramSector;
  const purificationAmount = canCalculate ? Math.ceil(numericDividend * (result.purificationRate / 100)) : 0;
  const halalAmount = numericDividend > 0 ? numericDividend - purificationAmount : 0;

  return (
    <div className="app-container">
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

          {activeTab === 'AI_SEARCH' && (
            <div className="denom-switcher no-print">
              <span className="denom-switcher-label">Méthode de calcul des ratios :</span>
              <div className="denom-switcher-pills" role="group" aria-label="Dénominateur AAOIFI">
                <button
                  type="button"
                  className={`denom-pill ${denominatorMethod === 'MARKET_CAP' ? 'active' : ''}`}
                  onClick={() => setDenominatorMethod('MARKET_CAP')}
                  disabled={loading}
                >
                  Capitalisation Boursière (AAOIFI)
                </button>
                <button
                  type="button"
                  className={`denom-pill ${denominatorMethod === 'TOTAL_ASSETS' ? 'active' : ''}`}
                  onClick={() => setDenominatorMethod('TOTAL_ASSETS')}
                  disabled={loading}
                >
                  Total Actif (Bilan)
                </button>
              </div>
            </div>
          )}

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
            prefillData={prefillManualData}
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
            onPrefillManual={handlePrefillManual}
          />

          {consolidatedPurification && consolidatedPurification.items.length > 0 && (
            <section className="consolidated-purif-card">
              <div className="consolidated-purif-head">
                <div>
                  <span className="consolidated-purif-tag">Portefeuille synchronisé</span>
                  <h3>Synthèse Purification Portefeuille</h3>
                </div>
                <div className="consolidated-kpis">
                  <div className="consolidated-kpi">
                    <span>Dividendes bruts</span>
                    <strong>{consolidatedPurification.totalGrossMAD.toFixed(2)} MAD</strong>
                  </div>
                  <div className="consolidated-kpi purif">
                    <span>À purifier (arrondi AAOIFI)</span>
                    <strong>{consolidatedPurification.totalPurificationMAD.toFixed(0)} MAD</strong>
                  </div>
                  <div className="consolidated-kpi halal">
                    <span>Net Halal estimé</span>
                    <strong>{consolidatedPurification.totalHalalMAD.toFixed(2)} MAD</strong>
                  </div>
                </div>
              </div>
              <div className="consolidated-table-wrap">
                <table className="consolidated-table">
                  <thead>
                    <tr>
                      <th>Symbole</th>
                      <th>Date</th>
                      <th>Titres</th>
                      <th>Brut</th>
                      <th>Taux</th>
                      <th>À purifier</th>
                      <th>Net Halal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidatedPurification.items.map((item, idx) => (
                      <tr key={`${item.symbol}-${item.dividendDate}-${idx}`}>
                        <td><strong>{item.symbol}</strong></td>
                        <td>{item.dividendDate}</td>
                        <td>{item.sharesHeld}</td>
                        <td>{item.grossDividendMAD.toFixed(2)} MAD</td>
                        <td>{item.purificationRatePct.toFixed(2)}%</td>
                        <td className="txt-purif">{item.purificationAmountMAD.toFixed(0)} MAD</td>
                        <td className="txt-halal">{item.halalNetMAD.toFixed(2)} MAD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          
        </div>
      </main>

      <style jsx>{`
        .denom-switcher {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(17, 24, 39, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .denom-switcher-label {
          font-size: 12px;
          color: #9ca3af;
          font-weight: 500;
        }
        .denom-switcher-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .denom-pill {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #d1d5db;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .denom-pill:hover:not(:disabled) {
          border-color: rgba(16, 185, 129, 0.45);
          color: #f3f4f6;
        }
        .denom-pill.active {
          background: rgba(16, 185, 129, 0.18);
          border-color: rgba(16, 185, 129, 0.6);
          color: #6ee7b7;
        }
        .denom-pill:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .consolidated-purif-card {
          margin-top: 20px;
          padding: 20px;
          border-radius: 14px;
          background: rgba(17, 24, 39, 0.78);
          border: 1px solid rgba(16, 185, 129, 0.22);
        }
        .consolidated-purif-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .consolidated-purif-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          color: #34d399;
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid rgba(16, 185, 129, 0.28);
          padding: 2px 9px;
          border-radius: 999px;
          margin-bottom: 6px;
        }
        .consolidated-purif-head h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
        }
        .consolidated-kpis {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .consolidated-kpi {
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .consolidated-kpi span {
          font-size: 11px;
          color: #9ca3af;
        }
        .consolidated-kpi strong {
          font-size: 13px;
          color: #f3f4f6;
        }
        .consolidated-kpi.purif strong {
          color: #fbbf24;
        }
        .consolidated-kpi.halal strong {
          color: #34d399;
        }
        .consolidated-table-wrap {
          overflow-x: auto;
        }
        .consolidated-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .consolidated-table th, .consolidated-table td {
          padding: 9px 10px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          color: #d1d5db;
        }
        .consolidated-table th {
          color: #9ca3af;
          font-weight: 600;
        }
        .txt-purif { color: #fbbf24; font-weight: 600; }
        .txt-halal { color: #34d399; font-weight: 600; }
        @media (min-width: 1024px) {
          .max-container {
            max-width: 1180px;
          }
        }
      `}</style>
    </div>
  );
}
