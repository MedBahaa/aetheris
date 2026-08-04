import React from 'react';
import { CompanyAnalysis, AgentType } from '@/lib/agent-engine';

export interface DashboardProps {
  // State
  query: string;
  loading: boolean;
  analysis: CompanyAnalysis | null;
  activeId: string | undefined;
  activeAgent: AgentType;
  history: CompanyAnalysis[];
  terminalLogs: string[];
  isSidebarOpen: boolean;
  error: string | null;
  suggestions: any[];
  showSuggestions: boolean;
  selectedIndex: number;

  // Setters
  setQuery: (q: string) => void;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowSuggestions: (show: boolean) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setActiveAgent: (agent: AgentType) => void;
  setError: (err: string | null) => void;
  
  // Handlers
  handleSearch: (e: React.FormEvent, overrideQuery?: string, forceRefresh?: boolean, overrideAgent?: AgentType) => void;
  executeSearch: (ticker: string, forceRefresh?: boolean) => void;
  handleSelectFromHistory: (a: CompanyAnalysis) => void;

  // Refs
  searchRef: React.RefObject<HTMLDivElement | null>;
  logContainerRef: React.RefObject<HTMLDivElement | null>;
}
