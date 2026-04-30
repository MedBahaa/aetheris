'use client';

import { useState } from 'react';
import { 
  BrainCircuit, 
  Activity, 
  Landmark, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Zap,
  Globe,
  Cpu
} from 'lucide-react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function IntelligenceDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const agents = [
    {
      id: 'SENTIMENT',
      title: 'Veille Narrative AI',
      subtitle: 'ANALYSE DE SENTIMENT & NEWS FLOW',
      icon: <BrainCircuit size={32} />,
      color: 'var(--accent-emerald)',
      description: 'Analyse en temps réel des flux RSS, communiqués de presse et réseaux sociaux pour détecter les shifts psychologiques du marché.',
      capabilities: [
        'Scraping multi-sources BVC',
        'Analyse sémantique NLP',
        'Social Media Buzz Detection',
        'Calcul du score de sentiment global'
      ],
      href: '/?agent=SENTIMENT'
    },
    {
      id: 'TECHNICAL',
      title: 'Moteur Quantitatif',
      subtitle: 'INTELLIGENCE TECHNIQUE ALPHA',
      icon: <Activity size={32} />,
      color: 'var(--accent-blue)',
      description: 'Traitement massif des données de cours pour identifier les patterns institutionnels et les points de retournement critiques.',
      capabilities: [
        'Indicateurs Momentum & Vitesse',
        'Support & Résistance Auto-detect',
        'Analyse des volumes anormaux',
        'Calcul des retracements de Fibonacci'
      ],
      href: '/?agent=TECHNICAL'
    },
    {
      id: 'FUNDAMENTAL',
      title: 'Audit Fondamental',
      subtitle: 'RATIOS & VALORISATION INTRINSÈQUE',
      icon: <Landmark size={32} />,
      color: 'var(--accent-cyan)',
      description: 'Extraction automatisée des metrics financières pour évaluer la santé réelle des entreprises cotées.',
      capabilities: [
        'P/E Ratio & Dividend Yield',
        'Analyse de l\'endettement Net',
        'Comparaison sectorielle',
        'Historique des bénéfices'
      ],
      href: '/?agent=FUNDAMENTAL'
    },
    {
      id: 'STRATEGY',
      title: 'Synthèse Stratégique',
      subtitle: 'ORCHESTRATEUR DÉCISIONNEL',
      icon: <ShieldCheck size={32} />,
      color: 'var(--accent-cyan)',
      description: 'Le cœur cognitif d\'Aetheris. Fusionne tous les signaux pour générer des setups de trading institutionnels.',
      capabilities: [
        'Convergence multi-agents',
        'Génération de Stop-Loss & Target',
        'Calcul du Risk/Reward Ratio',
        'Tactique d\'entrée multi-horizon'
      ],
      href: '/?agent=STRATEGY',
      isPremium: true
    }
  ];

  return (
    <div className="app-container">
      <Sidebar 
        history={[]} 
        onSelect={() => {}} 
        activeAgent="STRATEGY" 
        onAgentChange={() => {}} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <Header onOpenSidebar={() => setIsSidebarOpen(true)} />

      <main className="main-content">
        <div className="max-container">
          {/* Header Identity */}
          <header className="terminal-header animate-fade-in">
            <div className="header-identity">
              <div className="identity-block">
                <BrainCircuit size={14} className="text-emerald" />
                <span className="mono-tiny text-emerald">HUB_INTELLIGENCE_ALPHA</span>
              </div>
              <div className="title-row">
                <h1 className="title-h1">Moteurs de Décision</h1>
                <div className="market-badge opacity-70">TERMINAL COGNITIF v2.0</div>
              </div>
            </div>
          </header>

          <div className="intro-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <p className="intro-text">
              L'écosystème Aetheris repose sur une architecture multi-agents coordonnée par une IA de raisonnement avancée. 
              Chaque moteur est spécialisé dans une couche spécifique de l'analyse financière pour garantir une vision 360° des opportunités.
            </p>
          </div>

          <div className="agent-grid">
            {agents.map((agent, idx) => (
              <div 
                key={agent.id} 
                className={`agent-card glass-heavy animate-fade-in ${agent.isPremium ? 'premium-glow' : ''}`}
                style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
              >
                <div className="agent-card-header">
                  <div className="agent-icon-box" style={{ color: agent.color }}>
                    {agent.icon}
                  </div>
                  {agent.isPremium && (
                    <div className="premium-badge">
                      <Sparkles size={10} />
                      <span>ALPHA EXECUTIVE</span>
                    </div>
                  )}
                </div>

                <div className="agent-card-body">
                  <div className="agent-labels">
                    <h3 className="agent-title">{agent.title}</h3>
                    <span className="agent-subtitle mono">{agent.subtitle}</span>
                  </div>
                  
                  <p className="agent-description">{agent.description}</p>
                  
                  <div className="capability-list">
                    {agent.capabilities.map((cap, i) => (
                      <div key={i} className="cap-item">
                        <div className="cap-dot" style={{ backgroundColor: agent.color }}></div>
                        <span className="cap-text">{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="agent-card-footer">
                  <Link href={agent.href} className="launch-btn glass">
                    <span>LANCER LE MOTEUR</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <style jsx>{`
        .max-container { width: 100%; max-width: 1300px; margin: 0 auto; padding: 2rem 1.5rem; }
        
        .terminal-header { 
          display: flex; 
          flex-direction: column; 
          gap: 1.5rem; 
          margin-bottom: 3rem; 
          border-bottom: 1px solid var(--border-glass); 
          padding-bottom: 3rem; 
          margin-top: 2.5rem; 
        }
        
        .header-identity { display: flex; flex-direction: column; gap: 1.5rem; }
        .identity-block { display: flex; align-items: center; gap: 1rem; }
        .mono-tiny { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 950; letter-spacing: 0.2rem; }
        
        .title-row { display: flex; align-items: center; gap: 2.5rem; flex-wrap: wrap; }
        .title-h1 { font-family: 'Outfit', sans-serif; font-size: 4.5rem; font-weight: 950; color: #fff; letter-spacing: -0.05em; line-height: 0.85; margin: 0; }
        .market-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 950; color: #475569; background: rgba(255,255,255,0.03); padding: 0.6rem 1.75rem; border-radius: 100px; border: 1px solid rgba(255,255,255,0.05); }

        .intro-section { max-width: 800px; margin-bottom: 4rem; }
        .intro-text { font-size: 1.1rem; color: #94a3b8; line-height: 1.6; }

        .agent-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
          margin-bottom: 6rem;
        }

        .agent-card {
          padding: 2.5rem;
          border-radius: 2rem;
          border: 1px solid var(--border-glass);
          display: flex;
          flex-direction: column;
          gap: 2rem;
          transition: all 0.4s var(--ease);
          position: relative;
          overflow: hidden;
        }
        .agent-card:hover { transform: translateY(-5px); border-color: rgba(255,255,255,0.15); box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        
        .premium-glow::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(16, 185, 129, 0.05), transparent 70%);
          pointer-events: none;
        }

        .agent-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .agent-icon-box { background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 1.25rem; border: 1px solid var(--border-glass); }
        
        .premium-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(16, 185, 129, 0.1);
          color: var(--accent-emerald);
          padding: 0.4rem 0.8rem;
          border-radius: 100px;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.1rem;
          font-family: 'JetBrains Mono', monospace;
        }

        .agent-labels { display: flex; flex-direction: column; gap: 0.5rem; }
        .agent-title { font-family: 'Outfit', sans-serif; font-size: 1.75rem; font-weight: 800; color: #fff; margin: 0; }
        .agent-subtitle { font-size: 10px; color: #475569; letter-spacing: 0.1rem; font-weight: 900; }

        .agent-description { font-size: 0.95rem; color: #64748b; line-height: 1.6; }

        .capability-list { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
        .cap-item { display: flex; align-items: center; gap: 0.75rem; }
        .cap-dot { width: 6px; height: 6px; border-radius: 50%; opacity: 0.5; }
        .cap-text { font-size: 11px; color: #d1d5db; font-weight: 500; }

        .agent-card-footer { margin-top: auto; padding-top: 1rem; }
        .launch-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 1rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 900;
          color: #fff;
          transition: all 0.3s var(--ease);
          text-decoration: none;
        }
        .launch-btn:hover { background: rgba(255,255,255,0.08); color: var(--accent-emerald); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s var(--ease) forwards; opacity: 0; }

        @media (max-width: 1024px) {
          .agent-grid { grid-template-columns: 1fr; }
          .title-h1 { font-size: 3rem; }
        }
      `}</style>
    </div>
  );
}
