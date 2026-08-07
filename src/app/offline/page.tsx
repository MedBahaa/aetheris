export default function OfflinePage() {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Aetheris — Hors ligne</title>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: 'Inter', sans-serif;
            background: #030712;
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            overflow: hidden;
          }

          .bg-glow {
            position: fixed;
            inset: 0;
            background:
              radial-gradient(ellipse 60% 50% at 50% -10%, rgba(168,85,247,0.12) 0%, transparent 70%),
              radial-gradient(ellipse 40% 30% at 80% 110%, rgba(6,182,212,0.06) 0%, transparent 70%);
            pointer-events: none;
          }

          .card {
            position: relative;
            text-align: center;
            max-width: 420px;
            width: 100%;
            background: rgba(13,17,23,0.8);
            border: 1px solid rgba(168,85,247,0.2);
            border-radius: 1.5rem;
            padding: 3rem 2rem;
            backdrop-filter: blur(20px);
            box-shadow: 0 0 60px rgba(168,85,247,0.08), 0 25px 50px rgba(0,0,0,0.4);
          }

          .icon-ring {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(6,182,212,0.1));
            border: 1px solid rgba(168,85,247,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 2rem;
            animation: pulse-ring 3s ease-in-out infinite;
          }

          @keyframes pulse-ring {
            0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.3); }
            50% { box-shadow: 0 0 0 12px rgba(168,85,247,0); }
          }

          .badge {
            display: inline-block;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.15em;
            color: #a855f7;
            background: rgba(168,85,247,0.1);
            border: 1px solid rgba(168,85,247,0.2);
            border-radius: 99px;
            padding: 0.25rem 0.75rem;
            margin-bottom: 1rem;
            font-family: 'Courier New', monospace;
          }

          h1 {
            font-size: 1.75rem;
            font-weight: 700;
            background: linear-gradient(135deg, #f1f5f9 0%, #a855f7 60%, #06b6d4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.75rem;
          }

          p {
            font-size: 0.9rem;
            color: #94a3b8;
            line-height: 1.7;
            margin-bottom: 2rem;
          }

          .features {
            list-style: none;
            text-align: left;
            margin-bottom: 2rem;
          }

          .features li {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 0.82rem;
            color: #64748b;
            padding: 0.4rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.04);
          }

          .features li:last-child { border-bottom: none; }

          .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(168,85,247,0.5); flex-shrink: 0; }

          .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.85rem 2rem;
            border-radius: 0.75rem;
            border: none;
            background: linear-gradient(135deg, #a855f7, #7c3aed);
            color: #fff;
            font-weight: 700;
            font-size: 0.85rem;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            box-shadow: 0 4px 20px rgba(168,85,247,0.3);
          }

          .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(168,85,247,0.4); }

          .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #f59e0b;
            margin-right: 0.4rem;
            animation: blink 1.5s ease-in-out infinite;
          }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

          .footer {
            margin-top: 1.5rem;
            font-size: 0.75rem;
            color: #334155;
          }
        `}</style>
      </head>
      <body>
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
          <a href="/" className="btn">
            🔄 Réessayer la connexion
          </a>
          <div className="footer">
            <span className="status-dot" />
            Aetheris AI — Mode hors-ligne actif
          </div>
        </div>
      </body>
    </html>
  );
}
