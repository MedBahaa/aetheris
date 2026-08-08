'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap, Search, ShieldCheck, Activity, Landmark, Globe, Briefcase, Scale,
  ArrowRight, CheckCircle2, XCircle, UserPlus, Cpu, TrendingUp,
  TrendingDown, BarChart2, Brain, ChevronRight, Shield, Lock, ChevronDown,
  HelpCircle, Check, Flame, Menu, X, LogIn, Layers, ArrowDownRight, ArrowUpRight,
  Sliders, Terminal as TerminalIcon, Database, Cpu as Processor, GitMerge, FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────
   INSTITUTIONAL MARKET DATA
───────────────────────────────────────── */
const TICKERS = [
  { symbol: 'ATW', name: 'Attijariwafa Bank',   price: '512.00', change: '+1.24%', up: true  },
  { symbol: 'BCP', name: 'Banque Centrale Pop.', price: '304.50', change: '+0.87%', up: true  },
  { symbol: 'IAM', name: 'Maroc Telecom',        price: '92.10',  change: '-0.43%', up: false },
  { symbol: 'MSA', name: 'Marsa Maroc',          price: '348.00', change: '+2.11%', up: true  },
  { symbol: 'TGCC', name: 'TGCC BTP',           price: '315.00', change: '+0.33%', up: true  },
  { symbol: 'SNEP', name: 'SNEP',               price: '480.00', change: '-0.78%', up: false },
  { symbol: 'BOA', name: 'Bank of Africa',       price: '202.00', change: '+1.55%', up: true  },
  { symbol: 'LBV', name: 'Label Vie',           price: '4450.00',change: '+0.92%', up: true  },
  { symbol: 'CIH', name: 'CIH Bank',            price: '390.00', change: '-0.21%', up: false },
  { symbol: 'MNG', name: 'Managem',             price: '2890.00',change: '+3.07%', up: true  },
];

/* ─────────────────────────────────────────
   PROPRIETARY PIPELINE STAGES
───────────────────────────────────────── */
const PIPELINE_STAGES = [
  {
    step: '01',
    title: 'DATA INGESTION ENGINE',
    subtitle: 'Flux BVC & RSS Temps Réel',
    icon: <Database size={20} />,
    desc: 'Agrégation continue des flux de cotations du MASI, carnets d\'ordres et scraping en direct de +40 sources d\'actualités financières marocaines.',
    metrics: '40+ Sources • Latence <500ms'
  },
  {
    step: '02',
    title: 'ORCHESTRATOR CORE',
    subtitle: 'Moteur de Dispatching',
    icon: <GitMerge size={20} />,
    desc: 'Structure et normalise les données entrantes brutes avant de distribuer les signaux aux 4 nœuds d\'intelligence analytique.',
    metrics: 'Dispatching Parallèle • 100% Async'
  },
  {
    step: '03',
    title: '4 INTELLIGENCE NODES',
    subtitle: 'Agents IA Spécialisés',
    icon: <Processor size={20} />,
    desc: 'Veille Narrative NLP, Trading Quant (RSI/MACD/Fibo), Analyse Fondamentale (PER/Bilan) et Screening Shariah AAOIFI.',
    metrics: 'Traitement Concurrent'
  },
  {
    step: '04',
    title: 'ALPHA SYNTHESIS',
    subtitle: 'Agrégation Algorithmique',
    icon: <Brain size={20} />,
    desc: 'Combinaison pondérée des signaux pour éliminer le bruit de marché et générer un score de confiance composite.',
    metrics: 'Algorithme Pondéré • Score /100'
  },
  {
    step: '05',
    title: 'DECISION INTELLIGENCE',
    subtitle: 'Rapports & Audits',
    icon: <FileText size={20} />,
    desc: 'Génération de thèses d\'investissement précises, d\'objectifs de cours et d\'audits d\'étanchéité financière AAOIFI.',
    metrics: 'Rapports Instantanés'
  }
];

/* ─────────────────────────────────────────
   OUTCOME-FIRST FRAMEWORK
───────────────────────────────────────── */
const OUTCOMES = [
  {
    id: 'understand',
    tag: '01. UNDERSTAND',
    title: 'Comprendre la valeur intrinsèque et le sentiment du marché',
    desc: 'Accédez instantanément à la santé bilancielle des entreprises du MASI et au sentiment médiatique agrégé pour évaluer le risque réel avant toute prise de position.',
    bullets: [
      'Bilan financier synthétisé & PER historique',
      'Sentiment médiatique NLP en temps réel (+40 sources)',
      'Détection automatique des rumeurs et dépêches financières'
    ],
    tech: 'Alimenté par l\'Agent Fonda & l\'Agent Veille Narrative'
  },
  {
    id: 'discover',
    tag: '02. DISCOVER',
    title: 'Déceler les opportunités et signaux de retournement',
    desc: 'Laissez l\'algorithme scanner le marché pour identifier les anomalies de cours, les divergences RSI/MACD et les niveaux de Fibonacci clés.',
    bullets: [
      'Points de croisement moyennes mobiles (MM20, MM50, MM200)',
      'Niveaux de support & résistance calculés automatiquement',
      'Alertes quantitatives sur volatilité anormale'
    ],
    tech: 'Alimenté par l\'Agent Trading Quant'
  },
  {
    id: 'decide',
    tag: '03. DECIDE',
    title: 'Trancher avec une thèse d\'investissement synthétisée',
    desc: 'Obtenez une recommandation nette assortie d\'un score de confiance pondéré et d\'objectifs de cours à 12 mois pour valider vos convictions.',
    bullets: [
      'Score de confiance d\'analyse globale (ex: 94% ACHAT)',
      'Objectifs de cours prédictifs à horizon 1 an',
      'Synthèse claire exempte de bruit de marché'
    ],
    tech: 'Alimenté par l\'Agent Stratégie Alpha'
  },
  {
    id: 'monitor',
    tag: '04. MONITOR & AUDIT',
    title: 'Piloter le P&L et auditer la conformité éthique AAOIFI',
    desc: 'Suivez le rendement réel de vos positions consolidées tout en garantissant la purification exacte des dividendes non-conformes selon les normes éthiques AAOIFI.',
    bullets: [
      'Calculateur d\'étanchéité financière Shariah automatique',
      'Suivi consolidé du P&L et des plus-values latentes',
      'Conformité aux standards internationaux AAOIFI 2026'
    ],
    tech: 'Alimenté par le Moteur AAOIFI & Portefeuille Intelligent'
  }
];

