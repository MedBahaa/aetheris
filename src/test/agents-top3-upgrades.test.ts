// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { newsEngine, classifyNewsSourceType, SourceType } from '../lib/news-engine';
import {
  classifyNewsEvent,
  NewsWorker,
  detectMarketRegime,
  backtestTechnicalSignals,
  computeFundamentalQualityScore,
  MarketWorker,
  FundamentalWorker,
} from '../lib/agents/worker-agents';
import { TechnicalEngine } from '../lib/technical-engine';
import { TradingViewScraper, SectorMedian } from '../lib/scrapers/tradingview-scraper';
import { CacheService } from '../lib/cache-service';
import { validatePriceLevels, AetherisOrchestrator } from '../lib/agent-engine';
import { GeminiService, validatePortfolioOptimization } from '../lib/gemini';
import { computeConsolidatedPurification } from '../lib/portfolio-service';
import { BMCEBourseScraper } from '../lib/scrapers/bmce-scraper';
import { MacroScraper } from '../lib/scrapers/macro-scraper';
import { ImpactValidator } from '../lib/impact-validator';

describe('Aetheris Top 3 Upgrades Across All 7 Agents', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    TradingViewScraper.clearCache();
    vi.restoreAllMocks();
  });

  describe('1. Agent Sentiment / News (AMMC, Cluster Dedup & Event Multipliers)', () => {
    it('classifies institutional BVC/AMMC sources, specialized media, and general press', () => {
      expect(classifyNewsSourceType('AMMC Officiel', 'https://www.ammc.ma/fr/com/1')).toBe(SourceType.OFFICIAL);
      expect(classifyNewsSourceType('BVC Communiqué', 'https://www.casablanca-bourse.com/fr/news')).toBe(SourceType.OFFICIAL);
      expect(classifyNewsSourceType('Challenge.ma', 'https://www.challenge.ma/bourse')).toBe(SourceType.SPECIALIZED);
      expect(classifyNewsSourceType('Google News Bourse', 'https://news.google.com/article')).toBe(SourceType.GENERAL);
    });

    it('detects high-impact financial events with expected multipliers', () => {
      expect(classifyNewsEvent('Profit warning : révision à la baisse des prévisions annuelles')).toMatchObject({
        category: 'PROFIT_WARNING',
        multiplier: 1.35,
      });
      expect(classifyNewsEvent('Projet OPA et fusion-acquisition stratégique annoncée')).toMatchObject({
        category: 'M_AND_A',
        multiplier: 1.30,
      });
      expect(classifyNewsEvent('Augmentation de capital approuvée par l’AGE')).toMatchObject({
        category: 'CAPITAL_INCREASE',
        multiplier: 1.25,
      });
      expect(classifyNewsEvent('Distribution de dividende exceptionnel de 5 MAD par action')).toMatchObject({
        category: 'DIVIDEND',
        multiplier: 1.20,
      });
      expect(classifyNewsEvent('Publication des résultats annuels et RNPG en hausse')).toMatchObject({
        category: 'EARNINGS',
        multiplier: 1.20,
      });
      expect(classifyNewsEvent('Conférence sectorielle à Casablanca')).toMatchObject({
        category: 'GENERAL',
        multiplier: 1.0,
      });
    });

    it('deduplicates similar articles keeping highest institutional source priority and counts corroborating sources', () => {
      const articles = [
        {
          title: 'Maroc Telecom publie des résultats annuels solides à la Bourse de Casablanca',
          link: 'https://news.google.com/iam',
          pubDate: '2026-11-26T09:00:00Z',
          contentSnippet: 'Résultats publiés.',
          source: 'Google News Bourse',
        },
        {
          title: 'Maroc Telecom publie ses résultats annuels solides Bourse de Casablanca',
          link: 'https://www.ammc.ma/fr/communiques/iam',
          pubDate: '2026-11-26T08:00:00Z',
          contentSnippet: 'Communiqué officiel.',
          source: 'AMMC Officiel',
        },
        {
          title: 'Maroc Telecom publie les résultats annuels solides à la Bourse Casablanca',
          link: 'https://medias24.com/iam-resultats',
          pubDate: '2026-11-26T10:00:00Z',
          contentSnippet: 'Analyse Médias24.',
          source: 'Médias24 Actualités',
        },
      ];

      const deduped = (newsEngine as any).deduplicateArticles(articles);
      expect(deduped).toHaveLength(1);
      expect(deduped[0].source).toBe('AMMC Officiel');
      expect(deduped[0].corroboratingSourcesCount).toBe(3);
    });

    it('propagates event multipliers and detectedEvents into NewsWorker.analyze weighted score', async () => {
      const nowIso = new Date().toISOString();
      vi.spyOn(newsEngine, 'getNewsWithMetrics').mockResolvedValueOnce({
        articles: [
          {
            title: 'Avertissement sur résultats : Maroc Telecom lance un profit warning',
            link: 'https://www.ammc.ma/fr/iam-pw',
            pubDate: nowIso,
            contentSnippet: 'Révision à la baisse des bénéfices.',
            source: 'AMMC Officiel',
            corroboratingSourcesCount: 2,
          },
          {
            title: 'Maroc Telecom participe à un salon tech régional',
            link: 'https://news.google.com/iam-expo',
            pubDate: nowIso,
            contentSnippet: 'Conférence sectorielle.',
            source: 'Google News Bourse',
            corroboratingSourcesCount: 1,
          },
        ],
        metrics: { successCount: 5, totalFeeds: 5 },
      });

      vi.spyOn(GeminiService, 'analyzeNewsSentiment').mockResolvedValueOnce({
        globalScore: -0.2,
        impactSummary: 'Pression baissière attendue.',
        consolidatedSummary: 'Profit warning confirmé malgré une actu neutre.',
        aiAvailable: true,
        details: [
          {
            articleId: 'art-0',
            relevant: true,
            sentiment: 'FORTEMENT_NEGATIF',
            score: -0.8,
            impact: 'Court terme',
            explanation: 'Profit warning majeur.',
          },
          {
            articleId: 'art-1',
            relevant: true,
            sentiment: 'POSITIF',
            score: 0.4,
            impact: 'Court terme',
            explanation: 'Présence conférence.',
          },
        ],
      });

      const res = await NewsWorker.analyze('MAROC TELECOM');
      expect(res.detectedEvents).toContain('Profit Warning / Alerte Résultats');
      expect(res.news?.[0]?.eventCategory).toBe('PROFIT_WARNING');
      expect(res.news?.[0]?.corroboratingSourcesCount).toBe(2);
      // Equal average would be -0.20; AMMC + PROFIT_WARNING (1.35) + corroboration shifts score to ~ -0.498
      expect(res.globalScore).toBeLessThan(-0.45);
      expect(res.globalScore).toBeCloseTo(-0.498, 2);
    });
  });

  describe('2. Agent Technique / Market (ATR(14), Volume Breakout & MASI Alpha)', () => {
    it('computes dynamic ATR(14) stops/targets, volume breakout + Bollinger squeeze, and relative strength vs MASI', () => {
      const prices = [
        ...Array.from({ length: 34 }, (_, i) => 100 + (i % 2 === 0 ? 0.15 : -0.15)),
        104.5,
      ];
      const volumeHistory = Array.from({ length: 19 }, () => 10000);
      const currentVolume = 25000;

      const signals = TechnicalEngine.calculate(
        prices,
        currentVolume,
        { high: 105.0, low: 100.0, close: 104.5 },
        volumeHistory,
        { stockVariationPct: 4.5, masiVariationPct: 1.2 }
      );

      expect(signals.atr).toBeDefined();
      expect(signals.atr!.atr14).toBeGreaterThan(0);
      expect(signals.atr!.dynamicStopBuy).toBeLessThan(104.5);
      expect(signals.atr!.dynamicTargetBuy).toBeGreaterThan(104.5);
      expect(signals.atr!.dynamicStopSell).toBeGreaterThan(104.5);
      expect(signals.atr!.dynamicTargetSell).toBeLessThan(104.5);

      expect(signals.volumeBreakout).toBeDefined();
      expect(signals.volumeBreakout!.ratio).toBe(2.5);
      expect(signals.volumeBreakout!.isBreakout).toBe(true);
      expect(typeof signals.volumeBreakout!.bollingerBandwidth).toBe('number');
      expect(typeof signals.volumeBreakout!.isBollingerSqueeze).toBe('boolean');

      expect(signals.relativeStrengthMasi).toBeDefined();
      expect(signals.relativeStrengthMasi!.alphaPct).toBe(3.3);
      expect(signals.relativeStrengthMasi!.label).toContain('Surperformance');
    });

    it('detects Bollinger squeeze during low-volatility consolidation', () => {
      const flatPrices = Array.from({ length: 30 }, (_, i) => 200 + (i % 2 === 0 ? 0.2 : -0.2));
      const signals = TechnicalEngine.calculate(flatPrices, 5000, undefined, Array(10).fill(5000));
      expect(signals.volumeBreakout?.bollingerBandwidth).toBeLessThan(4.0);
      expect(signals.volumeBreakout?.isBollingerSqueeze).toBe(true);
      expect(signals.volumeBreakout?.isBreakout).toBe(false);
    });
  });

  describe('3. Agent Fondamental (Sector Benchmarks, Quality Score & Distributed Lock)', () => {
    it('computes sector PE discount/premium verdicts via TradingViewScraper.computeSectorBenchmark', () => {
      const benchmarks = new Map<string, SectorMedian>([
        [
          'banques',
          {
            sectorName: 'Banques',
            peerCount: 6,
            medianPe: 20,
            medianDividendYield: 4.0,
            medianRoe: 12.5,
          },
        ],
      ]);

      const discount = TradingViewScraper.computeSectorBenchmark('Banques', 15, benchmarks);
      expect(discount?.valuationVerdict).toBe('DÉCOTE');
      expect(discount?.peVsSectorPct).toBe(-25);

      const premium = TradingViewScraper.computeSectorBenchmark('Banques', 26, benchmarks);
      expect(premium?.valuationVerdict).toBe('PRIME');
      expect(premium?.peVsSectorPct).toBe(30);

      const inline = TradingViewScraper.computeSectorBenchmark('Banques', 21, benchmarks);
      expect(inline?.valuationVerdict).toBe('EN_LIGNE');
    });

    it('computes Grade A–D quality score accurately from fundamental ratios', () => {
      const strong = computeFundamentalQualityScore({
        roe: '18.5%',
        margin: '20.0%',
        peRatio: '12.5',
        dividendYield: '4.5%',
        revenueGrowth: '+11.0%',
        profitGrowth: '+14.0%',
        sectorBenchmark: { medianPe: 18 },
      });
      expect(strong.grade).toBe('A');
      expect(strong.score).toBeGreaterThanOrEqual(75);

      const weak = computeFundamentalQualityScore({
        roe: '2.0%',
        margin: '-4.0%',
        peRatio: '35.0',
        dividendYield: '0%',
        revenueGrowth: '-10.0%',
        profitGrowth: '-15.0%',
      });
      expect(weak.grade).toBe('D');
      expect(weak.score).toBeLessThan(45);
    });

    it('safely handles distributed Redis locks when Redis env vars are absent and with mocked Upstash', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;

      const localToken = await CacheService.acquireLock('aetheris:lock:test', 5000);
      expect(localToken).toBe('local');
      await expect(CacheService.releaseLock('aetheris:lock:test', localToken)).resolves.toBeUndefined();

      process.env.UPSTASH_REDIS_REST_URL = 'https://redis-lock-test.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'lock-token';

      let storedLock: string | null = null;
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body || '[]'));
        const cmd = body[0];
        if (cmd === 'SET') {
          if (storedLock !== null) {
            return new Response(JSON.stringify({ result: null }), { status: 200 });
          }
          storedLock = body[2];
          return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
        }
        if (cmd === 'GET') {
          return new Response(JSON.stringify({ result: storedLock }), { status: 200 });
        }
        if (cmd === 'DEL') {
          storedLock = null;
          return new Response(JSON.stringify({ result: 1 }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: null }), { status: 200 });
      });

      const acquired = await CacheService.acquireLock('aetheris:lock:test', 10000);
      expect(typeof acquired).toBe('string');
      expect(acquired).not.toBe('local');

      // Contended acquisition returns null while lock is held
      const contended = await CacheService.acquireLock('aetheris:lock:test', 10000);
      expect(contended).toBeNull();

      await CacheService.releaseLock('aetheris:lock:test', acquired);
      expect(storedLock).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('4. Agent Stratégie (Market Regime, Backtest Rolling & ATR Levels)', () => {
    it('detects HIGH_VOLATILITY, TRENDING, and RANGING regimes', () => {
      expect(
        detectMarketRegime({
          atr: {
            atr14: 4.5,
            atrPercent: 4.2,
            dynamicStopBuy: 93,
            dynamicTargetBuy: 113,
            dynamicStopSell: 106,
            dynamicTargetSell: 86,
          },
        })
      ).toBe('HIGH_VOLATILITY');

      expect(
        detectMarketRegime({
          sma20: 112,
          sma50: 100,
          macd: { macd: 2.1, signal: 1.4, histogram: 0.7, trend: 'Haussier' },
          atr: {
            atr14: 1.2,
            atrPercent: 1.1,
            dynamicStopBuy: 110,
            dynamicTargetBuy: 115,
            dynamicStopSell: 114,
            dynamicTargetSell: 108,
          },
        })
      ).toBe('TRENDING');

      expect(
        detectMarketRegime({
          sma20: 101,
          sma50: 100,
          macd: { macd: 0.1, signal: 0.1, histogram: 0, trend: 'Neutre' },
        })
      ).toBe('RANGING');
    });

    it('runs empirical rolling backtest over synthetic closing series (>= 35 closes)', () => {
      // Oscillating uptrend keeps RSI < 70 while sustaining bullish SMA/MACD alignment
      const oscillatingUptrend = Array.from({ length: 65 }, (_, i) => {
        const pullback = i % 4 === 3 ? -2.2 : 1.1;
        return Number((100 + i * 0.45 + pullback).toFixed(2));
      });
      const bt = backtestTechnicalSignals(oscillatingUptrend, 5);
      expect(bt).toBeDefined();
      expect(bt!.sampleSize).toBeGreaterThanOrEqual(3);
      expect(bt!.winRatePct).toBeGreaterThanOrEqual(0);
      expect(bt!.winRatePct).toBeLessThanOrEqual(100);
      expect(bt!.maxDrawdownPct).toBeGreaterThanOrEqual(0);
      expect(bt!.horizonSessions).toBe(5);

      expect(backtestTechnicalSignals([100, 101, 102], 5)).toBeUndefined();
    });

    it('uses ATR dynamic stops/targets in validatePriceLevels when AI TP/SL violate directional constraints', () => {
      const res = validatePriceLevels('ACHETER', 100, '90.00 MAD', '120.00 MAD', '100.00 MAD', {
        dynamicTargetBuy: 109.5,
        dynamicStopBuy: 95.5,
      });
      expect(res.tp).toContain('109.50 MAD');
      expect(res.sl).toContain('95.50 MAD');
      expect(res.riskRewardRatio).toBe('1:2.1');
    });
  });

  describe('5. Orchestrateur Multi-Agents (Coalescing, onProgress, Reliability & Multi-Horizon Guard)', () => {
    it('coalesces concurrent AetherisOrchestrator.process calls, streams progress, and injects reliability score', async () => {
      vi.spyOn(CacheService, 'get').mockResolvedValue(null);
      vi.spyOn(CacheService, 'set').mockResolvedValue(undefined);
      vi.spyOn(AetherisOrchestrator as any, 'checkRateLimit').mockResolvedValue(false);
      vi.spyOn(BMCEBourseScraper, 'resolveStock').mockResolvedValue({
        id: '1234',
        symbol: 'IAM',
        name: 'MAROC TELECOM',
        uuid: 'comp-iam-1',
      });
      vi.spyOn(ImpactValidator, 'getAgentReliabilityScore').mockResolvedValue(88);
      const newsSpy = vi.spyOn(NewsWorker, 'analyze').mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 80));
        return {
          globalSentiment: 'POSITIF',
          globalScore: 0.45,
          probableImpact: 'Dynamique favorable sur Maroc Telecom.',
          news: [],
          isAI: true,
        };
      });

      const progressA: string[] = [];
      const progressB: string[] = [];

      const [resA, resB] = await Promise.all([
        AetherisOrchestrator.process('IAM', 'SENTIMENT', false, (step) => progressA.push(step)),
        AetherisOrchestrator.process('IAM', 'SENTIMENT', false, (step) => progressB.push(step)),
      ]);

      expect(newsSpy).toHaveBeenCalledTimes(1);
      expect(resA.dataQuality?.agentReliabilityScore).toBe(88);
      expect(resB.dataQuality?.agentReliabilityScore).toBe(88);
      const allProgress = [...progressA, ...progressB];
      expect(progressA.length).toBeGreaterThanOrEqual(2);
      expect(progressB.length).toBeGreaterThanOrEqual(2);
      expect(allProgress.some((s) => s.includes('COALESCENCE'))).toBe(true);
    });

    it('downgrades confidenceLevel and warns when shortTerm BUY contradicts mediumTerm & longTerm SELL', async () => {
      vi.spyOn(CacheService, 'get').mockResolvedValue(null);
      vi.spyOn(CacheService, 'set').mockResolvedValue(undefined);
      vi.spyOn(BMCEBourseScraper, 'resolveStock').mockResolvedValue({
        id: '1234',
        symbol: 'IAM',
        name: 'MAROC TELECOM',
        uuid: '',
      });
      vi.spyOn(NewsWorker, 'analyze').mockResolvedValue({
        globalSentiment: 'NEUTRE',
        globalScore: 0,
        probableImpact: 'Flux neutres.',
        news: [],
        isAI: true,
      });
      vi.spyOn(MarketWorker, 'analyze').mockResolvedValue({
        price: '100.00 MAD',
        technicalTrend: 'Neutre',
        marketSituation: 'Consolidation technique',
        rsi: { value: '50', interpretation: 'Neutre' },
        support: '95.00 MAD',
        resistance: '108.00 MAD',
        signals: ['RSI neutre'],
        liquidityWarning: { isLiquid: true, dailyVolume: 15000 },
      });
      vi.spyOn(FundamentalWorker, 'analyze').mockResolvedValue({
        fundamentals: {
          peRatio: '16.5',
          dividendYield: '4.2%',
          marketCap: '88 Mrd MAD',
          roe: '19.0%',
          netProfit: '5.1 Mrd MAD',
        },
      });
      vi.spyOn(MacroScraper, 'getMacroData').mockResolvedValue(null);
      vi.spyOn(GeminiService, 'synthesizeAnalysis').mockResolvedValue({
        finalAction: 'ACHETER',
        confidenceLevel: 'Élevé',
        why: 'Rebond technique court terme.',
        idealEntryPoint: '99.00 MAD',
        takeProfit: '108.00 MAD',
        stopLoss: '95.00 MAD',
        risk: 'Moyen',
        keyPoints: ['Support technique proche'],
        horizons: {
          shortTerm: {
            finalAction: 'ACHETER',
            idealEntryPoint: '99.00 MAD',
            takeProfit: '108.00 MAD',
            stopLoss: '95.00 MAD',
            risk: 'Moyen',
            why: 'Rebond technique CT.',
            keyPoints: ['Rebond sur 99 MAD'],
            strategyPlan: 'Entrée sur 99 MAD.',
            confidenceLevel: 'Élevé',
          },
          mediumTerm: {
            finalAction: 'VENDRE',
            idealEntryPoint: '102.00 MAD',
            takeProfit: '90.00 MAD',
            stopLoss: '107.00 MAD',
            risk: 'Élevé',
            why: 'Tendance baissière MT.',
            keyPoints: ['Pression MT'],
          },
          longTerm: {
            finalAction: 'VENDRE',
            idealEntryPoint: '102.00 MAD',
            takeProfit: '85.00 MAD',
            stopLoss: '108.00 MAD',
            risk: 'Élevé',
            why: 'Pression fondamentale LT.',
            keyPoints: ['Marge sous pression'],
          },
        },
      } as any);

      const strategyRes = await AetherisOrchestrator.process('IAM', 'STRATEGY', true);
      expect(strategyRes.confidenceLevel).toBe('Faible');
      expect(strategyRes.orchestrator?.contradictionDetected).toContain('Divergence multi-horizons');
      expect(strategyRes.dataQuality?.warnings.some((w) => w.includes('Divergence multi-horizons'))).toBe(true);
    });
  });

  describe('6. Agent Robo-Advisor (Filtre Sharia AAOIFI, Frais 0.99%, Cash Cap & HHI)', () => {
    it('blocks Haram BUY orders under shariaOnly while computing 0.99% brokerage fees, cash cap, and HHI score', () => {
      const holdings = [
        { symbol: 'IAM', totalQuantity: 100, curPrice: 100, totalCost: 9000, sector: 'Télécoms' },
        { symbol: 'ATW', totalQuantity: 20, curPrice: 500, totalCost: 9000, sector: 'Banques' },
      ];

      const aiParsed = {
        allocations: [
          { sector: 'Télécoms', current: 50, target: 70 },
          { sector: 'Banques', current: 50, target: 30 },
        ],
        orders: [
          { type: 'BUY', symbol: 'ATW', quantity: 5, reason: 'Renforcement banque' },
          { type: 'BUY', symbol: 'IAM', quantity: 50, reason: 'Renforcement Télécoms' },
        ],
        rationale: 'Rééquilibrage Sharia avec plafond de liquidités.',
      };

      const res = validatePortfolioOptimization(aiParsed, holdings, {
        shariaOnly: true,
        availableCashMAD: 2050,
      });

      expect(res.shariaMode).toBe(true);
      expect(res.blockedHaramOrdersCount).toBe(1);
      expect(res.orders.some((o) => o.symbol === 'ATW')).toBe(false);

      const iamBuy = res.orders.find((o) => o.symbol === 'IAM');
      expect(iamBuy).toBeDefined();
      expect(iamBuy!.quantity).toBe(20);
      expect(iamBuy!.estimatedAmountMAD).toBe(2000);
      expect(iamBuy!.estimatedFeeMAD).toBe(19.8);

      expect(res.feesSummary?.feeRatePct).toBe(0.99);
      expect(res.feesSummary?.totalEstimatedFeesMAD).toBe(19.8);
      expect(res.feesSummary?.netCashImpactMAD).toBe(-2019.8);

      expect(res.diversification?.hhiCurrent).toBe(5000);
      expect(res.diversification?.hhiTarget).toBe(5800);
      expect(res.diversification?.concentrationRisk).toBe('ÉLEVÉ');
      expect(res.diversification?.scoreBefore).toBeLessThanOrEqual(100);
    });
  });

  describe('7. Agent Sharia Screener (Double Dénominateur & Purification Consolidée)', () => {
    it('evaluates both Market Cap and Total Assets denominators and respects denominatorMethod=TOTAL_ASSETS', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.MISTRAL_API_KEY;

      vi.spyOn(TradingViewScraper, 'getShariaBalanceSheet').mockResolvedValue({
        status: 'success',
        ticker: 'IAM',
        companyName: 'MAROC TELECOM',
        sector: 'Communications',
        industry: 'Wireless Telecommunications',
        currency: 'MAD',
        totalRevenue: 36_000_000_000,
        interestDebt: 15_000_000_000,
        interestCash: 3_000_000_000,
        marketCap: 40_000_000_000,
        totalAssets: 60_000_000_000,
      });

      vi.spyOn(GeminiService as any, 'generateShariaNarrative').mockResolvedValue({
        sector: 'Télécommunications',
        summary: 'Synthèse sectorielle.',
        explanation: 'Comparaison bilancielle.',
      });

      const res = await GeminiService.analyzeShariaCompliance('IAM', undefined, 'IAM', 'TOTAL_ASSETS');
      expect(res.denominatorComparison).toBeDefined();
      expect(res.denominatorComparison?.activeMethod).toBe('TOTAL_ASSETS');
      expect(res.denominatorComparison?.marketCap?.debtRatio).toBe(37.5);
      expect(res.denominatorComparison?.marketCap?.compliant).toBe(false);
      expect(res.denominatorComparison?.totalAssets?.debtRatio).toBe(25);
      expect(res.denominatorComparison?.totalAssets?.compliant).toBe(true);
      expect(res.debtRatio).toBe(25);
    });

    it('computes consolidated portfolio dividend purification honoring historical buy/sell balance, ticker aliases, and AAOIFI ceil rounding', () => {
      const transactions = [
        {
          id: 'tx-1',
          user_id: 'u1',
          symbol: 'MAROC TELECOM',
          type: 'BUY' as const,
          quantity: 100,
          buy_price: 95,
          buy_date: '2026-01-10',
          is_virtual: false,
          created_at: '2026-01-10T10:00:00Z',
        },
        {
          id: 'tx-2',
          user_id: 'u1',
          symbol: 'IAM',
          type: 'SELL' as const,
          quantity: 40,
          buy_price: 105,
          buy_date: '2026-03-01',
          is_virtual: false,
          created_at: '2026-03-01T10:00:00Z',
        },
        {
          id: 'tx-3',
          user_id: 'u1',
          symbol: 'TQM',
          type: 'BUY' as const,
          quantity: 10,
          buy_price: 1200,
          buy_date: '2026-08-01',
          is_virtual: false,
          created_at: '2026-08-01T10:00:00Z',
        },
      ];

      const dividends = [
        {
          id: 'div-1',
          user_id: 'u1',
          symbol: 'IAM',
          amount_per_share: 4.2,
          dividend_date: '2026-05-15',
          is_virtual: false,
          created_at: '2026-05-15T10:00:00Z',
        },
        {
          id: 'div-2',
          user_id: 'u1',
          symbol: 'TQM',
          amount_per_share: 35,
          dividend_date: '2026-05-20',
          is_virtual: false,
          created_at: '2026-05-20T10:00:00Z',
        },
      ];

      const summary = computeConsolidatedPurification(dividends, transactions, {
        IAM: 2.5,
        'TAQA MOROCCO': 1.2,
      });

      expect(summary.items).toHaveLength(1);
      expect(summary.items[0].symbol).toBe('IAM');
      expect(summary.items[0].sharesHeld).toBe(60);
      expect(summary.items[0].grossDividendMAD).toBe(252);
      expect(summary.items[0].purificationAmountMAD).toBe(7);
      expect(summary.items[0].halalNetMAD).toBe(245);
      expect(summary.totalGrossMAD).toBe(252);
      expect(summary.totalPurificationMAD).toBe(7);
      expect(summary.totalHalalMAD).toBe(245);
    });
  });
});
