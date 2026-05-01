'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Droplet, TrendingUp, TrendingDown, Landmark, PieChart, Calendar, Coins } from 'lucide-react';

export default function MacroWidget() {
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
    fetch('/api/macro')
      .then(async res => {
        const contentType = res.headers.get('content-type');
        if (!res.ok || !contentType?.includes('application/json')) {
          console.error(`[MacroWidget] Invalid response: status=${res.status}, type=${contentType}`);
          return null;
        }
        return res.json();
      })
      .then(d => {
         if (d && !d.error) setData(d);
      })
      .catch(err => console.error('[MacroWidget] Network error:', err));
  }, []);

  if (!data) return null;

  const getColor = (val: number) => val >= 0 ? 'text-emerald' : 'text-rose';
  const getIcon = (val: number) => val >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />;

  return (
    <div className="macro-ticker-wrapper">
      <div className="macro-ticker-content animate-ticker">
        {/* DUPLICATE CONTENT FOR SEAMLESS LOOP */}
        {[1, 2].map((i) => (
          <div key={i} className="macro-ticker-group">
            {/* GLOBAL MACRO */}
            <div className="macro-item">
              <span className="m-label"><Droplet size={10}/> BRENT</span>
              <span className="m-val">${data.brent.price.toFixed(2)}</span>
              <span className={`m-pct ${getColor(data.brent.changePercent)}`}>
                {getIcon(data.brent.changePercent)} {data.brent.changePercent > 0 ? '+' : ''}{data.brent.changePercent}%
              </span>
            </div>

            <div className="macro-divider" />

            <div className="macro-item">
              <span className="m-label"><Coins size={10}/> OR (GOLD)</span>
              <span className="m-val">${data.gold.price.toFixed(2)}</span>
              <span className={`m-pct ${getColor(data.gold.changePercent)}`}>
                {getIcon(data.gold.changePercent)} {data.gold.changePercent > 0 ? '+' : ''}{data.gold.changePercent}%
              </span>
            </div>

            <div className="macro-divider" />

            <div className="macro-item">
              <span className="m-label"><DollarSign size={10}/> USD/MAD</span>
              <span className="m-val">{data.usDmad.price.toFixed(4)}</span>
              <span className={`m-pct ${getColor(data.usDmad.changePercent)}`}>
                {getIcon(data.usDmad.changePercent)} {data.usDmad.changePercent > 0 ? '+' : ''}{data.usDmad.changePercent}%
              </span>
            </div>

            <div className="macro-divider-heavy" />

            {/* INSTITUTIONAL MOROCCO (BAM) */}
            <div className="macro-item highlight">
              <span className="m-label"><Landmark size={10}/> TAUX BAM</span>
              <span className="m-val">{data.keyRate.value.toFixed(2)}%</span>
              <span className="m-sub">{data.keyRate.lastChange}</span>
            </div>

            <div className="macro-divider" />

            <div className="macro-item">
              <span className="m-label"><PieChart size={10}/> INFLATION</span>
              <span className="m-val">{data.inflation.value}%</span>
            </div>

            <div className="macro-divider" />

            <div className="macro-item">
              <span className="m-label"><Calendar size={10}/> CONSEIL BAM</span>
              <span className="m-val text-xs">{data.nextBAMMeeting}</span>
            </div>

            <div className="macro-divider-heavy" />
          </div>
        ))}
      </div>

      <style jsx>{`
        .macro-ticker-wrapper {
          width: 100%;
          overflow: hidden;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0.4rem 0;
          border-radius: 100px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          position: relative;
        }

        .macro-ticker-content {
          display: flex;
          align-items: center;
          white-space: nowrap;
          width: max-content;
        }

        .animate-ticker {
          animation: ticker-move 40s linear infinite;
        }

        .animate-ticker:hover {
          animation-play-state: paused;
        }

        .macro-ticker-group {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding-right: 1.5rem;
        }

        @keyframes ticker-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .macro-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-family: 'JetBrains Mono', monospace;
        }

        .m-label {
          font-size: 0.6rem;
          color: #64748b;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.02rem;
        }

        .m-val {
          font-size: 0.75rem;
          color: #f8fafc;
          font-weight: 600;
        }

        .m-pct {
          font-size: 0.65rem;
          display: flex;
          align-items: center;
          gap: 0.1rem;
          font-weight: 700;
        }

        .m-sub {
          font-size: 0.55rem;
          color: #475569;
          font-weight: 500;
        }

        .text-emerald { color: #10b981; }
        .text-rose { color: #f43f5e; }
        .text-xs { font-size: 0.65rem; }

        .macro-divider {
          width: 1px;
          height: 10px;
          background: rgba(255, 255, 255, 0.06);
        }

        .macro-divider-heavy {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.15);
        }

        .macro-item.highlight .m-val {
          color: #34d399;
          text-shadow: 0 0 10px rgba(52, 211, 153, 0.2);
        }

        @media (max-width: 768px) {
          .macro-ticker-wrapper {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
