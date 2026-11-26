'use client';

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
    <div className="sharia-box-root">
      <div className="sharia-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'AI_SEARCH'}
          onClick={() => setActiveTab('AI_SEARCH')}
          className={`sharia-tab-btn ${activeTab === 'AI_SEARCH' ? 'active-ai' : ''}`}
        >
          ANALYSE IA (AUTO)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'MANUAL'}
          onClick={() => setActiveTab('MANUAL')}
          className={`sharia-tab-btn ${activeTab === 'MANUAL' ? 'active-manual' : ''}`}
        >
          SAISIE MANUELLE
        </button>
      </div>

      {activeTab === 'AI_SEARCH' && (
        <form onSubmit={handleSubmit} className="sharia-form animate-fade-in">
          <div className="sharia-search-box glass-heavy">
            <Search size={18} className="sharia-search-icon" />
            <input
              type="text"
              placeholder="Entreprise cotée (ex: Maroc Telecom, ATW...)"
              className="sharia-search-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              aria-label="Rechercher une entreprise Sharia"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="sharia-clear-btn"
                aria-label="Effacer"
              >
                <X size={18} />
              </button>
            )}

            {showSuggestions && query.trim().length >= 2 && (
              <div className="sharia-suggestions">
                {isSearchingDebounce ? (
                  <div className="sharia-sugg-status">Recherche en cours...</div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="sharia-sugg-item"
                      onClick={() => handleSuggestionClick(s.symbol)}
                    >
                      <span className="sharia-sugg-name">{s.name}</span>
                      <span className="sharia-sugg-sym mono">{s.symbol}</span>
                    </div>
                  ))
                ) : (
                  <div className="sharia-sugg-status">
                    Aucune entreprise marocaine trouvée pour &laquo; {query} &raquo;
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pdf-upload-card glass-heavy">
            <div className="pdf-info">
              <p className="pdf-title">
                <FileText size={16} className="pdf-icon" />
                <span>Rapport Financier PDF (Optionnel)</span>
              </p>
              <p className="pdf-desc">
                Si fourni, l&apos;IA extraira les chiffres de ce document certifié au lieu du web.
              </p>
            </div>
            <div className="pdf-controls">
              <input
                type="file"
                accept="application/pdf"
                id="pdf-upload"
                className="sr-only-input"
                onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)}
              />
              <label htmlFor="pdf-upload" className="pdf-upload-btn">
                {pdfFile ? pdfFile.name : 'Uploader PDF'}
              </label>
              {pdfFile && (
                <button type="button" onClick={() => setPdfFile(null)} className="pdf-remove-btn">
                  Retirer
                </button>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading || !query.trim()} className="sharia-submit-btn">
            {loading ? 'ANALYSE EN COURS...' : "LANCER L'ANALYSE SHARIA IA"}
          </button>
        </form>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="sharia-loading-card glass-heavy animate-pulse">
          <RefreshCw className="animate-spin sharia-spin-icon" size={32} />
          <div className="sharia-loading-texts">
            <h3 className="mono sharia-loading-title">RECHERCHE ET ANALYSE SHARIA EN COURS...</h3>
            <p className="mono sharia-loading-step">
              {`🔍 Étape ${loadingStep}/4 : ${loadingMessage}`}
            </p>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="sharia-error-card glass-heavy">
          <div className="sharia-error-info">
            <AlertTriangle size={24} className="sharia-error-icon" />
            <div>
              <h4 className="sharia-error-title">Analyse automatique indisponible</h4>
              <p className="sharia-error-msg">{error}</p>
            </div>
          </div>
          <button type="button" onClick={() => setActiveTab('MANUAL')} className="sharia-fallback-btn">
            Saisir manuellement
          </button>
        </div>
      )}

      <style jsx>{`
        .sharia-box-root { margin-bottom: 1.25rem; }
        .sharia-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 5px;
          margin-bottom: 1.25rem;
        }
        .sharia-tab-btn {
          min-height: 44px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sharia-tab-btn.active-ai {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #022c22;
        }
        .sharia-tab-btn.active-manual {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .sharia-form { position: relative; z-index: 20; display: flex; flex-direction: column; gap: 0.9rem; }
        .sharia-search-box {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.75rem 0.45rem 1rem;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        :global(.sharia-search-icon) { color: #34d399; flex-shrink: 0; }
        .sharia-search-input {
          flex: 1;
          min-width: 0;
          min-height: 44px;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 500;
        }
        .sharia-clear-btn {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: none;
          background: rgba(255, 255, 255, 0.06);
          color: #94a3b8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .sharia-suggestions {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: rgba(11, 16, 27, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.75);
          z-index: 60;
          max-height: 300px;
          overflow-y: auto;
        }
        .sharia-sugg-status { padding: 1rem; text-align: center; color: #64748b; font-size: 13px; }
        .sharia-sugg-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          min-height: 48px;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
        }
        .sharia-sugg-item:hover { background: rgba(16, 185, 129, 0.08); }
        .sharia-sugg-name { font-weight: 700; color: #f8fafc; font-size: 14px; }
        .sharia-sugg-sym {
          font-size: 11px;
          font-weight: 800;
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .pdf-upload-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.15rem;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .pdf-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .pdf-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 700; color: #fff; margin: 0; }
        :global(.pdf-icon) { color: #34d399; flex-shrink: 0; }
        .pdf-desc { font-size: 0.78rem; color: #94a3b8; margin: 0; line-height: 1.4; }
        .pdf-controls { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
        .sr-only-input { display: none; }
        .pdf-upload-btn {
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          padding: 0 0.9rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #f8fafc;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          max-width: 190px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pdf-remove-btn {
          background: transparent;
          border: none;
          color: #fb7185;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 6px 8px;
        }

        .sharia-submit-btn {
          width: 100%;
          min-height: 50px;
          border: none;
          border-radius: 0.9rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #022c22;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.2s ease;
        }
        .sharia-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sharia-submit-btn:active:not(:disabled) { transform: scale(0.985); }

        .sharia-loading-card {
          padding: 2rem 1.25rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(16, 185, 129, 0.25);
          margin: 1.25rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1rem;
        }
        :global(.sharia-spin-icon) { color: #34d399; }
        .sharia-loading-texts { display: flex; flex-direction: column; gap: 4px; }
        .sharia-loading-title { font-size: 0.95rem; font-weight: 800; color: #fff; margin: 0; }
        .sharia-loading-step { font-size: 11px; color: #34d399; margin: 0; }

        .sharia-error-card {
          padding: 1.15rem;
          border-radius: 1.1rem;
          border: 1px solid rgba(244, 63, 94, 0.38);
          background: rgba(76, 5, 25, 0.35);
          margin: 1.25rem 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .sharia-error-info { display: flex; align-items: flex-start; gap: 0.75rem; flex: 1; min-width: 220px; }
        :global(.sharia-error-icon) { color: #fb7185; flex-shrink: 0; margin-top: 2px; }
        .sharia-error-title { font-size: 0.95rem; font-weight: 800; color: #fff; margin: 0 0 2px; }
        .sharia-error-msg { font-size: 12px; color: #fda4af; margin: 0; line-height: 1.45; }
        .sharia-fallback-btn {
          min-height: 42px;
          padding: 0 1rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .sharia-search-input { font-size: 16px; }
          .pdf-upload-card { flex-direction: column; align-items: stretch; }
          .pdf-controls { justify-content: space-between; }
          .pdf-upload-btn { flex: 1; justify-content: center; max-width: none; }
          .sharia-fallback-btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}
