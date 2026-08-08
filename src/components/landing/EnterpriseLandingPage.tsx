'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap, Search, ShieldCheck, Activity, Landmark, Globe, Briefcase, Scale,
  ArrowRight, CheckCircle2, LogIn, UserPlus, Sparkles, Cpu, TrendingUp,
  TrendingDown, BarChart2, Brain, ChevronRight, Star, Users, Shield, Lock, Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────
   DATA CONSTANTS
───────────────────────────────────────── */
const TICKERS = [
  { symbol: 'ATW', name: 'Attijariwafa Bank', change: '+1.24%', up: true },
  { symbol: 'BCP', name: 'Banque Centrale Pop.', change: '+0.87%', up: true },
  { symbol: 'IAM', name: 'Maroc Telecom', change: '-0.43%', up: false },
  { symbol: 'MSA', name: 'Marsa Maroc', change: '+2.11%', up: true },
  { symbol: 'TGCC', name: 'TGCC BTP', change: '+0.33%', up: true },
  { symbol: 'SNEP', name: 'SNEP', change: '-0.78%', up: false },
  { symbol: 'BOA', name: 'Bank of Africa', change: '+1.55%', up: true },
  { symbol: 'LBV', name: 'Label Vie', change: '+0.92%', up: true },
  { symbol: 'CIH', name: 'CIH Bank', change: '-0.21%', up: false },
  { symbol: 'MNG', name: 'Managem', change: '+3.07%', up: true },
];

const STATS = [
  { value: '12,400+', label: 'Transactions Analysées', icon: <BarChart2 size={18}/> },
  { value: '4 Agents', label: 'IA Spécialisés', icon: <Brain size={18}/> },
  { value: '99.8%', label: 'Uptime Garanti', icon: <Shield size={18}/> },
  { value: 'AAOIFI', label: 'Conformité Shariah', icon: <Scale size={18}/> },
];

const SERVICES = [
  {
    id: 'terminal', badge: 'IA ÉLITE', color: '#10b981', bg: 'rgba(16,185,129,0.08)',
    icon: <Cpu size={24}/>,
    title: 'Terminal Multi-Agents IA',
    desc: 'Quatre agents IA spécialisés — Veille Narrative, Trading Quant, Analyse Fondamentale et Stratégie Alpha — collaborent pour produire des rapports d\'investissement de grade institutionnel.',
    features: ['Analyse RSI / MACD / Fibonacci', 'Sentiment NLP temps réel', 'Score de Confiance Pondéré'],
    link: '/console',
  },
  {
    id: 'marche', badge: 'LIVE 24/7', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',
    icon: <Globe size={24}/>,
    title: 'Flux de Marché MASI Live',
    desc: 'Cotations en direct du MASI Casablanca, carnets d\'ordres, devises (USD/MAD, EUR/MAD) et matières premières (Brent, Or, Argent) avec actualisation automatique toutes les 3 minutes.',
    features: ['MASI • MADEX en direct', 'USD/MAD • Brent • Or', 'Actualisation auto 3 min'],
    link: '/marche-live',
  },
  {
    id: 'portfolio', badge: 'GESTION P&L', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',
    icon: <Briefcase size={24}/>,
    title: 'Portefeuille Intelligent',
    desc: 'Suivi consolidé du P&L (Plus/Moins-values), calcul des rendements, allocation d\'actifs et performance de portefeuille avec métriques professionnelles en temps réel.',
    features: ['P&L en temps réel', 'Allocation par secteur', 'Rendement annualisé'],
    link: '/portfolio',
  },
  {
    id: 'purification', badge: 'AAOIFI', color: '#a855f7', bg: 'rgba(168,85,247,0.08)',
    icon: <Scale size={24}/>,
    title: 'Purification Dividendes',
    desc: 'Screening Shariah-Compliant automatisé et calculateur précis d\'étanchéité financière des dividendes non-conformes selon les normes éthiques AAOIFI internationales.',
    features: ['Screening Shariah Auto', 'Calcul d\'étanchéité précis', 'Standards AAOIFI 2024'],
    link: '/purification',
  },
];

const AGENTS = [
  {
    key: 'STRATEGY',
    label: 'Stratégie Alpha',
    badge: 'SYNTHÈSE GLOBALE',
    color: '#a855f7',
    icon: <ShieldCheck size={22}/>,
    desc: 'L\'agent orchestrateur. Il collecte les signaux des 3 autres agents IA spécialisés pour forger une thèse d\'investissement complète, dotée d\'un score de confiance et d\'objectifs de cours précis.',
    metrics: [
      { name: 'Score de Confiance', val: '94%' },
      { name: 'Obj. Cours 1 an', val: '+18.4%' },
      { name: 'Signal', val: 'ACHAT FORT' },
    ],
  },
  {
    key: 'SENTIMENT',
    label: 'Veille Narrative',
    badge: 'NLP & SCRAPING',
    color: '#10b981',
    icon: <Zap size={22}/>,
    desc: 'Scrape et analyse en temps réel des dizaines de flux RSS d\'actualités financières marocaines. Évalue le sentiment agrégé (positif/négatif/neutre) et détecte les signaux faibles.',
    metrics: [
      { name: 'Sources RSS', val: '40+' },
      { name: 'Sentiment Net', val: 'POSITIF' },
      { name: 'Score NLP', val: '0.78' },
    ],
  },
  {
    key: 'TECHNICAL',
    label: 'Trading Quant',
    badge: 'INDICATEURS',
    color: '#3b82f6',
    icon: <Activity size={22}/>,
    desc: 'Calcule instantanément une batterie d\'indicateurs : RSI, MACD, moyennes mobiles (20/50/200j), retracements de Fibonacci, niveaux de support/résistance et signaux de croisement.',
    metrics: [
      { name: 'RSI (14j)', val: '58.3' },
      { name: 'MACD', val: 'HAUSSIER' },
      { name: 'Tendance MM', val: 'BULL' },
    ],
  },
  {
    key: 'FUNDAMENTAL',
    label: 'Analyse Fonda',
    badge: 'VALORISATION',
    color: '#f59e0b',
    icon: <Landmark size={22}/>,
    desc: 'Dissèque les états financiers (bilan, compte de résultat), calcule le PER, les ratios d\'endettement, la marge nette, le rendement des dividendes et évalue la valorisation intrinsèque.',
    metrics: [
      { name: 'PER', val: '11.2x' },
      { name: 'Rendement Div.', val: '5.4%' },
      { name: 'Endettement', val: 'SAIN' },
    ],
  },
];

