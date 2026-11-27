// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  sanitizePdfText,
  formatPdfFilename,
  buildAgentReportPdf,
  buildRoboAdvisorPdf,
  buildShariaCertificatePdf,
} from '../lib/pdf-export-service';
import type { CompanyAnalysis, ShariaResult } from '../lib/schemas';

function decodePdfBytes(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('latin1');
}

function extractPdfVisibleText(bytes: Uint8Array): string {
  const raw = decodePdfBytes(bytes);
  const parts: string[] = [];
  const regex = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    parts.push(
      match[1]
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
    );
  }
  return parts.join(' ').replace(/\s+/g, ' ');
}

describe('Aetheris PDF Export Engine (All 7 Agents)', () => {
  describe('0. WinAnsi Sanitization & Filenames', () => {
    it('normalizes narrow NBSP, French typographic punctuation, emojis, and avoids [object Object]', () => {
      const formattedNumber = (1250000).toLocaleString('fr-FR');
      const raw = `Cœur de séance ⚠️ : « ${formattedNumber}\u202FMAD » — seuil ≤ 33,33% → 🚀`;
      const clean = sanitizePdfText(raw);

      expect(clean).not.toContain('\u202F');
      expect(clean).not.toContain('\u00A0');
      expect(clean).not.toContain('œ');
      expect(clean).not.toContain('≤');
      expect(clean).not.toContain('→');
      expect(clean).not.toContain('⚠️');
      expect(clean).toContain('Coeur');
      expect(clean).toContain('<= 33,33%');
      expect(clean).toContain('->');
      expect(clean).toContain('1 250 000 MAD');

      expect(sanitizePdfText('Évolution annuelle : bénéfice estimé à 12%')).toContain('Évolution');
      expect(sanitizePdfText({ a: 'Achat', b: 100 })).toBe('Achat | 100');
      expect(sanitizePdfText({ a: 'Achat', b: 100 })).not.toContain('[object Object]');
      expect(sanitizePdfText(undefined)).toBe('N/A');
    });

    it('generates clean ASCII-safe PDF filenames', () => {
      const fixedDate = new Date('2026-11-27T12:00:00Z');
      expect(formatPdfFilename('Stratégie Alpha', 'MAROC TELECOM (IAM)', fixedDate)).toBe(
        'Aetheris_Strategie_Alpha_MAROC_TELECOM_IAM_2026-11-27.pdf'
      );
      expect(formatPdfFilename('Attestation Sharia', 'ATW', fixedDate)).toBe(
        'Aetheris_Attestation_Sharia_ATW_2026-11-27.pdf'
      );
    });
  });

  describe('1. Agent Sentiment / News PDF', () => {
    it('builds a valid multi-item PDF including weighted score, momentum, events, and all AI news explanations', async () => {
      const analysis: CompanyAnalysis = {
        id: 'sent-iam-1',
        companyName: 'MAROC TELECOM',
        sector: 'Télécoms',
        date: '27/11/2026',
        type: 'SENTIMENT',
        globalSentiment: 'FORTEMENT_POSITIF',
        globalScore: 0.78,
        probableImpact: 'Impulsion haussière court terme attendue sur IAM.',
        consolidatedSummary: 'Les publications trimestrielles dépassent le consensus BVC.',
        isAI: true,
        sentimentMomentum: {
          direction: '📈 AMÉLIORATION',
          variation: '+0.24',
          previousScore: '0.54',
        },
        detectedEvents: ['Publication Résultats', 'Dividende & Distribution'],
        collectionStatus: {
          status: 'FULL',
          feedsSuccess: 5,
          feedsTotal: 5,
          articlesFound: 2,
        },
        dataQuality: {
          score: 94,
          warnings: [],
          missingFields: [],
          sources: ['RSS'],
          agentReliabilityScore: 88,
        },
        news: [
          {
            id: 'art-0',
            summary: 'Maroc Telecom annonce un RNPG en hausse de 6%',
            sentiment: 'FORTEMENT_POSITIF',
            impact: 'Moyen terme',
            explanation: 'Croissance solide portée par les filiales Moov Africa.',
            source: 'AMMC Officiel',
            date: '27/11/2026',
            url: 'https://www.ammc.ma/fr/com/iam-1',
            eventCategory: 'EARNINGS',
            corroboratingSourcesCount: 3,
          },
          {
            id: 'art-1',
            summary: 'Proposition de dividende ordinaire stable',
            sentiment: 'POSITIF',
            impact: 'Court terme',
            explanation: 'Rendement attractif maintenu autour de 4,5%.',
            source: 'Médias24',
            date: '26/11/2026',
            url: 'https://medias24.com/iam-div',
            eventCategory: 'DIVIDEND',
            corroboratingSourcesCount: 2,
          },
        ],
      };

      const { bytes, filename, pageCount } = await buildAgentReportPdf(analysis);
      const raw = decodePdfBytes(bytes);
      const visible = extractPdfVisibleText(bytes);

      expect(filename).toMatch(/^Aetheris_Sentiment_MAROC_TELECOM_/);
      expect(Buffer.from(bytes.slice(0, 5)).toString('ascii')).toBe('%PDF-');
      expect(raw).toContain('%%EOF');
      expect(pageCount).toBeGreaterThanOrEqual(1);
      expect(visible).toContain('MAROC TELECOM');
      expect(visible).toContain('0.78');
      expect(visible).toContain('FORTEMENT_POSITIF');
      expect(visible).toContain('Moov Africa');
      expect(visible).toContain('AMMC Officiel');
      expect(visible).toContain('Page 1 /');
      expect(visible).not.toContain('undefined');
      expect(visible).not.toContain('[object Object]');
    });
  });

  describe('2. Agent Technique / Market PDF', () => {
    it('builds a valid PDF with RSI, Pivots, Fibonacci, ATR(14), Volume Breakout, MASI Alpha, and safe MACD N/A handling', async () => {
      const analysis: CompanyAnalysis = {
        id: 'tech-msa-1',
        companyName: 'MARSA MAROC',
        sector: 'Transport & Ports',
        date: '27/11/2026',
        type: 'TECHNICAL',
        globalSentiment: 'POSITIF',
        probableImpact: 'Configuration haussière au-dessus de la MMS 20.',
        price: '542.00 MAD',
        technicalTrend: 'Haussière',
        rsi: { value: '61', interpretation: 'Haussier' },
        sma20: 525.5,
        sma50: 498.2,
        smaLabel: 'MMS(20) / MMS(50)',
        pivot: 538.0,
        support: '530.00',
        resistance: '555.00',
        fibonacci: { h23: '532.00', h38: '520.00', h50: '510.00', h61: '500.00' },
        atr: {
          atr14: 9.4,
          atrPercent: 1.73,
          dynamicStopBuy: 527.9,
          dynamicTargetBuy: 570.2,
          dynamicStopSell: 556.1,
          dynamicTargetSell: 513.8,
        },
        volumeBreakout: {
          ratio: 2.15,
          avgVolume20: 18400,
          isBreakout: true,
          bollingerBandwidth: 3.4,
          isBollingerSqueeze: true,
        },
        relativeStrengthMasi: {
          stockVariationPct: 3.2,
          masiVariationPct: 0.7,
          alphaPct: 2.5,
          label: 'Surperformance MASI',
        },
        signals: ['Cassure haussière avec 2.15x volume moyen', 'Cours au-dessus de MMS 20 et MMS 50'],
        marketSituation: 'Tendance haussière soutenue par les volumes.',
        liquidityWarning: { isLiquid: true, dailyVolume: 39500 },
        isAI: false,
      };

      const { bytes, filename } = await buildAgentReportPdf(analysis);
      const raw = decodePdfBytes(bytes);
      const visible = extractPdfVisibleText(bytes);

      expect(filename).toMatch(/^Aetheris_Technique_MARSA_MAROC_/);
      expect(Buffer.from(bytes.slice(0, 5)).toString('ascii')).toBe('%PDF-');
      expect(raw).toContain('%%EOF');
      expect(visible).toContain('MARSA MAROC');
      expect(visible).toContain('542.00 MAD');
      expect(visible).toContain('9.40 MAD');
      expect(visible).toContain('CASSURE CONFIRMÉE');
      expect(visible).toContain('Ratio Vol/MM20 : 2.15x');
      expect(visible).toContain('+2.50%');
      expect(visible).toContain('Surperformance MASI');
      expect(visible).not.toContain('NaN');
      expect(visible).not.toContain('[object Object]');
    });
  });

  describe('3. Agent Fondamental PDF', () => {
    it('builds a valid PDF with Grade A quality score, BVC sector benchmark, and data source attribution', async () => {
      const analysis: CompanyAnalysis = {
        id: 'fund-tqm-1',
        companyName: 'TAQA MOROCCO',
        sector: 'Énergie & Utilities',
        date: '27/11/2026',
        type: 'FUNDAMENTAL',
        globalSentiment: 'POSITIF',
        probableImpact: 'Valorisation décotée avec rendement élevé.',
        isAI: false,
        fundamentals: {
          peRatio: '13.4',
          dividendYield: '4.85%',
          marketCap: '29500000000',
          netProfit: '1150000000 MAD',
          roe: '21.5%',
          margin: '16.2%',
          revenueGrowth: '+8.4%',
          profitGrowth: 'N/A',
          sector: 'Utilities & Énergie',
          dataSources: {
            peRatio: 'TRADINGVIEW',
            dividendYield: 'BMCE',
            marketCap: 'CASABOURSE',
          },
          fundamentalQualityScore: {
            score: 84,
            grade: 'A',
            highlights: ['ROE robuste (21.5%)', 'Rendement dividende attractif (4.85%)'],
          },
          sectorBenchmark: {
            sectorName: 'Utilities & Énergie',
            peerCount: 4,
            medianPe: 17.5,
            medianDividendYield: 3.9,
            medianRoe: 14.0,
            peVsSectorPct: -23.4,
            valuationVerdict: 'DÉCOTE',
          },
        },
      };

      const { bytes, filename } = await buildAgentReportPdf(analysis);
      const raw = decodePdfBytes(bytes);
      const visible = extractPdfVisibleText(bytes);

      expect(filename).toMatch(/^Aetheris_Fondamental_TAQA_MOROCCO_/);
      expect(Buffer.from(bytes.slice(0, 5)).toString('ascii')).toBe('%PDF-');
      expect(raw).toContain('%%EOF');
      expect(visible).toContain('Grade A');
      expect(visible).toContain('84 / 100');
      expect(visible).toContain('17.5x');
      expect(visible).toContain('-23.4%');
      expect(visible).toContain('TRADINGVIEW');
      expect(visible).toContain('Value');
      expect(visible).not.toContain('undefined');
    });
  });

  describe('4 & 5. Agents Stratégie & Orchestrateur Multi-Agents PDF', () => {
    it('builds a multi-page institutional PDF covering all 3 horizons (CT/MT/LT), market regime, rolling backtest, and consolidated annex', async () => {
      const analysis: CompanyAnalysis = {
        id: 'strat-lhm-1',
        companyName: 'LAFARGEHOLCIM MAROC',
        sector: 'Bâtiment & Matériaux',
        date: '27/11/2026',
        type: 'STRATEGY',
        globalSentiment: 'POSITIF',
        globalScore: 0.52,
        probableImpact: 'Perspectives constructives sur les grands chantiers.',
        consolidatedSummary: 'Forte visibilité sur les marges opérationnelles.',
        price: '1850.00 MAD',
        technicalTrend: 'Haussière',
        rsi: { value: '58', interpretation: 'Haussier' },
        support: '1800.00',
        resistance: '1950.00',
        pivot: 1845,
        sma20: 1820,
        sma50: 1760,
        smaLabel: 'MMS(20) / MMS(50)',
        marketSituation: 'Tendance haussière validée au-dessus des MMS.',
        marketRegime: 'TRENDING',
        recommendedAction: 'ACHETER',
        confidenceLevel: 'Élevé',
        strategyPlan: 'Accumulation progressive sur repli vers 1820 MAD.',
        idealEntryPoint: '1820.00 MAD',
        isPremiumSignal: true,
        isAI: true,
        strategyBacktest: {
          sampleSize: 18,
          winRatePct: 66.7,
          avgReturnPct: 2.85,
          maxDrawdownPct: 4.1,
          horizonSessions: 5,
        },
        dataQuality: {
          score: 91,
          warnings: [],
          missingFields: [],
          sources: ['RSS', 'BMCE', 'TRADINGVIEW'],
          agentReliabilityScore: 82,
        },
        orchestrator: {
          finalAction: 'ACHETER',
          idealEntryPoint: '1820.00 MAD',
          takeProfit: '2010.00 MAD',
          stopLoss: '1755.00 MAD',
          risk: 'Moyen',
          confidenceLevel: 'Élevé',
          why: 'Alignement positif entre carnet d\'ordres BVC et dynamique technique.',
          keyPoints: [
            'Breakout technique au-dessus de 1820 MAD',
            'Marge opérationnelle supérieure à la médiane sectorielle',
            'Win rate historique positif sur 18 occurrences',
          ],
          isAI: true,
        },
        horizons: {
          shortTerm: {
            finalAction: 'ACHETER',
            idealEntryPoint: '1820.00 MAD',
            takeProfit: '1920.00 MAD',
            stopLoss: '1780.00 MAD',
            risk: 'Moyen',
            confidenceLevel: 'Élevé',
            why: 'Momentum haussier court terme sur rebond support.',
            keyPoints: ['Support 1800 MAD préservé'],
          },
          mediumTerm: {
            finalAction: 'ACHETER',
            idealEntryPoint: '1800.00 MAD',
            takeProfit: '2050.00 MAD',
            stopLoss: '1740.00 MAD',
            risk: 'Moyen',
            confidenceLevel: 'Élevé',
            why: 'Poursuite de la tendance sur 2-4 semaines.',
            keyPoints: ['Croisement haussier MMS20/MMS50'],
          },
          longTerm: {
            finalAction: 'ATTENDRE',
            idealEntryPoint: '1750.00 MAD',
            takeProfit: '2200.00 MAD',
            stopLoss: '1650.00 MAD',
            risk: 'Faible',
            confidenceLevel: 'Moyen',
            why: 'Valorisation proche des sommets annuels à 6-12 mois.',
            keyPoints: ['Surveiller la croissance des volumes BTP'],
          },
        },
        fundamentals: {
          peRatio: '18.2',
          dividendYield: '4.1%',
          marketCap: '43000000000',
          netProfit: '1650000000 MAD',
          roe: '24.0%',
          sector: 'Bâtiment & Matériaux',
        },
        news: [
          {
            id: 'lhm-1',
            summary: 'Hausse de la consommation nationale de ciment',
            sentiment: 'POSITIF',
            impact: 'Moyen terme',
            explanation: 'Catalyseur favorable pour LafargeHolcim Maroc.',
            source: 'Médias24',
            date: '27/11/2026',
            url: 'https://medias24.com/lhm-ciment',
          },
        ],
        signals: ['Tendance haussière confirmée'],
      };

      const { bytes, filename, pageCount } = await buildAgentReportPdf(analysis);
      const raw = decodePdfBytes(bytes);
      const visible = extractPdfVisibleText(bytes);

      expect(filename).toMatch(/^Aetheris_Strategie_Alpha_LAFARGEHOLCIM_MAROC_/);
      expect(Buffer.from(bytes.slice(0, 5)).toString('ascii')).toBe('%PDF-');
      expect(raw).toContain('%%EOF');
      expect(pageCount).toBeGreaterThanOrEqual(2);
      expect(visible).toContain('LAFARGEHOLCIM MAROC');
      expect(visible).toContain('TRENDING');
      expect(visible).toContain('66.7%');
      expect(visible).toContain('Court Terme (1-5J)');
      expect(visible).toContain('Moyen Terme (2-4 Sem)');
      expect(visible).toContain('Long Terme (6-12 Mois)');
      expect(visible).toContain('1920.00 MAD');
      expect(visible).toContain('2050.00 MAD');
      expect(visible).toContain('2200.00 MAD');
      expect(visible).toContain(`Page ${pageCount} / ${pageCount}`);
      expect(visible).not.toContain('[object Object]');
    });
  });

  describe('6. Agent Robo-Advisor PDF', () => {
    it('builds a valid PDF showing Sharia AAOIFI mode, blocked Haram count, HHI score, 0.99% brokerage fees, and rebalancing orders', async () => {
      const recommendation = {
        allocations: [
          { sector: 'Télécoms', current: 60, target: 45 },
          { sector: 'Santé & Médical', current: 40, target: 55 },
        ],
        orders: [
          {
            type: 'BUY' as const,
            symbol: 'AKT',
            quantity: 10,
            reason: 'Renforcement santé conforme Sharia',
            estimatedPriceMAD: 850,
            estimatedAmountMAD: 8500,
            estimatedFeeMAD: 84.15,
          },
        ],
        rationale: 'Rééquilibrage sectoriel conforme AAOIFI avec maîtrise du risque HHI.',
        isAI: true,
        shariaMode: true,
        blockedHaramOrdersCount: 2,
        feesSummary: {
          feeRatePct: 0.99,
          totalBuyAmountMAD: 8500,
          totalSellAmountMAD: 0,
          totalEstimatedFeesMAD: 84.15,
          netCashImpactMAD: -8584.15,
        },
        diversification: {
          hhiCurrent: 5200,
          hhiTarget: 5050,
          scoreBefore: 53,
          scoreAfter: 55,
          concentrationRisk: 'ÉLEVÉ' as const,
        },
      };

      const { bytes, filename } = await buildRoboAdvisorPdf(recommendation, { isVirtualMode: false });
      const raw = decodePdfBytes(bytes);
      const visible = extractPdfVisibleText(bytes);

      expect(filename).toMatch(/^Aetheris_RoboAdvisor_SHARIA_AAOIFI_/);
      expect(Buffer.from(bytes.slice(0, 5)).toString('ascii')).toBe('%PDF-');
      expect(raw).toContain('%%EOF');
      expect(visible).toContain('53/100 -> 55/100');
      expect(visible).toContain('84,15 MAD');
      expect(visible).toContain('0.99%');
      expect(visible).toContain('AKT');
      expect(visible).toContain('2 ordre(s)');
      expect(visible).not.toContain('[object Object]');
    });
  });

  describe('7. Agent Sharia Screener & Purification PDF', () => {
    it('builds an official multi-section AAOIFI PDF with dual denominator comparison, citations, historical years, and consolidated portfolio purification', async () => {
      const shariaResult: ShariaResult = {
        companyName: 'MAROC TELECOM',
        ticker: 'IAM',
        sector: 'Télécommunications',
        isHaramSector: false,
        fiscalYear: 'Annuel 2025',
        isCompliant: true,
        dataQuality: 'MANUAL',
        purificationRate: 2.1,
        debtRatio: 25.0,
        cashRatio: 5.0,
        confidenceScore: 95,
        financialData: {
          totalRevenue: '36 000 000 000 MAD',
          interestIncome: '756 000 000 MAD',
          interestDebt: '15 000 000 000 MAD',
          interestCash: '3 000 000 000 MAD',
          marketCap: '60 000 000 000 MAD',
        },
        summary: 'Titre conforme aux standards AAOIFI sous méthode Total Actif.',
        explanation: 'Revenus d\'intérêts < 5% et dettes <= 33.33% du Total Actif.',
        sources: ['Rapport Annuel AMMC 2025'],
        denominatorComparison: {
          activeMethod: 'TOTAL_ASSETS',
          marketCap: { value: '40 000 000 000 MAD', debtRatio: 37.5, cashRatio: 7.5, compliant: false },
          totalAssets: { value: '60 000 000 000 MAD', debtRatio: 25.0, cashRatio: 5.0, compliant: true },
        },
        historicalYears: [
          { fiscalYear: '2024', debtRatio: 27.4, purificationRate: 1.95 },
          { fiscalYear: '2025', debtRatio: 25.0, purificationRate: 2.1 },
        ],
        citations: [
          { metric: 'Produits financiers (Riba)', pageOrNote: 'Note CPC 4.2', excerpt: 'Intérêts de placements : 756 MDH' },
        ],
      };

      const { bytes, filename } = await buildShariaCertificatePdf(shariaResult, {
        dividendAmount: 1000,
        dividendType: 'BRUT',
        purificationAmount: 21,
        halalAmount: 979,
        canCalculate: true,
        consolidatedPurification: {
          items: [
            {
              symbol: 'IAM',
              dividendDate: '2026-05-15',
              sharesHeld: 100,
              amountPerShare: 4.2,
              grossDividendMAD: 420,
              purificationRatePct: 2.1,
              purificationAmountMAD: 9,
              halalNetMAD: 411,
            },
          ],
          totalGrossMAD: 420,
          totalPurificationMAD: 9,
          totalHalalMAD: 411,
        },
      });

      const raw = decodePdfBytes(bytes);
      const visible = extractPdfVisibleText(bytes);

      expect(filename).toMatch(/^Aetheris_Attestation_Sharia_IAM_/);
      expect(Buffer.from(bytes.slice(0, 5)).toString('ascii')).toBe('%PDF-');
      expect(raw).toContain('%%EOF');
      expect(visible).toContain('MAROC TELECOM (IAM)');
      expect(visible).toContain('2.10%');
      expect(visible).toContain('37.50%');
      expect(visible).toContain('25.00%');
      expect(visible).toContain('Note CPC 4.2');
      expect(visible).toContain('420,00 MAD');
      expect(visible).not.toContain('[object Object]');
    });

    it('renders explicit Haram sector prohibition when isHaramSector is true', async () => {
      const bankResult: ShariaResult = {
        companyName: 'ATTIJARIWAFA BANK',
        ticker: 'ATW',
        sector: 'Banques',
        isHaramSector: true,
        fiscalYear: 'Dernier bilan publié',
        isCompliant: false,
        dataQuality: 'UNVERIFIED',
        purificationRate: 0,
        debtRatio: 45,
        cashRatio: 18,
        financialData: {
          totalRevenue: '30 000 000 000 MAD',
          interestIncome: 'N/A (Secteur illicite)',
          interestDebt: '20 000 000 000 MAD',
          interestCash: '8 000 000 000 MAD',
          marketCap: '110 000 000 000 MAD',
        },
        summary: 'Banque conventionnelle non conforme aux règles de la finance islamique.',
        sources: ['TradingView CSEMA'],
      };

      const { bytes } = await buildShariaCertificatePdf(bankResult);
      const raw = decodePdfBytes(bytes);
      const visible = extractPdfVisibleText(bytes);

      expect(Buffer.from(bytes.slice(0, 5)).toString('ascii')).toBe('%PDF-');
      expect(raw).toContain('%%EOF');
      expect(visible).toContain('ATTIJARIWAFA BANK (ATW)');
      expect(visible).toContain('SECTEUR NON CONFORME');
    });
  });
});
