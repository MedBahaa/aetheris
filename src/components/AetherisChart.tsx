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
      if (!companyId) {
        // Fallback mock si pas d'ID
        setChartData([
          { time: '2024-01-01', value: 100 },
          { time: '2024-01-02', value: 105 },
          { time: '2024-01-03', value: 102 },
          { time: '2024-01-04', value: 110 },
        ]);
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

          const formattedData = Array.from(dailyData.entries()).map(([date, price]) => ({
            time: date,
            value: price
          }));
          
          if (formattedData.length < 2) {
            // Rajouter un point fictif pour dessiner la ligne
            formattedData.unshift({ time: new Date(Date.now() - 86400000).toISOString().split('T')[0], value: formattedData[0]?.value || 0 });
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

    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const color = isBullish ? '#10b981' : '#f43f5e';
    
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 250,
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
      topColor: color + '40', // 40 hex opacity
      bottomColor: color + '00',
      lineWidth: 2,
    });
    
    seriesRef.current = newSeries;

    newSeries.setData(chartData);
    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData, loading, isBullish]);

  return (
    <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Historique des Prix</span>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            {isBullish ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
            {company}
          </h4>
        </div>
        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-slate-400">
           MAD
        </div>
      </div>

      <div className="w-full h-[250px] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-500" size={24} />
          </div>
        ) : chartData.length > 0 ? (
          <div ref={chartContainerRef} className="w-full h-full" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            Données historiques insuffisantes
          </div>
        )}
      </div>
    </div>
  );
}