/* ─────────────────────────────────────────
   ANIMATED TICKER TAPE
───────────────────────────────────────── */
function TickerTape() {
  const items = [...TICKERS, ...TICKERS];
  return (
    <div className="ticker-tape-container">
      <div className="ticker-tape-inner">
        <div className="ticker-tape-track">
          {items.map((t, i) => (
            <span key={i} className="ticker-item">
              <span className="ticker-sym mono">{t.symbol}</span>
              <span className={`ticker-chg mono ${t.up ? 'up' : 'down'}`}>
                {t.up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
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
   ANIMATED COUNTER
───────────────────────────────────────── */
function AnimatedStat({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`stat-card ${visible ? 'visible' : ''}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label mono">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TERMINAL MOCKUP (animated)
───────────────────────────────────────── */
function TerminalMockup() {
  const lines = [
    { delay: 0, text: '> AETHERIS ENGINE v2.0 — INITIALISATION...', color: '#64748b' },
    { delay: 300, text: '> CONNEXION MASI CASABLANCA [OK]', color: '#10b981' },
    { delay: 600, text: '> CHARGEMENT AGENT VEILLE NARRATIVE [OK]', color: '#10b981' },
    { delay: 900, text: '> CHARGEMENT AGENT TRADING QUANT [OK]', color: '#10b981' },
    { delay: 1200, text: '> CHARGEMENT AGENT ANALYSE FONDA [OK]', color: '#10b981' },
    { delay: 1500, text: '> AGENT STRATÉGIE ALPHA OPÉRATIONNEL ●', color: '#a855f7' },
    { delay: 1800, text: '> ANALYSE EN COURS : ATW (Attijariwafa)', color: '#f59e0b' },
    { delay: 2100, text: '  ├─ RSI(14): 58.3 | MACD: HAUSSIER', color: '#94a3b8' },
    { delay: 2400, text: '  ├─ SENTIMENT NLP: +0.78 POSITIF', color: '#94a3b8' },
    { delay: 2700, text: '  ├─ PER: 11.2x | DIV YIELD: 5.4%', color: '#94a3b8' },
    { delay: 3000, text: '  └─ SCORE CONFIANCE: 94% ██████████ ACHAT', color: '#10b981' },
    { delay: 3300, text: '> RAPPORT GÉNÉRÉ EN 4.2s ✓', color: '#10b981' },
  ];
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    lines.forEach((_, i) => {
      setTimeout(() => setVisibleCount(n => Math.max(n, i + 1)), lines[i].delay + 500);
    });
  }, []);

  return (
    <div className="terminal-mockup">
      <div className="terminal-header">
        <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
        <span className="terminal-title mono">AETHERIS CONSOLE — TERMINAL ALPHA</span>
      </div>
      <div className="terminal-body">
        {lines.slice(0, visibleCount).map((l, i) => (
          <div key={i} className="terminal-line" style={{ color: l.color }}>
            <span className="mono">{l.text}</span>
            {i === visibleCount - 1 && <span className="cursor-blink" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function EnterpriseLandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAgent, setActiveAgent] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => setIsAuthenticated(!!user))
      .catch(() => setIsAuthenticated(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthenticated(!!s?.user));
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => { subscription.unsubscribe(); window.removeEventListener('scroll', onScroll); };
  }, []);

  const gotoConsole = useCallback((sym?: string) => {
    router.push(sym ? `/console?q=${encodeURIComponent(sym)}` : '/console');
  }, [router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    gotoConsole(searchQuery.trim().toUpperCase() || undefined);
  };

  return (
    <div className="lp-root">
      {/* ══════════════════════ NOISE OVERLAY ══════════════════════ */}
      <div className="noise-overlay" aria-hidden />

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <nav className={`lp-nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="nav-inner">
          {/* Brand */}
          <Link href="/" className="nav-brand" aria-label="Aetheris Home">
            <div className="brand-orb">
              <Zap size={16} fill="#000" strokeWidth={0} />
            </div>
            <div>
              <div className="brand-name">AETHERIS</div>
              <div className="brand-sub mono">ALPHA TERMINAL</div>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="nav-links">
            <a href="#services" className="nl">Services</a>
            <a href="#agents"   className="nl">Agents IA</a>
            <Link href="/marche-live" className="nl">Marché Live</Link>
            <Link href="/purification" className="nl">Conformité AAOIFI</Link>
          </div>

          {/* CTA */}
          <div className="nav-ctas">
            {isAuthenticated === null && <div className="nav-skel" />}
            {isAuthenticated === false && <>
              <Link href="/login"><button className="btn-ghost">Se connecter</button></Link>
              <Link href="/login?mode=signup"><button className="btn-cta-sm"><UserPlus size={13}/>S'inscrire</button></Link>
            </>}
            {isAuthenticated === true && (
              <Link href="/console"><button className="btn-cta-sm"><Cpu size={13}/>Ouvrir la Console</button></Link>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════════════════ TICKER TAPE ══════════════════════ */}
      <div className="ticker-wrapper">
        <TickerTape />
      </div>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="lp-hero">
        {/* Background blobs */}
        <div className="blob blob-1" aria-hidden />
        <div className="blob blob-2" aria-hidden />
        <div className="blob blob-3" aria-hidden />
        {/* Grid */}
        <div className="hero-grid-bg" aria-hidden />

        <div className="hero-content">
          {/* Top pill */}
          <div className="hero-pill animate-in" style={{ animationDelay: '0ms' }}>
            <span className="live-dot pulsing" />
            <span className="mono">SYSTÈME OPÉRATIONNEL • MASI CASABLANCA • BVC LIVE</span>
            <ChevronRight size={12} />
          </div>

          {/* Headline */}
          <h1 className="hero-h1 animate-in" style={{ animationDelay: '80ms' }}>
            L'Intelligence Financière<br/>
            <span className="grad-text">de Nouvelle Génération</span><br/>
            pour la Bourse de Casablanca
          </h1>

          <p className="hero-sub animate-in" style={{ animationDelay: '160ms' }}>
            4 agents IA orchestrés — Veille Narrative, Trading Quant, Analyse Fondamentale & Stratégie Alpha — 
            pour des décisions d'investissement MASI de grade institutionnel.
          </p>

          {/* CTAs */}
          <div className="hero-ctas animate-in" style={{ animationDelay: '240ms' }}>
            {isAuthenticated ? (
              <button className="btn-primary-lg" onClick={() => gotoConsole()}>
                <Cpu size={17} />Ouvrir la Console Alpha<ArrowRight size={16}/>
              </button>
            ) : (
              <>
                <Link href="/login?mode=signup">
                  <button className="btn-primary-lg">
                    <Sparkles size={17} />Démarrer gratuitement<ArrowRight size={16}/>
                  </button>
                </Link>
                <button className="btn-ghost-lg" onClick={() => gotoConsole()}>
                  Explorer le Terminal
                </button>
              </>
            )}
          </div>

          {/* Social proof pills */}
          <div className="social-proof animate-in" style={{ animationDelay: '320ms' }}>
            <div className="sp-stars">
              {[...Array(5)].map((_,i) => <Star key={i} size={12} fill="#f59e0b" color="#f59e0b"/>)}
            </div>
            <span className="sp-text">Plateforme de référence pour les investisseurs MASI</span>
            <span className="sp-divider">•</span>
            <span className="sp-badge mono">AAOIFI COMPLIANT</span>
          </div>
        </div>

        {/* Terminal Mockup */}
        <div className="hero-terminal animate-in" style={{ animationDelay: '200ms' }}>
          <TerminalMockup />
          {/* Glow under terminal */}
          <div className="terminal-glow" aria-hidden />
        </div>

        {/* Search bar */}
        <div className="hero-search-section animate-in" style={{ animationDelay: '400ms' }}>
          <form className="search-bar" onSubmit={handleSearch}>
            <div className="sb-left">
              <Search size={17} className="sb-icon" />
              <input
                className="sb-input mono"
                placeholder="ANALYSER UN ACTIF DU MASI — EX: ATW • IAM • BCP • TGCC • MANAGEM…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="sb-btn">
              <span>Lancer l'Analyse IA</span>
              <Sparkles size={14}/>
            </button>
          </form>

          <div className="quick-chips">
            <span className="qc-label mono">VALEURS PHARES :</span>
            {TICKERS.slice(0, 7).map(t => (
              <button key={t.symbol} className="qc-chip" onClick={() => gotoConsole(t.symbol)}>
                <span className="qc-sym mono">{t.symbol}</span>
                <span className={`qc-chg mono ${t.up ? 'up' : 'down'}`}>{t.change}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ STATS BAND ══════════════════════ */}
      <section className="stats-band">
        <div className="stats-inner">
          {STATS.map((s, i) => (
            <AnimatedStat key={i} value={s.value} label={s.label} icon={s.icon} />
          ))}
        </div>
      </section>

      {/* ══════════════════════ SERVICES ══════════════════════ */}
      <section id="services" className="lp-section">
        <div className="lp-container">
          <div className="section-head">
            <div className="section-eyebrow mono">ÉCOSYSTÈME AETHERIS</div>
            <h2 className="section-h2">Une Suite Logicielle Complète<br/><span className="grad-text">pour Chaque Dimension du Marché</span></h2>
            <p className="section-p">Du flux de données brutes à la thèse d'investissement finale, chaque outil est pensé pour l'investisseur exigeant.</p>
          </div>

          <div className="services-grid">
            {SERVICES.map((s, i) => (
              <div key={s.id} className="service-card" style={{ '--card-accent': s.color } as React.CSSProperties}>
                <div className="sc-top">
                  <div className="sc-icon-box" style={{ background: s.bg, color: s.color }}>
                    {s.icon}
                  </div>
                  <span className="sc-badge mono" style={{ color: s.color }}>{s.badge}</span>
                </div>
                <h3 className="sc-title">{s.title}</h3>
                <p className="sc-desc">{s.desc}</p>
                <ul className="sc-features">
                  {s.features.map((f, j) => (
                    <li key={j} className="sc-feature-item">
                      <CheckCircle2 size={13} style={{ color: s.color }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={s.link} className="sc-link">
                  <span>Accéder au service</span>
                  <ArrowRight size={14}/>
                </Link>
                {/* Hover accent line */}
                <div className="sc-accent-line" style={{ background: s.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ AI AGENTS ══════════════════════ */}
      <section id="agents" className="lp-section lp-dark-section">
        <div className="lp-container">
          <div className="section-head">
            <div className="section-eyebrow mono">MOTEUR MULTI-AGENTS</div>
            <h2 className="section-h2">4 Cerveaux IA Spécialisés<br/><span className="grad-text">Travaillant en Orchestre</span></h2>
            <p className="section-p">Chaque agent maîtrise un domaine précis du marché financier. Ensemble, ils produisent des analyses impossibles à répliquer manuellement.</p>
          </div>

          <div className="agents-showcase">
            {/* Selector tabs */}
            <div className="agent-tabs">
              {AGENTS.map((a, i) => (
                <button
                  key={a.key}
                  className={`agent-tab ${activeAgent === i ? 'at-active' : ''}`}
                  style={{ '--tab-color': a.color } as React.CSSProperties}
                  onClick={() => setActiveAgent(i)}
                >
                  <span className="at-icon" style={{ color: activeAgent === i ? a.color : '#64748b' }}>
                    {a.icon}
                  </span>
                  <span className="at-label">{a.label}</span>
                  <span className="at-badge mono" style={{ color: a.color }}>{a.badge}</span>
                </button>
              ))}
            </div>

            {/* Detail panel */}
            <div className="agent-detail" key={activeAgent}>
              {(() => {
                const ag = AGENTS[activeAgent];
                return (
                  <>
                    <div className="ad-left">
                      <div className="ad-badge-row">
                        <div className="ad-icon" style={{ background: ag.color + '18', color: ag.color, border: `1px solid ${ag.color}33` }}>
                          {ag.icon}
                        </div>
                        <span className="ad-kbadge mono" style={{ color: ag.color }}>{ag.badge}</span>
                      </div>
                      <h3 className="ad-title">Agent {ag.label}</h3>
                      <p className="ad-desc">{ag.desc}</p>
                      <button className="ad-demo-btn" onClick={() => gotoConsole('ATW')} style={{ borderColor: ag.color + '55', color: ag.color }}>
                        <span>Démo live — Analyser ATW</span>
                        <ArrowRight size={14}/>
                      </button>
                    </div>
                    <div className="ad-right">
                      <div className="ad-metrics-card" style={{ borderColor: ag.color + '30' }}>
                        <div className="ad-mc-header mono" style={{ color: ag.color }}>
                          <span className="live-dot" style={{ boxShadow: `0 0 6px ${ag.color}` }} />
                          RÉSULTATS EN DIRECT — ATW
                        </div>
                        {ag.metrics.map((m, mi) => (
                          <div key={mi} className="ad-metric-row">
                            <span className="ad-mname">{m.name}</span>
                            <span className="ad-mval mono" style={{ color: ag.color }}>{m.val}</span>
                          </div>
                        ))}
                        <div className="ad-bar-track">
                          <div className="ad-bar-fill" style={{ background: `linear-gradient(90deg, ${ag.color}80, ${ag.color})`, width: '72%' }} />
                        </div>
                        <span className="ad-bar-label mono">SIGNAL COMPOSITE 72%</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ AAOIFI SECTION ══════════════════════ */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="aaoifi-block">
            <div className="aaoifi-left">
              <div className="section-eyebrow mono">FINANCE ÉTHIQUE & ISLAMIQUE</div>
              <h2 className="section-h2" style={{ textAlign: 'left', maxWidth: 560 }}>
                Investissez en conformité avec<br/>
                <span className="grad-text">les Normes AAOIFI Internationales</span>
              </h2>
              <p className="section-p" style={{ textAlign: 'left', marginLeft: 0 }}>
                Notre module de Purification automatise le screening Shariah-Compliant et le calcul d'étanchéité financière des dividendes non-conformes pour l'ensemble des valeurs du MASI.
              </p>

              <div className="aaoifi-checks">
                {[
                  'Screening Shariah automatique sur toutes les valeurs MASI',
                  'Calcul d\'étanchéité des dividendes non-conformes',
                  'Conformité aux standards AAOIFI 2024 reconnus internationalement',
                  'Rapports détaillés et historisés téléchargeables',
                ].map((item, i) => (
                  <div key={i} className="aaoifi-check">
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Link href="/purification">
                <button className="btn-primary-lg" style={{ marginTop: '2rem' }}>
                  <Scale size={16} /> Ouvrir le Calculateur AAOIFI
                </button>
              </Link>
            </div>

            <div className="aaoifi-right">
              {/* AAOIFI Card */}
              <div className="aaoifi-card">
                <div className="ac-header">
                  <div className="ac-icon"><Scale size={20} color="#10b981"/></div>
                  <div>
                    <div className="ac-title mono">AAOIFI SCREENING REPORT</div>
                    <div className="ac-sub mono">Attijariwafa Bank — ATW</div>
                  </div>
                  <span className="ac-pass mono">CONFORME</span>
                </div>

                <div className="ac-rows">
                  {[
                    { name: "Critères d'Activité Principale", val: 'CONFORME ✓', color: '#10b981' },
                    { name: 'Ratio d\'Endettement', val: '< 30% PASS ✓', color: '#10b981' },
                    { name: 'Revenus Non-Halal', val: '< 5% PASS ✓', color: '#10b981' },
                    { name: 'Dividende à Purifier', val: '0.42%', color: '#f59e0b' },
                    { name: 'Montant Purification (100 MAD)', val: '0.42 MAD', color: '#f59e0b' },
                  ].map((r, i) => (
                    <div key={i} className="ac-row">
                      <span className="ac-rname">{r.name}</span>
                      <span className="ac-rval mono" style={{ color: r.color }}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div className="ac-footer mono">
                  Conforme selon AAOIFI Standard FAS-2 • Mis à jour 2026
                </div>
              </div>

              {/* Floating badge */}
              <div className="aaoifi-float-badge">
                <Lock size={14} color="#10b981"/>
                <span className="mono">FINANCE ÉTHIQUE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ CTA BAND ══════════════════════ */}
      <section className="cta-band">
        <div className="cta-blob" aria-hidden />
        <div className="cta-content">
          <div className="section-eyebrow mono" style={{ color: '#10b981' }}>COMMENCEZ DÈS MAINTENANT</div>
          <h2 className="cta-h2">Prenez une longueur d'avance<br/>sur le marché marocain</h2>
          <p className="cta-p">Accédez immédiatement à la suite complète Aetheris — Terminal IA, Flux MASI Live, Portefeuille & Purification AAOIFI.</p>
          <div className="cta-actions">
            {isAuthenticated ? (
              <button className="btn-primary-lg" onClick={() => gotoConsole()}>
                <Cpu size={17}/>Accéder à ma Console Alpha<ArrowRight size={16}/>
              </button>
            ) : (
              <>
                <Link href="/login?mode=signup">
                  <button className="btn-primary-lg"><Sparkles size={17}/>Créer un compte gratuit<ArrowRight size={16}/></button>
                </Link>
                <button className="btn-ghost-lg" onClick={() => gotoConsole()}>Voir la démo</button>
              </>
            )}
          </div>
          <div className="cta-trust">
            <span className="mono">✓ Sans carte bancaire</span>
            <span className="mono">✓ Accès immédiat</span>
            <span className="mono">✓ AAOIFI Compliant</span>
            <span className="mono">✓ Données MASI en direct</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="lp-footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="fg-col fg-brand-col">
              <div className="fg-brand">
                <div className="brand-orb sm"><Zap size={14} fill="#000" strokeWidth={0}/></div>
                <span className="brand-name">AETHERIS</span>
              </div>
              <p className="fg-desc">Plateforme d'intelligence financière de nouvelle génération dédiée à la Bourse de Casablanca (MASI).</p>
              <div className="fg-status">
                <span className="live-dot pulsing" style={{ width: 6, height: 6 }}/>
                <span className="mono">SYSTÈME OPÉRATIONNEL OS 2.0</span>
              </div>
            </div>

            <div className="fg-col">
              <div className="fg-col-title mono">SERVICES</div>
              <Link href="/console" className="fg-link">Console Alpha IA</Link>
              <Link href="/marche-live" className="fg-link">Flux de Marché Live</Link>
              <Link href="/portfolio" className="fg-link">Portefeuille Intelligent</Link>
              <Link href="/purification" className="fg-link">Purification AAOIFI</Link>
            </div>

            <div className="fg-col">
              <div className="fg-col-title mono">COMPTE</div>
              <Link href="/login" className="fg-link">Se connecter</Link>
              <Link href="/login?mode=signup" className="fg-link">Créer un compte</Link>
              <Link href="/profile" className="fg-link">Gestion de profil</Link>
            </div>

            <div className="fg-col">
              <div className="fg-col-title mono">LÉGAL & ÉTHIQUE</div>
              <span className="fg-link-muted">Normes AAOIFI</span>
              <span className="fg-link-muted">Confidentialité & Données</span>
              <span className="fg-link-muted">Mentions Légales</span>
              <span className="fg-link-muted">CGU</span>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="mono">© 2026 AETHERIS TECHNOLOGIES — BOURSE DE CASABLANCA</span>
            <span className="mono fg-emerald">INSTITUTIONAL GRADE TERMINAL</span>
          </div>
        </div>
      </footer>

      {/* ══════════════════════ GLOBAL STYLES ══════════════════════ */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap');
      `}</style>

      <style jsx>{`
        /* ── RESET & ROOT ── */
        .lp-root {
          min-height: 100vh;
          width: 100%;
          background: #05070d;
          color: #e2e8f0;
          font-family: 'Inter', -apple-system, sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        /* ── NOISE OVERLAY ── */
        .noise-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          background-size: 200px;
        }

        /* ── TICKER TAPE ── */
        .ticker-wrapper {
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          z-index: 99;
          background: rgba(5,7,13,0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .ticker-tape-container {
          overflow: hidden;
          position: relative;
          height: 32px;
          display: flex;
          align-items: center;
        }
        .ticker-tape-container::before,
        .ticker-tape-container::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 80px;
          z-index: 2;
          pointer-events: none;
        }
        .ticker-tape-container::before { left: 0; background: linear-gradient(90deg, rgba(5,7,13,1) 0%, transparent 100%); }
        .ticker-tape-container::after  { right: 0; background: linear-gradient(-90deg, rgba(5,7,13,1) 0%, transparent 100%); }
        .ticker-tape-inner { overflow: hidden; width: 100%; }
        .ticker-tape-track {
          display: flex;
          gap: 0;
          white-space: nowrap;
          animation: ticker-scroll 40s linear infinite;
        }
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 1.5rem;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
        }
        .ticker-sym { color: #94a3b8; font-weight: 700; }
        .ticker-chg { display: inline-flex; align-items: center; gap: 3px; font-weight: 600; }
        .ticker-chg.up   { color: #10b981; }
        .ticker-chg.down { color: #ef4444; }
        .ticker-sep { color: #1e293b; }

        /* ── NAVBAR ── */
        .lp-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 64px;
          z-index: 200;
          display: flex;
          align-items: center;
          transition: background 0.3s, box-shadow 0.3s;
        }
        .lp-nav.nav-scrolled {
          background: rgba(5,7,13,0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.06);
        }
        .nav-inner {
          width: 100%; max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .nav-brand {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
        }
        .brand-orb {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(16,185,129,0.35);
          flex-shrink: 0;
        }
        .brand-orb.sm { width: 28px; height: 28px; border-radius: 7px; }
        .brand-name {
          font-family: 'Outfit', sans-serif;
          font-weight: 900; font-size: 1.1rem;
          color: #fff; letter-spacing: -0.03em;
          line-height: 1;
        }
        .brand-sub {
          font-size: 7.5px; color: #10b981;
          font-weight: 800; letter-spacing: 0.1rem;
          margin-top: 2px;
          font-family: 'JetBrains Mono', monospace;
        }
        .nav-links { display: flex; align-items: center; gap: 2rem; }
        .nl {
          color: #64748b; font-size: 13px;
          font-weight: 500; text-decoration: none;
          transition: color 0.2s;
          cursor: pointer;
        }
        .nl:hover { color: #e2e8f0; }
        .nav-ctas { display: flex; align-items: center; gap: 0.6rem; }
        .nav-skel { width: 180px; height: 34px; }

        /* ── BUTTONS ── */
        .btn-ghost {
          padding: 0.5rem 1rem; border-radius: 8px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: #94a3b8; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.06); color: #fff; }

        .btn-cta-sm {
          display: flex; align-items: center; gap: 6px;
          padding: 0.5rem 1rem; border-radius: 8px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none; color: #000;
          font-size: 12.5px; font-weight: 800;
          cursor: pointer; transition: all 0.22s;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 0 20px rgba(16,185,129,0.25);
        }
        .btn-cta-sm:hover { transform: translateY(-1px); box-shadow: 0 0 28px rgba(16,185,129,0.4); }

        .btn-primary-lg {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 0.95rem 2rem; border-radius: 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none; color: #000;
          font-size: 14px; font-weight: 800;
          cursor: pointer; transition: all 0.25s;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 4px 30px rgba(16,185,129,0.35);
          letter-spacing: -0.01em;
        }
        .btn-primary-lg:hover { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(16,185,129,0.5); }

        .btn-ghost-lg {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 0.95rem 2rem; border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          color: #e2e8f0; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.25s;
          font-family: 'Inter', sans-serif;
        }
        .btn-ghost-lg:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }

        /* ── HERO ── */
        .lp-hero {
          position: relative;
          padding: 140px 2rem 3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          overflow: hidden;
        }

        .blob {
          position: absolute; border-radius: 50%;
          filter: blur(80px); pointer-events: none;
          animation: float-slow 8s ease-in-out infinite alternate;
        }
        .blob-1 {
          width: 700px; height: 500px;
          background: radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%);
          top: 0; left: 50%; transform: translateX(-60%);
          animation-duration: 9s;
        }
        .blob-2 {
          width: 500px; height: 400px;
          background: radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%);
          top: 20%; right: 0;
          animation-duration: 11s; animation-delay: -3s;
        }
        .blob-3 {
          width: 400px; height: 300px;
          background: radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%);
          bottom: 20%; left: 0;
          animation-duration: 13s; animation-delay: -6s;
        }
        @keyframes float-slow {
          0%   { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-30px) scale(1.05); }
        }

        .hero-grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 100%);
          pointer-events: none;
        }

        .hero-content {
          position: relative; z-index: 10;
          max-width: 1000px; width: 100%;
          text-align: center;
          display: flex; flex-direction: column; align-items: center;
        }

        .hero-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 100px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.22);
          color: #10b981; font-size: 10px; font-weight: 800;
          letter-spacing: 0.04rem;
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 1.75rem;
        }

        .live-dot {
          display: inline-block;
          width: 7px; height: 7px; border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px rgba(16,185,129,0.7);
        }
        .live-dot.pulsing {
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 4px rgba(16,185,129,0.6); }
          50%       { box-shadow: 0 0 12px rgba(16,185,129,1); }
        }

        .hero-h1 {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(2.6rem, 5vw, 4.2rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.08;
          margin-bottom: 1.4rem;
          color: #f1f5f9;
        }

        .grad-text {
          background: linear-gradient(135deg, #10b981 0%, #34d399 40%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-sub {
          font-size: 1.1rem;
          color: #64748b; line-height: 1.7;
          max-width: 700px; margin-bottom: 2.25rem;
        }

        .hero-ctas {
          display: flex; align-items: center;
          gap: 1rem; margin-bottom: 1.5rem;
          flex-wrap: wrap; justify-content: center;
        }

        .social-proof {
          display: flex; align-items: center;
          gap: 10px; flex-wrap: wrap; justify-content: center;
          margin-bottom: 2.5rem;
        }
        .sp-stars { display: flex; gap: 2px; }
        .sp-text { font-size: 12px; color: #64748b; }
        .sp-divider { color: #334155; }
        .sp-badge {
          font-size: 9px; font-weight: 900;
          color: #10b981; letter-spacing: 0.06rem;
          padding: 2px 8px; border-radius: 4px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
        }

        /* ── TERMINAL MOCKUP ── */
        .hero-terminal {
          position: relative; z-index: 10;
          width: 100%; max-width: 820px;
          margin-bottom: 2.5rem;
        }
        .terminal-mockup {
          border-radius: 14px;
          overflow: hidden;
          background: rgba(8,12,20,0.95);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
        }
        .terminal-header {
          display: flex; align-items: center; gap: 6px;
          padding: 12px 16px;
          background: rgba(13,17,23,0.9);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .dot {
          width: 11px; height: 11px; border-radius: 50%;
        }
        .dot.red    { background: #ff5f57; }
        .dot.yellow { background: #febc2e; }
        .dot.green  { background: #28c840; }
        .terminal-title {
          margin-left: 8px; font-size: 10px;
          color: #475569; font-weight: 600; letter-spacing: 0.06rem;
        }
        .terminal-body {
          padding: 1.25rem 1.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
          min-height: 220px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .terminal-line { line-height: 1.6; animation: fadeInLine 0.2s ease forwards; }
        @keyframes fadeInLine { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: none; } }
        .cursor-blink {
          display: inline-block;
          width: 8px; height: 14px;
          background: #10b981;
          margin-left: 2px; vertical-align: middle;
          animation: blink 1s step-end infinite;
          border-radius: 2px;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .terminal-glow {
          position: absolute;
          bottom: -40px; left: 50%; transform: translateX(-50%);
          width: 600px; height: 60px;
          background: rgba(16,185,129,0.12);
          filter: blur(30px);
          pointer-events: none;
        }

        /* ── SEARCH BAR ── */
        .hero-search-section {
          position: relative; z-index: 10;
          width: 100%; max-width: 820px;
        }
        .search-bar {
          display: flex; align-items: center;
          background: rgba(10,14,23,0.9);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 30px rgba(0,0,0,0.5);
        }
        .search-bar:focus-within {
          border-color: rgba(16,185,129,0.4);
          box-shadow: 0 0 0 3px rgba(16,185,129,0.08), 0 4px 30px rgba(0,0,0,0.5);
        }
        .sb-left {
          flex: 1; display: flex; align-items: center;
          gap: 10px; padding: 0 1.25rem;
        }
        .sb-icon { color: #475569; flex-shrink: 0; }
        .sb-input {
          flex: 1; background: none; border: none;
          color: #e2e8f0; font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          outline: none; padding: 1.1rem 0;
          letter-spacing: 0.02em;
        }
        .sb-input::placeholder { color: #334155; }
        .sb-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 0.9rem 1.5rem; margin: 6px;
          border-radius: 8px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none; color: #000;
          font-size: 13px; font-weight: 800;
          cursor: pointer; transition: all 0.2s;
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .sb-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(16,185,129,0.4); }

        .quick-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .qc-label { font-size: 9px; color: #334155; font-weight: 900; letter-spacing: 0.06rem; flex-shrink: 0; }
        .qc-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 6px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          cursor: pointer; transition: all 0.2s;
        }
        .qc-chip:hover {
          background: rgba(16,185,129,0.08);
          border-color: rgba(16,185,129,0.25);
          transform: translateY(-1px);
        }
        .qc-sym { font-size: 10px; color: #10b981; font-weight: 800; }
        .qc-chg { font-size: 9.5px; font-weight: 600; }
        .qc-chg.up { color: #10b981; } .qc-chg.down { color: #ef4444; }

        /* ── STATS BAND ── */
        .stats-band {
          padding: 3rem 2rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(8,12,20,0.5);
        }
        .stats-inner {
          max-width: 1000px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }
        .stat-card {
          text-align: center;
          opacity: 0; transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .stat-card.visible { opacity: 1; transform: translateY(0); }
        .stat-icon { color: #10b981; margin-bottom: 0.75rem; display: flex; justify-content: center; }
        .stat-value {
          font-family: 'Outfit', sans-serif;
          font-size: 2rem; font-weight: 900;
          color: #f1f5f9; letter-spacing: -0.04em;
          line-height: 1;
          margin-bottom: 0.4rem;
        }
        .stat-label { font-size: 11px; color: #475569; font-weight: 700; letter-spacing: 0.04rem; }

        /* ── SECTIONS ── */
        .lp-section { padding: 6rem 2rem; }
        .lp-dark-section {
          background: rgba(5,7,13,0.7);
          border-top: 1px solid rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .lp-container { max-width: 1300px; margin: 0 auto; }
        .section-head { text-align: center; margin-bottom: 4rem; }
        .section-eyebrow {
          display: inline-block;
          font-size: 9.5px; font-weight: 900;
          color: #10b981; letter-spacing: 0.12rem;
          margin-bottom: 1rem;
          font-family: 'JetBrains Mono', monospace;
        }
        .section-h2 {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(1.8rem, 3.5vw, 2.6rem);
          font-weight: 900; color: #f1f5f9;
          letter-spacing: -0.04em; line-height: 1.15;
          margin-bottom: 1rem;
        }
        .section-p {
          font-size: 1rem; color: #475569;
          max-width: 580px; margin: 0 auto;
          line-height: 1.65;
        }

        /* ── SERVICES GRID ── */
        .services-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }
        .service-card {
          position: relative; overflow: hidden;
          background: rgba(10,14,23,0.8);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 2rem 1.75rem;
          display: flex; flex-direction: column;
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
          cursor: default;
        }
        .service-card:hover {
          border-color: var(--card-accent, #10b981);
          transform: translateY(-6px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(16,185,129,0.05);
        }
        .sc-accent-line {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 2px;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .service-card:hover .sc-accent-line { opacity: 1; }

        .sc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
        .sc-icon-box {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .sc-badge {
          font-size: 8px; font-weight: 900; letter-spacing: 0.07rem;
          padding: 3px 8px; border-radius: 5px;
          background: rgba(255,255,255,0.04);
          border: 1px solid currentColor;
          opacity: 0.8;
        }
        .sc-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.15rem; font-weight: 800;
          color: #f1f5f9; margin-bottom: 0.7rem;
          line-height: 1.2;
        }
        .sc-desc { font-size: 0.85rem; color: #475569; line-height: 1.6; margin-bottom: 1.25rem; flex: 1; }
        .sc-features { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 6px; }
        .sc-feature-item { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #94a3b8; }
        .sc-link {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          color: #94a3b8; font-size: 12px; font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }
        .sc-link:hover { background: rgba(255,255,255,0.06); color: #fff; }

        /* ── AGENTS SHOWCASE ── */
        .agents-showcase { display: flex; flex-direction: column; gap: 1.5rem; }
        .agent-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .agent-tab {
          display: flex; flex-direction: column; gap: 5px;
          padding: 1.25rem; border-radius: 12px;
          background: rgba(10,14,23,0.7);
          border: 1px solid rgba(255,255,255,0.07);
          cursor: pointer; transition: all 0.25s;
          text-align: left;
        }
        .agent-tab.at-active {
          background: rgba(255,255,255,0.04);
          border-color: var(--tab-color, #10b981);
          box-shadow: 0 0 20px rgba(16,185,129,0.07);
        }
        .agent-tab:hover:not(.at-active) { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.12); }
        .at-icon { margin-bottom: 4px; }
        .at-label { font-size: 14px; font-weight: 700; color: #e2e8f0; }
        .at-badge { font-size: 8px; font-weight: 900; letter-spacing: 0.06rem; margin-top: 2px; font-family: 'JetBrains Mono', monospace; }

        .agent-detail {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 2rem;
          background: rgba(10,14,23,0.7);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 2.5rem;
          animation: detail-in 0.3s ease forwards;
        }
        @keyframes detail-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

        .ad-badge-row { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
        .ad-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
        }
        .ad-kbadge { font-size: 9px; font-weight: 900; letter-spacing: 0.07rem; font-family: 'JetBrains Mono', monospace; }
        .ad-title { font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 900; color: #f1f5f9; margin-bottom: 1rem; letter-spacing: -0.03em; }
        .ad-desc { font-size: 0.95rem; color: #64748b; line-height: 1.65; margin-bottom: 1.75rem; }
        .ad-demo-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 8px;
          background: transparent; cursor: pointer;
          border: 1px solid; font-size: 13px; font-weight: 700;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
        }
        .ad-demo-btn:hover { background: rgba(255,255,255,0.04); }

        .ad-metrics-card {
          border: 1px solid; border-radius: 14px;
          padding: 1.75rem;
          background: rgba(5,7,13,0.7);
          display: flex; flex-direction: column; gap: 1rem;
        }
        .ad-mc-header {
          display: flex; align-items: center; gap: 8px;
          font-size: 9px; font-weight: 900; letter-spacing: 0.08rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .ad-metric-row { display: flex; align-items: center; justify-content: space-between; }
        .ad-mname { font-size: 13px; color: #64748b; }
        .ad-mval { font-size: 14px; font-weight: 800; }
        .ad-bar-track {
          height: 4px; border-radius: 99px;
          background: rgba(255,255,255,0.05);
          overflow: hidden; margin-top: 0.25rem;
        }
        .ad-bar-fill { height: 100%; border-radius: 99px; }
        .ad-bar-label { font-size: 9px; color: #334155; font-weight: 800; letter-spacing: 0.06rem; }

        /* ── AAOIFI SECTION ── */
        .aaoifi-block {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 4rem; align-items: center;
        }
        .aaoifi-checks { display: flex; flex-direction: column; gap: 12px; margin-top: 1.75rem; }
        .aaoifi-check { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #94a3b8; line-height: 1.5; }

        .aaoifi-right { position: relative; }
        .aaoifi-card {
          background: rgba(10,14,23,0.9);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 16px; padding: 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16,185,129,0.06);
        }
        .ac-header {
          display: flex; align-items: center; gap: 14px;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 1.25rem;
        }
        .ac-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.2);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ac-title { font-size: 10px; font-weight: 900; color: #e2e8f0; letter-spacing: 0.06rem; font-family: 'JetBrains Mono', monospace; }
        .ac-sub { font-size: 9px; color: #475569; font-weight: 700; margin-top: 2px; font-family: 'JetBrains Mono', monospace; }
        .ac-pass {
          margin-left: auto;
          background: rgba(16,185,129,0.12);
          border: 1px solid rgba(16,185,129,0.3);
          color: #10b981; font-size: 9px; font-weight: 900;
          padding: 3px 8px; border-radius: 4px; letter-spacing: 0.06rem;
        }
        .ac-rows { display: flex; flex-direction: column; gap: 12px; margin-bottom: 1.25rem; }
        .ac-row { display: flex; align-items: center; justify-content: space-between; }
        .ac-rname { font-size: 12.5px; color: #64748b; }
        .ac-rval { font-size: 11px; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
        .ac-footer { font-size: 9px; color: #334155; text-align: center; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.04); font-family: 'JetBrains Mono', monospace; }

        .aaoifi-float-badge {
          position: absolute; top: -18px; right: 24px;
          display: flex; align-items: center; gap: 6px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 9px; font-weight: 900; color: #10b981; letter-spacing: 0.06rem;
          font-family: 'JetBrains Mono', monospace;
          box-shadow: 0 4px 20px rgba(16,185,129,0.15);
        }

        /* ── CTA BAND ── */
        .cta-band {
          position: relative; overflow: hidden;
          padding: 7rem 2rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .cta-blob {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 800px; height: 400px;
          background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%);
          filter: blur(60px); pointer-events: none;
        }
        .cta-content { position: relative; z-index: 10; max-width: 700px; margin: 0 auto; }
        .cta-h2 {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 900; color: #f1f5f9;
          letter-spacing: -0.04em; line-height: 1.1;
          margin: 0.75rem 0 1.25rem;
        }
        .cta-p { font-size: 1rem; color: #475569; line-height: 1.6; margin-bottom: 2.5rem; }
        .cta-actions { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .cta-trust { display: flex; align-items: center; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
        .cta-trust span { font-size: 10px; color: #334155; font-weight: 700; letter-spacing: 0.03rem; }

        /* ── FOOTER ── */
        .lp-footer {
          padding: 4rem 2rem 2rem;
          background: rgba(3,5,10,0.9);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .footer-inner { max-width: 1300px; margin: 0 auto; }
        .footer-grid {
          display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr;
          gap: 3rem; margin-bottom: 3rem;
        }
        .fg-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; }
        .fg-desc { font-size: 0.85rem; color: #334155; line-height: 1.6; margin-bottom: 1.25rem; }
        .fg-status { display: flex; align-items: center; gap: 6px; font-size: 9px; color: #10b981; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
        .fg-col-title { font-size: 9px; font-weight: 900; color: #334155; letter-spacing: 0.1rem; margin-bottom: 1.25rem; font-family: 'JetBrains Mono', monospace; }
        .fg-col { display: flex; flex-direction: column; gap: 10px; }
        .fg-link { font-size: 13px; color: #475569; text-decoration: none; transition: color 0.2s; }
        .fg-link:hover { color: #e2e8f0; }
        .fg-link-muted { font-size: 13px; color: #1e293b; }
        .footer-bottom {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.04);
          font-size: 9px; font-weight: 800; letter-spacing: 0.05rem;
          color: #1e293b; font-family: 'JetBrains Mono', monospace;
        }
        .fg-emerald { color: #064e3b; }

        /* ── ANIMATIONS ── */
        .animate-in {
          opacity: 0; transform: translateY(18px);
          animation: anim-in 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        @keyframes anim-in {
          to { opacity: 1; transform: translateY(0); }
        }

        .mono { font-family: 'JetBrains Mono', monospace; }
        .up { color: #10b981; } .down { color: #ef4444; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1200px) {
          .services-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 900px) {
          .agent-tabs { grid-template-columns: repeat(2, 1fr); }
          .agent-detail { grid-template-columns: 1fr; }
          .aaoifi-block { grid-template-columns: 1fr; }
          .stats-inner { grid-template-columns: repeat(2, 1fr); }
          .nav-links { display: none; }
        }
        @media (max-width: 640px) {
          .hero-h1 { font-size: 2rem; }
          .services-grid { grid-template-columns: 1fr; }
          .agent-tabs { grid-template-columns: 1fr; }
          .stats-inner { grid-template-columns: 1fr 1fr; }
          .footer-grid { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; gap: 0.5rem; text-align: center; }
          .hero-ctas { flex-direction: column; width: 100%; }
          .btn-primary-lg, .btn-ghost-lg { width: 100%; justify-content: center; }
          .lp-section { padding: 4rem 1.25rem; }
          .lp-hero { padding: 130px 1.25rem 2rem; }
        }
      `}</style>
    </div>
  );
}
