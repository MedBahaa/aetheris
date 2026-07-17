'use client';

import { 
  History, Search, ArrowRight, BrainCircuit, Activity, 
  ShieldCheck, X, Globe, Zap, LayoutGrid, 
  Landmark, Briefcase, ChevronDown, ChevronRight,
  User, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { CompanyAnalysis, AgentType } from '@/lib/agent-engine';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getUserProfileAction, upsertUserProfileAction } from '@/lib/portfolio-actions';


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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState<{ initial_capital: number; subscription_tier: string } | null>(null);
  const [newCapital, setNewCapital] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const prof = await getUserProfileAction();
        if (prof) {
          setProfile(prof);
          setNewCapital(prof.initial_capital.toString());
        }
      } catch (err) {
        console.error('Failed to fetch profile in sidebar:', err);
      }
    };
    fetchProfile();
  }, [showProfileModal]);

  const handleSaveProfile = async (tier?: string) => {
    try {
      setSaving(true);
      const cap = parseFloat(newCapital) || 0;
      const targetTier = tier !== undefined ? tier : (profile?.subscription_tier || 'free');
      
      await upsertUserProfileAction({
        initial_capital: cap,
        subscription_tier: targetTier
      });

      setProfile({
        initial_capital: cap,
        subscription_tier: targetTier
      });

      if (pathname === '/portfolio') {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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
          <div className={`market-status-widget glass-mini animate-fade-in ${marketIndex.value >= 0 ? 'bullish' : 'bearish'}`}>
             <div className="widget-grid-pattern"></div>
             <div className="status-label">
                <span className="pulse-dot"></span>
                <span>MASI CASABLANCA</span>
                <span className="live-badge-glow">LIVE</span>
             </div>
             <div className="status-main">
                <span className="index-val mono">{marketIndex.price}</span>
                <span className={`index-change mono ${marketIndex.value >= 0 ? 'positive' : 'negative'}`}>
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

                <button 
                  onClick={() => { setShowProfileModal(true); onClose(); }} 
                  className={`agent-btn-compact user-profile-btn ${showProfileModal ? 'active' : ''} ${profile?.subscription_tier === 'premium' ? 'premium-active' : ''}`}
                >
                  <div className="user-avatar-group">
                    {profile?.subscription_tier === 'premium' ? (
                      <span className="premium-crown-avatar">👑</span>
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <span>Mon Profil & Abonnement</span>
                  {profile?.subscription_tier === 'premium' ? (
                    <span className="premium-badge-nav mono-tiny">PREMIUM</span>
                  ) : (
                    <span className="free-badge-nav mono-tiny">FREE</span>
                  )}
                </button>
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

        {showProfileModal && (
          <div className="modal-overlay glass-heavy animate-fade-in" style={{ zIndex: 10000 }} onClick={() => setShowProfileModal(false)}>
            <div className="modal-content glass-heavy animate-slide-up" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={18} className="text-emerald" />
                  <h2 className="mono" style={{ margin: 0, fontSize: '1.1rem' }}>PROFIL & PARAMÈTRES</h2>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="close-modal"><X size={20} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="mono-tiny" style={{ color: '#64748b' }}>CAPITAL DE RÉFÉRENCE (MAD)</label>
                  <input 
                    type="number" 
                    value={newCapital} 
                    onChange={e => setNewCapital(e.target.value)} 
                    placeholder="100000" 
                    className="terminal-input-field"
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      color: '#fff',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="mono-tiny" style={{ color: '#64748b' }}>STATUT DU COMPTE AETHERIS</label>
                  <div className="subscription-toggle-box">
                    <button 
                      type="button" 
                      className={`sub-toggle-btn ${profile?.subscription_tier !== 'premium' ? 'active' : ''}`}
                      onClick={() => handleSaveProfile('free')}
                      disabled={saving}
                    >
                      GRATUIT (FREE)
                    </button>
                    <button 
                      type="button" 
                      className={`sub-toggle-btn premium ${profile?.subscription_tier === 'premium' ? 'active' : ''}`}
                      onClick={() => handleSaveProfile('premium')}
                      disabled={saving}
                    >
                      👑 PREMIUM
                    </button>
                  </div>
                </div>

                <div className="premium-status-banner">
                  {profile?.subscription_tier === 'premium' ? (
                    <div className="status-banner-content premium mono-tiny">
                      <CheckCircle2 size={14} className="text-purple" />
                      <span style={{ fontSize: '10px' }}>Option Robo-Advisor et Agent Stratégie Débloqués.</span>
                    </div>
                  ) : (
                    <div className="status-banner-content free mono-tiny">
                      <AlertTriangle size={14} className="text-amber" />
                      <span style={{ fontSize: '10px' }}>Activez l'offre Premium pour débloquer l'intelligence IA.</span>
                    </div>
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={() => handleSaveProfile()} 
                  className="action-btn-save mono"
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#000',
                    fontWeight: 900,
                    border: 'none',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    letterSpacing: '0.05rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {saving ? 'SAUVEGARDE EN COURS...' : 'ENREGISTRER LE CAPITAL'}
                </button>
              </div>
            </div>
          </div>
        )}

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
            background: rgba(8, 10, 15, 0.85) !important;
            backdrop-filter: blur(20px);
            border-right: 1px solid rgba(255, 255, 255, 0.04);
            box-shadow: 10px 0 30px rgba(0,0,0,0.5);
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
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            flex-shrink: 0;
          }
          .nav-label-top { font-size: 10px; font-weight: 900; color: #475569; letter-spacing: 0.12rem; font-family: 'JetBrains Mono', monospace; }



          .sidebar-search-block { padding: 0 1rem 1rem; }
          .sidebar-search-container { position: relative; display: flex; align-items: center; }
          .s-icon { position: absolute; left: 12px; color: #475569; transition: color 0.2s; }
          .sidebar-search-input { 
            width: 100%; 
            background: rgba(0,0,0,0.25); 
            border: 1px solid rgba(255, 255, 255, 0.04); 
            border-radius: 8px; 
            padding: 0.6rem 0.75rem 0.6rem 2.25rem; 
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

          .nav-label { font-size: 9px; font-weight: 950; color: #475569; letter-spacing: 0.15rem; padding: 1.25rem 1.25rem 0.6rem; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; }
          
          .agent-btn-compact {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            padding: 0.7rem 1.25rem;
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: left;
            font-size: 12px;
            font-weight: 500;
          }
          .agent-btn-compact:hover { 
            background: rgba(255, 255, 255, 0.02); 
            color: #fff; 
            padding-left: 1.45rem; 
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
          .user-profile-btn.premium-active .user-avatar-group {
            background: rgba(245, 158, 11, 0.1);
          }
          .premium-crown-avatar {
            font-size: 10px;
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
            border-top: 1px solid rgba(255, 255, 255, 0.04);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(0,0,0,0.15);
            flex-shrink: 0;
          }
          .logout-btn-minimal { background: transparent; border: none; color: #ef4444; font-size: 9px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; letter-spacing: 0.05rem; font-family: 'JetBrains Mono', monospace; }
          .logout-btn-minimal:hover { color: #f43f5e; }
          .v-tag-minimal { font-size: 9px; color: #334155; font-weight: 900; font-family: 'JetBrains Mono', monospace; }

          .close-btn-drawer { background: transparent; border: none; color: #475569; cursor: pointer; }
          @media (min-width: 1024px) { .close-btn-drawer { display: none; } }
          
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

        <style jsx global>{`
          .market-status-widget {
            margin: 1rem !important;
            padding: 0.85rem 1rem !important;
            border-radius: 0.75rem !important;
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0.5rem !important;
            position: relative !important;
            overflow: hidden !important;
            transition: all 0.3s !important;
          }
          .market-status-widget.bullish {
            border-color: rgba(16, 185, 129, 0.2) !important;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%) !important;
          }
          .market-status-widget.bearish {
            border-color: rgba(239, 68, 68, 0.2) !important;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%) !important;
          }
          .widget-grid-pattern {
            position: absolute !important;
            inset: 0 !important;
            opacity: 0.03 !important;
            background-image: radial-gradient(#fff 1px, transparent 0) !important;
            background-size: 8px 8px !important;
            pointer-events: none !important;
          }
          .status-label {
            display: flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
            color: #64748b !important;
            font-size: 9px !important;
            font-weight: 800 !important;
            letter-spacing: 0.08rem !important;
            text-transform: uppercase !important;
            font-family: 'JetBrains Mono', monospace !important;
          }
          .pulse-dot {
            width: 6px !important;
            height: 6px !important;
            background: #10b981 !important;
            border-radius: 50% !important;
            box-shadow: 0 0 8px #10b981 !important;
            animation: pulse-live 1.8s infinite !important;
          }
          .live-badge-glow {
            font-size: 8px !important;
            font-weight: 900 !important;
            color: #10b981 !important;
            margin-left: auto !important;
            letter-spacing: 0.05rem !important;
          }
          .status-main {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            position: relative !important;
            z-index: 10 !important;
          }
          .index-val {
            font-size: 1.15rem !important;
            font-weight: 900 !important;
            color: #fff !important;
            letter-spacing: -0.02em !important;
          }
          .index-change {
            font-size: 10px !important;
            font-weight: 800 !important;
            font-family: 'JetBrains Mono', monospace !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
          .index-change.positive {
            color: #10b981 !important;
            background: rgba(16, 185, 129, 0.06) !important;
          }
          .index-change.negative {
            color: #ef4444 !important;
            background: rgba(239, 68, 68, 0.06) !important;
          }
        `}</style>
      </aside>
    </>
  );
}
