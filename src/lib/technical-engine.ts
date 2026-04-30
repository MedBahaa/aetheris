import { RSI, SMA, BollingerBands, MACD } from 'technicalindicators';

export interface TechnicalSignals {
  rsi: { value: number | string; interpretation: string };
  sma20: number | string;
  sma50: number | string;
  /** AUDIT FIX: Label honnête montrant la période réellement utilisée */
  smaLabel: string;
  macd: { macd: number | string; signal: number | string; histogram: number | string; trend: string };
  bb: { upper: number | string; middle: number | string; lower: number | string };
  support: number | string;
  resistance: number | string;
  pivot: number | string;
  trend: 'Haussière' | 'Baissière' | 'Neutre' | 'Indéterminé';
  volatility: string;
  fibonacci: {
    h23: string;
    h38: string;
    h50: string;
    h61: string;
  };
  /** AUDIT FIX: Nombre de points réellement utilisés (transparence) */
  dataPointsUsed: number;
  /** AUDIT FIX: Volume intégré dans les signaux */
  volumeSignal?: string;
}

/**
 * AUDIT FIX: Seuils minimum pour la validité des indicateurs
 */
const MIN_POINTS_RSI = 14;
const MIN_POINTS_SMA20 = 20;
const MIN_POINTS_SMA50 = 50;
const MIN_POINTS_MACD = 33; // 26 (slow) + 9 (signal) - 2

export class TechnicalEngine {
  /**
   * Calcule les indicateurs techniques à partir d'un historique de prix
   * AUDIT FIX: Calculs honnêtes avec labels réels et seuils minimum
   */
  static calculate(prices: number[], volume?: number): TechnicalSignals {
    const lastPrice = prices[prices.length - 1] || 0;
    const dataPointsUsed = prices.length;

    if (prices.length < MIN_POINTS_RSI) {
      return {
        rsi: { value: 'N/A', interpretation: 'Données historiques insuffisantes (min. 14 séances requises)' },
        sma20: 'N/A',
        sma50: 'N/A',
        smaLabel: 'N/A',
        macd: { macd: 'N/A', signal: 'N/A', histogram: 'N/A', trend: 'Indéterminé' },
        bb: { upper: 'N/A', middle: 'N/A', lower: 'N/A' },
        support: 'N/A',
        resistance: 'N/A',
        pivot: 'N/A',
        trend: 'Indéterminé',
        volatility: 'Inconnue',
        fibonacci: { h23: 'N/A', h38: 'N/A', h50: 'N/A', h61: 'N/A' },
        dataPointsUsed,
        volumeSignal: volume ? TechnicalEngine.interpretVolume(volume) : undefined
      };
    }

    // 1. RSI (14)
    const rsiValues = RSI.calculate({ values: prices, period: 14 });
    const lastRsi = rsiValues[rsiValues.length - 1] || 50;

    // 2. SMA 20 (Court terme)
    // AUDIT FIX: Calcul uniquement si assez de points, sinon label honnête
    const actualSma20Period = Math.min(20, prices.length);
    const sma20Values = SMA.calculate({ values: prices, period: actualSma20Period });
    const lastSma20 = sma20Values[sma20Values.length - 1] || lastPrice;

    // 3. SMA 50 (Moyen terme)
    // AUDIT FIX: Label honnête — montrer la période réelle
    let lastSma50: number | string = 'N/A';
    let smaLabel = `MMS(${actualSma20Period})`;
    if (prices.length >= MIN_POINTS_SMA50) {
      const sma50Values = SMA.calculate({ values: prices, period: 50 });
      lastSma50 = sma50Values[sma50Values.length - 1] || lastPrice;
      smaLabel = `MMS(${actualSma20Period}) / MMS(50)`;
    } else if (prices.length >= 30) {
      // On calcule sur la période disponible mais on le dit
      const actualPeriod = prices.length;
      const sma50Values = SMA.calculate({ values: prices, period: actualPeriod });
      lastSma50 = sma50Values[sma50Values.length - 1] || lastPrice;
      smaLabel = `MMS(${actualSma20Period}) / MMS(${actualPeriod}) ⚠️ (${actualPeriod} pts, non fiable)`;
    } else {
      smaLabel = `MMS(${actualSma20Period}) / MMS 50: ❌ insuffisant (${prices.length}/${MIN_POINTS_SMA50} pts)`;
    }

    // 4. MACD (12, 26, 9)
    // AUDIT FIX: N/A si < 33 points (mathématiquement non significatif)
    let macdResult: { macd: number | string; signal: number | string; histogram: number | string; trend: string };
    if (prices.length >= MIN_POINTS_MACD) {
      const macdValues = MACD.calculate({
        values: prices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      });
      const lastMacd = macdValues[macdValues.length - 1] || { MACD: 0, signal: 0, histogram: 0 };
      const macdTrend = lastMacd.histogram! > 0 ? 'Haussier' : 'Baissier';
      macdResult = {
        macd: parseFloat((lastMacd.MACD || 0).toFixed(2)),
        signal: parseFloat((lastMacd.signal || 0).toFixed(2)),
        histogram: parseFloat((lastMacd.histogram || 0).toFixed(2)),
        trend: macdTrend
      };
    } else {
      macdResult = {
        macd: 'N/A',
        signal: 'N/A',
        histogram: 'N/A',
        trend: `Indéterminé (${prices.length}/${MIN_POINTS_MACD} pts requis)`
      };
    }

    // 5. Volatilité & Bollinger
    const recentPrices = prices.slice(-20);
    const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const stdDev = Math.sqrt(recentPrices.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / recentPrices.length);
    const volatilityPct = (stdDev / mean) * 100;

    const bbValues = BollingerBands.calculate({ 
      values: prices, 
      period: Math.min(20, prices.length), 
      stdDev: 2 
    });
    const lastBb = bbValues[bbValues.length - 1] || { upper: 0, middle: 0, lower: 0 };

    // 6. Points Pivots (Standard)
    // AUDIT FIX: Utiliser uniquement les données de la DERNIÈRE SÉANCE
    // Au lieu de calculer H/L/C sur 20 jours, on prend les 1-2 derniers points
    // pour approximer la dernière séance (H/L/C intra-day non disponibles)
    const lastSessionPrices = prices.slice(-2); // Approximation : avant-dernier et dernier prix
    const sessionHigh = Math.max(...lastSessionPrices); 
    const sessionLow = Math.min(...lastSessionPrices);
    const sessionClose = lastPrice;
    
    const PP = (sessionHigh + sessionLow + sessionClose) / 3;
    const R1 = (2 * PP) - sessionLow;
    const S1 = (2 * PP) - sessionHigh;
    
    // 7. Fibonacci Retracements (basé sur la plage complète disponible)
    const fullHigh = Math.max(...prices);
    const fullLow = Math.min(...prices);
    const diff = fullHigh - fullLow;
    const fibo = {
      h23: (fullHigh - diff * 0.236).toFixed(2),
      h38: (fullHigh - diff * 0.382).toFixed(2),
      h50: (fullHigh - diff * 0.50).toFixed(2),
      h61: (fullHigh - diff * 0.618).toFixed(2),
    };

    // 8. Interprétation RSI
    let rsiInterpretation = 'Neutre';
    if (lastRsi > 70) rsiInterpretation = 'Surachat';
    else if (lastRsi < 30) rsiInterpretation = 'Survente';
    else if (lastRsi > 50) rsiInterpretation = 'Haussier';
    else rsiInterpretation = 'Baissier';

    // 9. AUDIT FIX: Détermination de la tendance multi-facteurs
    // Au lieu de se baser uniquement sur le RSI, on combine RSI + SMA + MACD
    const trend = TechnicalEngine.determineTrend(
      lastRsi,
      lastPrice,
      typeof lastSma20 === 'number' ? lastSma20 : undefined,
      typeof lastSma50 === 'number' ? lastSma50 : undefined,
      typeof macdResult.histogram === 'number' ? macdResult.histogram : undefined
    );

    // 10. AUDIT FIX: Signal volume
    const volumeSignal = volume ? TechnicalEngine.interpretVolume(volume) : undefined;

    return {
      rsi: { value: Math.round(lastRsi), interpretation: rsiInterpretation },
      sma20: parseFloat(lastSma20.toFixed(2)),
      sma50: typeof lastSma50 === 'number' ? parseFloat(lastSma50.toFixed(2)) : lastSma50,
      smaLabel,
      macd: macdResult,
      bb: { 
        upper: parseFloat(lastBb.upper.toFixed(2)), 
        middle: parseFloat(lastBb.middle.toFixed(2)), 
        lower: parseFloat(lastBb.lower.toFixed(2)) 
      },
      support: parseFloat(S1.toFixed(2)),
      resistance: parseFloat(R1.toFixed(2)),
      pivot: parseFloat(PP.toFixed(2)),
      trend,
      volatility: volatilityPct > 5 ? 'Élevée' : volatilityPct > 2 ? 'Moyenne' : 'Faible',
      fibonacci: fibo,
      dataPointsUsed,
      volumeSignal
    };
  }

