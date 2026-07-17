'use server';

import { PortfolioService } from './portfolio-service';
import { PortfolioTransaction, DividendTransaction, PriceAlert } from './schemas';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from './supabase-server';
import { GeminiService } from './gemini';

// ──────────────────────────────────────
// TRANSACTIONS (BUY & SELL)
// ──────────────────────────────────────

export async function getPortfolioTransactionsAction(isVirtual: boolean = false): Promise<PortfolioTransaction[]> {
  const client = await createServerSupabase();
  return await PortfolioService.getTransactions(client, isVirtual);
}

export async function addPortfolioTransactionAction(
  tx: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id'>
) {
  const client = await createServerSupabase();
  const result = await PortfolioService.addTransaction(client, tx);
  revalidatePath('/portfolio');
  return result;
}

export async function deletePortfolioTransactionAction(id: string) {
  const client = await createServerSupabase();
  await PortfolioService.deleteTransaction(client, id);
  revalidatePath('/portfolio');
}

export async function deleteSymbolPortfolioAction(symbol: string) {
  const client = await createServerSupabase();
  await PortfolioService.deleteSymbolTransactions(client, symbol);
  revalidatePath('/portfolio');
}

export async function bulkImportAction(data: { 
  transactions: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id'>[],
  dividends: Omit<DividendTransaction, 'id' | 'created_at' | 'user_id'>[]
}) {
  const client = await createServerSupabase();
  await PortfolioService.bulkImport(client, data);
  revalidatePath('/portfolio');
}

// ──────────────────────────────────────
// DIVIDENDES
// ──────────────────────────────────────

export async function getDividendsAction(isVirtual: boolean = false): Promise<DividendTransaction[]> {
  const client = await createServerSupabase();
  return await PortfolioService.getDividends(client, isVirtual);
}

export async function addDividendAction(
  div: Omit<DividendTransaction, 'id' | 'created_at' | 'user_id'>
) {
  const client = await createServerSupabase();
  const result = await PortfolioService.addDividend(client, div);
  revalidatePath('/portfolio');
  return result;
}

export async function deleteDividendAction(id: string) {
  const client = await createServerSupabase();
  await PortfolioService.deleteDividend(client, id);
  revalidatePath('/portfolio');
}

// ──────────────────────────────────────
// ALERTES PRIX (Stop-Loss / Take-Profit)
// ──────────────────────────────────────

export async function getAlertsAction(): Promise<PriceAlert[]> {
  const client = await createServerSupabase();
  return await PortfolioService.getAlerts(client);
}

export async function upsertAlertAction(
  alert: { symbol: string; sl_price?: number | null; tp_price?: number | null }
) {
  const client = await createServerSupabase();
  const result = await PortfolioService.upsertAlert(client, alert);
  revalidatePath('/portfolio');
  return result;
}

// ──────────────────────────────────────
// PROFIL UTILISATEUR (Settings)
// ──────────────────────────────────────

export async function getUserProfileAction() {
  const client = await createServerSupabase();
  return await PortfolioService.getUserProfile(client);
}

export async function upsertUserProfileAction(profile: { 
  initial_capital?: number; 
  subscription_tier?: string;
  telegram_chat_id?: string;
  whatsapp_phone?: string;
  alert_channel?: string;
  username?: string;
  virtual_initial_capital?: number;
  virtual_balance?: number;
}) {
  const client = await createServerSupabase();
  const result = await PortfolioService.upsertUserProfile(client, profile);
  revalidatePath('/portfolio');
  return result;
}

export async function addVirtualTransactionAction(
  tx: Omit<PortfolioTransaction, 'id' | 'created_at' | 'user_id' | 'is_virtual'>
) {
  const client = await createServerSupabase();
  const result = await PortfolioService.addVirtualTransaction(client, tx);
  revalidatePath('/portfolio');
  return result;
}

export async function resetVirtualPortfolioAction(initialCapital?: number) {
  const client = await createServerSupabase();
  const result = await PortfolioService.resetVirtualPortfolio(client, initialCapital);
  revalidatePath('/portfolio');
  return result;
}

export async function getLeaderboardAction() {
  const client = await createServerSupabase();
  return await PortfolioService.getLeaderboard(client);
}

export async function optimizePortfolioAction(holdings: any[]) {
  return await GeminiService.optimizePortfolio(holdings);
}

