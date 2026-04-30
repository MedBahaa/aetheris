import { z } from 'zod';

export const SentimentSchema = z.enum(['POSITIF', 'NEGATIF', 'NEUTRE']);
export const ImpactSchema = z.enum(['Court terme', 'Moyen terme', 'Long terme']);
export const ActionSchema = z.enum(['ACHETER', 'ATTENDRE', 'VENDRE']);
export const ConfidenceSchema = z.enum(['Faible', 'Moyen', 'Élevé']);
export const OpportunitySchema = z.enum(['Oui', 'Non', 'À surveiller']);

/**
 * AUDIT FIX: Source tracking — chaque donnée doit être traçable
 */
export const DataSourceSchema = z.enum(['BMCE', 'CASABOURSE', 'OFFICIAL_CASA', 'YAHOO', 'RSS', 'CALCULATED', 'UNKNOWN']);
export type DataSource = z.infer<typeof DataSourceSchema>;

export const DataQualitySchema = z.object({
  score: z.number().min(0).max(100), // 0 = données manquantes, 100 = données complètes et vérifiées
  warnings: z.array(z.string()),
  missingFields: z.array(z.string()),
  sources: z.array(DataSourceSchema),
});
export type DataQuality = z.infer<typeof DataQualitySchema>;

/**
 * AUDIT FIX: Alerte liquidité pour le marché marocain
 */
export const LiquidityWarningSchema = z.object({
  isLiquid: z.boolean(),
  dailyVolume: z.number().optional(),
  message: z.string().optional(),
});
export type LiquidityWarning = z.infer<typeof LiquidityWarningSchema>;

export const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  summary: z.string(),
  sentiment: SentimentSchema,
  impact: ImpactSchema,
  explanation: z.string(),
  source: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
  fullContent: z.string().optional(), // Contenu scrapé en profondeur
  sourceType: z.string().optional(), // RSS, WEB, etc.
});

export const OrchestratorResultSchema = z.object({
  currentSituation: z.string(),
  keyPoints: z.array(z.string()),
  opportunity: OpportunitySchema,
  risk: ConfidenceSchema,
  finalAction: ActionSchema,
  why: z.string(),
  contradictionDetected: z.string().optional().nullable(),
  strategyPlan: z.string().optional(),
  idealEntryPoint: z.string().optional(),
  riskExplication: z.string().optional(),
  confidenceLevel: ConfidenceSchema.optional(),
  stopLoss: z.string().optional(),
  takeProfit: z.string().optional(),
  riskRewardRatio: z.string().optional(),
  timeHorizon: z.string().optional(),
  isAI: z.boolean().optional(),
});

export const MultiHorizonSchema = z.object({
  shortTerm: OrchestratorResultSchema,
  mediumTerm: OrchestratorResultSchema,
  longTerm: OrchestratorResultSchema,
});

export const FundamentalDataSchema = z.object({
  peRatio: z.string().optional(),
  dividendYield: z.string().optional(),
  marketCap: z.string().optional(),
  netProfit: z.string().optional(),
  roe: z.string().optional(),
  margin: z.string().optional(),
  revenueGrowth: z.string().optional(),
  profitGrowth: z.string().optional(),
  sector: z.string().optional(),
  /** AUDIT FIX: Source de chaque donnée fondamentale */
  dataSources: z.record(z.string(), DataSourceSchema).optional(),
});

export const CollectionStatusSchema = z.object({
  status: z.enum(['FULL', 'PARTIAL', 'FAILED']),
  feedsSuccess: z.number(),
  feedsTotal: z.number(),
  articlesFound: z.number(),
});
export type CollectionStatus = z.infer<typeof CollectionStatusSchema>;

