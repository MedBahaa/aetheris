/**
 * Configuration des frais et taxes pour le portefeuille boursier (Marché Marocain)
 * Source: PORTFOLIO_FORMULAS.md & Loi de Finances 2026
 */

// Frais de courtage totaux (Courtage 0.55% + Dépositaire 0.33% + Bourse 0.11%)
export const BROKERAGE_FEE = 0.0099; // 0.99%

// Taxe sur les Plus-Values (TPV) - Appliquée sur les bénéfices nets
export const TAX_ON_PROFIT = 0.15; // 15%

// ───────────── FISCALITÉ DES DIVIDENDES (MAROC 2026) ─────────────
// Retenue à la source ÉTAT (TPA 2026): 11.25%
export const DIVIDEND_STATE_TAX = 0.1125; // 11.25%

// Commission Courtier Wafa Bourse / Banque: 2.20% TTC (2% HT + 10% TVA)
export const DIVIDEND_BROKER_FEE = 0.0220; // 2.20% TTC

// Total des déductions sur dividendes bruts: 13.45% (11.25% + 2.20%)
export const DIVIDEND_TOTAL_TAX_RATE = DIVIDEND_STATE_TAX + DIVIDEND_BROKER_FEE; // 0.1345 (13.45%)

// Ratio Net / Brut perçu en compte: 86.55%
export const DIVIDEND_NET_RATIO = 1 - DIVIDEND_TOTAL_TAX_RATE; // 0.8655 (86.55%)
