'use client';

import { useState, useEffect, useTransition, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { CompanyAnalysis, AgentType } from '@/lib/schemas';
import { analyzeCompanyAction } from '@/lib/actions';
import { HistoryService } from '@/lib/history-service';
import { recordAiSignal } from '@/lib/signal-tracker';
import { PremiumPaywallModal } from '@/components/portfolio/PremiumPaywallModal';
import { getUserProfileAction } from '@/lib/portfolio-actions';
import { activateSandboxSubscriptionAction } from '@/lib/stripe-actions';
import { useDevice } from '@/hooks/useDevice';
import { DashboardProps } from '@/types/dashboard';
import MobileDashboard from '@/components/adaptive/MobileDashboard';
import TabletDashboard from '@/components/adaptive/TabletDashboard';
import DesktopDashboard from '@/components/adaptive/DesktopDashboard';

export default function ConsolePage() {
  return (
    <Suspense fallback={null}>
      <ConsoleHome />
    </Suspense>
  );
}

function ConsoleHome() {
  const { isMobile, isTablet, isDesktop, isHydrated } = useDevice();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [activeAgent, setActiveAgent] = useState<AgentType>('STRATEGY');
  const [history, setHistory] = useState<CompanyAnalysis[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const autoSearchDone = useRef(false);

  useEffect(() => {
    const agentParam = searchParams.get('agent') as AgentType;
    const qParam = searchParams.get('q');

    if (agentParam && ['SENTIMENT', 'TECHNICAL', 'FUNDAMENTAL', 'STRATEGY'].includes(agentParam)) {
      setActiveAgent(agentParam);
    }

    if (qParam && !autoSearchDone.current) {
      autoSearchDone.current = true;
      setQuery(qParam);
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSearch(fakeEvent, qParam, false, agentParam);
      }, 100);
    }
  }, [searchParams]);

  useEffect(() => {
    setHistory(HistoryService.getFilteredHistory(activeAgent));
  }, [activeAgent]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getUserProfileAction();
        if (res && res.success && res.data) {
          setSubscriptionTier(res.data.subscription_tier || 'free');
        } else {
          setSubscriptionTier('free');
        }
      } catch (err) {
        console.error(err);
        setSubscriptionTier('free');
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(query)}`);
        const contentType = res.headers.get('content-type');
        if (!res.ok || !contentType?.includes('application/json')) {
          setSuggestions([]);
          return;
        }
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error("Search API Error:", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeSearch = (ticker: string, forceRefresh: boolean = false) => {
    setQuery(ticker);
    setShowSuggestions(false);
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSearch(fakeEvent, ticker, forceRefresh);
  };

  const handleSearch = async (e: React.FormEvent, overrideQuery?: string, forceRefresh: boolean = false, overrideAgent?: AgentType) => {
    e.preventDefault();
    const finalQuery = (overrideQuery || query).toUpperCase().trim();
    if (!finalQuery || isPending) return;

    const agentToUse = overrideAgent || activeAgent;
    if (agentToUse === 'STRATEGY' && subscriptionTier === 'free') {
      setLoading(false);
      setShowPaywallModal(true);
      return;
    }

    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
    const controller = new AbortController();
    streamAbortRef.current = controller;

    setLoading(true);
    setAnalysis(null); 
    setError(null);
    setActiveId(undefined);
    setShowSuggestions(false);
    setTerminalLogs([`INITIALISATION DU MOTEUR POUR : ${finalQuery}`, `CONNEXION AU FLUX TEMPS RÉEL SSE...`]);

    startTransition(async () => {
      try {
        let result: CompanyAnalysis | null = null;
        let usedSse = false;

        try {
          const res = await fetch('/api/analyze-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: finalQuery, type: agentToUse, forceRefresh }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => null);
            if (errJson?.message) {
              throw new Error(errJson.message);
            }
          } else if (res.body) {
            usedSse = true;
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let streamDone = false;

            while (!streamDone) {
              const { value, done } = await reader.read();
              streamDone = done;
              if (value) {
                buffer += decoder.decode(value, { stream: true });
                const chunks = buffer.split('\n\n');
                buffer = chunks.pop() || '';
                for (const chunk of chunks) {
                  if (!chunk.startsWith('data: ')) continue;
                  const payload = JSON.parse(chunk.slice(6));
                  if (payload.type === 'progress' && typeof payload.message === 'string') {
                    setTerminalLogs(prev =>
                      prev[prev.length - 1] === payload.message ? prev : [...prev, payload.message]
                    );
                  } else if (payload.type === 'result' && payload.data) {
                    result = payload.data as CompanyAnalysis;
                  } else if (payload.type === 'error') {
                    throw new Error(payload.message || "Erreur lors de l'analyse.");
                  }
                }
              }
            }
          }
        } catch (sseErr: any) {
          if (sseErr?.name === 'AbortError') return;
          if (usedSse || sseErr?.message?.includes('PAYWALL_BLOCKED') || sseErr?.message?.includes('Limite') || sseErr?.message?.includes('limite')) {
            throw sseErr;
          }
          // Repli transparent vers la Server Action si le flux SSE n'est pas joignable
          setTerminalLogs(prev => [...prev, 'BASCULE SUR LE CANAL D\'EXÉCUTION DIRECT...']);
          result = await analyzeCompanyAction(finalQuery, agentToUse, forceRefresh);
        }

        if (!result) {
          result = await analyzeCompanyAction(finalQuery, agentToUse, forceRefresh);
        }

        setAnalysis(result);
        setActiveId(result.id);
        HistoryService.saveToHistory(result);
        setHistory(HistoryService.getFilteredHistory(agentToUse));
        const verdict = result.orchestrator?.finalAction || result.recommendedAction;
        if (agentToUse === 'STRATEGY' && verdict) {
          void recordAiSignal({
            symbol: finalQuery,
            companyName: result.companyName || finalQuery,
            action: verdict,
            priceAtSignal: String(result.price || result.fundamentals?.marketCap || 'N/A'),
            targetPrice: result.orchestrator?.takeProfit,
            stopLoss: result.orchestrator?.stopLoss,
            confidenceLevel: result.orchestrator?.confidenceLevel || result.confidenceLevel,
          });
        }
        setQuery('');
        setLoading(false);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error(err);
        const msg = err?.message || '';
        if (msg.includes('PAYWALL_BLOCKED')) {
          setShowPaywallModal(true);
        } else {
          setError(msg || "Une erreur est survenue lors de l'analyse.");
        }
        setLoading(false);
      }
    });
  };

  const handleSelectFromHistory = (a: CompanyAnalysis) => {
    setAnalysis(a);
    setActiveId(a.id);
    if (a.type) {
      setActiveAgent(a.type);
    }
  };

  const handleUpgrade = async () => {
    try {
      const res = await activateSandboxSubscriptionAction();
      if (res.success) {
        setSubscriptionTier('premium');
        setShowPaywallModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAgentChange = (type: AgentType) => {
    setActiveAgent(type);
    if (analysis && analysis.companyName) {
      const currentCompany = analysis.companyName;
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(fakeEvent, currentCompany, false, type);
    } else {
      setAnalysis(null);
      setActiveId(undefined);
    }
  };

  const dashboardProps: DashboardProps & { handleAgentChange: (type: AgentType) => void } = {
    query, setQuery, loading, analysis, activeId, activeAgent, history, terminalLogs,
    isSidebarOpen, setIsSidebarOpen, error, setError, suggestions, showSuggestions,
    setShowSuggestions, selectedIndex, setSelectedIndex, handleSearch, executeSearch,
    handleSelectFromHistory, searchRef, logContainerRef, setActiveAgent, handleAgentChange
  };

  if (!isHydrated) {
    return <div style={{ minHeight: '100vh', background: '#020408' }} />;
  }

  return (
    <>
      {isMobile && <MobileDashboard {...dashboardProps} />}
      {isTablet && <TabletDashboard {...dashboardProps} />}
      {isDesktop && <DesktopDashboard {...dashboardProps} />}

      <PremiumPaywallModal 
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        onUpgrade={handleUpgrade}
      />
    </>
  );
}
