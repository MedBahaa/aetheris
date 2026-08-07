'use client';

import { 
  History, Search, ArrowRight, BrainCircuit, Activity, 
  ShieldCheck, X, Globe, Zap, LayoutGrid, Scale,
  Landmark, Briefcase, ChevronDown, ChevronRight,
  User, AlertTriangle, CheckCircle2, Bell, MessageSquare, LogOut
} from 'lucide-react';
import { CompanyAnalysis, AgentType } from '@/lib/agent-engine';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getUserProfileAction, upsertUserProfileAction } from '@/lib/portfolio-actions';
import { useDevice } from '@/hooks/useDevice';


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
  const { isDesktop } = useDevice();
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [profile, setProfile] = useState<any>(null);

  const handleLogout = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.auth.signOut();
      localStorage.removeItem('aetheris_last_activity_time');
      localStorage.removeItem('aetheris_user_profile');
      window.location.href = '/login';
    } catch (err) {
      console.error('Error logging out:', err);
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getUserProfileAction();
        if (res && res.success && res.data) {
          setProfile(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile in sidebar:', err);
      }
    };
    fetchProfile();
  }, [pathname]);

  const [marketIndex, setMarketIndex] = useState<{ price: string, variation: string, value: number }>({
    price: '17 667,10',
    variation: '-0,29%',
    value: -0.29
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
       {!isDesktop && (
         <div 
          className={`sidebar-overlay ${isOpen ? 'is-active' : ''}`}
          onClick={onClose}
          onTouchStart={onClose}
          aria-hidden="true"
          style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
         />
       )}

      <aside 
        className={`sidebar glass-heavy ${isOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation principale Aetheris"
      >
        <div className="sidebar-header">
          <div className="nav-label-top">CONTRÔLE ALPHA</div>
          <button 
            onClick={onClose} 
            className="close-btn-drawer touch-target"
            aria-label="Fermer le menu"
            style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
             <X size={20} />
          </button>
        </div>

        <div className="sidebar-scroll-area">
          <div 
            className="market-status-widget animate-fade-in"
            style={{
              margin: '1rem',
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              background: marketIndex.value >= 0 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)' 
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: marketIndex.value >= 0 
                ? '1px solid rgba(16, 185, 129, 0.2)' 
                : '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0
            }}
          >
             <div 
               className="widget-grid-pattern"
               style={{
                 position: 'absolute',
                 inset: 0,
                 opacity: 0.03,
                 backgroundImage: 'radial-gradient(#fff 1px, transparent 0)',
                 backgroundSize: '8px 8px',
                 pointerEvents: 'none'
               }}
             ></div>
             <div 
               className="status-label"
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: '0.5rem',
                 color: '#64748b',
                 fontSize: '9px',
                 fontWeight: 800,
                 letterSpacing: '0.08rem',
                 textTransform: 'uppercase',
                 fontFamily: 'JetBrains Mono, monospace'
               }}
             >
                <span 
                  className="pulse-dot"
                  style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px #10b981'
                  }}
                ></span>
                <span>MASI CASABLANCA</span>
                <span 
                  className="live-badge-glow"
                  style={{
                    fontSize: '8px',
                    fontWeight: 900,
                    color: '#10b981',
                    marginLeft: 'auto',
                    letterSpacing: '0.05rem'
                  }}
                >LIVE</span>
             </div>
             <div 
               className="status-main"
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'space-between',
                 position: 'relative',
                 zIndex: 10
               }}
             >
                <span 
                  className="index-val mono"
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    color: '#fff',
                    letterSpacing: '-0.02em'
                  }}
                >
                  {marketIndex.price}
                </span>
                <span 
                  className="index-change mono"
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    fontFamily: 'JetBrains Mono, monospace',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: marketIndex.value >= 0 ? '#10b981' : '#ef4444',
                    backgroundColor: marketIndex.value >= 0 ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)'
                  }}
                >
                  {marketIndex.value >= 0 ? '▲' : '▼'} {marketIndex.variation}
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

                <Link href="/purification" style={{ textDecoration: 'none' }} onClick={onClose}>
                  <button className={`agent-btn-compact ${pathname === '/purification' ? 'active' : ''}`}>
                    <Scale size={16} />
                    <span>Purification Dividendes</span>
                    <span className="live-badge-glow" style={{ fontSize: '8px', color: '#10b981', marginLeft: 'auto' }}>AAOIFI</span>
                  </button>
                </Link>

                <Link href="/profile" style={{ textDecoration: 'none' }} onClick={onClose}>
                  <button 
                    className={`agent-btn-compact user-profile-btn ${pathname === '/profile' ? 'active' : ''} ${profile?.subscription_tier === 'premium' ? 'premium-active' : ''}`}
                  >
                    <div className="user-avatar-group">
                      <User size={16} />
                    </div>
                    <span>Mon Profil & Abonnement</span>
                    {profile?.subscription_tier === 'premium' ? (
                      <span className="premium-badge-nav mono-tiny">PREMIUM</span>
                    ) : (
                      <span className="free-badge-nav mono-tiny">FREE</span>
                    )}
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
                      { id: 'SENTIMENT', label: 'Veille Narrative', icon: <Zap size={13} />, className: 'sentiment' },
                      { id: 'TECHNICAL', label: 'Trading Quant', icon: <Activity size={13} />, className: 'technical' },
                      { id: 'FUNDAMENTAL', label: 'Analyse Fonda', icon: <Landmark size={13} />, className: 'fundamental' },
                      { id: 'STRATEGY', label: 'Stratégie Alpha', icon: <ShieldCheck size={13} />, className: 'strategy' }
                    ].map(agent => (
                      <button 
                        key={agent.id}
                        onClick={() => handleAgentClick(agent.id as AgentType)}
                        className={`sub-node ${agent.className} ${activeAgent === agent.id ? 'active' : ''}`}
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
            onClick={handleLogout}
            className="logout-btn-minimal"
          >
            <LogOut size={14} />
            DÉCONNEXION
          </button>
          <span className="v-tag-minimal">VERSION 2.0 ALPHA</span>
        </div>



        <style jsx>{`
          .sidebar {
            display: flex !important;
            flex-direction: column !important;
            height: 100vh !important;
            height: 100dvh !important;
            overflow: hidden !important;
            position: fixed;
            top: 0;
            left: 0;
            width: var(--sidebar-width);
            z-index: 100000 !important;
            background: #090d16 !important;
            backdrop-filter: blur(24px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
            border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
            box-shadow: 20px 0 60px rgba(0, 0, 0, 0.85) !important;
          }

          .sidebar-scroll-area {
            flex: 1 !important;
            min-height: 0 !important;
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
            padding: 0.85rem 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            flex-shrink: 0;
          }
          .nav-label-top { font-size: 10px; font-weight: 900; color: #475569; letter-spacing: 0.12rem; font-family: 'JetBrains Mono', monospace; }

          .sidebar-search-block { padding: 0 0.75rem 0.6rem; }
          .sidebar-search-container { position: relative; display: flex; align-items: center; }
          .s-icon { position: absolute; left: 10px; color: #475569; transition: color 0.2s; }
          .sidebar-search-input { 
            width: 100%; 
            background: rgba(0,0,0,0.25); 
            border: 1px solid rgba(255, 255, 255, 0.04); 
            border-radius: 6px; 
            padding: 0.45rem 0.6rem 0.45rem 2rem; 
            color: #fff; 
            font-size: 11px; 
            outline: none; 
            transition: all 0.25s;
          }
          .sidebar-search-input:focus {
            border-color: rgba(16, 185, 129, 0.25);
            background: rgba(0,0,0,0.4);
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.05);
          }
          .sidebar-search-container:focus-within .s-icon {
            color: #10b981;
          }

          .nav-label { font-size: 9px; font-weight: 950; color: #475569; letter-spacing: 0.15rem; padding: 0.85rem 1rem 0.4rem; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; }
          
          .agent-btn-compact {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            width: 100%;
            padding: 0.5rem 1rem;
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: left;
            font-size: 11.5px;
            font-weight: 500;
          }
          .agent-btn-compact:hover { 
            background: rgba(255, 255, 255, 0.02); 
            color: #fff; 
            padding-left: 1.15rem; 
          }
          .agent-btn-compact.active { 
            background: rgba(255, 255, 255, 0.04); 
            color: #fff; 
            font-weight: 700;
            border-left: 2px solid #10b981;
          }
          
          .user-profile-btn {
            position: relative;
          }
          .user-avatar-group {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.05);
            font-size: 10px;
            transition: all 0.2s;
          }

          .premium-badge-nav {
            margin-left: auto;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #000;
            font-weight: 900;
            font-size: 8px;
            padding: 1px 4px;
            border-radius: 3px;
            letter-spacing: 0.01rem;
            font-family: 'JetBrains Mono', monospace;
          }
          .free-badge-nav {
            margin-left: auto;
            background: rgba(255,255,255,0.05);
            color: #64748b;
            font-weight: 800;
            font-size: 8px;
            padding: 1px 4px;
            border-radius: 3px;
            font-family: 'JetBrains Mono', monospace;
          }

          .live-pulse { width: 4px; height: 4px; background: #10b981; border-radius: 50%; margin-left: auto; box-shadow: 0 0 8px #10b981; }
          .chevron-icon { margin-left: auto; opacity: 0.5; }

          .submenu-compact { margin-left: 2rem; border-left: 1px solid rgba(255,255,255,0.04); }
          
          .sub-node {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.45rem 1rem;
            background: transparent;
            border: none;
            color: #475569;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
            text-align: left;
            transition: all 0.2s;
          }
          .sub-node:hover { padding-left: 1.15rem; }
          
          .sub-node.sentiment:hover, .sub-node.sentiment.active { color: #10b981; background: rgba(16,185,129,0.04); }
          .sub-node.technical:hover, .sub-node.technical.active { color: #3b82f6; background: rgba(59,130,246,0.04); }
          .sub-node.fundamental:hover, .sub-node.fundamental.active { color: #f59e0b; background: rgba(245,158,11,0.04); }
          .sub-node.strategy:hover, .sub-node.strategy.active { color: #a855f7; background: rgba(168,85,247,0.04); }
          
          .sub-node.active { font-weight: 700; }

          .history-section-compact { border-top: 1px solid rgba(255,255,255,0.03); margin-top: 1.25rem; }
          .history-header { display: flex; align-items: center; gap: 0.5rem; font-size: 9px; font-weight: 950; color: #475569; padding: 1.25rem 1.25rem 0.6rem; letter-spacing: 0.12rem; font-family: 'JetBrains Mono', monospace; }
          .history-group { margin-bottom: 0.75rem; }
          .group-label { padding: 0.25rem 1.25rem; color: #334155; font-size: 9px; font-weight: 900; letter-spacing: 0.05rem; }
          .history-item {
            display: flex;
            flex-direction: column;
            padding: 0.5rem 1.25rem;
            width: 100%;
            background: transparent;
            border: none;
            color: #64748b;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s;
          }
          .history-item:hover { background: rgba(255,255,255,0.02); color: #fff; padding-left: 1.45rem; }
          .history-item.active { background: rgba(255,255,255,0.04); color: #fff; border-left: 2px solid #3b82f6; }
          .h-name { font-size: 11px; font-weight: 600; }
          .h-date { font-size: 9px; opacity: 0.4; margin-top: 2px; font-family: 'JetBrains Mono', monospace; }

          .sidebar-footer-compact {
            padding: 1rem 1.25rem;
            padding-bottom: max(1.25rem, env(safe-area-inset-bottom, 24px));
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(0,0,0,0.4);
            flex-shrink: 0;
          }
          .logout-btn-minimal { 
            background: rgba(239, 68, 68, 0.12); 
            border: 1px solid rgba(239, 68, 68, 0.3); 
            color: #f87171; 
            font-size: 10px; 
            font-weight: 900; 
            padding: 0.5rem 0.85rem;
            border-radius: 8px;
            cursor: pointer; 
            display: flex; 
            align-items: center; 
            gap: 0.5rem; 
            letter-spacing: 0.05rem; 
            font-family: 'JetBrains Mono', monospace; 
            transition: all 0.25s ease;
          }
          .logout-btn-minimal:hover { 
            background: rgba(239, 68, 68, 0.25); 
            border-color: rgba(239, 68, 68, 0.5); 
            color: #ffffff; 
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
          }
          .v-tag-minimal { font-size: 9px; color: #334155; font-weight: 900; font-family: 'JetBrains Mono', monospace; }

          .close-btn-drawer { background: transparent; border: none; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.2s; }
          .close-btn-drawer:hover { color: #fff; }
          
          @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeIn 0.4s ease forwards; }

          .subscription-toggle-box {
            display: flex;
            gap: 0.5rem;
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 8px;
            padding: 3px;
          }
          .sub-toggle-btn {
            flex: 1;
            border: none;
            background: transparent;
            color: #64748b;
            font-size: 10px;
            font-weight: 800;
            font-family: 'JetBrains Mono', monospace;
            padding: 0.6rem;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .sub-toggle-btn.active {
            background: rgba(255,255,255,0.05);
            color: #fff;
          }
          .sub-toggle-btn.premium.active {
            background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
            color: #fff;
            box-shadow: 0 2px 10px rgba(168, 85, 247, 0.2);
          }
          .premium-status-banner {
            border-radius: 8px;
            padding: 0.75rem;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            margin: 0.25rem 0;
          }
          .status-banner-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #94a3b8;
          }
          .status-banner-content.premium span {
            color: #c084fc;
            font-weight: 700;
          }
          .status-banner-content.free span {
            color: #f59e0b;
            font-weight: 700;
          }
        `}</style>
      </aside>
    </>
  );
}
