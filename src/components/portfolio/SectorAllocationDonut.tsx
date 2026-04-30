import React from 'react';

interface Sector {
  name: string;
  val: number;
  pct: number;
}

interface SectorAllocationDonutProps {
  sectors: Sector[];
}

const DONUT_COLORS = [
  '#3b82f6', // Bleu
  '#f59e0b', // Jaune
  '#ef4444', // Rouge
  '#10b981', // Vert
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Rose
];

export const SectorAllocationDonut: React.FC<SectorAllocationDonutProps> = ({ sectors }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  // Trier par pourcentage décroissant (déjà fait en amont, mais sécurité)
  const sortedSectors = [...sectors].sort((a, b) => b.pct - a.pct);
  
  return (
    <div className="portfolio-widget">
      <div className="widget-header">
        <span className="mono-tiny opacity-70">DIVERSIFICATION</span>
        <h2 className="widget-title">ALLOCATION SECTEUR</h2>
      </div>

      <div className="donut-container">
        {sortedSectors.length > 0 ? (
          <>
            <div className="donut-chart-wrapper">
              <svg width="200" height="200" viewBox="0 0 160 160" className="donut-svg">
                {/* Background circle */}
                <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="20" />
                
                {/* Segments */}
                {sortedSectors.map((sector, index) => {
                  const strokeLength = (sector.pct / 100) * circumference;
                  const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
                  const strokeDashoffset = -currentOffset;
                  currentOffset += strokeLength;
                  const color = DONUT_COLORS[index % DONUT_COLORS.length];

                  return (
                    <circle
                      key={sector.name}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke={color}
                      strokeWidth="20"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="donut-segment animate-draw"
                      style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                    />
                  );
                })}
              </svg>
              <div className="donut-center-text">
                <span className="mono-tiny">{sortedSectors.length} SECTEURS</span>
              </div>
            </div>

            <div className="donut-legend">
              {sortedSectors.map((sector, index) => (
                <div key={sector.name} className="legend-item">
                  <div className="legend-label">
                    <span 
                      className="legend-dot" 
                      style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} 
                    />
                    <span className="legend-name truncate">{sector.name}</span>
                  </div>
                  <span className="legend-pct mono">{sector.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="donut-empty mono-tiny opacity-40">
            AUCUNE DONNÉE SECTORIELLE
          </div>
        )}
      </div>

      <style jsx>{`
        .portfolio-widget {
          background: rgba(10, 12, 16, 0.4);
          border: 1px solid var(--border-glass);
          border-radius: 1.5rem;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .widget-header {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 2rem;
        }

        .widget-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }

        .donut-container {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 0.75rem;
          flex: 1;
          padding-left: 0;
        }

        .donut-chart-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 160px;
          height: 160px;
          flex-shrink: 0;
          margin-left: -1.5rem;
        }

        .donut-center-text {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: transparent;
        }

        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          flex: 1;
          max-width: 210px;
          min-width: 0;
        }

        .legend-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .legend-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .legend-name {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          color: #e2e8f0;
          text-transform: capitalize;
        }

        .legend-pct {
          font-size: 12px;
          font-weight: 900;
          color: #fff;
        }

        .donut-segment {
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .donut-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
        }

        @keyframes draw {
          from { stroke-dasharray: 0 1000; }
        }
        .animate-draw {
          animation: draw 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (max-width: 768px) {
          .donut-container {
            flex-direction: column;
            gap: 1.5rem;
          }
          .donut-legend {
            max-width: 100%;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
