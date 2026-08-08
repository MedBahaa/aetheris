'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Zap, Search, ShieldCheck, Activity, Landmark, Globe, Briefcase, Scale, 
  ArrowRight, CheckCircle2, ChevronRight, LogIn, UserPlus, Sparkles, TrendingUp,
  Brain, ShieldAlert, Cpu, Lock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MacroWidget from '@/components/MacroWidget';

export default function EnterpriseLandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'STRATEGY' | 'SENTIMENT' | 'TECHNICAL' | 'FUNDAMENTAL'>('STRATEGY');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDemoSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (q) {
      router.push(`/console?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/console');
    }
  };

  const executeChipSearch = (symbol: string) => {
    router.push(`/console?q=${encodeURIComponent(symbol)}`);
  };

  const popularTickers = [
    { symbol: 'ATW', name: 'Attijariwafa Bank', sector: 'Bancaire' },
    { symbol: 'BCP', name: 'Banque Centrale', sector: 'Bancaire' },
    { symbol: 'IAM', name: 'Maroc Telecom', sector: 'Telecom' },
    { symbol: 'MSA', name: 'Marsa Maroc', sector: 'Logistique' },
    { symbol: 'TGCC', name: 'TGCC BTP', sector: 'BTP' },
    { symbol: 'SNEP', name: 'SNEP', sector: 'Chimie' },
    { symbol: 'BOA', name: 'Bank of Africa', sector: 'Bancaire' },
  ];

  const saasServices = [
    {
      id: 'terminal',
      title: 'Terminal Multi-Agents IA',
      desc: 'Analyse boursière prédictive avec 4 agents IA dédiés (Veille Narrative, Trading Quant, Analyse Fonda & Stratégie Alpha).',
      badge: 'IA PRO',
      color: 'emerald',
      icon: <Cpu size={22} />,
      link: '/console'
    },
    {
      id: 'marche',
      title: 'Flux de Marché MASI Live',
      desc: 'Cotations en direct 24/7 du MASI Casablanca, carnets d’ordres, devises (USD/MAD) et matières premières (Brent, Or).',
      badge: 'LIVE 24/7',
      color: 'blue',
      icon: <Globe size={22} />,
      link: '/marche-live'
    },
    {
      id: 'portfolio',
      title: 'Portefeuille Intelligent',
      desc: 'Gestion & suivi consolidé du P&L (Plus/Moins-values), calcul des rendements et allocation d’actifs en temps réel.',
      badge: 'GESTION',
      color: 'amber',
      icon: <Briefcase size={22} />,
      link: '/portfolio'
    },
    {
      id: 'purification',
      title: 'Purification Dividendes AAOIFI',
      desc: 'Screening Shariah-Compliant et calculateur d’étanchéité des dividendes non-conformes pour un investissement éthique.',
      badge: 'AAOIFI',
      color: 'purple',
      icon: <Scale size={22} />,
      link: '/purification'
    }
  ];

  const agentDetails = {
    STRATEGY: {
      title: 'Agent Stratégie Alpha',
      badge: 'SYNTHÈSE GLOBALE',
      color: '#a855f7',
      desc: 'Rassemble l’ensemble des signaux financiers pour produire une thèse d’investissement claire, un score de confiance et des objectifs de cours.',
      icon: <ShieldCheck size={20} />
    },
    SENTIMENT: {
      title: 'Agent Veille Narrative',
      badge: 'NLP & RSS SCRAPING',
      color: '#10b981',
      desc: 'Scrape et évalue le sentiment médiatique en temps réel à partir de dizaines de flux d’actualités financières marocaines.',
      icon: <Zap size={20} />
    },
    TECHNICAL: {
      title: 'Agent Trading Quant',
      badge: 'INDICATEURS TECHNIQUES',
      color: '#3b82f6',
      desc: 'Calcule instantanément le RSI, le MACD, les moyennes mobiles (20/50/200), les retracements de Fibonacci et les niveaux de support/résistance.',
      icon: <Activity size={20} />
    },
    FUNDAMENTAL: {
      title: 'Agent Analyse Fonda',
      badge: 'VALORISATION & RATIOS',
      color: '#f59e0b',
      desc: 'Examine la santé du bilan financier, le PER, les ratios d’endettement, le rendement des dividendes et la valorisation intrinsèque.',
      icon: <Landmark size={20} />
    }
  };

  return (
    <div className="landing-root">
      {/* ────────────────── ENTERPRISE TOP NAVBAR ────────────────── */}
      <nav className="ent-navbar">
        <div className="ent-nav-inner">
          <Link href="/" style={{ textDecoration: 'none' }} className="ent-brand">
            <div className="brand-icon">
              <Zap size={18} fill="currentColor" />
            </div>
            <div className="brand-titles">
              <span className="brand-name">AETHERIS</span>
              <span className="brand-tag">ALPHA TERMINAL</span>
            </div>
          </Link>

          <div className="ent-nav-links">
            <a href="#services" className="nav-link">Services</a>
            <a href="#agents" className="nav-link">Agents IA</a>
            <Link href="/marche-live" className="nav-link">Marché Live</Link>
            <Link href="/purification" className="nav-link">Conformité AAOIFI</Link>
          </div>

          <div className="ent-nav-actions">
            {isAuthenticated === false ? (
              <>
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <button className="nav-btn-secondary">
                    <LogIn size={14} />
                    <span>Se connecter</span>
                  </button>
                </Link>
                <Link href="/login?mode=signup" style={{ textDecoration: 'none' }}>
                  <button className="nav-btn-primary">
                    <UserPlus size={14} />
                    <span>S'inscrire</span>
                  </button>
                </Link>
              </>
            ) : isAuthenticated === true ? (
              <Link href="/console" style={{ textDecoration: 'none' }}>
                <button className="nav-btn-primary">
                  <Cpu size={14} />
                  <span>Accéder à la Console</span>
                </button>
              </Link>
            ) : (
              <div className="nav-skeleton" />
            )}
          </div>
        </div>
      </nav>

      {/* ────────────────── HERO SECTION ────────────────── */}
      <section className="ent-hero">
        <div className="hero-glow-bg" />
        <div className="hero-content">
          <div className="hero-top-badge animate-fade-in">
            <span className="live-dot" />
            <span className="mono">INTELLIGENCE FINANCIÈRE DE NOUVELLE GÉNÉRATION • BVC MASI</span>
          </div>

          <h1 className="hero-h1 animate-fade-in">
            Le Terminal boursier IA d'élite pour la <span className="text-gradient">Bourse de Casablanca</span>
          </h1>

          <p className="hero-p animate-fade-in">
            Analysez les actions du marché marocain (MASI) avec 4 agents IA spécialisés, suivez votre portefeuille en temps réel et calculez la purification des dividendes selon les normes éthiques AAOIFI.
          </p>

          <div className="hero-actions animate-fade-in">
            {isAuthenticated ? (
              <Link href="/console" style={{ textDecoration: 'none' }}>
                <button className="hero-main-btn">
                  <span>Ouvrir la Console Alpha</span>
                  <ArrowRight size={16} />
                </button>
              </Link>
            ) : (
              <>
                <Link href="/login?mode=signup" style={{ textDecoration: 'none' }}>
                  <button className="hero-main-btn">
                    <span>Démarrer gratuitement</span>
                    <ArrowRight size={16} />
                  </button>
                </Link>
                <Link href="/console" style={{ textDecoration: 'none' }}>
                  <button className="hero-outline-btn">
                    <span>Explorer le Terminal</span>
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* SEARCH DEMO BAR */}
          <div className="hero-search-box glass-card animate-fade-in">
            <form onSubmit={handleDemoSearch} className="demo-search-form">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="RECHERCHER UN ACTIF SUR LE MASI (ex: ATW, IAM, BCP, TGCC)..."
                className="demo-search-input"
              />
              <button type="submit" className="demo-search-btn">
                <span>Lancer l'Analyse</span>
                <Sparkles size={14} />
              </button>
            </form>

            <div className="hero-chips-row">
              <span className="chips-title mono">VALEURS PHARES :</span>
              <div className="chips-group">
                {popularTickers.map(ticker => (
                  <button 
                    key={ticker.symbol} 
                    onClick={() => executeChipSearch(ticker.symbol)} 
                    className="hero-chip-btn"
                  >
                    <span className="chip-sym mono">{ticker.symbol}</span>
                    <span className="chip-lbl">{ticker.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MACRO TICKER DISPLAY */}
          <div className="hero-macro-bar glass-card animate-fade-in">
            <div className="macro-bar-label mono">
              <Activity size={12} className="text-emerald" />
              <span>DONNÉES MARCHÉ EN DIRECT</span>
            </div>
            <div className="macro-bar-content">
              <MacroWidget />
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── CORE SAAS PILLARS SECTION ────────────────── */}
      <section id="services" className="ent-section">
        <div className="section-container">
          <div className="section-head text-center">
            <span className="section-badge mono">ÉCOSYSTÈME DE NOUVELLE GÉNÉRATION</span>
            <h2 className="section-h2">Nos 4 Services Principaux</h2>
            <p className="section-p">
              Une suite logicielle complète combinant intelligence artificielle prédictive et conformité financière institutionnelle.
            </p>
          </div>

          <div className="services-cards-grid">
            {saasServices.map((service) => (
              <div key={service.id} className="pillar-card glass-card">
                <div className="pillar-top">
                  <div className={`pillar-icon-box ${service.color}`}>
                    {service.icon}
                  </div>
                  <span className={`pillar-badge mono ${service.color}`}>
                    {service.badge}
                  </span>
                </div>

                <h3 className="pillar-title">{service.title}</h3>
                <p className="pillar-desc">{service.desc}</p>

                <Link href={service.link} style={{ textDecoration: 'none' }}>
                  <button className="pillar-btn">
                    <span>Accéder au service</span>
                    <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── AI AGENTS SHOWCASE ────────────────── */}
      <section id="agents" className="ent-section bg-alt">
        <div className="section-container">
          <div className="section-head text-center">
            <span className="section-badge mono">MOTEUR MULTI-AGENTS AETHERIS</span>
            <h2 className="section-h2">4 Agents IA Spécialisés à votre Service</h2>
            <p className="section-p">
              Chaque agent examine le marché sous un angle d'expertise dédié avant la synthèse globale.
            </p>
          </div>

          <div className="agent-showcase-wrapper glass-card">
            <div className="agent-tabs-header">
              {(['STRATEGY', 'SENTIMENT', 'TECHNICAL', 'FUNDAMENTAL'] as const).map((key) => {
                const isSelected = activeTab === key;
                const details = agentDetails[key];
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`agent-tab-btn ${isSelected ? 'active' : ''}`}
                    style={{
                      borderColor: isSelected ? details.color : 'transparent'
                    }}
                  >
                    <div className="tab-icon" style={{ color: isSelected ? details.color : '#64748b' }}>
                      {details.icon}
                    </div>
                    <span>{details.title.replace('Agent ', '')}</span>
                  </button>
                );
              })}
            </div>

            <div className="agent-display-content">
              {(() => {
                const details = agentDetails[activeTab];
                return (
                  <div className="agent-detail-panel animate-fade-in">
                    <div className="ad-header">
                      <div className="ad-icon-box" style={{ background: `${details.color}15`, color: details.color, borderColor: `${details.color}40` }}>
                        {details.icon}
                      </div>
                      <div>
                        <div className="ad-badge mono" style={{ color: details.color }}>{details.badge}</div>
                        <h3 className="ad-title">{details.title}</h3>
                      </div>
                    </div>

                    <p className="ad-desc">{details.desc}</p>

                    <div className="ad-action">
                      <button onClick={() => executeChipSearch('ATW')} className="ad-try-btn">
                        <span>Lancer une analyse de démonstration (ex: ATW)</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── AAOIFI SHARIAH COMPLIANCE SECTION ────────────────── */}
      <section className="ent-section">
        <div className="section-container">
          <div className="aaoifi-feature-box glass-card">
            <div className="af-grid">
              <div className="af-text-col">
                <span className="af-badge mono text-emerald">FINANCE ÉTHIQUE & ISLAMIQUE</span>
                <h2 className="af-h2">Purification des Dividendes conforme aux normes AAOIFI</h2>
                <p className="af-p">
                  Investissez sereinement sur les actions marocaines du MASI grâce à notre algorithme de screening Shariah et au calcul précis du pourcentage de purification des dividendes non-conformes.
                </p>
                <div className="af-checks">
                  <div className="af-check-item">
                    <CheckCircle2 size={16} className="text-emerald" />
                    <span>Conformité avec les standards internationaux AAOIFI</span>
                  </div>
                  <div className="af-check-item">
                    <CheckCircle2 size={16} className="text-emerald" />
                    <span>Calcul d'étanchéité financière automatique par entreprise</span>
                  </div>
                  <div className="af-check-item">
                    <CheckCircle2 size={16} className="text-emerald" />
                    <span>Rapports téléchargeables et historisés</span>
                  </div>
                </div>

                <Link href="/purification" style={{ textDecoration: 'none' }}>
                  <button className="af-btn">
                    <span>Découvrir le calculateur Purification</span>
                    <ArrowRight size={14} />
                  </button>
                </Link>
              </div>

              <div className="af-graphic-col">
                <div className="shariah-card glass-card">
                  <div className="sc-header">
                    <Scale size={24} className="text-emerald" />
                    <span className="mono">AAOIFI SCREENING INDEX</span>
                  </div>
                  <div className="sc-body">
                    <div className="sc-row">
                      <span>Critères d'Activité</span>
                      <span className="sc-badge pass mono">CONFORME</span>
                    </div>
                    <div className="sc-row">
                      <span>Ratio d'Endettement</span>
                      <span className="sc-val mono font-bold">&lt; 30% PASS</span>
                    </div>
                    <div className="sc-row">
                      <span>Revenus Non-Conformes</span>
                      <span className="sc-val mono font-bold text-amber">0.42% À PURIFIER</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── ENTERPRISE FOOTER ────────────────── */}
      <footer className="ent-footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="fg-brand">
              <div className="brand-logo-group">
                <div className="brand-icon">
                  <Zap size={16} fill="currentColor" />
                </div>
                <span className="brand-name">AETHERIS</span>
              </div>
              <p className="fg-desc">
                Plateforme d'intelligence financière de nouvelle génération dédiée à la Bourse de Casablanca (MASI).
              </p>
              <div className="fg-status mono">
                <span className="live-dot" />
                <span>SYSTÈME OPÉRATIONNEL OS 2.0</span>
              </div>
            </div>

            <div className="fg-links-group">
              <h4 className="fg-title mono">SERVICES</h4>
              <Link href="/console" className="fg-link">Console Alpha IA</Link>
              <Link href="/marche-live" className="fg-link">Flux de Marché Live</Link>
              <Link href="/portfolio" className="fg-link">Portefeuille Intelligent</Link>
              <Link href="/purification" className="fg-link">Purification AAOIFI</Link>
            </div>

            <div className="fg-links-group">
              <h4 className="fg-title mono">COMPTE & SÉCURITÉ</h4>
              <Link href="/login" className="fg-link">Se connecter</Link>
              <Link href="/login?mode=signup" className="fg-link">Créer un compte</Link>
              <Link href="/profile" className="fg-link">Gestion de profil</Link>
            </div>

            <div className="fg-links-group">
              <h4 className="fg-title mono">LEGAL & ETHIQUE</h4>
              <span className="fg-link-disabled">Normes AAOIFI</span>
              <span className="fg-link-disabled">Confidentialité & Données</span>
              <span className="fg-link-disabled">Mentions Légales</span>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="mono">© 2026 AETHERIS TECHNOLOGIES • BOURSE DE CASABLANCA</span>
            <span className="mono text-emerald">INSTITUTIONAL GRADE TERMINAL</span>
          </div>
        </div>
      </footer>

      {/* ────────────────── CSS STYLING ────────────────── */}
      <style jsx>{`
        .mono { font-family: 'JetBrains Mono', monospace; }
        .text-emerald { color: #10b981; }
        .text-blue { color: #3b82f6; }
        .text-amber { color: #f59e0b; }
        .text-purple { color: #a855f7; }

        .landing-root {
          min-height: 100vh;
          width: 100%;
          background: #020408;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }

        /* ── ENTERPRISE NAVBAR ── */
        .ent-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          z-index: 1000;
          background: rgba(2, 4, 8, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
        }

        .ent-nav-inner {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ent-brand {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .brand-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
        }

        .brand-titles {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 1.15rem;
          color: #ffffff;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .brand-tag {
          font-size: 8px;
          font-family: 'JetBrains Mono', monospace;
          color: #10b981;
          font-weight: 800;
          letter-spacing: 0.08rem;
          margin-top: 2px;
        }

        .ent-nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .nav-link {
          color: #94a3b8;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: #ffffff;
        }

        .ent-nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .nav-btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .nav-btn-primary {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: #000000;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
        }
        .nav-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }

        .nav-skeleton {
          width: 140px;
          height: 36px;
        }

        /* ── HERO SECTION ── */
        .ent-hero {
          position: relative;
          padding: 8rem 1.5rem 4rem;
          min-height: 85vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-glow-bg {
          position: absolute;
          top: 10%;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 400px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.05) 50%, transparent 70%);
          filter: blur(60px);
          pointer-events: none;
        }

        .hero-content {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          z-index: 10;
        }

        .hero-top-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.9rem;
          border-radius: 100px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #10b981;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05rem;
          margin-bottom: 1.5rem;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .hero-h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 3.5rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.1;
          margin-bottom: 1.25rem;
          max-width: 900px;
        }

        .text-gradient {
          background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-p {
          font-size: 1.1rem;
          color: #94a3b8;
          max-width: 750px;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2.5rem;
        }

        .hero-main-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.85rem 1.75rem;
          border-radius: 10px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: #000000;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.25s var(--ease);
          box-shadow: 0 0 25px rgba(16, 185, 129, 0.35);
        }
        .hero-main-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 35px rgba(16, 185, 129, 0.55);
        }

        .hero-outline-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.85rem 1.75rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s var(--ease);
        }
        .hero-outline-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }

        /* Glass Card */
        .glass-card {
          background: rgba(13, 17, 23, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1.25rem;
        }

        /* Demo Search Box */
        .hero-search-box {
          width: 100%;
          max-width: 850px;
          padding: 1.25rem;
          margin-bottom: 2rem;
        }

        .demo-search-form {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 0.4rem 0.5rem 0.4rem 1rem;
        }

        .search-icon { color: #64748b; }
        .demo-search-input {
          flex: 1;
          background: none;
          border: none;
          color: #fff;
          font-size: 13px;
          outline: none;
          font-family: 'Inter', sans-serif;
        }
        .demo-search-input::placeholder {
          color: #64748b;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
        }

        .demo-search-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          background: #10b981;
          border: none;
          color: #000;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .demo-search-btn:hover {
          background: #34d399;
          transform: translateY(-1px);
        }

        .hero-chips-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
        }

        .chips-title {
          font-size: 9px;
          color: #475569;
          font-weight: 800;
          letter-spacing: 0.05rem;
          flex-shrink: 0;
        }

        .chips-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .hero-chip-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          transition: all 0.2s;
        }
        .hero-chip-btn:hover {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          transform: translateY(-1px);
        }
        .chip-sym { color: #10b981; font-weight: 900; font-size: 9.5px; }
        .chip-lbl { color: #94a3b8; font-size: 11px; }

        /* Macro Bar */
        .hero-macro-bar {
          width: 100%;
          max-width: 850px;
          padding: 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .macro-bar-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #475569;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05rem;
          flex-shrink: 0;
        }

        .macro-bar-content {
          flex: 1;
          overflow: hidden;
        }

        /* ── SECTIONS ── */
        .ent-section {
          padding: 5rem 1.5rem;
        }
        .ent-section.bg-alt {
          background: rgba(13, 17, 23, 0.4);
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .section-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-head {
          margin-bottom: 3.5rem;
        }
        .text-center { text-align: center; }

        .section-badge {
          font-size: 9.5px;
          color: #10b981;
          font-weight: 900;
          letter-spacing: 0.1rem;
        }

        .section-h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 2.25rem;
          font-weight: 900;
          color: #ffffff;
          margin: 0.5rem 0 0.75rem;
          letter-spacing: -0.03em;
        }

        .section-p {
          font-size: 1rem;
          color: #94a3b8;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.5;
        }

        /* Services Cards Grid */
        .services-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .pillar-card {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.3s var(--ease);
        }
        .pillar-card:hover {
          transform: translateY(-5px);
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .pillar-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .pillar-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pillar-icon-box.emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .pillar-icon-box.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
        .pillar-icon-box.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
        .pillar-icon-box.purple { background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2); }

        .pillar-badge {
          font-size: 8.5px;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 4px;
          letter-spacing: 0.05rem;
        }
        .pillar-badge.emerald { color: #10b981; background: rgba(16, 185, 129, 0.08); }
        .pillar-badge.blue { color: #3b82f6; background: rgba(59, 130, 246, 0.08); }
        .pillar-badge.amber { color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
        .pillar-badge.purple { color: #a855f7; background: rgba(168, 85, 247, 0.08); }

        .pillar-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.15rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.6rem;
        }

        .pillar-desc {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.55;
          margin-bottom: 1.75rem;
          flex: 1;
        }

        .pillar-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pillar-btn:hover {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          color: #ffffff;
        }

        /* Agent Showcase */
        .agent-showcase-wrapper {
          padding: 2rem;
        }

        .agent-tabs-header {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .agent-tab-btn {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          font-family: 'Inter', sans-serif;
        }
        .agent-tab-btn:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .agent-tab-btn.active {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
        }

        .agent-detail-panel {
          padding: 2rem;
          border-radius: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .ad-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ad-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid;
        }

        .ad-badge {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08rem;
        }

        .ad-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.35rem;
          font-weight: 900;
          color: #ffffff;
          margin-top: 2px;
        }

        .ad-desc {
          font-size: 0.95rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .ad-try-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ad-try-btn:hover {
          background: rgba(16, 185, 129, 0.2);
          color: #ffffff;
        }

        /* AAOIFI Feature */
        .aaoifi-feature-box {
          padding: 3rem;
        }

        .af-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 3rem;
          align-items: center;
        }

        .af-badge {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.1rem;
        }

        .af-h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 2rem;
          font-weight: 900;
          color: #ffffff;
          margin: 0.5rem 0 1rem;
          line-height: 1.2;
        }

        .af-p {
          font-size: 0.95rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 1.75rem;
        }

        .af-checks {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }

        .af-check-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          color: #e2e8f0;
          font-weight: 500;
        }

        .af-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.85rem 1.5rem;
          border-radius: 10px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: #000;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }
        .af-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
        }

        .shariah-card {
          padding: 2rem;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .sc-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #ffffff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 1.25rem;
        }

        .sc-body {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .sc-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .sc-badge.pass {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 900;
        }

        .sc-val {
          font-size: 11px;
        }

        /* ── ENTERPRISE FOOTER ── */
        .ent-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 4, 8, 0.95);
          padding: 4rem 1.5rem 2rem;
        }

        .footer-inner {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 3rem;
          margin-bottom: 3rem;
        }

        .brand-logo-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .fg-desc {
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 1.25rem;
        }

        .fg-status {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #10b981;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05rem;
        }

        .fg-title {
          font-size: 9px;
          color: #475569;
          font-weight: 900;
          letter-spacing: 0.1rem;
          margin-bottom: 1.25rem;
        }

        .fg-links-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .fg-link {
          font-size: 0.85rem;
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.2s;
        }
        .fg-link:hover {
          color: #ffffff;
        }
        .fg-link-disabled {
          font-size: 0.85rem;
          color: #475569;
        }

        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 9px;
          color: #475569;
          font-weight: 800;
          letter-spacing: 0.05rem;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.4s ease forwards; }

        @media (max-width: 1024px) {
          .ent-nav-links { display: none; }
          .services-cards-grid { grid-template-columns: repeat(2, 1fr); }
          .agent-tabs-header { grid-template-columns: repeat(2, 1fr); }
          .af-grid { grid-template-columns: 1fr; gap: 2rem; }
          .footer-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .hero-h1 { font-size: 2.25rem; }
          .services-cards-grid { grid-template-columns: 1fr; }
          .agent-tabs-header { grid-template-columns: 1fr; }
          .footer-grid { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; gap: 0.5rem; text-align: center; }
          .hero-actions { flex-direction: column; width: 100%; }
          .hero-main-btn, .hero-outline-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
