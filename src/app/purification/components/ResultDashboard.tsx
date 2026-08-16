import React, { useState } from 'react';
import { FileText, ShieldCheck, XCircle, AlertTriangle, Coins, Check, Copy } from 'lucide-react';
import { ShariaResult } from '@/lib/schemas';

interface ResultDashboardProps {
  result: ShariaResult | null;
  isManualResult: boolean;
  dividendAmount: string;
  setDividendAmount: (val: string) => void;
  dividendType: 'BRUT' | 'NET';
  setDividendType: (val: 'BRUT' | 'NET') => void;
  canCalculate: boolean;
  halalAmount: number;
  purificationAmount: number;
  numericDividend: number;
}

export default function ResultDashboard({
  result,
  isManualResult,
  dividendAmount,
  setDividendAmount,
  dividendType,
  setDividendType,
  canCalculate,
  halalAmount,
  purificationAmount,
  numericDividend
}: ResultDashboardProps) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const copyToClipboard = () => {
    if (!result || !canCalculate || !navigator.clipboard) return;
    const text = `ANALYSE SHARIA & PURIFICATION DES DIVIDENDES (${result.companyName} - ${result.ticker})
- Statut: ${result.isCompliant ? 'CONFORME (HALAL)' : 'NON CONFORME'}
- Secteur: ${result.sector || 'N/A'}
- Taux de Purification: ${result.purificationRate}%
- Dividende (${dividendType === 'BRUT' ? 'Brut avant impôts' : "Net d'impôts"}): ${numericDividend.toLocaleString('fr-FR')} MAD
- Part Halal: ${halalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
- Montant à Purifier (Aumône arrondie à l'unité supérieure): ${purificationAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
-- Généré via Aetheris Sharia Screener (AAOIFI 2026)`;

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => alert('La copie automatique est indisponible sur cet appareil.'));
  };

  return (
    <div className={`data-terminal glass-heavy animate-fade-in mt-6 border-l-4 ${isManualResult ? 'border-l-emerald-500' : 'border-l-amber-500'}`} style={{ padding: '2rem' }}>
      
      {/* PDF EXPORT BUTTON */}
      <div className="flex justify-end mb-4 no-print">
        <button onClick={() => window.print()} className="action-btn-terminal white" style={{ padding: '6px 12px', fontSize: '11px', height: 'auto' }}>
          <FileText size={14} className="mr-2 inline" />
          <span>EXPORTER REÇU (PDF)</span>
        </button>
      </div>

      {/* HARAM SECTOR ALERT */}
      {result.isHaramSector && (
        <div className="mb-8 bg-rose-500/10 border border-rose-500/30 p-6 rounded-xl flex items-start gap-4 text-rose-300">
          <AlertTriangle size={32} className="text-rose-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-lg text-rose-400 mb-1">SECTEUR ILLICITE PAR NATURE</h3>
            <p className="text-sm opacity-90 mb-2">L'entreprise appartient à un secteur d'activité non conforme à la Sharia ({result.sector}). Les activités telles que la banque conventionnelle, l'assurance conventionnelle, l'alcool, le tabac et les jeux de hasard sont proscrites.</p>
            <p className="text-sm font-bold opacity-100">Aucun calcul de purification n'est applicable car l'investissement principal est illicite.</p>
          </div>
        </div>
      )}

      {/* COMPLIANCE HERO BADGE */}
      <div className="flex flex-col items-center justify-center mb-8 pb-8 border-b border-white/5">
        <div className={`p-4 rounded-full mb-3 ${isManualResult && result.isCompliant ? 'bg-emerald-500/20 text-emerald-400' : (isManualResult || result.isHaramSector) ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {isManualResult && result.isCompliant ? <ShieldCheck size={48} /> : <XCircle size={48} />}
        </div>
        <h2 className={`text-4xl font-black mb-1 text-center ${isManualResult && result.isCompliant ? 'text-emerald-400' : (isManualResult || result.isHaramSector) ? 'text-rose-400' : 'text-amber-400'}`}>
          {result.isCompliant ? 'CONFORME (HALAL)' : 'NON CONFORME'}
        </h2>
        <div className="flex gap-4 mt-4 opacity-80">
          <span className="mono-tiny bg-slate-800 px-3 py-1 rounded">{result.companyName}</span>
          <span className="mono-tiny bg-slate-800 px-3 py-1 rounded">TICKER: {result.ticker}</span>
          <span className="mono-tiny bg-slate-800 px-3 py-1 rounded">ANNÉE: {result.fiscalYear}</span>
        </div>
        {!isManualResult && result.confidenceScore && result.confidenceScore > 0 && (
          <div className="mt-4 px-4 py-2 bg-amber-950/30 border border-amber-500/20 rounded-xl text-amber-300 text-sm max-w-2xl text-center">
            <strong className="block mb-1">Analyse IA (Fiabilité : {result.confidenceScore}%)</strong>
            {result.explanation}
          </div>
        )}
      </div>

      {/* AAOIFI FINANCIAL RATIOS */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-slate-400 mb-4 tracking-widest flex justify-between items-end">
          <span>RATIOS FINANCIERS (Normes AAOIFI)</span>
          {isManualResult && <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">SAISIE MANUELLE</span>}
        </h3>
        
        <div className="hidden md:block border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-white/5">
                <th className="p-4 mono-tiny text-slate-500">MÉTRIQUE</th>
                <th className="p-4 mono-tiny text-slate-500">LIMITE SHARIA</th>
                <th className="p-4 mono-tiny text-slate-500">VALEUR EXTRAITE</th>
                <th className="p-4 mono-tiny text-slate-500">RÉSULTAT RATIO</th>
                <th className="p-4 mono-tiny text-slate-500">STATUT</th>
              </tr>
            </thead>
            <tbody className="mono text-sm">
              <tr className="border-b border-white/5 hover:bg-slate-900/50 transition-colors">
                <td className="p-4 font-bold text-slate-300">Revenus Illicites / Chiffre d'Affaires</td>
                <td className="p-4 text-slate-500">&lt; 5%</td>
                <td className="p-4 text-slate-400">
                  Intérêts: <span className="text-white">{Number(result.financialData.interestIncome).toLocaleString('fr-FR')}</span><br/>
                  CA: <span className="text-white">{Number(result.financialData.totalRevenue).toLocaleString('fr-FR')}</span>
                </td>
                <td className="p-4 font-bold text-white">{result.purificationRate.toFixed(2)}%</td>
                <td className="p-4">
                  <div className={`px-2 py-1 rounded text-xs font-bold inline-block ${result.purificationRate <= 5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {result.purificationRate <= 5 ? 'OK' : 'DÉPASSÉ'}
                  </div>
                </td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-slate-900/50 transition-colors">
                <td className="p-4 font-bold text-slate-300">Dettes / Dénominateur (Capitalisation/Actif)</td>
                <td className="p-4 text-slate-500">&lt; 33.33%</td>
                <td className="p-4 text-slate-400">
                  Dettes: <span className="text-white">{Number(result.financialData.interestDebt).toLocaleString('fr-FR')}</span><br/>
                  Dénominateur: <span className="text-white">{Number(result.financialData.marketCap).toLocaleString('fr-FR')}</span>
                </td>
                <td className="p-4 font-bold text-white">{result.debtRatio.toFixed(2)}%</td>
                <td className="p-4">
                  <div className={`px-2 py-1 rounded text-xs font-bold inline-block ${result.debtRatio <= 33.33 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {result.debtRatio <= 33.33 ? 'OK' : 'DÉPASSÉ'}
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-slate-900/50 transition-colors">
                <td className="p-4 font-bold text-slate-300">Trésorerie / Dénominateur</td>
                <td className="p-4 text-slate-500">&lt; 33.33%</td>
                <td className="p-4 text-slate-400">
                  Cash: <span className="text-white">{Number(result.financialData.interestCash).toLocaleString('fr-FR')}</span><br/>
                  Dénominateur: <span className="text-white">{Number(result.financialData.marketCap).toLocaleString('fr-FR')}</span>
                </td>
                <td className="p-4 font-bold text-white">{result.cashRatio.toFixed(2)}%</td>
                <td className="p-4">
                  <div className={`px-2 py-1 rounded text-xs font-bold inline-block ${result.cashRatio <= 33.33 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {result.cashRatio <= 33.33 ? 'OK' : 'DÉPASSÉ'}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* MOBILE TABLE CARDS */}
        <div className="mobile-only-container gap-3 mb-8 md:hidden">
          {[
            { label: "Revenus Illicites", val: result.purificationRate, limit: 5, tip: "AAOIFI: Max 5% des revenus totaux" },
            { label: "Endettement Bancaire", val: result.debtRatio, limit: 33, tip: "AAOIFI: Max 33% du dénominateur" },
            { label: "Trésorerie Placée", val: result.cashRatio, limit: 33, tip: "AAOIFI: Max 33% du dénominateur" }
          ].map((metric, i) => {
            const isOk = metric.val <= metric.limit;
            return (
              <div key={i} className="live-market-mobile-card p-4 bg-slate-900/50 rounded-xl border border-white/5 mb-2">
                <div className="flex justify-between items-center">
                  <div className="stock-titles">
                    <span className="stock-symbol-title font-bold text-white flex items-center gap-1">{metric.label} <span title={metric.tip} className="cursor-help opacity-50 hover:opacity-100 text-xs">ⓘ</span></span>
                    <span className="mono-tiny text-slate-500">MAX {metric.limit}%</span>
                  </div>
                  <div className="price-hero-block flex flex-col items-end">
                    <div className="hero-price font-bold mono text-lg">{metric.val.toFixed(2)}%</div>
                    <div className={`pnl-hero-pill mt-1 px-2 py-0.5 rounded text-xs font-bold ${isOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {isOk ? 'CONFORME' : 'DÉPASSÉ'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. CALCULATEUR D'AUMÔNE */}
      {canCalculate && <div className="glass p-6 rounded-2xl bg-slate-900 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <Coins size={18} />
            <span className="font-bold tracking-wide">CALCULATEUR DE PURIFICATION</span>
          </div>
          <button onClick={copyToClipboard} className="action-btn-terminal white" style={{ padding: '6px 12px', fontSize: '11px', height: 'auto' }}>
            {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
            <span>{copied ? 'COPIÉ' : 'COPIER RÉSULTAT'}</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="mono-tiny text-slate-400">MON DIVIDENDE REÇU (MAD)</label>
              <div className="flex items-center gap-1 bg-slate-800 rounded px-1 py-0.5">
                <button onClick={() => setDividendType('BRUT')} className={`text-[10px] px-2 py-0.5 rounded font-bold ${dividendType === 'BRUT' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>BRUT</button>
                <button onClick={() => setDividendType('NET')} className={`text-[10px] px-2 py-0.5 rounded font-bold ${dividendType === 'NET' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>NET</button>
              </div>
            </div>
            <input 
              type="number" 
              value={dividendAmount} 
              onChange={e => setDividendAmount(e.target.value)}
              placeholder="Ex: 6024"
              className="terminal-input"
              style={{ fontSize: '1.5rem', fontWeight: 800, padding: '1rem', width: '100%', borderRadius: '0.75rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
            />
            {dividendType === 'NET' && (
              <p className="text-[10px] text-amber-500 mt-2 leading-tight">
                <AlertTriangle size={10} className="inline mr-1" />
                La majorité des comités Sharia exigent de purifier sur la base du dividende <strong>BRUT</strong> (avant retenue à la source).
              </p>
            )}
          </div>

          <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-500 font-bold text-xs uppercase tracking-wider block mb-1">PART HALAL CONSERVÉE ({(100 - result.purificationRate).toFixed(2)}%)</span>
            <span className="mono text-2xl font-black text-white">
              +{halalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-slate-400">MAD</span>
            </span>
          </div>

          <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-rose-500 font-bold text-xs uppercase tracking-wider block mb-1">À PURIFIER / AUMÔNE ({result.purificationRate.toFixed(2)}%)</span>
            <span className="mono text-2xl font-black text-rose-500">
              -{purificationAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-rose-500/50">MAD</span>
            </span>
            <p className="text-[10px] text-rose-400/70 mt-2 italic">*Arrondi à l'unité supérieure par précaution religieuse</p>
          </div>
        </div>
      </div>}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .data-terminal, .data-terminal * {
            visibility: visible;
          }
          .data-terminal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .text-amber-400, .text-amber-500, .text-rose-400, .text-rose-500, .text-emerald-400, .text-emerald-500, .text-white, .text-slate-300, .text-slate-400, .text-slate-500 {
            color: black !important;
          }
          .bg-slate-900\\/50, .bg-slate-800, .glass-heavy, .bg-emerald-500\\/20, .bg-amber-500\\/20, .bg-rose-500\\/20, .bg-amber-950\\/30 {
            background: #f8fafc !important;
            border-color: #cbd5e1 !important;
          }
          .inst-row {
            border-bottom: 1px solid #ccc !important;
          }
          .pnl-hero-pill {
            border: 1px solid #000 !important;
            color: #000 !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
