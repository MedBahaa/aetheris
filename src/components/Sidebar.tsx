'use client';

import { 
  History, Search, ArrowRight, BrainCircuit, Activity, 
  ShieldCheck, X, Globe, Zap, LayoutGrid, 
  Landmark, Briefcase, ChevronDown, ChevronRight 
} from 'lucide-react';
import { CompanyAnalysis, AgentType } from '@/lib/agent-engine';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';


interface SidebarProps {
  history: CompanyAnalysis[];
  onSelect: (analysis: CompanyAnalysis) => void;
  activeId?: string;
  activeAgent: AgentType;
  onAgentChange: (type: AgentType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ history, onSelect, activeId, activeAgent, onAgentChange, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [marketIndex, setMarketIndex] = useState<{ price: string, variation: string, value: number }>({
    price: '14 250,42',
    variation: '+0,85%',
    value: 0.85
  });

  useEffect(() => {
    const fetchIndex = async () => {
      try {
        const res = await fetch('/api/market-index');
        const contentType = res.headers.get('content-type');
        
        if (!res.ok || !contentType?.includes('application/json')) {
          console.error(`[Sidebar] Market index fetch failed: status=${res.status}, type=${contentType}`);
          return;
        }

        const json = await res.json();
        if (json.status === 'success') {
          setMarketIndex({
            price: json.data.price,
            variation: json.data.variation,
            value: json.data.variationValue
          });
        }
      } catch (err) {
        console.error('Failed to fetch index:', err);
      }
    };

    fetchIndex();
    const interval = setInterval(fetchIndex, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAgentClick = (type: AgentType) => {
    onAgentChange(type);
    if (pathname !== '/') {
      router.push(`/?agent=${type}`);
    }
    onClose();
  };

  const toggleIntelligence = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsIntelligenceOpen(!isIntelligenceOpen);
  };

  // ✅ Grouping Logic
  const groupHistory = (items: CompanyAnalysis[]) => {
    const todayStr = new Date().toLocaleDateString('fr-FR');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('fr-FR');

    const filtered = items.filter(a => 
      a.companyName.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      a.id.toLowerCase().includes(sidebarSearch.toLowerCase())
    );

    const groups: { [key: string]: CompanyAnalysis[] } = {
      "AUJOURD'HUI": [],
      "HIER": [],
      "PRÉCÉDEMMENT": []
    };

    filtered.forEach(item => {
      if (item.date === todayStr) groups["AUJOURD'HUI"].push(item);
      else if (item.date === yesterdayStr) groups["HIER"].push(item);
      else groups["PRÉCÉDEMMENT"].push(item);
    });

    return groups;
  };

  const groupedHistory = groupHistory(history);

  return (
    <>
       <div 
        className={`sidebar-overlay ${isOpen ? 'is-active' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar glass-heavy ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <div className="nav-label-top">CONTRÔLE ALPHA</div>
          <button onClick={onClose} className="close-btn-drawer">
             <X size={18} />
          </button>
        </div>

        <div className="sidebar-scroll-area">
          {/* Alpha Market Status Widget */}
          <div className="market-status-widget glass-mini animate-fade-in">
             <div className="status-top">
               <div className="status-label">
                  <Globe size={10} />
                  <span>MASI CASABLANCA</span>
               </div>
               <div className="status-tag active">LIVE</div>
             </div>
             <div className="status-main">
                <span className="index-val mono">{marketIndex.price}</span>
                <span className={`index-change mono ${marketIndex.value > 0 ? 'positive' : marketIndex.value < 0 ? 'negative' : 'neutral'}`}>
                  {marketIndex.variation}
                </span>
             </div>
          </div>

          {/* Persistent Search Bar */}
          <div className="sidebar-search-block">
             <div className="sidebar-search-container">
                <Search size={14} className="s-icon" />
                <input 
                   type="text" 
                   value={sidebarSearch}
                   onChange={(e) => setSidebarSearch(e.target.value)}
                   placeholder="Filtrer actifs..." 
                   className="sidebar-search-input"
                />
             </div>
          </div>

          <nav className="compact-nav">
              <div className="nav-label">PILOTAGE CORE</div>
              <div className="nav-list">
                <Link href="/marche-live" style={{ textDecoration: 'none' }} onClick={onClose}>
                  <button className={`agent-btn-compact ${pathname === '/marche-live' ? 'active' : ''}`}>
                    <Globe size={16} />
                    <span>Flux de Marché</span>
                    <span className="live-pulse"></span>
                  </button>
                </Link>

                <Link href="/" style={{ textDecoration: 'none' }} onClick={onClose}>
                  <button className={`agent-btn-compact ${pathname === '/' ? 'active' : ''}`}>
                    <LayoutGrid size={16} />
                    <span>Console Alpha</span>
                  </button>
                </Link>

                <Link href="/portfolio" style={{ textDecoration: 'none' }} onClick={onClose}>
                  <button className={`agent-btn-compact ${pathname === '/portfolio' ? 'active' : ''}`}>
                    <Briefcase size={16} />
                    <span>Portefeuille</span>
                  </button>
                </Link>
              </div>

              <div className="nav-spacer-tiny"></div>

              <div className="intelligence-group">
                <button className={`agent-btn-compact parent-node ${pathname === '/intelligence' ? 'active' : ''}`} onClick={() => setIsIntelligenceOpen(!isIntelligenceOpen)}>
                  <BrainCircuit size={16} />
                  <span>Hub Intelligence</span>
                  <div className="chevron-icon">
                    {isIntelligenceOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </button>

                {isIntelligenceOpen && (
                  <div className="submenu-compact">
                    {[
                      { id: 'SENTIMENT', label: 'Veille Narrative', icon: <Zap size={13} /> },
                      { id: 'TECHNICAL', label: 'Trading Quant', icon: <Activity size={13} /> },
                      { id: 'FUNDAMENTAL', label: 'Analyse Fonda', icon: <Landmark size={13} /> },
                      { id: 'STRATEGY', label: 'Stratégie Alpha', icon: <ShieldCheck size={13} /> }
                    ].map(agent => (
                      <button 
                        key={agent.id}
                        onClick={() => handleAgentClick(agent.id as AgentType)}
                        className={`sub-node ${activeAgent === agent.id ? 'active' : ''}`}
                      >
                        {agent.icon}
                        <span>{agent.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
          </nav>

          <div className="history-section-compact">
            <div className="history-header">
              <History size={13} />
              <span>JOURNAUX D'ANALYSE</span>
            </div>
            
            <div className="history-stack">
              {Object.keys(groupedHistory).map((groupName) => {
                 const items = groupedHistory[groupName];
                 if (items.length === 0) return null;

                 return (
                   <div key={groupName} className="history-group">
                      <div className="group-label mono-tiny">{groupName}</div>
                      {items.map((analysis) => (
                        <button
                          key={analysis.id}
                          onClick={() => { onSelect(analysis); if (window.innerWidth < 1024) onClose(); }}
                          className={`history-item ${activeId === analysis.id ? 'active' : ''}`}
                        >
                          <span className="h-name">{analysis.companyName}</span>
                          <span className="h-date mono">{analysis.date}</span>
                        </button>
                      ))}
                   </div>
                 );
              })}
              {history.length === 0 && <p className="empty-history">Aucun log disponible</p>}
            </div>
          </div>
        </div>

        <div className="sidebar-footer-compact">
          <button 
            onClick={async () => {
              const { supabase } = await import('@/lib/supabase');
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="logout-btn-minimal"
          >
            <ShieldCheck size={13} />
            DÉCONNEXION
          </button>
          <span className="v-tag-minimal">VERSION 2.0 ALPHA</span>
        </div>

        <style jsx>{`
          .sidebar {
            display: flex !important;
            flex-direction: column !important;
            height: 100vh !important;
            overflow: hidden !important;
            position: fixed;
            top: 0;
            left: 0;
            width: var(--sidebar-width);
            z-index: 1000;
            background: rgba(2, 4, 8, 0.95);
          }

          .sidebar-scroll-area {
            flex: 1 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            display: flex;
            flex-direction: column;
            padding-bottom: 2rem;
          }

          .sidebar-header { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            padding: 1.25rem;
            border-bottom: 1px solid var(--border-glass);
            flex-shrink: 0;
          }
          .nav-label-top { font-size: 10px; font-weight: 900; color: #475569; letter-spacing: 0.1rem; }

          .market-status-widget {
            margin: 1rem;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border-glass);
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
          }
          .status-top { display: flex; justify-content: space-between; align-items: center; }
          .status-label { display: flex; align-items: center; gap: 0.4rem; color: #475569; font-size: 8px; font-weight: 900; letter-spacing: 0.05rem; }
          .status-tag { font-size: 8px; font-weight: 950; color: var(--accent-emerald); }
          .status-main { display: flex; align-items: center; justify-content: space-between; }
          .index-val { font-size: 1.1rem; font-weight: 800; color: #fff; }
          .index-change { font-size: 10px; font-weight: 900; }
          .index-change.positive { color: var(--accent-emerald); }
          .index-change.negative { color: #ef4444; }
          .index-change.neutral { color: #f8fafc; }

          .sidebar-search-block { padding: 0 1rem 1rem; }
          .sidebar-search-container { position: relative; display: flex; align-items: center; }
          .s-icon { position: absolute; left: 10px; color: #334155; }
          .sidebar-search-input { 
            width: 100%; 
            background: rgba(0,0,0,0.3); 
            border: 1px solid var(--border-glass); 
            border-radius: 6px; 
            padding: 0.5rem 0.75rem 0.5rem 2.25rem; 
            color: #fff; 
            font-size: 11px; 
            outline: none; 
          }

          .nav-label { font-size: 9px; font-weight: 950; color: #475569; letter-spacing: 0.15rem; padding: 1rem 1.25rem 0.5rem; text-transform: uppercase; }
          .agent-btn-compact {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            padding: 0.6rem 1.25rem;
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            font-size: 13px;
          }
          .agent-btn-compact:hover { background: rgba(255,255,255,0.03); color: #fff; }
          .agent-btn-compact.active { background: rgba(255,255,255,0.05); color: #fff; }
          .live-pulse { width: 4px; height: 4px; background: var(--accent-emerald); border-radius: 50%; margin-left: auto; box-shadow: 0 0 8px var(--accent-emerald); }
          .chevron-icon { margin-left: auto; opacity: 0.5; }

          .submenu-compact { margin-left: 2rem; border-left: 1px solid rgba(255,255,255,0.05); }
          .sub-node {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.4rem 1rem;
            background: transparent;
            border: none;
            color: #475569;
            font-size: 11px;
            cursor: pointer;
            width: 100%;
            text-align: left;
          }
          .sub-node:hover { color: #fff; background: rgba(255,255,255,0.02); }
          .sub-node.active { color: var(--accent-emerald); font-weight: 600; }

          .history-section-compact { border-top: 1px solid rgba(255,255,255,0.03); margin-top: 1rem; }
          .history-header { display: flex; align-items: center; gap: 0.5rem; font-size: 9px; font-weight: 950; color: #475569; padding: 1rem 1.25rem 0.5rem; }
          .history-group { margin-bottom: 0.5rem; }
          .group-label { padding: 0.25rem 1.25rem; color: #334155; font-size: 8px; font-weight: 900; }
          .history-item {
            display: flex;
            flex-direction: column;
            padding: 0.4rem 1.25rem;
            width: 100%;
            background: transparent;
            border: none;
            color: #64748b;
            text-align: left;
            cursor: pointer;
          }
          .history-item:hover { background: rgba(255,255,255,0.02); color: #fff; }
          .history-item.active { background: rgba(255,255,255,0.04); color: #fff; }
          .h-name { font-size: 11px; font-weight: 600; }
          .h-date { font-size: 9px; opacity: 0.3; }

          .sidebar-footer-compact {
            padding: 0.75rem 1.25rem;
            border-top: 1px solid var(--border-glass);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(0,0,0,0.2);
            flex-shrink: 0;
          }
          .logout-btn-minimal { background: transparent; border: none; color: #ef4444; font-size: 9px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; }
          .v-tag-minimal { font-size: 9px; color: #334155; font-weight: 900; }

          .close-btn-drawer { background: transparent; border: none; color: #475569; cursor: pointer; }
          @media (min-width: 1024px) { .close-btn-drawer { display: none; } }
          
          @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeIn 0.4s ease forwards; }
        `}</style>
      </aside>
    </>
  );
}
