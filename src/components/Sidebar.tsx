'use client';

import { 
  History, Search, BrainCircuit, Activity, 
  ShieldCheck, X, Globe, Zap, LayoutGrid, Scale,
  Landmark, Briefcase, ChevronDown, ChevronRight,
  User, LogOut, LogIn, Sparkles, XCircle, Loader2
} from 'lucide-react';
import type { CompanyAnalysis, AgentType } from '@/lib/schemas';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getUserProfileAction } from '@/lib/portfolio-actions';
import { supabase, performCleanLogout } from '@/lib/supabase';
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

export default function Sidebar({ 
  history, 
  onSelect, 
  activeId, 
  activeAgent, 
  onAgentChange, 
  isOpen, 
  onClose 
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDesktop } = useDevice();
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isOpen || isDesktop) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, isDesktop, onClose]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await performCleanLogout('/login');
  };

  useEffect(() => {
    let active = true;

    const fetchAuthAndProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

        if (!session?.user) {
          setIsAuthenticated(false);
          setProfile(null);
          return;
        }

        setIsAuthenticated(true);
        const res = await getUserProfileAction();
        if (active && res && res.success && res.data) {
          setProfile(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile in sidebar:', err);
      }
    };

    fetchAuthAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setIsAuthenticated(!!session?.user);
        if (!session?.user) setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  const [marketIndex, setMarketIndex] = useState<{ price: string; variation: string; value: number }>({
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
    if (pathname !== '/console') {
      router.push(`/console?agent=${type}`);
    }
    onClose();
  };

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
      {isOpen && !isDesktop && (
        <div 
          className="sidebar-overlay is-active"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`sidebar glass-heavy ${isOpen ? 'is-open' : ''}`}
        role={isDesktop ? 'navigation' : 'dialog'}
        aria-modal={!isDesktop && isOpen ? true : undefined}
        aria-hidden={isDesktop ? false : !isOpen}
        aria-label="Navigation principale Aetheris"
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStartRef.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          if (!touchStartRef.current) return;
          const t = e.changedTouches[0];
          const deltaX = t.clientX - touchStartRef.current.x;
          const deltaY = t.clientY - touchStartRef.current.y;
          touchStartRef.current = null;
          if (deltaX < -60 && Math.abs(deltaY) < 70) {
            onClose();
          }
        }}
      >
        {/* Header Branding */}
        <div className="sidebar-header">
          <div className="brand-logo-group">
            <div className="brand-icon-box">
              <Sparkles size={16} className="brand-sparkle" />
            </div>
            <div className="brand-text-block">
              <span className="brand-title">AETHERIS</span>
              <span className="brand-sub">ALPHA CONTROL</span>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="close-btn-drawer"
            type="button"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Main Area */}
        <div className="sidebar-scroll-area">
          {/* MASI Live Market Widget */}
          <div className="market-status-widget animate-fade-in">
            <div className="widget-grid-pattern" />
            <div className="status-label">
              <span className="pulse-dot" />
              <span>MASI CASABLANCA</span>
              <span className="live-badge-glow">LIVE</span>
            </div>
            <div className="status-main">
              <span className="index-val mono">
                {marketIndex.price}
              </span>
              <span className={`index-change mono ${marketIndex.value >= 0 ? 'is-positive' : 'is-negative'}`}>
                {marketIndex.value >= 0 ? '▲' : '▼'} {marketIndex.variation}
              </span>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="sidebar-search-block">
            <div className="sidebar-search-container">
              <Search size={13} className="s-icon" />
              <input 
                type="text" 
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Filtrer les actifs..." 
                className="sidebar-search-input"
              />
              {sidebarSearch && (
                <button 
                  onClick={() => setSidebarSearch('')}
                  className="clear-search-btn"
                  aria-label="Effacer la recherche"
                >
                  <XCircle size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Core Navigation */}
          <nav className="compact-nav">
            <div className="nav-label">PILOTAGE CORE</div>
            <div className="nav-list">
              <Link href="/marche-live" style={{ textDecoration: 'none' }} onClick={() => onClose()}>
                <button className={`agent-btn-compact ${pathname === '/marche-live' ? 'active' : ''}`}>
                  <Globe size={16} className="nav-icon" />
                  <span>Flux de Marché</span>
                  <span className="live-pulse" />
                </button>
              </Link>

              <Link href="/console" style={{ textDecoration: 'none' }} onClick={() => onClose()}>
                <button className={`agent-btn-compact ${pathname === '/console' ? 'active' : ''}`}>
                  <LayoutGrid size={16} className="nav-icon" />
                  <span>Console Alpha</span>
                </button>
              </Link>

              <Link href="/portfolio" style={{ textDecoration: 'none' }} onClick={() => onClose()}>
                <button className={`agent-btn-compact ${pathname === '/portfolio' ? 'active' : ''}`}>
                  <Briefcase size={16} className="nav-icon" />
                  <span>Portefeuille</span>
                </button>
              </Link>

              <Link href="/dividendes" style={{ textDecoration: 'none' }} onClick={() => onClose()}>
                <button className={`agent-btn-compact ${pathname === '/dividendes' ? 'active' : ''}`}>
                  <Landmark size={16} className="nav-icon" style={{ color: '#fbbf24' }} />
                  <span>Palmarès Dividendes</span>
                </button>
              </Link>

              <Link href="/purification" style={{ textDecoration: 'none' }} onClick={() => onClose()}>
                <button className={`agent-btn-compact ${pathname === '/purification' ? 'active' : ''}`}>
                  <Scale size={16} className="nav-icon" />
                  <span>Purification Dividendes</span>
                  <span className="badge-tag green">AAOIFI</span>
                </button>
              </Link>
            </div>

            {/* AI Intelligence Hub Accordion */}
            <div className="nav-label">INTELLIGENCE ARTIFICIELLE</div>
            <div className="intelligence-group">
              <button 
                className={`agent-btn-compact parent-node ${pathname === '/intelligence' ? 'active' : ''}`} 
                onClick={() => setIsIntelligenceOpen(!isIntelligenceOpen)}
              >
                <BrainCircuit size={16} className="nav-icon purple" />
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

            {/* User Profile Navigation */}
            <div className="nav-label">COMPTE</div>
            <div className="nav-list">
              <Link href="/profile" style={{ textDecoration: 'none' }} onClick={() => onClose()}>
                <button 
                  className={`agent-btn-compact user-profile-btn ${pathname === '/profile' ? 'active' : ''}`}
                >
                  <div className="user-avatar-group">
                    <User size={14} />
                  </div>
                  <span>Profil & Abonnement</span>
                  {profile?.subscription_tier === 'premium' ? (
                    <span className="premium-badge-nav mono-tiny">PREMIUM</span>
                  ) : (
                    <span className="free-badge-nav mono-tiny">FREE</span>
                  )}
                </button>
              </Link>
            </div>
          </nav>

          {/* Analysis History Section */}
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
                        onClick={() => { 
                          onSelect(analysis); 
                          onClose(); 
                        }}
                        className={`history-item ${activeId === analysis.id ? 'active' : ''}`}
                      >
                        <span className="h-name">{analysis.companyName}</span>
                        <span className="h-date mono">{analysis.date}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
              {history.length === 0 && <p className="empty-history">Aucun journal disponible</p>}
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className="sidebar-footer-compact">
          {isAuthenticated ? (
            <button 
              onClick={handleLogout}
              disabled={loggingOut}
              className="logout-btn-minimal"
            >
              {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              <span>{loggingOut ? 'Déconnexion...' : 'Déconnexion'}</span>
            </button>
          ) : (
            <button 
              onClick={() => {
                onClose();
                router.push('/login');
              }}
              className="logout-btn-minimal"
              style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.25)', background: 'rgba(16, 185, 129, 0.06)' }}
            >
              <LogIn size={14} />
              <span>Se connecter</span>
            </button>
          )}
          <div className="footer-status-row">
            <span className="v-tag-minimal">AETHERIS OS v2.0</span>
            <span className="status-indicator-dot" title="Système Opérationnel" />
          </div>
        </div>

        {/* CSS Scoped Styling */}
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
            width: min(85vw, 290px);
            z-index: var(--z-drawer, 2010) !important;
            background: linear-gradient(180deg, rgba(9, 13, 22, 0.98) 0%, rgba(6, 9, 16, 0.99) 100%) !important;
            backdrop-filter: blur(24px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
            border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 20px 0 60px rgba(0, 0, 0, 0.85) !important;
            transition: transform 0.34s var(--ease-spring) !important;
          }

          @media (min-width: 1024px) {
            .sidebar {
              width: var(--sidebar-width, 256px) !important;
              transform: translateX(0) !important;
              box-shadow: none !important;
              border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
            }
            .close-btn-drawer {
              display: none !important;
            }
          }

          .sidebar-header { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            padding: calc(0.95rem + env(safe-area-inset-top, 0px)) 1rem 0.85rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            flex-shrink: 0;
          }

          .brand-logo-group {
            display: flex;
            align-items: center;
            gap: 0.65rem;
          }

          .brand-icon-box {
            width: 30px;
            height: 30px;
            border-radius: 8px;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%);
            border: 1px solid rgba(16, 185, 129, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #10b981;
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
          }

          .brand-text-block {
            display: flex;
            flex-direction: column;
          }

          .brand-title {
            font-size: 13px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: 0.12rem;
            font-family: 'JetBrains Mono', monospace;
            line-height: 1.1;
          }

          .brand-sub {
            font-size: 8px;
            font-weight: 800;
            color: #10b981;
            letter-spacing: 0.1rem;
            font-family: 'JetBrains Mono', monospace;
            margin-top: 1px;
          }

          .close-btn-drawer { 
            background: rgba(255, 255, 255, 0.04); 
            border: 1px solid rgba(255, 255, 255, 0.1); 
            color: #94a3b8; 
            border-radius: 10px;
            width: 40px;
            height: 40px;
            cursor: pointer; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            transition: all 0.2s; 
          }
          .close-btn-drawer:hover { 
            color: #fff;
            background: rgba(255, 255, 255, 0.08);
          }

          .sidebar-scroll-area {
            flex: 1 !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            display: flex;
            flex-direction: column;
            padding-bottom: 1.5rem;
          }

          .sidebar-scroll-area::-webkit-scrollbar {
            width: 4px;
          }
          .sidebar-scroll-area::-webkit-scrollbar-track {
            background: transparent;
          }
          .sidebar-scroll-area::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }

          /* MASI Market Widget */
          .market-status-widget {
            margin: 0.85rem 0.75rem 0.5rem;
            padding: 0.75rem 0.85rem;
            border-radius: 10px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%);
            border: 1px solid rgba(255, 255, 255, 0.07);
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
            position: relative;
            overflow: hidden;
            flex-shrink: 0;
            transition: border-color 0.3s;
          }
          .market-status-widget:hover {
            border-color: rgba(16, 185, 129, 0.25);
          }

          .widget-grid-pattern {
            position: absolute;
            inset: 0;
            opacity: 0.03;
            background-image: radial-gradient(#fff 1px, transparent 0);
            background-size: 8px 8px;
            pointer-events: none;
          }

          .status-label {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            color: #64748b;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.08rem;
            text-transform: uppercase;
            font-family: 'JetBrains Mono', monospace;
          }

          .pulse-dot {
            width: 6px;
            height: 6px;
            background-color: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 8px #10b981;
            animation: pulseGlow 2s infinite;
          }

          @keyframes pulseGlow {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 12px #10b981; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }

          .live-badge-glow {
            font-size: 8px;
            font-weight: 900;
            color: #10b981;
            margin-left: auto;
            letter-spacing: 0.05rem;
          }

          .status-main {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            z-index: 10;
          }

          .index-val {
            font-size: 1.1rem;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: -0.02em;
          }

          .index-change {
            font-size: 10px;
            font-weight: 800;
            font-family: 'JetBrains Mono', monospace;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .index-change.is-positive {
            color: #10b981;
            background-color: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.2);
          }
          .index-change.is-negative {
            color: #ef4444;
            background-color: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.2);
          }

          /* Search Block */
          .sidebar-search-block { padding: 0.35rem 0.75rem 0.5rem; }
          .sidebar-search-container { position: relative; display: flex; align-items: center; }
          .s-icon { position: absolute; left: 10px; color: #475569; transition: color 0.2s; }
          .sidebar-search-input { 
            width: 100%; 
            background: rgba(0, 0, 0, 0.35); 
            border: 1px solid rgba(255, 255, 255, 0.06); 
            border-radius: 10px; 
            padding: 0.55rem 2.1rem; 
            color: #fff; 
            font-size: 12px; 
            outline: none; 
            transition: all 0.25s;
          }
          @media (max-width: 767px) {
            .sidebar-search-input {
              font-size: 16px;
              padding: 0.6rem 2.2rem;
            }
          }
          .sidebar-search-input:focus {
            border-color: rgba(16, 185, 129, 0.35);
            background: rgba(0, 0, 0, 0.5);
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.1);
          }
          .sidebar-search-container:focus-within .s-icon {
            color: #10b981;
          }

          .clear-search-btn {
            position: absolute;
            right: 8px;
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2px;
            transition: color 0.2s;
          }
          .clear-search-btn:hover {
            color: #ef4444;
          }

          /* Navigation Rules */
          .nav-label { 
            font-size: 9px; 
            font-weight: 900; 
            color: #475569; 
            letter-spacing: 0.12rem; 
            padding: 0.85rem 1rem 0.35rem; 
            text-transform: uppercase; 
            font-family: 'JetBrains Mono', monospace; 
          }
          
          .agent-btn-compact {
            display: flex;
            align-items: center;
            gap: 0.7rem;
            width: 100%;
            min-height: 44px;
            padding: 0.55rem 1rem;
            background: transparent;
            border: none;
            border-left: 2px solid transparent;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: left;
            font-size: 12.5px;
            font-weight: 500;
          }
          .agent-btn-compact:hover { 
            background: rgba(255, 255, 255, 0.03); 
            color: #ffffff; 
            padding-left: 1.15rem; 
          }
          .agent-btn-compact.active { 
            background: rgba(16, 185, 129, 0.06); 
            color: #ffffff; 
            font-weight: 700;
            border-left: 2px solid #10b981;
          }
          
          .nav-icon {
            color: #64748b;
            transition: color 0.2s;
          }
          .agent-btn-compact:hover .nav-icon,
          .agent-btn-compact.active .nav-icon {
            color: #10b981;
          }
          .nav-icon.purple {
            color: #a855f7;
          }

          .badge-tag {
            margin-left: auto;
            font-size: 8px;
            font-weight: 900;
            padding: 1px 5px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            letter-spacing: 0.02rem;
          }
          .badge-tag.green {
            background: rgba(16, 185, 129, 0.12);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.25);
          }

          .user-profile-btn {
            position: relative;
          }
          .user-avatar-group {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.06);
            color: #94a3b8;
            transition: all 0.2s;
          }

          .premium-badge-nav {
            margin-left: auto;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #000;
            font-weight: 900;
            font-size: 8px;
            padding: 1px 5px;
            border-radius: 3px;
            letter-spacing: 0.01rem;
            font-family: 'JetBrains Mono', monospace;
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
          }
          .free-badge-nav {
            margin-left: auto;
            background: rgba(255, 255, 255, 0.05);
            color: #64748b;
            font-weight: 800;
            font-size: 8px;
            padding: 1px 5px;
            border-radius: 3px;
            font-family: 'JetBrains Mono', monospace;
          }

          .live-pulse { 
            width: 5px; 
            height: 5px; 
            background: #10b981; 
            border-radius: 50%; 
            margin-left: auto; 
            box-shadow: 0 0 8px #10b981; 
          }
          
          .chevron-icon { 
            margin-left: auto; 
            opacity: 0.6;
            display: flex;
            align-items: center;
          }

          /* Submenu Accordion */
          .submenu-compact { 
            margin-left: 1.75rem; 
            border-left: 1px solid rgba(255, 255, 255, 0.06); 
            padding-left: 0.25rem;
            margin-top: 0.2rem;
            margin-bottom: 0.4rem;
          }
          
          .sub-node {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            min-height: 40px;
            padding: 0.45rem 0.75rem;
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 11.5px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
            text-align: left;
            border-radius: 8px;
            transition: all 0.2s;
          }
          .sub-node:hover { 
            padding-left: 0.95rem; 
            color: #ffffff;
          }
          
          .sub-node.sentiment:hover, .sub-node.sentiment.active { color: #10b981; background: rgba(16, 185, 129, 0.06); }
          .sub-node.technical:hover, .sub-node.technical.active { color: #3b82f6; background: rgba(59, 130, 246, 0.06); }
          .sub-node.fundamental:hover, .sub-node.fundamental.active { color: #f59e0b; background: rgba(245, 158, 11, 0.06); }
          .sub-node.strategy:hover, .sub-node.strategy.active { color: #a855f7; background: rgba(168, 85, 247, 0.06); }
          
          .sub-node.active { font-weight: 700; }

          /* History Section */
          .history-section-compact { 
            border-top: 1px solid rgba(255, 255, 255, 0.04); 
            margin-top: 1rem; 
          }
          .history-header { 
            display: flex; 
            align-items: center; 
            gap: 0.45rem; 
            font-size: 9px; 
            font-weight: 900; 
            color: #475569; 
            padding: 1rem 1rem 0.5rem; 
            letter-spacing: 0.12rem; 
            font-family: 'JetBrains Mono', monospace; 
          }
          .history-group { margin-bottom: 0.5rem; }
          .group-label { padding: 0.2rem 1rem; color: #64748b; font-size: 8.5px; font-weight: 900; letter-spacing: 0.05rem; }
          .history-item {
            display: flex;
            flex-direction: column;
            padding: 0.45rem 1rem;
            width: 100%;
            background: transparent;
            border: none;
            border-left: 2px solid transparent;
            color: #64748b;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s;
          }
          .history-item:hover { 
            background: rgba(255, 255, 255, 0.03); 
            color: #ffffff; 
            padding-left: 1.15rem; 
          }
          .history-item.active { 
            background: rgba(59, 130, 246, 0.08); 
            color: #ffffff; 
            border-left: 2px solid #3b82f6; 
          }
          .h-name { font-size: 11px; font-weight: 600; }
          .h-date { font-size: 9px; opacity: 0.5; margin-top: 2px; font-family: 'JetBrains Mono', monospace; }
          .empty-history { font-size: 10px; color: #475569; padding: 0.5rem 1rem; font-style: italic; }

          /* Footer */
          .sidebar-footer-compact {
            padding: 0.6rem 0;
            padding-bottom: max(0.6rem, env(safe-area-inset-bottom, 16px));
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            display: flex;
            flex-direction: column;
            background: rgba(0, 0, 0, 0.4);
            flex-shrink: 0;
          }
          .logout-btn-minimal { 
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.45rem 1rem;
            background: transparent;
            border: none;
            color: #64748b;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
            text-align: left;
            transition: all 0.2s;
          }
          .logout-btn-minimal:hover { 
            padding-left: 1.15rem; 
            background: rgba(239, 68, 68, 0.06); 
            color: #ef4444; 
          }

          .footer-status-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.2rem 1rem 0.2rem;
          }
          .v-tag-minimal { 
            font-size: 8.5px; 
            color: #64748b; 
            font-weight: 900; 
            font-family: 'JetBrains Mono', monospace; 
            letter-spacing: 0.05rem;
          }
          .status-indicator-dot {
            width: 6px;
            height: 6px;
            background-color: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 6px #10b981;
          }

          @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
        `}</style>
      </aside>
    </>
  );
}
