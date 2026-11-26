'use client';

import Link from 'next/link';
import { RefreshCw, ArrowRight } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="offline-root">
      <div className="bg-glow" />
      <div className="card">
        <div className="icon-ring">📡</div>
        <div className="badge">MODE HORS-LIGNE</div>
        <h1>Aetheris Offline</h1>
        <p>
          Votre connexion réseau est momentanément indisponible.
          Certaines pages en cache restent accessibles.
        </p>
        <ul className="features">
          <li><span className="dot" /> Pages visitées récemment disponibles en cache</li>
          <li><span className="dot" /> Vos données de portefeuille locales conservées</li>
          <li><span className="dot" /> Les analyses live nécessitent une connexion</li>
        </ul>
        <div className="actions">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            <RefreshCw size={16} />
            <span>Réessayer la connexion</span>
          </button>
          <Link href="/console" className="btn-secondary">
            <span>Aller à la Console</span>
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="footer">
          <span className="status-dot" />
          Aetheris AI — Mode hors-ligne actif
        </div>
      </div>

      <style jsx>{`
        .offline-root {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: calc(1.5rem + env(safe-area-inset-top, 0px)) 1.25rem calc(2rem + env(safe-area-inset-bottom, 0px));
          background: #030712;
          color: #f1f5f9;
          position: relative;
          overflow: hidden;
        }

        .bg-glow {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 50% -10%, rgba(168, 85, 247, 0.14) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 80% 110%, rgba(6, 182, 212, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .card {
          position: relative;
          text-align: center;
          max-width: 420px;
          width: 100%;
          background: rgba(13, 17, 23, 0.85);
          border: 1px solid rgba(168, 85, 247, 0.22);
          border-radius: 1.5rem;
          padding: 2.5rem 1.75rem;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 0 60px rgba(168, 85, 247, 0.08), 0 25px 50px rgba(0, 0, 0, 0.45);
          z-index: 1;
        }

        .icon-ring {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.16), rgba(6, 182, 212, 0.12));
          border: 1px solid rgba(168, 85, 247, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.35rem;
          font-size: 2rem;
          animation: pulse-ring 3s ease-in-out infinite;
        }

        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.3); }
          50% { box-shadow: 0 0 0 12px rgba(168, 85, 247, 0); }
        }

        .badge {
          display: inline-block;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.15em;
          color: #a855f7;
          background: rgba(168, 85, 247, 0.12);
          border: 1px solid rgba(168, 85, 247, 0.25);
          border-radius: 999px;
          padding: 0.28rem 0.8rem;
          margin-bottom: 1rem;
          font-family: 'JetBrains Mono', monospace;
        }

        h1 {
          font-size: 1.75rem;
          font-weight: 800;
          background: linear-gradient(135deg, #f1f5f9 0%, #a855f7 60%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.75rem;
        }

        p {
          font-size: 0.9rem;
          color: #94a3b8;
          line-height: 1.65;
          margin: 0 0 1.65rem;
        }

        .features {
          list-style: none;
          text-align: left;
          margin: 0 0 1.75rem;
          padding: 0;
        }

        .features li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.82rem;
          color: #94a3b8;
          padding: 0.45rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .features li:last-child { border-bottom: none; }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(168, 85, 247, 0.65);
          flex-shrink: 0;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          width: 100%;
          min-height: 48px;
          padding: 0.85rem 1.5rem;
          border-radius: 0.85rem;
          border: none;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          color: #fff;
          font-weight: 800;
          font-size: 0.88rem;
          letter-spacing: 0.03em;
          cursor: pointer;
          box-shadow: 0 6px 22px rgba(168, 85, 247, 0.35);
          transition: transform 0.15s ease;
        }
        .btn-primary:active { transform: scale(0.98); }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          width: 100%;
          min-height: 44px;
          padding: 0.7rem 1.25rem;
          border-radius: 0.85rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          font-weight: 600;
          font-size: 0.85rem;
          text-decoration: none;
        }

        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f59e0b;
          margin-right: 0.45rem;
          animation: blink 1.5s ease-in-out infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        .footer {
          margin-top: 1.5rem;
          font-size: 0.75rem;
          color: #64748b;
        }

        @media (max-width: 480px) {
          .card {
            padding: 2rem 1.25rem;
            border-radius: 1.25rem;
          }
          h1 { font-size: 1.5rem; }
        }
      `}</style>
    </div>
  );
}
