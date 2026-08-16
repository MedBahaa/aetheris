import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

export interface ManualFormState {
  companyName: string;
  ticker: string;
  totalRevenue: string;
  interestIncome: string;
  interestDebt: string;
  interestCash: string;
  marketCap: string;
}

interface ManualCalculatorProps {
  onCalculate: (form: ManualFormState, denominatorType: 'MARKET_CAP' | 'TOTAL_ASSETS') => void;
  activeTab: 'AI_SEARCH' | 'MANUAL';
}

export default function ManualCalculator({ onCalculate, activeTab }: ManualCalculatorProps) {
  const [denominatorType, setDenominatorType] = useState<'MARKET_CAP' | 'TOTAL_ASSETS'>('MARKET_CAP');
  const [manualForm, setManualForm] = useState<ManualFormState>({
    companyName: '', ticker: '', totalRevenue: '', interestIncome: '',
    interestDebt: '', interestCash: '', marketCap: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(manualForm, denominatorType);
  };

  if (activeTab !== 'MANUAL') return null;

  return (
    <form onSubmit={handleSubmit} className="glass-heavy p-6 rounded-2xl animate-fade-in relative z-10">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-white text-lg">Saisie Manuelle des États Financiers</h3>
        <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1">
          <button type="button" onClick={() => setDenominatorType('MARKET_CAP')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors ${denominatorType === 'MARKET_CAP' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>CAPITALISATION BOURSIÈRE</button>
          <button type="button" onClick={() => setDenominatorType('TOTAL_ASSETS')} className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors ${denominatorType === 'TOTAL_ASSETS' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>TOTAL ACTIF</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mb-2">
          <label className="mono-tiny text-slate-400 block mb-1">NOM ENTREPRISE</label>
          <input type="text" className="terminal-input w-full p-3 rounded-xl" placeholder="Ex: Itissalat Al-Maghrib" value={manualForm.companyName} onChange={e => setManualForm({...manualForm, companyName: e.target.value})} required />
        </div>
        <div className="mb-2">
          <label className="mono-tiny text-slate-400 block mb-1">TICKER (Optionnel)</label>
          <input type="text" className="terminal-input w-full p-3 rounded-xl" placeholder="Ex: IAM" value={manualForm.ticker} onChange={e => setManualForm({...manualForm, ticker: e.target.value.toUpperCase()})} />
        </div>

        <div className="col-span-1 md:col-span-2 mt-2 mb-2 border-t border-white/5 pt-4">
          <h4 className="text-sm font-bold text-slate-300 mb-4">COMPTE DE RÉSULTAT (MAD)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mono-tiny text-slate-400 block mb-1">CHIFFRE D'AFFAIRES TOTAL</label>
              <input type="number" step="0.01" className="terminal-input w-full p-3 rounded-xl" placeholder="Ex: 35000000" value={manualForm.totalRevenue} onChange={e => setManualForm({...manualForm, totalRevenue: e.target.value})} required />
            </div>
            <div>
              <label className="mono-tiny text-slate-400 block mb-1">PRODUITS INTÉRÊTS / FINANCIERS ILLICITES</label>
              <input type="number" step="0.01" className="terminal-input w-full p-3 rounded-xl" placeholder="Ex: 500000" value={manualForm.interestIncome} onChange={e => setManualForm({...manualForm, interestIncome: e.target.value})} required />
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 mt-2 mb-2 border-t border-white/5 pt-4">
          <h4 className="text-sm font-bold text-slate-300 mb-4">BILAN & MARCHÉ (MAD)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mono-tiny text-slate-400 block mb-1">DETTES PORTEUSES D'INTÉRÊTS</label>
              <input type="number" step="0.01" className="terminal-input w-full p-3 rounded-xl" placeholder="Emprunts Bancaires..." value={manualForm.interestDebt} onChange={e => setManualForm({...manualForm, interestDebt: e.target.value})} required />
            </div>
            <div>
              <label className="mono-tiny text-slate-400 block mb-1">TRÉSORERIE & PLACEMENTS (LIQUIDES)</label>
              <input type="number" step="0.01" className="terminal-input w-full p-3 rounded-xl" placeholder="Cash, OPCVM..." value={manualForm.interestCash} onChange={e => setManualForm({...manualForm, interestCash: e.target.value})} required />
            </div>
            <div>
              <label className="mono-tiny text-slate-400 block mb-1">{denominatorType === 'MARKET_CAP' ? 'CAPITALISATION BOURSIÈRE (Sur 36 mois moy.)' : 'TOTAL ACTIF'}</label>
              <input type="number" step="0.01" className="terminal-input w-full p-3 rounded-xl bg-slate-800/50" placeholder="Le dénominateur de ratio..." value={manualForm.marketCap} onChange={e => setManualForm({...manualForm, marketCap: e.target.value})} required />
            </div>
          </div>
        </div>
      </div>
      <button type="submit" className="action-btn-terminal strategy full-width mt-4">
        <Calculator size={16} /> <span>CALCULER LA CONFORMITÉ MANUELLE</span>
      </button>
    </form>
  );
}