const FAQ_ITEMS = [
  {
    q: "D'où proviennent les données financières et boursières du MASI ?",
    a: "Aetheris agrège les cours du marché de Casablanca (BVC), les données macro-économiques banques centrales/matières premières et scrape plus de 40 flux d'actualités financières marocaines autorisées pour alimenter ses algorithmes."
  },
  {
    q: "Comment est établie la conformité Shariah AAOIFI ?",
    a: "Notre module passe chaque entreprise du MASI au criblage des critères financiers AAOIFI (ratio d'endettement < 30%, revenus non-conformes < 5%). Il calcule ensuite la purification exacte des dividendes."
  },
  {
    q: "Le compte Découverte est-il vraiment sans engagement ?",
    a: "Oui, la création de compte prend 10 secondes sans carte bancaire et donne accès au terminal de recherche et aux cotations en direct."
  },
  {
    q: "En quoi consiste l'architecture multi-agents ?",
    a: "Plutôt qu'un modèle IA générique unique, Aetheris fait tourner 4 nœuds IA spécialisés (Sentiment, Quant, Fonda, AAOIFI) dont les résultats sont consolidés par le moteur d'orchestration Alpha."
  }
];

/* ─────────────────────────────────────────
   TICKER TAPE COMPONENT
───────────────────────────────────────── */
function TickerTape() {
  const items = [...TICKERS, ...TICKERS];
  return (
    <div className="ticker-tape-container">
      <div className="ticker-tape-inner">
        <div className="ticker-tape-track">
          {items.map((t, i) => (
            <span key={`${t.symbol}-${i}`} className="ticker-item">
              <span className="ticker-sym mono">{t.symbol}</span>
              <span className="ticker-price mono">{t.price} MAD</span>
              <span className={`ticker-chg mono ${t.up ? 'chg-up' : 'chg-down'}`}>
                {t.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {t.change}
              </span>
              <span className="ticker-sep">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   INSTITUTIONAL TERMINAL UI DEMO
───────────────────────────────────────── */
function InstitutionalTerminal() {
  const [selectedTicker, setSelectedTicker] = useState('ATW');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'QUANT' | 'AAOIFI'>('OVERVIEW');

  return (
    <div className="inst-terminal-box">
      {/* Top Terminal Bar */}
      <div className="it-topbar">
        <div className="it-left-controls">
          <span className="it-dot red" /><span className="it-dot yellow" /><span className="it-dot green" />
          <span className="it-title mono">AETHERIS ALPHA TERMINAL — MASI LIVE SYSTEM v2.0</span>
        </div>
        <div className="it-right-status mono">
          <span className="live-dot-green" />
          <span>CONNECTED • BVC FEED 100% ONLINE</span>
        </div>
      </div>

      {/* Terminal Main Grid */}
      <div className="it-grid">
        {/* Left Ticker Selector */}
        <div className="it-sidebar">
          <div className="it-sidebar-head mono">WATCHLIST MASI</div>
          <div className="it-ticker-list">
            {TICKERS.slice(0, 5).map(t => (
              <button 
                key={t.symbol}
                onClick={() => setSelectedTicker(t.symbol)}
                className={`it-ticker-row ${selectedTicker === t.symbol ? 'active' : ''}`}
              >
                <div>
                  <div className="it-tsym mono">{t.symbol}</div>
                  <div className="it-tname">{t.name}</div>
                </div>
                <div className="text-right">
                  <div className="it-tprice mono">{t.price}</div>
                  <div className={`it-tchg mono ${t.up ? 'chg-up' : 'chg-down'}`}>{t.change}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center Workspace */}
        <div className="it-workspace">
          {/* Asset Header */}
          <div className="it-asset-head">
            <div>
              <div className="it-asset-title-row">
                <h2 className="it-asset-name">{selectedTicker} — Attijariwafa Bank</h2>
                <span className="it-badge-pass mono">AAOIFI CONFORME</span>
              </div>
              <div className="it-asset-sub mono">SECTEUR : BANCAIRE • CAPITALISATION : 108.4 B MAD</div>
            </div>

            {/* Tab Toggles */}
            <div className="it-tab-toggles">
              <button className={`it-tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`} onClick={() => setActiveTab('OVERVIEW')}>SYNTHÈSE ALPHA</button>
              <button className={`it-tab-btn ${activeTab === 'QUANT' ? 'active' : ''}`} onClick={() => setActiveTab('QUANT')}>INDICATEURS QUANT</button>
              <button className={`it-tab-btn ${activeTab === 'AAOIFI' ? 'active' : ''}`} onClick={() => setActiveTab('AAOIFI')}>AUDIT AAOIFI</button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'OVERVIEW' && (
            <div className="it-tab-content">
              <div className="it-cards-row">
                <div className="it-card">
                  <div className="it-card-lbl mono">SIGNAL ALPHA SYNTHÈSE</div>
                  <div className="it-card-val text-emerald mono">ACHAT FORT</div>
                  <div className="it-card-sub mono">SCORE CONFIANCE : 94%</div>
                </div>
                <div className="it-card">
                  <div className="it-card-lbl mono">OBJECTIF DE COURS (12M)</div>
                  <div className="it-card-val mono">606.00 MAD</div>
                  <div className="it-card-sub text-emerald mono">+18.4% POTENTIEL</div>
                </div>
                <div className="it-card">
                  <div className="it-card-lbl mono">SENTIMENT MÉDIATIQUE NLP</div>
                  <div className="it-card-val text-emerald mono">+0.78 POSITIF</div>
                  <div className="it-card-sub mono">SCRAPING 42 SOURCES</div>
                </div>
              </div>

              {/* Thesis Box */}
              <div className="it-thesis-box">
                <div className="it-tb-title mono">THÈSE D'INVESTISSEMENT SYNTHÉTISÉE PAR L'AGENT ALPHA :</div>
                <p className="it-tb-text">
                  "Résultats du T4 tirés par l'expansion du produit net bancaire (+8.2%) et une maîtrise rigoureuse du coût du risque. L'indicateur RSI(14) à 58.3 montre une dynamique haussière saine sans surachat. Ratio d'endettement à 24.1% conforme aux exigences éthiques AAOIFI."
                </p>
              </div>
            </div>
          )}

          {activeTab === 'QUANT' && (
            <div className="it-tab-content">
              <div className="it-cards-row">
                <div className="it-card">
                  <div className="it-card-lbl mono">RSI (14 JOURS)</div>
                  <div className="it-card-val mono">58.30</div>
                  <div className="it-card-sub mono">ZONE NEUTRE-HAUSSIÈRE</div>
                </div>
                <div className="it-card">
                  <div className="it-card-lbl mono">MACD (12, 26, 9)</div>
                  <div className="it-card-val text-emerald mono">CROISEMENT BULL</div>
                  <div className="it-card-sub mono">HISTOGRAMME +2.45</div>
                </div>
                <div className="it-card">
                  <div className="it-card-lbl mono">MOMENTUM MM20 / MM50</div>
                  <div className="it-card-val text-emerald mono">AU-DESSUS MM20</div>
                  <div className="it-card-sub mono">SUPPORT : 498.00 MAD</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'AAOIFI' && (
            <div className="it-tab-content">
              <div className="it-cards-row">
                <div className="it-card">
                  <div className="it-card-lbl mono">CRITÈRE D'ACTIVITÉ</div>
                  <div className="it-card-val text-emerald mono">CONFORME</div>
                  <div className="it-card-sub mono">AAOIFI STANDARD FAS-2</div>
                </div>
                <div className="it-card">
                  <div className="it-card-lbl mono">RATIO D'ENDETTEMENT</div>
                  <div className="it-card-val text-emerald mono">24.10%</div>
                  <div className="it-card-sub mono">SEUIL MAXIMAL &lt; 30%</div>
                </div>
                <div className="it-card">
                  <div className="it-card-lbl mono">PURIFICATION DIVIDENDES</div>
                  <div className="it-card-val text-amber mono">0.42%</div>
                  <div className="it-card-sub mono">0.42 MAD POUR 100 MAD</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN ENTERPRISE LANDING PAGE
───────────────────────────────────────── */
export default function EnterpriseLandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOutcome, setActiveOutcome] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => setIsAuthenticated(!!user))
      .catch(() => setIsAuthenticated(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setIsAuthenticated(!!s?.user);
    });

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const gotoConsole = (sym?: string) => {
    router.push(sym ? `/console?q=${encodeURIComponent(sym)}` : '/console');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    gotoConsole(q || undefined);
  };

  return (
    <div className="lp-root">
      <div className="noise-overlay" aria-hidden />

      {/* ════════════════════ NAVBAR ════════════════════ */}
      <nav className={`lp-nav${scrolled ? ' nav-scrolled' : ''}`} role="navigation">
        <div className="nav-inner">
          <Link href="/" className="nav-brand" aria-label="Aetheris — Accueil">
            <div className="brand-orb">
              <Zap size={16} fill="#000" strokeWidth={0} />
            </div>
            <div className="brand-title-row">
              <span className="brand-name">AETHERIS</span>
              <span className="brand-status-pill mono">v2.8</span>
            </div>
          </Link>

          <div className="nav-links">
            <a href="#terminal" className="nl">Terminal Live</a>
            <Link href="/marche-live" className="nl">MASI Live</Link>
            <Link href="/purification" className="nl">Audit AAOIFI</Link>
            <a href="#pipeline" className="nl">Architecture</a>
            <a href="#outcomes" className="nl">Plateforme</a>
            <a href="#pricing"  className="nl">Tarifs</a>
          </div>

          <div className="nav-ctas">
            {isAuthenticated === null && <div className="nav-skel" />}
            {isAuthenticated === false && (
              <>
                <Link href="/login" className="btn-ghost-link">
                  <button className="btn-ghost"><LogIn size={13} />Se connecter</button>
                </Link>
                <Link href="/login?mode=signup" className="btn-primary-link">
                  <button className="btn-cta-sm"><UserPlus size={13} />S'inscrire</button>
                </Link>
              </>
            )}
            {isAuthenticated === true && (
              <Link href="/console" className="btn-primary-link">
                <button className="btn-cta-sm"><Cpu size={13} />Accéder au Terminal</button>
              </Link>
            )}
          </div>

          <button 
            className="mobile-hamburger-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu de navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay animate-in">
          <div className="mobile-drawer-header">
            <div className="mobile-logo-brand">
              <div className="mobile-logo-icon-bg">
                <Zap size={14} className="text-black" />
              </div>
              <span className="mobile-brand-name">AETHERIS</span>
              <span className="mobile-version-badge">v2.8</span>
            </div>
            <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="mobile-drawer-inner">
            <div className="mobile-links-container">
              <a href="#terminal" className="mobile-card-link" onClick={() => setMobileMenuOpen(false)}>Terminal Live</a>
              
              <div className="mobile-sublinks">
                <Link href="/marche-live" className="mobile-sublink" onClick={() => setMobileMenuOpen(false)}>
                  MASI Live
                </Link>
                <Link href="/purification" className="mobile-sublink" onClick={() => setMobileMenuOpen(false)}>
                  Audit AAOIFI
                </Link>
              </div>

              <a href="#pipeline" className="mobile-card-link" onClick={() => setMobileMenuOpen(false)}>Architecture</a>
              <a href="#outcomes" className="mobile-card-link" onClick={() => setMobileMenuOpen(false)}>Plateforme</a>
              <a href="#pricing" className="mobile-card-link" onClick={() => setMobileMenuOpen(false)}>Tarifs</a>
            </div>

            <div className="mobile-drawer-divider" />
            
            {isAuthenticated ? (
              <Link href="/console" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
                <button className="btn-cta-mobile-premium"><Cpu size={16} />Accéder à la Console</button>
              </Link>
            ) : (
              <div className="mobile-drawer-actions">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
                  <button className="btn-ghost-mobile"><LogIn size={14} />Se connecter</button>
                </Link>
                <Link href="/login?mode=signup" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
                  <button className="btn-cta-mobile-premium"><UserPlus size={16} />Créer un compte gratuit</button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ════════════════════ HERO SECTION ════════════════════ */}
      <section className="lp-hero">
        <div className="hero-grid-bg" aria-hidden />

        <div className="hero-content">
          <div className="hero-pill animate-in">
            <span className="live-dot-green" />
            <span className="mono">FINANCIAL INFRASTRUCTURE • BOURSE DE CASABLANCA</span>
          </div>

          <h1 className="hero-h1 animate-in">
            L'intelligence financière nouvelle génération<br />
            <span className="text-white-pure">pour la Bourse de Casablanca.</span>
          </h1>

          <p className="hero-sub animate-in">
            Infrastructure d'analyse décisionnelle et de conformité éthique AAOIFI pour les investisseurs et analystes du MASI.
          </p>

          <div className="hero-ctas animate-in">
            <button className="btn-primary-lg" onClick={() => gotoConsole()}>
              Accéder à la Console Alpha <ArrowRight size={16} />
            </button>
            <a href="#pipeline" className="btn-ghost-lg">
              Consulter l'Architecture Propriétaire ↓
            </a>
          </div>

          {/* Quick Search */}
          <div className="hero-search-wrapper animate-in">
            <form className="inst-search-form" onSubmit={handleSearch}>
              <Search size={16} className="text-muted" />
              <input
                className="inst-search-input mono"
                placeholder="RECHERCHER UN SYMBOLE (EX: ATW, IAM, BCP, TGCC, MANAGEM)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="inst-search-btn mono">
                RECHERCHER
              </button>
            </form>
          </div>
        </div>

        {/* ════════════════════ TERMINAL AT THE CENTER ════════════════════ */}
        <div id="terminal" className="hero-terminal-container animate-in">
          <InstitutionalTerminal />
        </div>
      </section>

      {/* ════════════════════ PROPRIETARY PIPELINE ════════════════════ */}
      <section id="pipeline" className="lp-section lp-dark-section">
        <div className="lp-container">
          <div className="section-head">
            <div className="section-eyebrow mono">TECHNOLOGIE PROPRIÉTAIRE</div>
            <h2 className="section-h2">
              Architecture Moteur &amp; Pipeline de Traitement
            </h2>
            <p className="section-p">
              Comment Aetheris transforme les flux de données boursières brutes en intelligence décisionnelle.
            </p>
          </div>

          <div className="pipeline-grid">
            {PIPELINE_STAGES.map((s) => (
              <div key={s.step} className="pipeline-card">
                <div className="pc-top">
                  <span className="pc-step mono">{s.step}</span>
                  <div className="pc-icon">{s.icon}</div>
                </div>
                <h3 className="pc-title mono">{s.title}</h3>
                <div className="pc-sub mono">{s.subtitle}</div>
                <p className="pc-desc">{s.desc}</p>
                <div className="pc-metrics mono">{s.metrics}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ OUTCOME-FIRST FRAMEWORK ════════════════════ */}
      <section id="outcomes" className="lp-section">
        <div className="lp-container">
          <div className="section-head">
            <div className="section-eyebrow mono">CADRE DÉCISIONNEL</div>
            <h2 className="section-h2">
              Quatre Étape Clés pour Chaque Investissement
            </h2>
            <p className="section-p">
              Une plateforme structurée autour des objectifs de l'investisseur institutionnel et privé.
            </p>
          </div>

          <div className="outcomes-layout">
            <div className="outcomes-nav">
              {OUTCOMES.map((o, idx) => (
                <button
                  key={o.id}
                  className={`outcome-tab-btn ${activeOutcome === idx ? 'active' : ''}`}
                  onClick={() => setActiveOutcome(idx)}
                >
                  <span className="otb-tag mono">{o.tag}</span>
                  <span className="otb-title">{o.title}</span>
                </button>
              ))}
            </div>

            <div className="outcome-display-panel">
              {(() => {
                const oc = OUTCOMES[activeOutcome];
                return (
                  <div className="odp-inner animate-in" key={oc.id}>
                    <span className="odp-tag mono">{oc.tag}</span>
                    <h3 className="odp-title">{oc.title}</h3>
                    <p className="odp-desc">{oc.desc}</p>

                    <div className="odp-bullets">
                      {oc.bullets.map((b, i) => (
                        <div key={i} className="odp-bullet-item">
                          <CheckCircle2 size={16} className="text-emerald" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>

                    <div className="odp-tech-footer mono">{oc.tech}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ PRICING ════════════════════ */}
      <section id="pricing" className="lp-section lp-dark-section">
        <div className="lp-container">
          <div className="section-head">
            <div className="section-eyebrow mono">OFFRE &amp; ACCÈS</div>
            <h2 className="section-h2">
              Tarification Institutionnelle
            </h2>
            <p className="section-p">
              Accès sans engagement avec réassurance sans carte bancaire.
            </p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pc-header">
                <h3 className="pc-title">Compte Découverte</h3>
                <p className="pc-desc">Pour explorer la plateforme et suivre les cours en direct.</p>
                <div className="pc-price">
                  <span className="price-val">0 MAD</span>
                  <span className="price-period">/ gratuit</span>
                </div>
              </div>
              <ul className="pc-features">
                <li><Check size={14} className="pc-check" /><span>3 Analyses de Symboles / jour</span></li>
                <li><Check size={14} className="pc-check" /><span>Flux MASI Live 24/7</span></li>
                <li><Check size={14} className="pc-check" /><span>Screening Shariah AAOIFI Basique</span></li>
                <li><Check size={14} className="pc-check" /><span>Suivi de Portefeuille P&amp;L</span></li>
              </ul>
              <Link href="/login?mode=signup" style={{ textDecoration: 'none' }}>
                <button className="pc-btn pc-btn-ghost">Créer un compte gratuit</button>
              </Link>
            </div>

            <div className="pricing-card pc-featured">
              <div className="pc-popular-tag mono"><Flame size={12} /> BETA ACCÈS INSTITUTIONNEL</div>
              <div className="pc-header">
                <h3 className="pc-title">Console Alpha Pro</h3>
                <p className="pc-desc">Accès complet à l'ensemble du moteur d'intelligence analytique.</p>
                <div className="pc-price">
                  <span className="price-val text-emerald">OFFERT</span>
                  <span className="price-period">/ pendant la Beta 2026</span>
                </div>
              </div>
              <ul className="pc-features">
                <li><Check size={14} className="pc-check-green" /><span><strong>Analyses Multi-Agents IA illimitées</strong></span></li>
                <li><Check size={14} className="pc-check-green" /><span>Agent Stratégie Alpha &amp; Score Composite</span></li>
                <li><Check size={14} className="pc-check-green" /><span>Carnet d'ordres &amp; Cotations temps réel</span></li>
                <li><Check size={14} className="pc-check-green" /><span>Purification Dividendes AAOIFI intégrale</span></li>
                <li><Check size={14} className="pc-check-green" /><span>Exportation des rapports d'analyse</span></li>
              </ul>
              <Link href="/login?mode=signup" style={{ textDecoration: 'none' }}>
                <button className="pc-btn pc-btn-primary">⚡ Réserver mon Accès Pro</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ FAQ ════════════════════ */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="section-head">
            <div className="section-eyebrow mono">RÉASSURANCE</div>
            <h2 className="section-h2">
              Foire Aux Questions
            </h2>
          </div>

          <div className="faq-wrapper">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className={`faq-card${isOpen ? ' faq-open' : ''}`}>
                  <button className="faq-question" onClick={() => setOpenFaq(isOpen ? null : index)}>
                    <div className="faq-q-text">
                      <HelpCircle size={16} className="faq-icon" />
                      <span>{item.q}</span>
                    </div>
                    <ChevronDown size={16} className={`faq-arrow${isOpen ? ' arrow-up' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="faq-answer animate-in">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer className="lp-footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="fg-col">
              <div className="fg-brand">
                <div className="brand-orb sm"><Zap size={14} fill="#000" strokeWidth={0} /></div>
                <span className="brand-name">AETHERIS</span>
              </div>
              <p className="fg-desc">
                Plateforme d'intelligence financière institutionnelle dédiée à la Bourse de Casablanca (MASI).
              </p>
            </div>

            <div className="fg-col">
              <div className="fg-col-title mono">SERVICES</div>
              <Link href="/console"       className="fg-link">Console Alpha</Link>
              <Link href="/marche-live"   className="fg-link">MASI Live</Link>
              <Link href="/portfolio"     className="fg-link">Portefeuille P&amp;L</Link>
              <Link href="/purification"  className="fg-link">Purification AAOIFI</Link>
            </div>

            <div className="fg-col">
              <div className="fg-col-title mono">COMPTE</div>
              <Link href="/login"              className="fg-link">Se connecter</Link>
              <Link href="/login?mode=signup"  className="fg-link">Créer un compte</Link>
              <Link href="/profile"            className="fg-link">Profil utilisateur</Link>
            </div>

            <div className="fg-col">
              <div className="fg-col-title mono">INSTITUTIONNEL</div>
              <span className="fg-link-muted">Normes AAOIFI 2026</span>
              <span className="fg-link-muted">Protection Données</span>
              <span className="fg-link-muted">Mentions Légales</span>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="mono">© 2026 AETHERIS TECHNOLOGIES — BOURSE DE CASABLANCA</span>
            <span className="mono text-muted">FINANCIAL INFRASTRUCTURE</span>
          </div>
        </div>
      </footer>

      {/* ════════════════════ INSTITUTIONAL FINTECH STYLES ════════════════════ */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
      `}</style>

      <style jsx>{`
        /* ── ROOT & OBSIDIAN FINTECH PALETTE ── */
        .lp-root {
          min-height: 100vh; width: 100%;
          background: #030508;
          color: #cbd5e1;
          font-family: 'Inter', -apple-system, sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        .text-emerald { color: #10b981; }
        .text-amber { color: #f59e0b; }
        .text-red { color: #ef4444; }
        .text-muted { color: #475569; }
        .text-white-pure { color: #ffffff; }

        /* ── NOISE ── */
        .noise-overlay {
          position: fixed; inset: 0;
          pointer-events: none; z-index: 1; opacity: 0.015;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 180px;
        }

        /* ── TICKER ── */
        .ticker-wrapper {
          position: relative;
          margin-top: 64px;
          width: 100%;
          z-index: 10;
          background: rgba(3,5,8,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          height: 32px; overflow: hidden;
        }
        .ticker-tape-container { position: relative; height: 32px; display: flex; align-items: center; overflow: hidden; }
        .ticker-tape-container::before, .ticker-tape-container::after { content: ''; position: absolute; top: 0; bottom: 0; width: 80px; z-index: 2; pointer-events: none; }
        .ticker-tape-container::before { left: 0; background: linear-gradient(90deg, #030508 0%, transparent 100%); }
        .ticker-tape-container::after  { right: 0; background: linear-gradient(-90deg, #030508 0%, transparent 100%); }
        .ticker-tape-inner { overflow: hidden; width: 100%; }
        .ticker-tape-track { display: flex; gap: 0; white-space: nowrap; animation: ticker-scroll 45s linear infinite; }
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-item { display: inline-flex; align-items: center; gap: 6px; padding: 0 1.25rem; font-size: 11px; }
        .ticker-sym { color: #f8fafc; font-weight: 700; }
        .ticker-price { color: #64748b; }
        .ticker-chg { display: inline-flex; align-items: center; gap: 2px; font-weight: 600; }
        .chg-up { color: #10b981; } .chg-down { color: #ef4444; }
        .ticker-sep { color: #1e293b; }

        /* ── NAVBAR ── */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; height: 64px; z-index: 200;
          display: flex; align-items: center;
          background: rgba(3,5,8,0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .lp-nav.nav-scrolled { background: rgba(3,5,8,0.75); backdrop-filter: blur(24px); box-shadow: 0 4px 20px rgba(0,0,0,0.8); }
        .nav-inner { width: 100%; max-width: 1400px; margin: 0 auto; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; }
        .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .brand-orb { width: 32px; height: 32px; border-radius: 6px; background: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .brand-orb.sm { width: 26px; height: 26px; border-radius: 5px; }
        .brand-title-row { display: flex; align-items: center; gap: 8px; }
        .brand-name { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.1rem; color: #fff; letter-spacing: -0.02em; }
        .brand-status-pill { font-size: 8px; color: #10b981; font-weight: 700; border: 1px solid rgba(16,185,129,0.3); padding: 1px 5px; border-radius: 3px; background: rgba(16,185,129,0.06); }

        .nav-links { display: flex; align-items: center; gap: 1.25rem; }
        .nl, .nl:visited, .nl:link {
          color: #94a3b8 !important; font-size: 13px; font-weight: 600; text-decoration: none !important;
          transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 10px; border-radius: 6px;
        }
        .nl:hover, .nl:focus { color: #ffffff !important; background: rgba(255,255,255,0.06); }
        .nl-icon { opacity: 0.7; transition: opacity 0.2s; }
        .nl:hover .nl-icon { opacity: 1; }

        .nl-live-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25);
          padding: 4px 10px; border-radius: 20px; color: #34d399 !important;
        }
        .nl-live-badge:hover { background: rgba(16,185,129,0.16); border-color: rgba(16,185,129,0.4); color: #ffffff !important; }
        .live-pulse-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #10b981;
          box-shadow: 0 0 8px #10b981; display: inline-block;
          animation: pulse-dot 2s infinite ease-in-out;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }

        .nav-ctas { display: flex; align-items: center; gap: 0.75rem; }
        .mobile-hamburger-btn { display: none; background: none; border: none; color: #fff; cursor: pointer; padding: 0.5rem; }
        .mobile-drawer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; background: #030508; padding: 1.5rem; display: flex; flex-direction: column; }
        
        .mobile-drawer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
        .mobile-logo-brand { display: flex; align-items: center; gap: 8px; }
        .mobile-logo-icon-bg { background: #10b981; border-radius: 6px; padding: 6px; display: flex; align-items: center; justify-content: center; }
        .mobile-brand-name { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.2rem; color: #fff; letter-spacing: -0.5px; }
        .mobile-version-badge { font-size: 8.5px; font-weight: 800; color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 2px 6px; border-radius: 4px; }
        .mobile-close-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #fff; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; }
        
        .mobile-drawer-inner { display: flex; flex-direction: column; width: 100%; }
        .mobile-links-container { display: flex; flex-direction: column; gap: 0.75rem; }
        .mobile-card-link { background: #0c111a; border: 1px solid rgba(255,255,255,0.03); border-radius: 8px; padding: 1rem 1.25rem; color: #fff; font-weight: 700; font-size: 1rem; text-decoration: none; transition: background 0.2s; }
        .mobile-card-link:active { background: rgba(255,255,255,0.06); }
        .mobile-sublinks { display: flex; flex-direction: column; gap: 0.25rem; }
        .mobile-sublink { display: flex; align-items: center; gap: 10px; padding: 0.6rem 1.25rem 0.6rem 1.5rem; color: #cbd5e1; font-weight: 600; font-size: 0.95rem; text-decoration: none; }
        
        .mobile-drawer-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 1.25rem 0; }
        .mobile-drawer-actions { display: flex; flex-direction: column; gap: 0.75rem; }
        .btn-cta-mobile-premium { width: 100%; background: #10b981; color: #000; border: none; border-radius: 8px; padding: 1.1rem; font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: opacity 0.2s; }
        .btn-cta-mobile-premium:active { opacity: 0.8; }
        .btn-ghost-mobile { width: 100%; background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1.1rem; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
        .nav-skel { width: 140px; height: 32px; }
        .btn-ghost-link, .btn-primary-link { text-decoration: none; }

        .btn-ghost {
          display: flex; align-items: center; gap: 6px; padding: 0.45rem 0.9rem; border-radius: 6px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #cbd5e1;
          font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.07); color: #fff; }

        .btn-cta-sm {
          display: flex; align-items: center; gap: 6px; padding: 0.45rem 1rem; border-radius: 6px;
          background: #10b981; border: none; color: #000; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
        }
        .btn-cta-sm:hover { background: #34d399; }

        .mobile-hamburger-btn { display: flex; background: none; border: 1px solid rgba(255,255,255,0.1); color: #fff; width: 36px; height: 36px; border-radius: 6px; align-items: center; justify-content: center; cursor: pointer; }
        .w-full { width: 100%; justify-content: center; }

        /* ── HERO ── */
        .lp-hero {
          position: relative; overflow: hidden;
          padding: 120px 2rem 5rem;
          display: flex; flex-direction: column; align-items: center;
        }
        .hero-grid-bg {
          position: absolute; inset: 0; pointer-events: none;
          background-image: linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, black 0%, transparent 100%);
        }
        .hero-content {
          position: relative; z-index: 10; max-width: 900px; width: 100%;
          text-align: center; display: flex; flex-direction: column; align-items: center;
          margin-bottom: 3.5rem;
        }
        .hero-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 4px;
          background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2);
          color: #10b981; font-size: 10px; font-weight: 700; letter-spacing: 0.05rem;
          margin-bottom: 1.5rem;
        }
        .live-dot-green { width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block; }

        .hero-h1 {
          font-family: 'Outfit', sans-serif; font-size: clamp(2.4rem, 4.5vw, 3.8rem);
          font-weight: 800; letter-spacing: -0.03em; line-height: 1.1;
          color: #94a3b8; margin-bottom: 1.25rem;
        }
        .hero-sub {
          font-size: 1.1rem; color: #64748b; line-height: 1.6; max-width: 680px; margin-bottom: 2rem;
        }

        .hero-ctas { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; justify-content: center; }
        .btn-primary-lg {
          display: inline-flex; align-items: center; gap: 8px; padding: 0.85rem 1.75rem; border-radius: 6px;
          background: #10b981; border: none; color: #000; font-size: 13.5px; font-weight: 800;
          cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
        }
        .btn-primary-lg:hover { background: #34d399; }

        .btn-ghost-lg {
          display: inline-flex; align-items: center; gap: 8px; padding: 0.85rem 1.75rem; border-radius: 6px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1;
          font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; text-decoration: none;
        }
        .btn-ghost-lg:hover { background: rgba(255,255,255,0.07); color: #fff; }

        /* Search Form in Hero */
        .hero-search-wrapper { width: 100%; max-width: 720px; }
        .inst-search-form {
          display: flex; align-items: center; gap: 8px;
          background: rgba(9,13,20,0.9); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px; padding: 4px 6px 4px 14px;
        }
        .inst-search-input {
          flex: 1; background: none; border: none; color: #fff; font-size: 12px; outline: none;
        }
        .inst-search-input::placeholder { color: #334155; }
        .inst-search-btn {
          padding: 0.6rem 1.25rem; border-radius: 4px; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 11px; font-weight: 700;
          cursor: pointer; transition: background 0.2s;
        }
        .inst-search-btn:hover { background: rgba(255,255,255,0.12); }

        /* ── TERMINAL AT THE CENTER ── */
        .hero-terminal-container { width: 100%; max-width: 1150px; position: relative; z-index: 10; }
        .inst-terminal-box {
          background: #080c14; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
          overflow: hidden; box-shadow: 0 30px 90px rgba(0,0,0,0.9);
        }
        .it-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px; background: #0c101b; border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .it-left-controls { display: flex; align-items: center; gap: 6px; }
        .it-dot { width: 10px; height: 10px; border-radius: 50%; }
        .it-dot.red { background: #ff5f57; } .it-dot.yellow { background: #febc2e; } .it-dot.green { background: #28c840; }
        .it-title { font-size: 10px; color: #64748b; margin-left: 8px; font-weight: 600; }
        .it-right-status { display: flex; align-items: center; gap: 6px; font-size: 9.5px; color: #10b981; font-weight: 700; }

        .it-grid { display: grid; grid-template-columns: 240px 1fr; min-height: 380px; }
        .it-sidebar { border-right: 1px solid rgba(255,255,255,0.06); background: rgba(5,8,14,0.6); }
        .it-sidebar-head { padding: 12px 14px; font-size: 9px; color: #475569; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.04); letter-spacing: 0.05rem; }
        .it-ticker-list { display: flex; flex-direction: column; }
        .it-ticker-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; background: none; border: none; border-bottom: 1px solid rgba(255,255,255,0.03);
          cursor: pointer; text-align: left; transition: background 0.15s;
        }
        .it-ticker-row:hover { background: rgba(255,255,255,0.03); }
        .it-ticker-row.active { background: rgba(16,185,129,0.08); border-left: 2px solid #10b981; }
        .it-tsym { font-size: 12px; font-weight: 800; color: #fff; }
        .it-tname { font-size: 10px; color: #64748b; }
        .it-tprice { font-size: 11px; color: #cbd5e1; }
        .it-tchg { font-size: 10px; font-weight: 600; }

        .it-workspace { padding: 1rem; display: flex; flex-direction: column; gap: 1.25rem; }
        @media (min-width: 768px) { .it-workspace { padding: 1.5rem; } }
        .it-asset-head { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
        .it-asset-title-row { display: flex; align-items: center; gap: 10px; }
        .it-asset-name { font-family: 'Outfit', sans-serif; font-size: 1.35rem; font-weight: 800; color: #fff; margin: 0; }
        .it-badge-pass { font-size: 9px; font-weight: 800; color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); padding: 2px 7px; border-radius: 3px; }
        .it-asset-sub { font-size: 9.5px; color: #64748b; margin-top: 3px; }

        .it-tab-toggles { display: flex; gap: 4px; background: rgba(255,255,255,0.03); padding: 3px; border-radius: 4px; }
        .it-tab-btn { background: none; border: none; color: #64748b; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace; padding: 5px 10px; border-radius: 3px; cursor: pointer; }
        .it-tab-btn.active { background: rgba(255,255,255,0.08); color: #fff; }

        .it-cards-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .it-card { background: rgba(12,17,27,0.7); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 6px; }
        .it-card-lbl { font-size: 9px; color: #475569; font-weight: 700; margin-bottom: 4px; }
        .it-card-val { font-size: 1.25rem; font-weight: 800; color: #fff; }
        .it-card-sub { font-size: 9.5px; margin-top: 2px; }

        .it-thesis-box { background: rgba(12,17,27,0.5); border: 1px solid rgba(255,255,255,0.05); padding: 1.1rem; border-radius: 6px; }
        .it-tb-title { font-size: 9.5px; color: #10b981; font-weight: 800; margin-bottom: 6px; }
        .it-tb-text { font-size: 12.5px; color: #94a3b8; line-height: 1.6; margin: 0; font-style: italic; }

        /* ── SECTIONS ── */
        .lp-section { padding: 4.5rem 1.5rem; }
        .lp-dark-section { background: #060910; border-top: 1px solid rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.04); }
        .lp-container { max-width: 1200px; margin: 0 auto; }
        .section-head { text-align: center; margin-bottom: 3.5rem; }
        .section-eyebrow { font-size: 9.5px; font-weight: 800; color: #10b981; letter-spacing: 0.15rem; margin-bottom: 1rem; display: block; text-transform: uppercase; }
        .section-h2 { font-family: 'Outfit', sans-serif; font-size: clamp(2.2rem, 5.5vw, 3.8rem); font-weight: 800; color: #fff; letter-spacing: -0.03em; margin-bottom: 1.25rem; line-height: 1.1; }
        .section-p { font-size: 1.05rem; color: #94a3b8; max-width: 600px; margin: 0 auto; line-height: 1.7; }
        @media (min-width: 768px) {
          .lp-section { padding: 8rem 2rem; }
          .section-head { margin-bottom: 5rem; }
        }

        /* ── PIPELINE STAGES ── */
        .pipeline-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; }
        .pipeline-card { background: rgba(12,17,27,0.7); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 1.5rem; display: flex; flex-direction: column; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .pipeline-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px -10px rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.25); background: rgba(16,185,129,0.03); }
        .pc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
        .pc-step { font-size: 11px; font-weight: 800; color: #10b981; }
        .pc-icon { color: #64748b; }
        .pc-title { font-size: 10.5px; font-weight: 800; color: #fff; margin-bottom: 2px; }
        .pc-subtitle { font-size: 9.5px; color: #10b981; font-weight: 700; margin-bottom: 0.75rem; }
        .pc-desc { font-size: 11.5px; color: #64748b; line-height: 1.5; margin-bottom: 1.25rem; flex: 1; }
        .pc-metrics { font-size: 9px; color: #334155; border-top: 1px solid rgba(255,255,255,0.04); padding-top: 0.75rem; font-weight: 700; }

        /* ── OUTCOME FRAMEWORK ── */
        .outcomes-layout { display: grid; grid-template-columns: 340px 1fr; gap: 2rem; }
        .outcomes-nav { display: flex; flex-direction: column; gap: 0.5rem; }
        .outcome-tab-btn {
          display: flex; flex-direction: column; text-align: left; padding: 1.1rem;
          background: rgba(12,17,27,0.5); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .outcome-tab-btn:hover { background: rgba(255,255,255,0.03); transform: translateX(4px); border-color: rgba(255,255,255,0.15); }
        .outcome-tab-btn.active { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.3); border-left: 3px solid #10b981; }
        .otb-tag { font-size: 9px; font-weight: 800; color: #10b981; margin-bottom: 4px; }
        .otb-title { font-size: 13px; font-weight: 700; color: #fff; line-height: 1.35; }

        .outcome-display-panel {
          background: rgba(12,17,27,0.7); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;
        }
        @media (min-width: 768px) { .outcome-display-panel { padding: 2.5rem; } }
        .odp-tag { font-size: 10px; font-weight: 800; color: #10b981; margin-bottom: 0.5rem; }
        .odp-title { font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 1rem; line-height: 1.25; }
        .odp-desc { font-size: 0.95rem; color: #64748b; line-height: 1.65; margin-bottom: 2rem; }
        .odp-bullets { display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 2.5rem; }
        .odp-bullet-item { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #cbd5e1; }
        .odp-tech-footer { font-size: 10px; color: #475569; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem; font-weight: 700; }

        /* ── PRICING ── */
        .pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 900px; margin: 0 auto; }
        .pricing-card {
          background: rgba(12,17,27,0.7); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px; padding: 2.5rem; display: flex; flex-direction: column; position: relative;
        }
        .pricing-card.pc-featured { border-color: rgba(16,185,129,0.3); background: rgba(12,17,27,0.9); }
        .pc-popular-tag { position: absolute; top: -12px; right: 20px; background: #10b981; color: #000; font-size: 9px; font-weight: 800; padding: 3px 10px; border-radius: 3px; display: flex; align-items: center; gap: 4px; }
        .pc-header { margin-bottom: 1.5rem; }
        .pc-title { font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 0.3rem; }
        .pc-desc { font-size: 0.85rem; color: #64748b; margin-bottom: 1rem; }
        .pc-price { display: flex; align-items: baseline; gap: 6px; }
        .price-val { font-family: 'Outfit', sans-serif; font-size: 2.2rem; font-weight: 800; color: #fff; }
        .price-period { font-size: 0.85rem; color: #64748b; }
        .pc-features { list-style: none; padding: 0; margin: 0 0 2rem; display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }
        .pc-features li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #cbd5e1; }
        .pc-check { color: #64748b; } .pc-check-green { color: #10b981; }
        .pc-btn { width: 100%; padding: 0.85rem 1.5rem; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; font-family: 'Inter', sans-serif; }
        .pc-btn-ghost { background: rgba(255,255,255,0.04); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
        .pc-btn-ghost:hover { background: rgba(255,255,255,0.08); }
        .pc-btn-primary { background: #10b981; color: #000; }
        .pc-btn-primary:hover { background: #34d399; transform: translateY(-2px); box-shadow: 0 8px 20px -5px rgba(16,185,129,0.3); }

        /* ── FAQ ── */
        .faq-wrapper { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.75rem; }
        .faq-card { background: rgba(12,17,27,0.5); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden; }
        .faq-card.faq-open { border-color: rgba(16,185,129,0.3); }
        .faq-question { width: 100%; padding: 1.25rem 1.5rem; background: none; border: none; display: flex; align-items: center; justify-content: space-between; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif; }
        .faq-q-text { display: flex; align-items: center; gap: 10px; }
        .faq-icon { color: #10b981; flex-shrink: 0; }
        .faq-arrow { color: #64748b; transition: transform 0.2s; }
        .faq-arrow.arrow-up { transform: rotate(180deg); color: #10b981; }
        .faq-answer { padding: 0 1.5rem 1.25rem 2.75rem; color: #64748b; font-size: 13.5px; line-height: 1.6; }

        /* ── FOOTER ── */
        .lp-footer { padding: 4rem 2rem 2rem; background: #030508; border-top: 1px solid rgba(255,255,255,0.06); }
        .footer-inner { max-width: 1200px; margin: 0 auto; }
        .footer-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
        .fg-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; }
        .fg-desc { font-size: 0.85rem; color: #475569; line-height: 1.6; }
        .fg-col { display: flex; flex-direction: column; gap: 8px; }
        .fg-col-title { font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 0.1rem; margin-bottom: 1rem; }
        .fg-link { font-size: 13px; color: #64748b; text-decoration: none; transition: color 0.2s; }
        .fg-link:hover { color: #fff; }
        .fg-link-muted { font-size: 13px; color: #334155; }
        .footer-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.04); font-size: 9px; font-weight: 700; }

        /* ── ANIMATION & RESPONSIVE ── */
        .animate-in { opacity: 0; transform: translateY(12px); animation: anim-in 0.5s ease forwards; }
        @keyframes anim-in { to { opacity: 1; transform: translateY(0); } }
        .mono { font-family: 'JetBrains Mono', monospace; }

        @media (max-width: 1024px) {
          .pipeline-grid { grid-template-columns: repeat(2, 1fr); }
          .outcomes-layout { grid-template-columns: 1fr; }
          .it-grid { grid-template-columns: 1fr; }
          .it-sidebar { display: none; }
        }
        @media (max-width: 768px) {
          .nav-links, .nav-ctas { display: none; }
          .mobile-hamburger-btn { display: flex; }
          .pipeline-grid { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
          .footer-grid { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; gap: 0.5rem; text-align: center; }
          .hero-ctas { flex-direction: column; width: 100%; }
          .btn-primary-lg, .btn-ghost-lg { width: 100%; justify-content: center; }
          .it-cards-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
