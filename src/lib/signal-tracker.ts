import { supabase } from './supabase';

export interface TrackedAiSignal {
  id: string;
  symbol: string;
  companyName: string;
  action: 'ACHETER' | 'VENDRE' | 'ATTENDRE' | string;
  priceAtSignal: string;
  targetPrice?: string;
  stopLoss?: string;
  confidenceLevel?: string;
  createdAt: string;
}

const SESSION_SIGNAL_KEY = 'aetheris_recent_signals';
const MAX_LOCAL_SIGNALS = 8;

let memorySignals: TrackedAiSignal[] = [];

export function getRecentAiSignals(): TrackedAiSignal[] {
  if (typeof window === 'undefined') return memorySignals;
  try {
    const raw = window.sessionStorage.getItem(SESSION_SIGNAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memorySignals = parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return memorySignals;
}

export function clearLocalSignals(): void {
  memorySignals = [];
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_SIGNAL_KEY);
  } catch {
    // Ignore
  }
}

export async function recordAiSignal(signal: Omit<TrackedAiSignal, 'id' | 'createdAt'>): Promise<TrackedAiSignal> {
  const entry: TrackedAiSignal = {
    ...signal,
    id: `${Date.now()}-${signal.symbol}`,
    createdAt: new Date().toISOString(),
  };

  const current = getRecentAiSignals().filter(
    (s) => !(s.symbol === entry.symbol && s.action === entry.action && s.priceAtSignal === entry.priceAtSignal)
  );
  const next = [entry, ...current].slice(0, MAX_LOCAL_SIGNALS);
  memorySignals = next;

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(SESSION_SIGNAL_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }

  // Persistance best-effort dans Supabase si utilisateur authentifié et table migrée
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('ai_signal_history').insert({
        user_id: user.id,
        symbol: entry.symbol,
        company_name: entry.companyName,
        action: entry.action,
        price_at_signal: entry.priceAtSignal,
        target_price: entry.targetPrice || null,
        stop_loss: entry.stopLoss || null,
        confidence_level: entry.confidenceLevel || null,
        source: 'gemini-orchestrator',
      });
    }
  } catch {
    // Silencieux si la table n'a pas encore été migrée
  }

  return entry;
}
