-- ============================================================================
-- AETHERIS — MIGRATION SÉCURITÉ, TRAÇABILITÉ & CRÉDIBILITÉ BVC (100% IDEMPOTENTE)
-- Exécuter ce script dans Supabase SQL Editor.
-- ============================================================================

-- 1. Idempotence atomique des webhooks Stripe
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- Aucune policy publique : accès exclusif au service_role (backend webhook)

-- 2. Journal d'audit sécurité (modifications profil, canaux OTP, abonnements)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_audit_user_created
  ON public.security_audit_logs (user_id, created_at DESC);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own security audit logs" ON public.security_audit_logs;
CREATE POLICY "Users read own security audit logs"
  ON public.security_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Archive vérifiable des signaux générés par l'Orchestrateur Multi-Agents
CREATE TABLE IF NOT EXISTS public.ai_signal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  action TEXT NOT NULL,
  price_at_signal TEXT,
  target_price TEXT,
  stop_loss TEXT,
  confidence_level TEXT,
  source TEXT DEFAULT 'gemini-orchestrator',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_signal_history_user_created
  ON public.ai_signal_history (user_id, created_at DESC);

ALTER TABLE public.ai_signal_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own AI signals" ON public.ai_signal_history;
CREATE POLICY "Users read own AI signals"
  ON public.ai_signal_history
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own AI signals" ON public.ai_signal_history;
CREATE POLICY "Users insert own AI signals"
  ON public.ai_signal_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Référentiel des états financiers officiels BVC / AMMC versionnés (Sharia & Fonda)
CREATE TABLE IF NOT EXISTS public.bvc_official_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  fiscal_period TEXT NOT NULL,
  total_revenue NUMERIC(18, 2),
  interest_income NUMERIC(18, 2),
  interest_debt NUMERIC(18, 2),
  interest_cash NUMERIC(18, 2),
  market_cap NUMERIC(18, 2),
  source_url TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (ticker, fiscal_period)
);

CREATE INDEX IF NOT EXISTS idx_bvc_official_financials_ticker
  ON public.bvc_official_financials (ticker);

ALTER TABLE public.bvc_official_financials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read verified BVC financials" ON public.bvc_official_financials;
CREATE POLICY "Public read verified BVC financials"
  ON public.bvc_official_financials
  FOR SELECT
  USING (true);