  /**
   * AUDIT FIX: Détermination de tendance multi-facteurs
   * Combine RSI, position par rapport aux SMA, et MACD pour un diagnostic plus robuste
   */
  private static determineTrend(
    rsi: number,
    price: number,
    sma20?: number,
    sma50?: number,
    macdHistogram?: number
  ): 'Haussière' | 'Baissière' | 'Neutre' | 'Indéterminé' {
    let bullishSignals = 0;
    let bearishSignals = 0;

    // RSI
    if (rsi > 55) bullishSignals++;
    if (rsi < 45) bearishSignals++;

    // Prix vs SMA20
    if (sma20) {
      if (price > sma20) bullishSignals++;
      if (price < sma20) bearishSignals++;
    }

    // Prix vs SMA50
    if (sma50) {
      if (price > sma50) bullishSignals++;
      if (price < sma50) bearishSignals++;
    }

    // MACD Histogram
    if (macdHistogram !== undefined) {
      if (macdHistogram > 0) bullishSignals++;
      if (macdHistogram < 0) bearishSignals++;
    }

    if (bullishSignals >= 3) return 'Haussière';
    if (bearishSignals >= 3) return 'Baissière';
    if (bullishSignals > bearishSignals) return 'Haussière';
    if (bearishSignals > bullishSignals) return 'Baissière';
    return 'Neutre';
  }

  /**
   * AUDIT FIX: Interprétation du volume pour le marché marocain
   * Le volume est un confirmatif crucial en analyse technique
   */
  private static interpretVolume(volume: number): string {
    if (volume < 100) return '⚠️ Volume extrêmement faible (<100 titres) — Illiquide';
    if (volume < 1000) return '⚠️ Volume faible (<1000 titres) — Liquidité limitée';
    if (volume < 10000) return 'Volume modéré';
    if (volume < 100000) return 'Volume correct';
    return 'Volume élevé — Forte liquidité';
  }
}
