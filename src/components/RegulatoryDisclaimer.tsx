'use client';

import React from 'react';
import { ShieldCheck, Clock, Database } from 'lucide-react';

interface RegulatoryDisclaimerProps {
  sources?: string[];
  updatedAt?: string | null;
  compact?: boolean;
}

export default function RegulatoryDisclaimer({
  sources = [],
  updatedAt = null,
  compact = false,
}: RegulatoryDisclaimerProps) {
  const formattedTime = React.useMemo(() => {
    if (!updatedAt) return null;
    const d = new Date(updatedAt);
    if (Number.isNaN(d.getTime())) return updatedAt;
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [updatedAt]);

  return (
    <aside
      className={`reg-disclaimer ${compact ? 'is-compact' : ''}`}
      aria-label="Traçabilité des données et avertissement réglementaire"
    >
      <div className="reg-top">
        <div className="reg-title">
          <ShieldCheck size={14} className="reg-icon" />
          <span className="mono">TRANSPARENCE &amp; AVERTISSEMENT AMMC</span>
        </div>

        <div className="reg-meta">
          {sources.length > 0 && (
            <span className="reg-pill mono">
              <Database size={11} />
              <span>{sources.join(' · ')}</span>
            </span>
          )}
          {formattedTime && (
            <span className="reg-pill mono">
              <Clock size={11} />
              <span>MAJ {formattedTime}</span>
            </span>
          )}
        </div>
      </div>

      <p className="reg-body">
        Outil d&apos;aide à la décision et d&apos;analyse financière à caractère purement informatif.
        Les données, ratios AAOIFI et signaux IA ne constituent pas un conseil en investissement, une recommandation
        personnalisée ou une sollicitation agréée par l&apos;<strong>AMMC</strong> (Autorité Marocaine du Marché des Capitaux).
        Vérifiez systématiquement vos décisions auprès des rapports financiers officiels et d&apos;un intermédiaire agréé.
      </p>

      <style jsx>{`
        .mono {
          font-family: var(--font-mono);
        }
        .reg-disclaimer {
          margin-top: 1.5rem;
          padding: 1rem 1.2rem;
          border-radius: 14px;
          background: rgba(10, 14, 23, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .reg-disclaimer.is-compact {
          margin-top: 1rem;
          padding: 0.85rem 1rem;
        }
        .reg-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .reg-title {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 10.5px;
          font-weight: 800;
          color: #34d399;
          letter-spacing: 0.06em;
        }
        :global(.reg-icon) {
          color: #10b981;
          flex-shrink: 0;
        }
        .reg-meta {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .reg-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 700;
        }
        .reg-body {
          margin: 0;
          font-size: 0.78rem;
          color: #94a3b8;
          line-height: 1.5;
        }
        .reg-body strong {
          color: #cbd5e1;
        }
      `}</style>
    </aside>
  );
}
