'use client';

import { useState, useEffect, useTransition, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CompanyAnalysis, AgentType } from '@/lib/agent-engine';
import { analyzeCompanyAction } from '@/lib/actions';
import { HistoryService } from '@/lib/history-service';
import { PremiumPaywallModal } from '@/components/portfolio/PremiumPaywallModal';
import { getUserProfileAction, upsertUserProfileAction } from '@/lib/portfolio-actions';
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
  
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const autoSearchDone = useRef(false);

  useEffect(() => {
    if (isDesktop) {
      setIsSidebarOpen(true);
    }
  }, [isDesktop]);

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
        }
      } catch (err) {
        console.error(err);
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

    setLoading(true);
    setAnalysis(null); 
    setError(null);
    setActiveId(undefined);
    setShowSuggestions(false);
    setTerminalLogs([`INITIALISATION DU MOTEUR POUR : ${finalQuery}`, `ÉTABLISSEMENT DE LA CONNEXION SÉCURISÉE...`]);
    
    const steps = agentToUse === 'SENTIMENT' 
      ? ['RÉCUPÉRATION DES FLUX RSS', 'EXTRACTION DES NEWS BOURSIÈRES', 'TRAITEMENT DES SOURCES', 'ANALYSE SENTIMENTALE IA EN COURS']
      : agentToUse === 'TECHNICAL'
      ? ['CONNEXION AU MARCHÉ LIVE', 'RÉCUPÉRATION DES COURS HISTORIQUES', 'CALCUL DES INDICATEURS TECHNIQUES', 'GÉNÉRATION DES RETRACEMENTS']
      : ['LIAISON MULTI-AGENTS OK', 'RÉCUPÉRATION DES DONNÉES MARCHÉ', 'SCRAPING DES NEWS INSTITUTIONNELLES', 'CALCUL DES POINTS PIVOTS', 'AGENTS NEWS OPÉRATIONNELS', 'AGENTS MARCHÉ PRÊTS', 'SYNTHÈSE IA ÉLITE EN COURS'];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setTerminalLogs(prev => [...prev, steps[stepIdx]]);
        stepIdx++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    startTransition(async () => {
      try {
        const result = await analyzeCompanyAction(finalQuery, agentToUse, forceRefresh);
        setTerminalLogs(prev => [...prev, `VALIDATION DES DONNÉES TERMINÉE`, `SYNTHÈSE CALCULÉE AVEC SUCCÈS`, `GÉNÉRATION DU RAPPORT EN COURS...`]);
        setTimeout(() => {
          clearInterval(interval);
          setAnalysis(result);
          setActiveId(result.id);
          HistoryService.saveToHistory(result);
          setHistory(HistoryService.getFilteredHistory(agentToUse));
          setQuery('');
          setLoading(false);
        }, 500);
      } catch (err: any) {
        console.error(err);
        const msg = err.message || '';
        if (msg.includes('PAYWALL_BLOCKED')) {
          setShowPaywallModal(true);
        } else {
          setError(msg || "Une erreur est survenue lors de l'analyse.");
        }
        setLoading(false);
        clearInterval(interval);
      }
    });
  };

  const handleSelectFromHistory = (a: CompanyAnalysis) => {
    setAnalysis(a);
    setActiveId(a.id);
  };

  const handleUpgrade = async () => {
    try {
      setSubscriptionTier('premium');
      await upsertUserProfileAction({ initial_capital: 0, subscription_tier: 'premium' });
      setShowPaywallModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAgentChange = (type: AgentType) => {
    setActiveAgent(type);
    setAnalysis(null);
    setActiveId(undefined);
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
