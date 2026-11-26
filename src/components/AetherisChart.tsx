'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries } from 'lightweight-charts';
import { supabase } from '@/lib/supabase';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface AetherisChartProps {
  company: string;
  companyId?: string; // Optional: Si on l'a, on fetch l'historique
  isBullish?: boolean;
}

export default function AetherisChart({ company, companyId, isBullish = true }: AetherisChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartData, setChartData] = useState<{ time: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      // Validate UUID format before querying Supabase to prevent 22P02 error
      const isValidUUID = companyId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId);
      
      if (!companyId || !isValidUUID) {
        // Pas d'ID ou ID invalide -> on n'affiche pas de données par défaut
        setChartData([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('market_history')
          .select('price, timestamp')
          .eq('company_id', companyId)
          .order('timestamp', { ascending: true })
          .limit(100);

        if (error) throw error;

        if (data && data.length > 0) {
          // Agréger par jour (dernière clôture du jour)
          const dailyData = new Map<string, number>();
          data.forEach(row => {
            const date = new Date(row.timestamp).toISOString().split('T')[0];
            dailyData.set(date, row.price);
          });

          const formattedData = Array.from(dailyData.entries())
            .map(([date, price]) => ({ time: date, value: price }))
            .sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
          
          if (formattedData.length === 1) {
            const firstDate = new Date(formattedData[0].time);
            firstDate.setDate(firstDate.getDate() - 1);
            const prevDateStr = firstDate.toISOString().split('T')[0];
            formattedData.unshift({ time: prevDateStr, value: formattedData[0].value });
          }

          setChartData(formattedData);
        } else {
          setChartData([]);
        }
      } catch (err) {
        console.error("Erreur chargement graphique:", err instanceof Error ? err.message : JSON.stringify(err));
        setChartData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [companyId]);

  useEffect(() => {
    if (loading || !chartContainerRef.current || chartData.length === 0) return;

    const containerEl = chartContainerRef.current;
    const isNarrow = containerEl.clientWidth > 0 && containerEl.clientWidth < 520;
    const color = isBullish ? '#10b981' : '#f43f5e';
    
    const chart = createChart(containerEl, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: containerEl.clientWidth,
      height: containerEl.clientHeight || (isNarrow ? 210 : 250),
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    chartRef.current = chart;

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: color + '40',
      bottomColor: color + '00',
      lineWidth: 2,
    });
    
    seriesRef.current = newSeries;

    newSeries.setData(chartData);
    chart.timeScale().fitContent();

    const applySize = () => {
      if (!chartRef.current || !chartContainerRef.current) return;
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight || 220,
      });
    };

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => applySize())
      : null;
    observer?.observe(containerEl);
    window.addEventListener('resize', applySize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', applySize);
      chart.remove();
    };
  }, [chartData, loading, isBullish]);

  return (
    <div className="aetheris-chart-card">
      <div className="chart-header">
        <div className="chart-titles">
          <span className="chart-eyebrow">Historique des Prix</span>
          <h4 className="chart-company">
            {isBullish
              ? <TrendingUp size={16} className="chart-icon-bull" />
              : <TrendingDown size={16} className="chart-icon-bear" />}
            <span>{company}</span>
          </h4>
        </div>
        <div className="chart-currency-badge mono">MAD</div>
      </div>

      <div className="chart-viewport">
        {loading ? (
          <div className="chart-loading">
            <Loader2 className="animate-spin" size={24} style={{ color: '#64748b' }} />
          </div>
        ) : chartData.length > 0 ? (
          <div ref={chartContainerRef} className="chart-canvas" />
        ) : (
          <div className="chart-empty">
            <span className="chart-empty-emoji">📊</span>
            <span className="chart-empty-title">Historique de cours non disponible</span>
            <span className="chart-empty-sub">L&apos;historique sera disponible après la prochaine synchronisation</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .aetheris-chart-card {
          width: 100%;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 1rem;
          padding: 1.5rem;
          position: relative;
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .chart-titles {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .chart-eyebrow {
          font-size: 10px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-family: 'JetBrains Mono', monospace;
        }
        .chart-company {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }
        :global(.chart-icon-bull) { color: #10b981; flex-shrink: 0; }
        :global(.chart-icon-bear) { color: #f43f5e; flex-shrink: 0; }
        .chart-currency-badge {
          padding: 0.25rem 0.7rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
        }
        .chart-viewport {
          width: 100%;
          height: 250px;
          position: relative;
        }
        .chart-canvas {
          width: 100%;
          height: 100%;
        }
        .chart-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chart-empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          gap: 8px;
        }
        .chart-empty-emoji { font-size: 24px; }
        .chart-empty-title { font-size: 12px; color: rgba(255, 255, 255, 0.55); letter-spacing: 0.04em; font-weight: 600; }
        .chart-empty-sub { font-size: 10px; color: rgba(255, 255, 255, 0.35); max-width: 280px; line-height: 1.4; }
        @media (max-width: 640px) {
          .aetheris-chart-card {
            padding: 1rem;
            border-radius: 0.9rem;
          }
          .chart-viewport {
            height: 210px;
          }
        }
      `}</style>
    </div>
  );
}
