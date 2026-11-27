// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { newsEngine } from '../lib/news-engine';
import { NewsWorker, MarketWorker, StrategyWorker } from '../lib/agents/worker-agents';
import { TechnicalEngine } from '../lib/technical-engine';
import { CasabourseScraper } from '../lib/scrapers/casabourse-scraper';
import { CacheService } from '../lib/cache-service';
import { validatePriceLevels, AetherisOrchestrator } from '../lib/agent-engine';
import { GeminiService, validatePortfolioOptimization } from '../lib/gemini';
import { TradingViewScraper, isHaramIndustryOrSector } from '../lib/scrapers/tradingview-scraper';
import { CompanyAnalysisSchema } from '../lib/schemas';

describe('Aetheris Full Agent-by-Agent Audit Fixes', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    CasabourseScraper.clearCache();
    TradingViewScraper.clearCache();
    vi.restoreAllMocks();
  });

  describe('1. Agent Sentiment / News', () => {
    it('excludes relevant=false articles from news[], maps strictly by articleId, and preserves FULL collectionStatus when 0 articles match', async () => {
      vi.spyOn(newsEngine, 'getNewsWithMetrics').mockResolvedValueOnce({
        articles: [],
        metrics: { successCount: 6, totalFeeds: 6 },
      });

      const emptyRes = await NewsWorker.analyze('MAROC TELECOM');
      expect(emptyRes.collectionStatus).toEqual({
        status: 'FULL',
        feedsSuccess: 6,
        feedsTotal: 6,
        articlesFound: 0,
      });
      expect(emptyRes.news).toEqual([]);
      expect(emptyRes.globalSentiment).toBe('NEUTRE');

      vi.spyOn(newsEngine, 'getNewsWithMetrics').mockResolvedValueOnce({
        articles: [
          {
            title: 'IAM Identity Access Management cloud launch',
            link: 'https://example.com/it-false-positive',
            pubDate: new Date().toISOString(),
            contentSnippet: 'False positive IT article.',
            source: 'Google News',
          },
          {
            title: 'Maroc Telecom publie des résultats solides',
            link: 'https://medias24.com/iam-results',
            pubDate: new Date().toISOString(),
            contentSnippet: 'Résultat net en hausse à la Bourse de Casablanca.',
            source: 'Médias24 Actualités',
          },
        ],
        metrics: { successCount: 5, totalFeeds: 6 },
      });

      vi.spyOn(GeminiService, 'analyzeNewsSentiment').mockResolvedValueOnce({
        globalScore: 0.7,
        impactSummary: 'Résultats solides.',
        consolidatedSummary: 'Maroc Telecom affiche de solides performances.',
        aiAvailable: true,
        // Intentionally inverted order vs input array to assert articleId lookup + relevant=false filtering
        details: [
          {
            articleId: 'art-1',
            relevant: true,
            sentiment: 'FORTEMENT_POSITIF',
            score: 0.8,
            impact: 'Moyen terme',
            explanation: 'Croissance du résultat net.',
          },
          {
            articleId: 'art-0',
            relevant: false,
            sentiment: 'NEUTRE',
            score: 0,
            impact: 'Court terme',
            explanation: 'Hors sujet informatique.',
          },
        ],
      });

      const res = await NewsWorker.analyze('MAROC TELECOM');
      expect(res.collectionStatus?.status).toBe('PARTIAL');
      expect(res.news).toHaveLength(1);
      expect(res.news?.[0].id).toBe('art-1');
      expect(res.news?.[0].sentiment).toBe('FORTEMENT_POSITIF');
      expect(res.news?.[0].summary).toContain('Maroc Telecom');
      expect(res.globalSentiment).toBe('FORTEMENT_POSITIF');
    });

    it('deduplicates French accented vs unaccented titles via normalized Jaccard similarity', async () => {
      const mockParser = (newsEngine as any).parser;
      vi.spyOn(mockParser, 'parseURL').mockImplementation(async (...args: unknown[]) => {
        const url = String(args[0] || '');
        if (!url.includes('medias24')) return { items: [] };
        return {
          items: [
            {
              title: 'MAROC TELECOM : Résultats financiers annuels en progression',
              link: 'https://medias24.com/iam-1',
              pubDate: '2026-11-26T10:00:00Z',
              contentSnippet: 'Résultats annuels en hausse.',
            },
            {
              title: 'MAROC TELECOM : Resultats financiers annuels en progression',
              link: 'https://challenge.ma/iam-2',
              pubDate: '2026-11-26T09:00:00Z',
              contentSnippet: 'Resultats annuels en hausse.',
            },
          ],
        };
      });
      vi.spyOn(newsEngine as any, 'fetchFullContent').mockResolvedValue(null);

      const res = await newsEngine.getNewsWithMetrics('MAROC TELECOM');
      expect(res.articles).toHaveLength(1);
    });

    it('normalizes mixed-case/English sentiment and impact enums returned by Gemini', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      vi.spyOn(CacheService, 'getGeneric').mockResolvedValue(null);
      vi.spyOn(CacheService, 'setGeneric').mockResolvedValue(undefined as any);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        globalScore: 1.4,
                        impactSummary: 'Impact positif',
                        consolidatedSummary: 'Bonne nouvelle.',
                        details: [
                          {
                            articleId: 'art-0',
                            relevant: true,
                            sentiment: 'strongly positive',
                            score: 1.5,
                            impact: 'Short Term',
                            explanation: 'Hausse du dividende.',
                          },
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const parsed = await GeminiService.analyzeNewsSentiment('IAM', [
        { title: 'IAM augmente son dividende', source: 'Médias24' },
      ]);
      expect(parsed.aiAvailable).toBe(true);
      expect(parsed.globalScore).toBe(1);
      expect(parsed.details[0].sentiment).toBe('FORTEMENT_POSITIF');
      expect(parsed.details[0].impact).toBe('Court terme');
      expect(parsed.details[0].score).toBe(1);
    });
  });

  describe('2. Agent Technique / Marché', () => {
    it('preserves RSI = 0 on 15 consecutive declining sessions, flags volume = 0 as illiquid, and keeps RSI = 50 as Neutre', () => {
      const fallingPrices = Array.from({ length: 16 }, (_, i) => 120 - i * 2);
      const fallingTech = TechnicalEngine.calculate(fallingPrices, 0);
      expect(fallingTech.rsi.value).toBe(0);
      expect(fallingTech.rsi.interpretation).toBe('Survente');
      expect(fallingTech.volumeSignal).toContain('Illiquide');

      // 15 alternating points = 7 gains (+2) and 7 losses (-2) => exact Wilder RSI 50
      const balancedPrices = Array.from({ length: 15 }, (_, i) => (i % 2 === 0 ? 100 : 102));
      const balancedTech = TechnicalEngine.calculate(balancedPrices, 5000);
      expect(balancedTech.rsi.value).toBe(50);
      expect(balancedTech.rsi.interpretation).toBe('Neutre');
    });

    it('handles NaN or negative volumes safely in MarketWorker.checkLiquidity without leaking dailyVolume: NaN', () => {
      const nanCheck = MarketWorker.checkLiquidity(NaN);
      expect(nanCheck.isLiquid).toBe(true);
      expect(nanCheck.dailyVolume).toBeUndefined();
      expect(nanCheck.message).toContain('Volume non disponible');
    });
  });

  describe('3. Agent Fondamental', () => {
    it('does not cache empty Casabourse HTML results and recovers cleanly on the next call', async () => {
      const validHtml = `
        <table><tbody><tr>
          <td>MAROC TELECOM (IAM)</td>
          <td data-column-key="pe_ratio">15.20</td>
          <td data-column-key="dividend_yield">4.80%</td>
          <td data-column-key="profit_margin">18.50%</td>
          <td data-column-key="revenue_aagr">2.10%</td>
          <td data-column-key="net_income_aagr">3.40%</td>
          <td>1</td><td>2</td><td>3</td><td>4</td>
        </tr></tbody></table>
      `;
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response('<html><body>Maintenance</body></html>', { status: 200 }))
        .mockResolvedValueOnce(new Response(validHtml, { status: 200 }));

      const first = await CasabourseScraper.getFundamentalData('MAROC TELECOM', 'IAM');
      expect(first.status).toBe('error');

      const second = await CasabourseScraper.getFundamentalData('MAROC TELECOM', 'IAM');
      expect(second.status).toBe('success');
      expect(second.peRatio).toBe('15.20');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('4. Agent Stratégie', () => {
    it('avoids RSI=NaN, guards N/A support in idealEntryPoint, and caps confidenceLevel to Faible when illiquid', () => {
      const res = StrategyWorker.synthesize(
        {
          globalSentiment: 'FORTEMENT_POSITIF',
          globalScore: 0.9,
          collectionStatus: { status: 'FULL', feedsSuccess: 6, feedsTotal: 6, articlesFound: 6 },
        },
        {
          price: '120.00 MAD',
          support: 'N/A',
          rsi: { value: 'N/A', interpretation: 'Données insuffisantes' },
          macd: { macd: 1.5, signal: 1.0, histogram: 0.5, trend: 'Haussier' },
          variationValue: 2.5,
          liquidityWarning: { isLiquid: false, dailyVolume: 50, message: '🔴 ILLIQUIDE' },
        }
      );

      expect(res.recommendedAction).toBe('ACHETER');
      expect(res.confidenceLevel).toBe('Faible');
      expect(res.strategyPlan).not.toContain('NaN');
      expect(res.idealEntryPoint).toBe('120.00 MAD');
      expect(res.riskExplication).toContain('Liquidité faible');
    });
  });

  describe('5. Orchestrateur Multi-Agents, CacheService & ImpactValidator', () => {
    it('reads Vercel Marketplace KV_REST_API_URL & KV_REST_API_TOKEN fallback in CacheService', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.KV_REST_API_URL = 'https://kv-test.upstash.io';
      process.env.KV_REST_API_TOKEN = 'kv-secret-token';

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ result: JSON.stringify({ cached: true }) }), { status: 200 })
      );

      const val = await CacheService.get('IAM', 'TECHNICAL');
      expect(val).toEqual({ cached: true });
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://kv-test.upstash.io',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer kv-secret-token' }),
        })
      );
    });

    it('rejects >2.5x BUY take-profit hallucinations and guards out-of-range entry prices in R:R', () => {
      const res = validatePriceLevels('ACHETER', 100, '1000.00 MAD', '95.00 MAD', '200.00 MAD');
      expect(res.tp).toBe('112.00 MAD ⚠️ (recalculé: TP original incohérent)');
      expect(res.sl).toBe('95.00 MAD');
      // Falls back to currentPrice=100 for R:R -> (112 - 100) / (100 - 95) = 2.4
      expect(res.riskRewardRatio).toBe('1:2.4');
    });

    it('detects contradictions on FORTEMENT_POSITIF vs Baissière trend and validates CompanyAnalysisSchema momentum', () => {
      const orch = (AetherisOrchestrator as any).generateFinalOrchestration(
        'IAM',
        { globalSentiment: 'FORTEMENT_POSITIF', probableImpact: 'Haussier' },
        { price: '100.00 MAD', technicalTrend: 'Baissière', rsi: { value: '35', interpretation: 'Baissier' } },
        { recommendedAction: 'ATTENDRE', confidenceLevel: 'Faible' }
      );
      expect(orch.contradictionDetected).toContain('Divergence détectée');

      const parsed = CompanyAnalysisSchema.safeParse({
        id: 'iam-1',
        companyName: 'MAROC TELECOM',
        date: '27/11/2026',
        type: 'SENTIMENT',
        globalSentiment: 'POSITIF',
        probableImpact: 'Haussier',
        sentimentMomentum: {
          direction: '📈 AMÉLIORATION',
          variation: '0.25',
          previousScore: '0.30',
        },
      });
      expect(parsed.success).toBe(true);
    });

    it('recognizes FORTEMENT_POSITIF and FORTEMENT_NEGATIF in ImpactValidator', async () => {
      vi.resetModules();
      vi.doMock('../lib/supabase-server', () => ({
        supabaseAdmin: {
          from: (table: string) => {
            if (table === 'news_items') {
              return {
                select: () => ({
                  eq: () => ({
                    gte: () => ({
                      lte: () => ({
                        not: async () => ({
                          data: [
                            {
                              title: 'Bénéfices records',
                              sentiment_label: 'FORTEMENT_POSITIF',
                              impact: 'Court terme',
                              timestamp: '2026-11-20T10:00:00Z',
                              url: 'https://example.com/1',
                            },
                            {
                              title: 'Avertissement sur résultats',
                              sentiment_label: 'FORTEMENT_NEGATIF',
                              impact: 'Court terme',
                              timestamp: '2026-11-20T10:00:00Z',
                              url: 'https://example.com/2',
                            },
                          ],
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  order: async () => ({
                    data: [
                      { price: 100, timestamp: '2026-11-20T12:00:00Z' },
                      { price: 105, timestamp: '2026-11-26T12:00:00Z' },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          },
        },
      }));

      try {
        const { ImpactValidator } = await import('../lib/impact-validator');
        const results = await ImpactValidator.validate('comp-1', 7);
        expect(results).toHaveLength(2);
        expect(results[0].isAccurate).toBe(true);
        expect(results[1].isAccurate).toBe(false);
      } finally {
        vi.doUnmock('../lib/supabase-server');
        vi.resetModules();
      }
    });
  });

  describe('6. Agent Robo-Advisor Portefeuille', () => {
    it('prevents cumulative multi-order SELL shorting, drops contradictory BUY+SELL on same symbol, and overrides hallucinated current weights', () => {
      const holdings = [
        { symbol: 'IAM', totalQuantity: 10, totalCost: 1000, sector: 'Télécoms' }, // valuation omitted -> derived 1000 (25%)
        { symbol: 'ATW', totalQuantity: 5, curPrice: 600, sector: 'Banques' },   // valuation omitted -> derived 3000 (75%)
      ];

      const aiParsed = {
        allocations: [
          { sector: 'Télécoms', current: 99, target: 40 },
          { sector: 'Banques', current: 1, target: 60 },
        ],
        orders: [
          { type: 'SELL', symbol: 'IAM', quantity: 6, reason: 'Prise de profit 1' },
          { type: 'SELL', symbol: 'IAM', quantity: 8, reason: 'Prise de profit 2 (dépasse cumul)' },
          { type: 'BUY', symbol: 'ATW', quantity: 2, reason: 'Renforcement' },
          { type: 'SELL', symbol: 'ATW', quantity: 2, reason: 'Ordre contradictoire' },
        ],
        rationale: 'Rééquilibrage contrôlé.',
      };

      const res = validatePortfolioOptimization(aiParsed, holdings);
      expect(res.allocations.find((a) => a.sector === 'Télécoms')?.current).toBe(25);
      expect(res.allocations.find((a) => a.sector === 'Banques')?.current).toBe(75);

      const iamSells = res.orders.filter((o) => o.symbol === 'IAM' && o.type === 'SELL');
      expect(iamSells.map((o) => o.quantity)).toEqual([6, 4]);
      expect(res.orders.filter((o) => o.symbol === 'ATW')).toHaveLength(1);
      expect(res.orders.find((o) => o.symbol === 'ATW')?.type).toBe('BUY');
    });
  });

  describe('7. Agent Sharia Screener AAOIFI', () => {
    it('flags SAH, AFM, TSF, SOF and extended finance/insurance industries as Haram', () => {
      expect(isHaramIndustryOrSector('Finance', 'Other', 'SAH')).toBe(true);
      expect(isHaramIndustryOrSector('Finance', 'Other', 'AFM')).toBe(true);
      expect(isHaramIndustryOrSector('Finance', 'Other', 'TSF')).toBe(true);
      expect(isHaramIndustryOrSector('Finance', 'Other', 'SOF')).toBe(true);
      expect(isHaramIndustryOrSector('Finance', 'Life/Health Insurance', 'XYZ')).toBe(true);
      expect(isHaramIndustryOrSector('Finance', 'Commercial Banks', 'XYZ')).toBe(true);
      expect(isHaramIndustryOrSector('Finance', 'Consumer Lending', 'XYZ')).toBe(true);
    });

    it('merges TradingView marketCap when Grounding extracts CPC interestIncome with marketCap=null', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      vi.spyOn(CacheService, 'getGeneric').mockResolvedValue(null);
      vi.spyOn(CacheService, 'setGeneric').mockResolvedValue(undefined as any);

      const mockUniverse = [
        {
          s: 'CSEMA:IAM',
          d: ['IAM', 'Maroc Telecom SA', 'Communications', 'Wireless Telecommunications', 80000000000, 77000000000, 36000000000, 36500000000, 20000000000, 2000000000, null, 'MAD'],
        },
      ];

      vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('scanner.tradingview.com/morocco/scan')) {
          return new Response(JSON.stringify({ data: mockUniverse }), { status: 200 });
        }
        if (url.includes('generativelanguage.googleapis.com')) {
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          companyName: 'Maroc Telecom',
                          ticker: 'IAM',
                          sector: 'Télécommunications',
                          fiscalYear: 'Annuel 2025',
                          confidenceScore: 88,
                          explanation: 'CPC extrait du rapport annuel.',
                          rawFinancials: {
                            totalRevenue: 36000000000,
                            interestIncome: 360000000,
                            interestDebt: 20000000000,
                            interestCash: 2000000000,
                            marketCap: null,
                          },
                          summary: 'Titre conforme après complément capitalisation.',
                          sources: ['https://www.ammc.ma/rapport-iam-2025.pdf'],
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200 }
          );
        }
        return new Response('{}', { status: 404 });
      });

      const res = await GeminiService.analyzeShariaCompliance('IAM', undefined, 'IAM');
      expect(res.interestIncomeMissing).toBe(false);
      expect(res.purificationRate).toBe(1);
      expect(res.debtRatio).toBe(25);
      expect(res.cashRatio).toBe(2.5);
      expect(res.estimatedCompliance).toBe(true);
      expect(res.sources.some((s) => s.includes('TradingView'))).toBe(true);
    });
  });
});
