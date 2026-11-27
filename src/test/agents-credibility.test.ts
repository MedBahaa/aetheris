// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TechnicalEngine } from '../lib/technical-engine';
import { StrategyWorker } from '../lib/agents/worker-agents';
import { newsEngine } from '../lib/news-engine';
import { TradingViewScraper, isHaramIndustryOrSector } from '../lib/scrapers/tradingview-scraper';
import { parseFrenchPrice, validatePriceLevels } from '../lib/agent-engine';
import { validatePortfolioOptimization, GeminiService } from '../lib/gemini';
import { CacheService } from '../lib/cache-service';
import { CompanyAnalysisSchema } from '../lib/schemas';

describe('Agents & Orchestrator Credibility Suite', () => {
  afterEach(() => {
    TradingViewScraper.clearCache();
    vi.restoreAllMocks();
  });

  describe('TechnicalEngine OHLC Pivots & Thresholds', () => {
    it('refuses indicator computation with fewer than 14 sessions', () => {
      const res = TechnicalEngine.calculate([100, 101, 102, 103, 104]);
      expect(res.rsi.value).toBe('N/A');
      expect(res.pivot).toBe('N/A');
      expect(res.support).toBe('N/A');
      expect(res.resistance).toBe('N/A');
      expect(res.trend).toBe('Indéterminé');
      expect(res.dataPointsUsed).toBe(5);
    });

    it('uses real intraday sessionOHLC for PP, R1, and S1 when valid', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 95 + i * 0.25);
      const res = TechnicalEngine.calculate(prices, 5000, { high: 110, low: 90, close: 100 });
      expect(res.pivot).toBe(100);
      expect(res.resistance).toBe(110);
      expect(res.support).toBe(90);
      expect(typeof res.rsi.value).toBe('number');
    });

    it('falls back to 5-session window so S1 < PP < R1 even when last close repeats', () => {
      const prices = [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 96, 98, 99, 100, 100];
      const res = TechnicalEngine.calculate(prices);
      expect(typeof res.support).toBe('number');
      expect(typeof res.pivot).toBe('number');
      expect(typeof res.resistance).toBe('number');
      expect(Number(res.support)).toBeLessThan(Number(res.pivot));
      expect(Number(res.pivot)).toBeLessThan(Number(res.resistance));
    });
  });

  describe('StrategyWorker Symmetrical Scoring & Circuit Breaker', () => {
    it('triggers circuit breaker when market price is missing or zero', () => {
      const res = StrategyWorker.synthesize(
        { globalSentiment: 'FORTEMENT_POSITIF', globalScore: 0.9 },
        { price: 'INDISPONIBLE', rsi: { value: '75', interpretation: 'Surachat' } }
      );
      expect(res.recommendedAction).toBe('ATTENDRE');
      expect(res.confidenceLevel).toBe('Faible');
      expect(res.strategyPlan).toContain('Analyse impossible');
    });

    it('emits ACHETER on strong bullish multi-factor convergence', () => {
      const res = StrategyWorker.synthesize(
        {
          globalSentiment: 'FORTEMENT_POSITIF',
          globalScore: 0.85,
          collectionStatus: { status: 'FULL', feedsSuccess: 4, feedsTotal: 5, articlesFound: 6 },
        },
        {
          price: '120.00',
          support: '115.00',
          rsi: { value: '62', interpretation: 'Haussier' },
          macd: { macd: 1.5, signal: 1.0, histogram: 0.5, trend: 'Haussier' },
          variationValue: 2.5,
        }
      );
      expect(res.recommendedAction).toBe('ACHETER');
      expect(res.confidenceLevel).toBe('Élevé');
      expect(res.idealEntryPoint).toBe('115.00 - 120.00');
    });

    it('emits VENDRE symmetrically on strong bearish multi-factor convergence', () => {
      const res = StrategyWorker.synthesize(
        {
          globalSentiment: 'FORTEMENT_NEGATIF',
          globalScore: -0.9,
          collectionStatus: { status: 'FULL', feedsSuccess: 4, feedsTotal: 5, articlesFound: 6 },
        },
        {
          price: '100.00',
          support: '95.00',
          rsi: { value: '78', interpretation: 'Surachat' },
          macd: { macd: -1.8, signal: -1.0, histogram: -0.8, trend: 'Baissier' },
          variationValue: -4.2,
        }
      );
      expect(res.recommendedAction).toBe('VENDRE');
      expect(res.confidenceLevel).toBe('Élevé');
    });
  });

  describe('NewsEngine Alias Isolation & Sort-Before-Slice', () => {
    it('isolates AUTO HALL (AUH) from ATLANTASANAD (ATH) and extracts parenthetical ticker (SODEP)', async () => {
      const mockParser = (newsEngine as any).parser;
      const parseSpy = vi.spyOn(mockParser, 'parseURL').mockImplementation(async (...args: unknown[]) => {
        const url = String(args[0] || '');
        if (!url.includes('medias24')) return { items: [] };
        return {
          items: [
            {
              title: 'ATLANTASANAD (ATH) publie ses résultats annuels',
              link: 'https://medias24.com/ath-results',
              pubDate: '2026-11-25T10:00:00Z',
              contentSnippet: 'Le titre ATH reste stable à la Bourse de Casablanca.',
            },
            {
              title: 'AUTO HALL (AUH) accélère dans la distribution automobile',
              link: 'https://medias24.com/auh-growth',
              pubDate: '2026-11-25T12:00:00Z',
              contentSnippet: 'AUH annonce de nouveaux showrooms au Maroc.',
            },
            {
              title: 'SODEP enregistre une hausse du trafic portuaire',
              link: 'https://medias24.com/sodep-traffic',
              pubDate: '2026-11-25T14:00:00Z',
              contentSnippet: 'Progression solide du chiffre d affaires de SODEP.',
            },
          ],
        };
      });
      const deepSpy = vi.spyOn(newsEngine as any, 'fetchFullContent').mockResolvedValue(null);

      const auhResult = await newsEngine.getNewsWithMetrics('AUTO HALL');
      expect(auhResult.articles).toHaveLength(1);
      expect(auhResult.articles[0].title).toContain('AUTO HALL');
      expect(auhResult.articles[0].title).not.toContain('ATH');

      const sodepResult = await newsEngine.getNewsWithMetrics('MARSA MAROC (SODEP)');
      expect(sodepResult.articles.some(a => a.title.includes('SODEP'))).toBe(true);
      expect(parseSpy).toHaveBeenCalled();
      expect(deepSpy).toHaveBeenCalled();
    });

    it('sorts articles newest-first before deduplicating & slicing top 15 / deep-scraping top 5', async () => {
      const topics = [
        'dividendes annuels',
        'déploiement réseau 5G',
        'croissance Moov Africa',
        'assemblée générale ordinaire',
        'partenariat cloud souverain',
        'extension câble maritime',
        'tendance boursière Casablanca',
        'lancement fibre optique',
        'rapport financier semestriel',
        'investissement infrastructures',
        'nomination comité exécutif',
        'certification sécurité ISO',
        'accord itinérance Maghreb',
        'modernisation centres données',
        'progression abonnés mobile',
        'attribution nouvelles fréquences',
        'résultats consolidés annuels',
        'transition énergétique pylônes',
        'émission emprunt obligataire',
        'expansion stratégique filiales',
      ];
      const items = topics.map((topic, i) => ({
        title: `MAROC TELECOM : ${topic}`,
        link: `https://medias24.com/iam-${i + 1}`,
        // Deliberately chronological oldest-first in feed: item 0 is oldest (Jan 1), item 19 is newest (Jan 20)
        pubDate: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
        contentSnippet: `Analyse dédiée au dossier ${topic} pour le groupe télécom.`,
      }));

      const mockParser = (newsEngine as any).parser;
      vi.spyOn(mockParser, 'parseURL').mockImplementation(async (...args: unknown[]) => {
        const url = String(args[0] || '');
        if (url.includes('medias24')) return { items };
        return { items: [] };
      });
      const deepSpy = vi.spyOn(newsEngine as any, 'fetchFullContent').mockResolvedValue('Contenu complet');

      const res = await newsEngine.getNewsWithMetrics('MAROC TELECOM');
      expect(res.articles).toHaveLength(15);
      // Newest item (day 20: 'expansion stratégique filiales') must be first, oldest top 5 excluded
      expect(res.articles[0].title).toContain('expansion stratégique filiales');
      expect(res.articles[14].title).toContain('extension câble maritime');
      // Deep scrape strictly capped at 5
      expect(deepSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe('TradingViewScraper Native MAD & Safe FX Fallback', () => {
    it('parses /morocco/scan native MAD fundamentals without NaN or USD distortion', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                s: 'CSEMA:IAM',
                d: ['IAM', 105.5, 95000000000, 14.8, 4.45, 21.5, 6000000000, 19.0, 36000000000, 3.2, 'MAD'],
              },
            ],
          }),
          { status: 200 }
        )
      );

      const res = await TradingViewScraper.getFundamentalData('MAROC TELECOM', 'IAM');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toContain('/morocco/scan');
      expect(res.status).toBe('success');
      expect(res.marketCap).toBe('95000000000');
      expect(res.netProfit).toBe('6 000 000 000 MAD');
      expect(res.peRatio).toBe('14.80');
      expect(res.dividendYield).toBe('4.45 %');
      expect(res.roe).toBe('21.50%');
      expect(res.margin).toBe('19.00%');
      expect(res.revenueGrowth).toBe('3.20%');
    });

    it('reads numeric FX column d[1] (never string d[0]) when TradingView reports USD', async () => {
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [
                {
                  s: 'CSEMA:ATW',
                  d: ['ATW', 500, 10000000000, 12.5, 3.8, 18.0, 900000000, 25.0, 5000000000, 8.0, 'USD'],
                },
              ],
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: [{ s: 'FX_IDC:USDMAD', d: ['USDMAD', 10.0] }],
            }),
            { status: 200 }
          )
        );

      const res = await TradingViewScraper.getFundamentalData('ATTIJARIWAFA BANK', 'ATW');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(res.status).toBe('success');
      expect(res.marketCap).toBe('100000000000');
      expect(res.marketCap).not.toContain('NaN');
      expect(res.netProfit).toBe('9 000 000 000 MAD');
    });
  });

  describe('Orchestrator Price Parsing & Bidirectional TP/SL Validation', () => {
    it('parses French and European number formats without truncation', () => {
      expect(parseFrenchPrice('1 850,50 MAD')).toBeCloseTo(1850.5, 2);
      expect(parseFrenchPrice('1.200,50 MAD')).toBeCloseTo(1200.5, 2);
      expect(parseFrenchPrice('98.45 MAD')).toBeCloseTo(98.45, 2);
      expect(parseFrenchPrice('N/A')).toBe(0);
      expect(parseFrenchPrice('INDISPONIBLE')).toBe(0);
    });

    it('validates BUY & SELL TP/SL coherence and computes bidirectional Risk/Reward ratio', () => {
      const validBuy = validatePriceLevels('ACHETER', 100, '115.00 MAD', '95.00 MAD', '100.00 MAD');
      expect(validBuy.tp).toBe('115.00 MAD');
      expect(validBuy.sl).toBe('95.00 MAD');
      expect(validBuy.riskRewardRatio).toBe('1:3.0');

      const invalidBuy = validatePriceLevels('ACHETER', 100, '90.00 MAD', '110.00 MAD');
      expect(invalidBuy.tp).toContain('recalculé');
      expect(invalidBuy.sl).toContain('recalculé');
      expect(invalidBuy.riskRewardRatio).toBe('1:2.0');

      const validSell = validatePriceLevels('VENDRE', 100, '85.00 MAD', '105.00 MAD', '100.00 MAD');
      expect(validSell.tp).toBe('85.00 MAD');
      expect(validSell.sl).toBe('105.00 MAD');
      expect(validSell.riskRewardRatio).toBe('1:3.0');

      const invalidSell = validatePriceLevels('VENDRE', 100, '110.00 MAD', '90.00 MAD');
      expect(invalidSell.tp).toContain('incohérent pour VENDRE');
      expect(invalidSell.sl).toContain('incohérent pour VENDRE');
      expect(invalidSell.riskRewardRatio).toBe('1:2.0');
    });
  });

  describe('Portfolio Optimizer Post-Validation & Schema Fidelity', () => {
    it('blocks unauthorized short SELLs, caps excess SELL quantities, and normalizes target allocation to 100%', () => {
      const holdings = [
        { symbol: 'IAM', totalQuantity: 10, sector: 'Télécoms', valuation: 1000 },
        { symbol: 'ATW', totalQuantity: 5, sector: 'Banques', valuation: 3000 },
      ];

      const aiParsed = {
        allocations: [
          { sector: 'Télécoms', current: 25, target: 40 },
          { sector: 'Banques', current: 75, target: 40 }, // Intentionally sums to 80%
        ],
        orders: [
          { type: 'SELL', symbol: 'BCP', quantity: 50, reason: 'Short halluciné' }, // Not held -> must be dropped
          { type: 'SELL', symbol: 'IAM', quantity: 99, reason: 'Trop élevé' },     // Held 10 -> capped to 10
          { type: 'BUY', symbol: 'MNG', quantity: 4, reason: 'Diversification' },
        ],
        rationale: 'Rééquilibrage sectoriel.',
      };

      const validated = validatePortfolioOptimization(aiParsed, holdings);
      expect(validated.isAI).toBe(true);
      const sumTargets = validated.allocations.reduce((s, a) => s + a.target, 0);
      expect(sumTargets).toBeCloseTo(100, 1);
      expect(validated.orders.find(o => o.symbol === 'BCP')).toBeUndefined();
      expect(validated.orders.find(o => o.symbol === 'IAM')?.quantity).toBe(10);
      expect(validated.orders.find(o => o.symbol === 'MNG')?.type).toBe('BUY');
    });

    it('preserves FORTEMENT_POSITIF and FORTEMENT_NEGATIF sentiments and isAI flag in CompanyAnalysisSchema', () => {
      const strongPos = CompanyAnalysisSchema.safeParse({
        id: 'test-1',
        companyName: 'MAROC TELECOM',
        date: '26/11/2026',
        type: 'SENTIMENT',
        globalSentiment: 'FORTEMENT_POSITIF',
        probableImpact: 'Haussier',
        isAI: false,
      });
      expect(strongPos.success).toBe(true);
      if (strongPos.success) {
        expect(strongPos.data.globalSentiment).toBe('FORTEMENT_POSITIF');
        expect(strongPos.data.isAI).toBe(false);
      }

      const strongNeg = CompanyAnalysisSchema.safeParse({
        id: 'test-2',
        companyName: 'AUTO HALL',
        date: '26/11/2026',
        type: 'SENTIMENT',
        globalSentiment: 'FORTEMENT_NEGATIF',
        probableImpact: 'Baissier',
        isAI: true,
      });
      expect(strongNeg.success).toBe(true);
      if (strongNeg.success) {
        expect(strongNeg.data.globalSentiment).toBe('FORTEMENT_NEGATIF');
        expect(strongNeg.data.isAI).toBe(true);
      }
    });
  });

  describe('Sharia Screener Hybrid Pipeline & Haram Classification', () => {
    it('flags banks, insurers, leasing, and alcohol as Haram while preserving Real Estate under Finance', () => {
      expect(isHaramIndustryOrSector('Finance', 'Regional Banks', 'ATW')).toBe(true);
      expect(isHaramIndustryOrSector('Finance', 'Multi-Line Insurance', 'WAA')).toBe(true);
      expect(isHaramIndustryOrSector('Finance', 'Finance/Rental/Leasing', 'EQD')).toBe(true);
      expect(isHaramIndustryOrSector('Consumer Non-Durables', 'Beverages: Alcoholic', 'SBM')).toBe(true);
      expect(isHaramIndustryOrSector('Non-Energy Minerals', 'Gold', 'BCP')).toBe(true);

      // Immobilier et Foncières classés sous "Finance" sur TradingView ne doivent PAS être marqués Haram
      expect(isHaramIndustryOrSector('Finance', 'Real Estate Development', 'ADH')).toBe(false);
      expect(isHaramIndustryOrSector('Finance', 'Real Estate Investment Trusts', 'BAL')).toBe(false);
      expect(isHaramIndustryOrSector('Communications', 'Wireless Telecommunications', 'IAM')).toBe(false);
      expect(isHaramIndustryOrSector('Technology Services', 'Packaged Software', 'HPS')).toBe(false);
    });

    it('matches TradingView /morocco/scan balance sheet by ticker and company name in native MAD', async () => {
      const mockUniverse = [
        {
          s: 'CSEMA:IAM',
          d: ['IAM', 'Maroc Telecom SA', 'Communications', 'Wireless Telecommunications', 78151582219, 77454000000, 36681000000, 37649000000, 20128000000, 2112000000, null, 'MAD'],
        },
        {
          s: 'CSEMA:ATW',
          d: ['ATW', 'Attijariwafa Bank SA', 'Finance', 'Regional Banks', 134474887573, 825301980000, 47696456000, 48826774000, 97739425000, null, null, 'MAD'],
        },
      ];

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUniverse }), { status: 200 })
      );

      const iamByName = await TradingViewScraper.getShariaBalanceSheet('Maroc Telecom');
      expect(iamByName.status).toBe('success');
      expect(iamByName.ticker).toBe('IAM');
      expect(iamByName.marketCap).toBe(78151582219);
      expect(iamByName.interestDebt).toBe(20128000000);
      expect(iamByName.interestCash).toBe(2112000000);

      // Uses 6h cache cleanly without second HTTP call
      const atwByTicker = await TradingViewScraper.getShariaBalanceSheet('ATW');
      expect(atwByTicker.status).toBe('success');
      expect(atwByTicker.companyName).toBe('Attijariwafa Bank SA');
    });

    it('gracefully falls back to TradingView balance sheet without fabricating interestIncome when Grounding returns 429', async () => {
      process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
      vi.spyOn(CacheService, 'getGeneric').mockResolvedValue(null);
      vi.spyOn(CacheService, 'setGeneric').mockResolvedValue(undefined as any);

      const mockUniverse = [
        {
          s: 'CSEMA:IAM',
          d: ['IAM', 'Maroc Telecom SA', 'Communications', 'Wireless Telecommunications', 78151582219, 77454000000, 36681000000, 37649000000, 20128000000, 2112000000, null, 'MAD'],
        },
        {
          s: 'CSEMA:ATW',
          d: ['ATW', 'Attijariwafa Bank SA', 'Finance', 'Regional Banks', 134474887573, 825301980000, 47696456000, 48826774000, 97739425000, null, null, 'MAD'],
        },
      ];

      vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('scanner.tradingview.com/morocco/scan')) {
          return new Response(JSON.stringify({ data: mockUniverse }), { status: 200 });
        }
        if (url.includes('generativelanguage.googleapis.com')) {
          const bodyStr = String(init?.body || '');
          if (bodyStr.includes('googleSearch')) {
            return new Response(JSON.stringify({ error: { code: 429, message: 'quota exceeded' } }), { status: 429 });
          }
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          sector: 'Télécommunications',
                          summary: 'Synthèse Sharia basée sur le bilan TradingView CSEMA.',
                          explanation: 'Dette et trésorerie calculées en MAD ; produits financiers à confirmer via PDF AMMC.',
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

      const iamResult = await GeminiService.analyzeShariaCompliance('IAM', undefined, 'IAM');
      expect(iamResult.isHaramSector).toBe(false);
      expect(iamResult.estimatedCompliance).toBe(true);
      expect(iamResult.interestIncomeMissing).toBe(true);
      expect(iamResult.purificationRate).toBe(0);
      expect(iamResult.debtRatio).toBeCloseTo(25.75, 1);
      expect(iamResult.cashRatio).toBeCloseTo(2.7, 1);
      expect(iamResult.financialData.interestIncome).toContain('PDF AMMC');

      const atwResult = await GeminiService.analyzeShariaCompliance('ATW', undefined, 'ATW');
      expect(atwResult.isHaramSector).toBe(true);
      expect(atwResult.isCompliant).toBe(false);
      expect(atwResult.estimatedCompliance).toBe(false);
    });
  });
});