export const CompanyAnalysisSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  date: z.string(),
  type: z.enum(['SENTIMENT', 'TECHNICAL', 'STRATEGY', 'FUNDAMENTAL']),
  globalSentiment: SentimentSchema,
  sector: z.string().optional(),
  globalScore: z.number().optional(),
  probableImpact: z.string(),
  consolidatedSummary: z.string().optional(),
  // Technical details
  price: z.string().optional(),
  rsi: z.union([z.string(), z.object({ value: z.string(), interpretation: z.string() })]).optional(),
  support: z.string().optional(),
  resistance: z.string().optional(),
  signals: z.array(z.string()).optional(),
  technicalTrend: z.string().optional(),
  marketSituation: z.string().optional(),
  variation: z.string().optional(),
  variationValue: z.number().optional(),
  // Technical Indicators - Extended
  sma20: z.number().optional(),
  sma50: z.number().optional(),
  /** AUDIT FIX: Label réel de la SMA calculée (ex: "SMA(20)" au lieu de "SMA 50") */
  smaLabel: z.string().optional(),
  pivot: z.number().optional(),
  macd: z.object({
    macd: z.number(),
    signal: z.number(),
    histogram: z.number(),
    trend: z.string(),
  }).optional(),
  // Fundamental details
  fundamentals: FundamentalDataSchema.optional(),
  // Fibonacci
  fibonacci: z.object({
    h23: z.string(),
    h38: z.string(),
    h50: z.string(),
    h61: z.string(),
  }).optional(),
  // News
  news: z.array(NewsItemSchema).optional(),
  // Strategy details
  synthesisSentiment: z.string().optional(),
  synthesisTechnical: z.string().optional(),
  recommendedAction: ActionSchema.optional(),
  confidenceLevel: ConfidenceSchema.optional(),
  strategyPlan: z.string().optional(),
  idealEntryPoint: z.string().optional(),
  riskExplication: z.string().optional(),
  isPremiumSignal: z.boolean().optional(),
  // Orchestrator Synthesis
  orchestrator: OrchestratorResultSchema.optional(),
  horizons: MultiHorizonSchema.optional(),
  /** AUDIT FIX: Qualité des données et avertissements */
  dataQuality: DataQualitySchema.optional(),
  /** AUDIT FIX: Alerte de liquidité */
  liquidityWarning: LiquidityWarningSchema.optional(),
  /** AUDIT FIX: Statut de la collecte RSS */
  collectionStatus: CollectionStatusSchema.optional(),
});

export type CompanyAnalysis = z.infer<typeof CompanyAnalysisSchema>;
export type OrchestratorResult = z.infer<typeof OrchestratorResultSchema>;
export type FundamentalData = z.infer<typeof FundamentalDataSchema>;
export type NewsItem = z.infer<typeof NewsItemSchema>;
export type AgentType = CompanyAnalysis['type'];
export type Sentiment = z.infer<typeof SentimentSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Opportunity = z.infer<typeof OpportunitySchema>;
export type Impact = z.infer<typeof ImpactSchema>;

export const PortfolioTransactionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  symbol: z.string(),
  type: z.enum(['BUY', 'SELL']).default('BUY'),
  quantity: z.number(),
  buy_price: z.number(),
  buy_date: z.string(),
  created_at: z.string(),
});

export type PortfolioTransaction = z.infer<typeof PortfolioTransactionSchema>;

// ──────────────────────────────────────────────
// DIVIDENDE — Reçu par action, versé à une date
// ──────────────────────────────────────────────
export const DividendTransactionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  symbol: z.string(),
  amount_per_share: z.number(),
  dividend_date: z.string(),
  created_at: z.string(),
});
export type DividendTransaction = z.infer<typeof DividendTransactionSchema>;

// ──────────────────────────────────────────────
// ALERTE PRIX — Stop-Loss / Take-Profit
// ──────────────────────────────────────────────
export const PriceAlertSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  symbol: z.string(),
  sl_price: z.number().nullable().optional(),
  tp_price: z.number().nullable().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string(),
});
export type PriceAlert = z.infer<typeof PriceAlertSchema>;

export interface PortfolioHolding {
  symbol: string;
  totalQuantity: number;
  weightedAveragePrice: number;
  totalCost: number;
  totalSold?: number;        // nombre de titres vendus
  realizedPnL?: number;      // PV/MV réalisées sur les ventes
  currentPrice?: number;
  curPrice?: number;         // Prix actuel du marché
  currentValue?: number;
  valuation?: number;        // Valeur actuelle du marché
  gainLoss?: number;
  gainLossPercentage?: number;
  pvNette?: number;          // Performance nette (après taxes)
  slHit?: boolean;           // Stop-Loss atteint
  tpHit?: boolean;           // Take-Profit atteint
  alert?: PriceAlert | null; // Alerte associée
  sector?: string;           // Secteur de l'entreprise
  transactions: PortfolioTransaction[];
}

export interface PortfolioRiskMetrics {
  beta: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercentage: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  realizedPnL: number;
  dividendIncome: number;
  riskMetrics?: PortfolioRiskMetrics;
}
