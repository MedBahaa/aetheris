'use client';

import { CompanyAnalysis } from '@/lib/agent-engine';
import { BarChart3 } from 'lucide-react';
import OrchestratorReport from './OrchestratorReport';

interface StrategyReportProps {
  analysis: CompanyAnalysis;
}

export default function StrategyReport({ analysis }: StrategyReportProps) {
  return (
    <div className="strategy-report animate-fade-in">
      {/* Technical Header */}
      <div className="tech-header">
        <div className="tech-header-left">
          <div className="status-indicator">
            <div className="pulse-dot"></div>
            <span className="mono-label text-emerald">FLUX DE DONNÉES TEMPS-RÉEL CRYPTÉ</span>
          </div>
          <h2 className="tech-main-title">
            Stratégie & Arbitrage Alpha : <span className="text-white">{analysis.companyName}</span>
          </h2>
          <div className="tech-meta">
            <div className="meta-pill glass">
              <span className="pill-key">RÉFÉRENCE RAPPORT</span>
              <span className="pill-val mono">#{analysis.id}</span>
            </div>
            <div className="meta-pill glass">
              <span className="pill-key">SYNCHRO TIMESTAMP</span>
              <span className="pill-val mono">{analysis.date}</span>
            </div>
            {analysis.orchestrator?.isAI && (
              <div className="meta-pill ai glass">
                <BarChart3 size={10} />
                <span className="pill-val mono">AETHERIS ENGINE CORE v3</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orchestrator Executive Summary & Dashboard */}
      <OrchestratorReport analysis={analysis} />

      <style jsx>{`
        .strategy-report { display: flex; flex-direction: column; gap: 4rem; width: 100%; padding-bottom: 8rem; max-width: 1400px; margin: 0 auto; }
        
        .mono-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 950; letter-spacing: 0.15rem; text-transform: uppercase; color: #475569; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        /* Tech Header */
        .tech-header { border-bottom: 1px solid var(--border-glass); padding-bottom: 3.5rem; margin-bottom: 1rem; }
        .status-indicator { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .pulse-dot { width: 8px; height: 8px; background: var(--accent-emerald); border-radius: 50%; box-shadow: 0 0 12px var(--accent-emerald); position: relative; }
        .pulse-dot::after { content: ''; position: absolute; width: 100%; height: 100%; background: inherit; border-radius: inherit; animation: pulse 2s infinite; opacity: 0.5; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(3); opacity: 0; } }

        .tech-main-title { font-family: 'Outfit', sans-serif; font-size: 2.25rem; font-weight: 900; color: #475569; letter-spacing: -0.02em; line-height: 1; margin-bottom: 2rem; }
        .text-white { color: #fff; }

        .tech-meta { display: flex; gap: 1rem; flex-wrap: wrap; }
        .meta-pill { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 1.25rem; border-radius: 8px; border: 1px solid var(--border-glass); }
        .meta-pill.ai { border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.03); color: var(--accent-emerald); }
        .pill-key { font-size: 11px; font-weight: 950; color: #334155; letter-spacing: 0.1rem; text-transform: uppercase; }
        .pill-val { font-size: 10px; font-weight: 700; color: #94a3b8; }
        .ai .pill-val { color: var(--accent-emerald); }
        .text-emerald { color: var(--accent-emerald); }
      `}</style>
    </div>
  );
}
