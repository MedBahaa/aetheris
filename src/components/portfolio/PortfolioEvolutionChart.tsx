'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries, LineSeries } from 'lightweight-charts';

import { PortfolioTransaction } from '@/lib/schemas';

interface PortfolioEvolutionChartProps {
  currentValue: number;
  performancePct: number;
  transactions: PortfolioTransaction[];
  masiBenchmark?: { variationValue: number; variation: string } | null;
}

export const PortfolioEvolutionChart: React.FC<PortfolioEvolutionChartProps> = ({ 
  currentValue, 
  performancePct,
  transactions,
  masiBenchmark,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const masiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [timeRange, setTimeRange] = useState<'1S' | '1M' | 'YTD' | '1A' | 'MAX'>('1M');

  // Équity Curve réelle calculée depuis les transactions
  const buildRealEquityCurve = (days: number) => {
    if (!transactions || transactions.length === 0 || !currentValue || currentValue <= 0) {
      return { portfolio: [], masi: [] };
    }

    // Trier les transactions par date
    const sorted = [...transactions].sort((a, b) =>
      new Date(a.buy_date).getTime() - new Date(b.buy_date).getTime()
    );

    const now = new Date();
    const startDate = new Date(sorted[0].buy_date);
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const from = days === 730 ? startDate : (cutoff < startDate ? startDate : cutoff);

    // Construire la courbe jour par jour
    const portfolioData: { time: string; value: number }[] = [];
    const masiData: { time: string; value: number }[] = [];

    // Pour chaque jour entre from et aujourd'hui, calculer la valeur du portefeuille
    // Valeur = sum(qty_achetee_avant_cette_date * prix_achat) comme proxy du coût
    // En fin de courbe, on ancre sur la vraie valeur marché actuelle
    const dayMs = 86400000;
    const totalDays = Math.max(1, Math.round((now.getTime() - from.getTime()) / dayMs));

    // Construire la progression des coûts cumulés par date
    const costByDate: { date: string; cost: number; qty: Record<string, number> }[] = [];
    let runningCost = 0;
    const runningQty: Record<string, number> = {};

    for (let d = 0; d <= totalDays; d++) {
      const date = new Date(from.getTime() + d * dayMs);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateStr = date.toISOString().split('T')[0];

      // Ajouter les transactions de ce jour
      sorted.forEach(tx => {
        if (tx.buy_date === dateStr) {
          if ((tx.type || 'BUY') === 'BUY') {
            runningCost += tx.quantity * tx.buy_price;
            runningQty[tx.symbol] = (runningQty[tx.symbol] || 0) + tx.quantity;
          } else {
            runningCost = Math.max(0, runningCost - tx.quantity * tx.buy_price);
            runningQty[tx.symbol] = Math.max(0, (runningQty[tx.symbol] || 0) - tx.quantity);
          }
        }
      });

      if (runningCost > 0) {
        costByDate.push({ date: dateStr, cost: runningCost, qty: { ...runningQty } });
      }
    }

    if (costByDate.length === 0) return { portfolio: [], masi: [] };

    // Normaliser pour que le dernier point == currentValue
    const lastCost = costByDate[costByDate.length - 1].cost;
    const scaleFactor = lastCost > 0 ? currentValue / lastCost : 1;

    // Valeur MASI initiale = même que le portefeuille au premier point
    const firstValue = costByDate[0].cost * scaleFactor;
    const masiPerfPct = (masiBenchmark?.variationValue || 0) / 100;
    const masiEndValue = firstValue * (1 + masiPerfPct);
    const masiScaleFactor = costByDate.length > 1 ? masiEndValue / (costByDate[0].cost * scaleFactor) : 1;

    costByDate.forEach((d, i) => {
      const portValue = d.cost * scaleFactor;
      portfolioData.push({ time: d.date, value: portValue });
      // MASI: interpolation linéaire sur la même échelle
      const progress = costByDate.length > 1 ? i / (costByDate.length - 1) : 1;
      const masiValue = firstValue * (1 + (masiScaleFactor - 1) * progress);
      masiData.push({ time: d.date, value: masiValue });
    });

    return { portfolio: portfolioData, masi: masiData };
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: "'JetBrains Mono', monospace",
        attributionLogo: false, // Masquer le watermark TradingView
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)', style: 3 },
      },
      rightPriceScale: {
        borderVisible: false,
        autoScale: true,
        scaleMargins: { top: 0.15, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: { color: '#334155', width: 1, style: 3 },
        horzLine: { color: '#334155', width: 1, style: 3 },
      },
      handleScroll: false,
      handleScale: false,
      width: chartContainerRef.current.clientWidth,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#10b981',
      topColor: 'rgba(16, 185, 129, 0.2)',
      bottomColor: 'rgba(16, 185, 129, 0.0)',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 0,
        minMove: 1,
      },
    });

    // MASI Benchmark — même priceScaleId que le portefeuille pour éviter le double-axe
    const masiSeries = chart.addSeries(LineSeries, {
      color: '#64748b',
      lineWidth: 1,
      lineStyle: 3, // Dotted
      priceScaleId: 'right', // même axe que AreaSeries
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;
    masiSeriesRef.current = masiSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !masiSeriesRef.current || !chartRef.current) return;

    // Déterminer le nombre de jours selon le range
    let days = 30; // 1M
    if (timeRange === '1S') days = 7;
    if (timeRange === 'YTD') {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const diff = new Date().getTime() - startOfYear.getTime();
      days = Math.ceil(diff / (1000 * 3600 * 24));
    }
    if (timeRange === '1A') days = 365;
    if (timeRange === 'MAX') days = 730;

    const { portfolio, masi } = buildRealEquityCurve(days);
    
    seriesRef.current.setData(portfolio);
    masiSeriesRef.current.setData(masi);

    chartRef.current.timeScale().fitContent();

  }, [currentValue, performancePct, timeRange]);

  return (
    <div className="portfolio-widget">
      <div className="widget-header-row">
        <div className="widget-header">
          <span className="mono-tiny opacity-70">PERFORMANCE VS MASI</span>
          <h2 className="widget-title">ÉVOLUTION VALEUR</h2>
        </div>
        
        <div className="time-ranges">
          {(['1S', '1M', 'YTD', '1A', 'MAX'] as const).map(range => (
            <button 
              key={range} 
              className={`range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container" ref={chartContainerRef} />

      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-line portfolio"></div>
          <span className="mono-tiny">PORTEFEUILLE</span>
        </div>
        <div className="legend-item">
          <div className="legend-line masi"></div>
          <span className="mono-tiny">MASI (BENCHMARK)</span>
        </div>
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

        .widget-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .widget-header {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .widget-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }

        .time-ranges {
          display: flex;
          gap: 0.25rem;
          background: rgba(255, 255, 255, 0.03);
          padding: 0.25rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .range-btn {
          background: transparent;
          border: none;
          color: #64748b;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          padding: 0.4rem 0.75rem;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .range-btn:hover {
          color: #fff;
        }

        .range-btn.active {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .chart-container {
          flex: 1;
          width: 100%;
          min-height: 250px;
          margin-bottom: 1.5rem;
        }

        .chart-legend {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding-top: 1.5rem;
          border-top: 1px dashed rgba(255, 255, 255, 0.1);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .legend-line {
          width: 16px;
          height: 2px;
        }

        .legend-line.portfolio {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .legend-line.masi {
          background: #64748b;
          border-top: 2px dashed #64748b;
          background: transparent;
        }

        @media (max-width: 640px) {
          .chart-legend {
            gap: 1rem;
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};
