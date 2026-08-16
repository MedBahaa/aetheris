import React, { useState, useEffect } from 'react';
import { Search, FileText, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface ShariaSearchBoxProps {
  onSearch: (query: string, pdfFile: File | null) => void;
  loading: boolean;
  loadingStep: number;
  loadingMessage: string;
  error: string | null;
  activeTab: 'AI_SEARCH' | 'MANUAL';
  setActiveTab: (tab: 'AI_SEARCH' | 'MANUAL') => void;
}

export default function ShariaSearchBox({
  onSearch,
  loading,
  loadingStep,
  loadingMessage,
  error,
  activeTab,
  setActiveTab
}: ShariaSearchBoxProps) {
  const [query, setQuery] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingDebounce, setIsSearchingDebounce] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (debouncedQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setIsSearchingDebounce(true);
      try {
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(debouncedQuery.trim())}`, { signal: controller.signal });
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Error fetching suggestions:', err);
      } finally {
        if (!controller.signal.aborted) setIsSearchingDebounce(false);
      }
    };

    fetchSuggestions();
    return () => controller.abort();
  }, [debouncedQuery]);

  const handleSuggestionClick = (symbol: string) => {
    setQuery(symbol);
    setShowSuggestions(false);
    onSearch(symbol, pdfFile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    onSearch(query, pdfFile);
  };

  return (
    <>
      <div className="flex bg-slate-900/60 rounded-xl p-1 mb-8">
        <button 
          onClick={() => setActiveTab('AI_SEARCH')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'AI_SEARCH' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
        >
          ANALYSE IA (AUTOMATIQUE)
        </button>
        <button 
          onClick={() => setActiveTab('MANUAL')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'MANUAL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          SAISIE MANUELLE
        </button>
      </div>

      {activeTab === 'AI_SEARCH' && (
        <form onSubmit={handleSubmit} className="animate-fade-in relative z-10">
          <div className="search-container glass-heavy p-2 rounded-2xl flex items-center relative mb-4">
            <Search className="text-emerald-400 ml-4 mr-2" />
            <input 
              type="text" 
              placeholder="Rechercher une entreprise cotée (ex: Maroc Telecom, ATW...)"
              className="terminal-input flex-1"
              style={{ fontSize: '1.25rem', padding: '1rem', background: 'transparent', border: 'none', color: '#ffffff' }}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="p-2 text-slate-400 hover:text-white mr-2">
                <X size={20} />
              </button>
            )}
            
            {showSuggestions && (query.trim().length >= 2) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-50">
                {isSearchingDebounce ? (
                  <div className="p-4 text-center text-slate-500 text-sm">Recherche en cours...</div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((s, i) => (
                    <div 
                      key={i}
                      className="p-4 hover:bg-slate-800 border-b border-slate-800 cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => handleSuggestionClick(s.symbol)}
                    >
                      <span className="font-bold text-white">{s.name}</span>
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">{s.symbol}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500 text-sm">Aucune entreprise marocaine trouvée pour "{query}"</div>
                )}
              </div>
            )}
          </div>
          
          <div className="glass-heavy p-4 rounded-xl border border-white/5 mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                Rapport Financier PDF (Optionnel)
              </p>
              <p className="text-xs text-slate-400">Si fourni, l'IA extraira les chiffres de ce document certifié au lieu du web.</p>
            </div>
            <div>
              <input
                type="file"
                accept="application/pdf"
                id="pdf-upload"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)}
              />
              <label htmlFor="pdf-upload" className="action-btn-terminal strategy text-xs cursor-pointer inline-block" style={{ height: 'auto', padding: '8px 12px' }}>
                {pdfFile ? pdfFile.name : 'Uploader PDF'}
              </label>
              {pdfFile && (
                <button type="button" onClick={() => setPdfFile(null)} className="ml-2 text-rose-400 hover:text-rose-300 text-xs">Retirer</button>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading || !query.trim()} className="action-btn-terminal emerald full-width">
            {loading ? 'ANALYSE EN COURS...' : 'LANCER L\'ANALYSE SHARIA IA'}
          </button>
        </form>
      )}

      {/* LOADING STATE ANIMATION */}
      {loading && (
        <div className="glass-heavy p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-4 my-6 animate-pulse border border-emerald-500/20">
          <RefreshCw className="animate-spin text-emerald-400" size={36} />
          <div className="flex flex-col gap-1">
            <h3 className="mono font-bold text-base text-white">RECHERCHE ET ANALYSE SHARIA EN COURS...</h3>
            <p className="mono-tiny text-emerald-400">
              {`🔍 Etape ${loadingStep}/4: ${loadingMessage}`}
            </p>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="glass-heavy p-6 rounded-2xl my-6 border border-rose-500/40 bg-rose-950/20 text-rose-300 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={28} className="text-rose-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-white">Analyse automatique indisponible</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button onClick={() => setActiveTab('MANUAL')} className="action-btn-terminal strategy">
            Saisir les chiffres manuellement
          </button>
        </div>
      )}
    </>
  );
}
