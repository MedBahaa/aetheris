'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Droplet, TrendingUp, TrendingDown } from 'lucide-react';

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
    <div className="macro-widget-container animate-fade-in">
      <div className="macro-item">
        <span className="m-label"><Droplet size={10}/> BRENT</span>
        <span className="m-val">${data.brent.price.toFixed(2)}</span>
        <span className={`m-pct ${getColor(data.brent.changePercent)}`}>
          {getIcon(data.brent.changePercent)} {data.brent.changePercent > 0 ? '+' : ''}{data.brent.changePercent}%
        </span>
      </div>

      <div className="macro-divider" />

      <div className="macro-item">
        <span className="m-label">🥇 OR (GOLD)</span>
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

      <style jsx>{`
        .macro-widget-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0.4rem 1rem;
          border-radius: 100px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .macro-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'JetBrains Mono', monospace;
        }

        .m-label {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.2rem;
          text-transform: uppercase;
        }

        .m-val {
          font-size: 0.75rem;
          color: #f8fafc;
          font-weight: 600;
        }

        .m-pct {
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          gap: 0.1rem;
          font-weight: 700;
        }

        .text-emerald { color: #10b981; }
        .text-rose { color: #f43f5e; }

        .macro-divider {
          width: 1px;
          height: 12px;
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .macro-widget-container {
            display: none; /* Hide on mobile to save header space, or restructure */
          }
        }
      `}</style>
    </div>
  );
}
