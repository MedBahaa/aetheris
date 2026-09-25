'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Trophy, RefreshCw, AlertCircle, Coins, Search, ArrowUpRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { DividendYieldData } from '@/lib/scrapers/dividend-scraper';
import { useDebounce } from '@/hooks/useDebounce';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DividendesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data: DividendYieldData[] }>(
    '/api/dividendes',
    fetcher
  );

  const dividends = data?.data || [];
  
  const filteredDividends = dividends.filter(d => 
    d.symbol.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    d.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <Sidebar history={[]} onSelect={() => {}} activeAgent="STRATEGY" onAgentChange={() => {}} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col relative h-screen max-w-full overflow-hidden transition-all duration-300 z-10 lg:ml-64">
        <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Coins className="text-emerald-400" size={32} />
                  Palmarès des Dividendes 2026
                </h1>
                <p className="text-slate-400 mt-2 max-w-2xl">
                  Classement des entreprises cotées à la Bourse de Casablanca offrant les meilleurs rendements (Dividend Yield) basés sur les données en temps réel.
                </p>
              </div>
              <button 
                onClick={() => mutate()}
                disabled={isLoading}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-sm py-2 px-4 rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                Actualiser
              </button>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />
                <p className="text-rose-300 text-sm">
                  Erreur lors du chargement des données. Veuillez réessayer plus tard.
                </p>
              </div>
            )}

            {/* Content Box */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-4 md:p-6 border-b border-slate-700/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 font-medium">
                  <Trophy size={18} className="text-amber-400" />
                  Top Rendements BVC
                </div>
                
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Rechercher (ex: IAM, Attijari...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-medium">Rang</th>
                      <th className="px-6 py-4 font-medium">Valeur</th>
                      <th className="px-6 py-4 font-medium text-right">Yield (%)</th>
                      <th className="px-6 py-4 font-medium text-right">Dividende (DH)</th>
                      <th className="px-6 py-4 font-medium text-right">Cours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {isLoading ? (
                      // Skeleton Loading
                      Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-4 w-8 bg-slate-700 rounded"></div></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-slate-700 rounded-full"></div>
                              <div className="h-4 w-24 bg-slate-700 rounded"></div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-700 rounded ml-auto"></div></td>
                          <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-700 rounded ml-auto"></div></td>
                          <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-700 rounded ml-auto"></div></td>
                        </tr>
                      ))
                    ) : filteredDividends.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          Aucun résultat trouvé pour "{searchTerm}"
                        </td>
                      </tr>
                    ) : (
                      filteredDividends.map((item, idx) => (
                        <tr key={item.symbol} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="px-6 py-4">
                            <span className={`font-mono font-medium ${idx < 3 ? 'text-amber-400' : 'text-slate-400'}`}>
                              #{item.rank}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                {item.symbol.substring(0, 3)}
                              </div>
                              <div>
                                <div className="font-medium text-slate-200">{item.symbol}</div>
                                <div className="text-xs text-slate-500">{item.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md font-medium">
                              <ArrowUpRight size={14} />
                              {item.yield}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-300">
                            {item.amountDH}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-400 font-mono">
                            {item.price}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
