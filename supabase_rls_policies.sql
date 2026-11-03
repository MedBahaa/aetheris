-- ──────────────────────────────────────────────────────────
-- SCRIPT DE CRÉATION DES TABLES ET DE SÉCURISATION ZERO TRUST (RLS + RESTRICTIVE + RPC)
-- Exécuter ce script dans l'éditeur SQL de Supabase (100% idempotent)
-- ──────────────────────────────────────────────────────────

-- 0. Création des tables et colonnes manquantes (100% idempotent)

CREATE TABLE IF NOT EXISTS public.portfolio_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT DEFAULT 'BUY',
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    buy_price NUMERIC NOT NULL CHECK (buy_price >= 0),
    buy_date DATE DEFAULT CURRENT_DATE NOT NULL,
    is_virtual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.portfolio_transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'BUY';
ALTER TABLE public.portfolio_transactions ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    initial_capital NUMERIC(15, 2) DEFAULT 0,
    subscription_tier TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    telegram_chat_id TEXT,
    telegram_verified BOOLEAN DEFAULT FALSE,
    telegram_verify_code_hash TEXT,
    telegram_verify_expires_at TIMESTAMPTZ,
    whatsapp_phone TEXT,
    whatsapp_verified BOOLEAN DEFAULT FALSE,
    whatsapp_verify_code_hash TEXT,
    whatsapp_verify_expires_at TIMESTAMPTZ,
    alert_channel TEXT DEFAULT 'EMAIL',
    notification_email TEXT,
    username TEXT,
    virtual_initial_capital NUMERIC(15, 2) DEFAULT 100000,
    virtual_balance NUMERIC(15, 2) DEFAULT 100000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS telegram_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS telegram_verify_code_hash TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS telegram_verify_expires_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS whatsapp_verify_code_hash TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS whatsapp_verify_expires_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS alert_channel TEXT DEFAULT 'EMAIL';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS notification_email TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS virtual_initial_capital NUMERIC(15, 2) DEFAULT 100000;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS virtual_balance NUMERIC(15, 2) DEFAULT 100000;

CREATE TABLE IF NOT EXISTS public.portfolio_dividends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    amount_per_share NUMERIC(10, 4) NOT NULL,
    dividend_date DATE NOT NULL,
    is_virtual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.portfolio_dividends ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.portfolio_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    sl_price NUMERIC(15, 2),
    tp_price NUMERIC(15, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Table d'idempotence atomique pour les webhooks Stripe (accès exclusif service_role)
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Activer RLS sur les tables utilisateurs et système
ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- 1b. Purge dynamique intégrale des anciennes politiques (anglaises ET françaises) sur les tables sensibles
-- Élimine tout contournement par combinaison OR de politiques PERMISSIVE résiduelles.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'portfolio_transactions',
        'portfolio_dividends',
        'portfolio_alerts',
        'user_profiles',
        'processed_stripe_events'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 1c. Activer RLS sur toutes les tables de données marché, actualités et caches IA
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN
    EXECUTE 'ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Lecture publique des sociétés" ON public.companies';
    EXECUTE 'CREATE POLICY "Lecture publique des sociétés" ON public.companies FOR SELECT USING (true)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'market_history') THEN
    EXECUTE 'ALTER TABLE public.market_history ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Lecture publique historique marché" ON public.market_history';
    EXECUTE 'CREATE POLICY "Lecture publique historique marché" ON public.market_history FOR SELECT USING (true)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'brokerage_firms') THEN
    EXECUTE 'ALTER TABLE public.brokerage_firms ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Lecture publique sociétés de bourse" ON public.brokerage_firms';
    EXECUTE 'CREATE POLICY "Lecture publique sociétés de bourse" ON public.brokerage_firms FOR SELECT USING (true)';
  END IF;

  -- Tables internes (aucune politique anon/authenticated => accessible uniquement via service_role)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'news_items') THEN
    EXECUTE 'ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public read news_items" ON public.news_items';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analyses_cache') THEN
    EXECUTE 'ALTER TABLE public.analyses_cache ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public read access" ON public.analyses_cache';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analysis_cache') THEN
    EXECUTE 'ALTER TABLE public.analysis_cache ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public read access" ON public.analysis_cache';
  END IF;
END $$;

-- 2. Politiques Zero Trust pour portfolio_transactions (PERMISSIVE + barrières AS RESTRICTIVE)
CREATE POLICY "Les utilisateurs peuvent voir leurs propres transactions"
ON public.portfolio_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent insérer leurs propres transactions"
ON public.portfolio_transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres transactions"
ON public.portfolio_transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE)
WITH CHECK (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres transactions"
ON public.portfolio_transactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

-- Barrières AS RESTRICTIVE infranchissables empêchant toute écriture client directe sur le Paper Trading
CREATE POLICY "rls_restrict_virtual_tx_insert"
ON public.portfolio_transactions
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "rls_restrict_virtual_tx_update"
ON public.portfolio_transactions
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE)
WITH CHECK (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "rls_restrict_virtual_tx_delete"
ON public.portfolio_transactions
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

-- 3. Politiques Zero Trust pour portfolio_dividends (PERMISSIVE + barrières AS RESTRICTIVE)
CREATE POLICY "Les utilisateurs peuvent voir leurs propres dividendes"
ON public.portfolio_dividends
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent insérer leurs propres dividendes"
ON public.portfolio_dividends
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres dividendes"
ON public.portfolio_dividends
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE)
WITH CHECK (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres dividendes"
ON public.portfolio_dividends
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "rls_restrict_virtual_div_insert"
ON public.portfolio_dividends
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "rls_restrict_virtual_div_update"
ON public.portfolio_dividends
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE)
WITH CHECK (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "rls_restrict_virtual_div_delete"
ON public.portfolio_dividends
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

-- 4. Politiques pour portfolio_alerts
CREATE POLICY "Les utilisateurs peuvent voir leurs propres alertes"
ON public.portfolio_alerts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent gérer leurs propres alertes"
ON public.portfolio_alerts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Politiques pour user_profiles
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent gérer leur propre profil"
ON public.user_profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Protection Anti-Élévation de Privilèges, Anti-Altération Financière & Vérification Canaux (Trigger PostgreSQL)
-- Verrouille subscription_tier, stripe_*, virtual_balance, virtual_initial_capital et *_verified contre toute écriture client directe.
CREATE OR REPLACE FUNCTION public.protect_user_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_tier := 'free';
      NEW.stripe_customer_id := NULL;
      NEW.stripe_subscription_id := NULL;
      NEW.virtual_initial_capital := 100000;
      NEW.virtual_balance := 100000;
      NEW.telegram_verified := FALSE;
      NEW.telegram_verify_code_hash := NULL;
      NEW.telegram_verify_expires_at := NULL;
      NEW.whatsapp_verified := FALSE;
      NEW.whatsapp_verify_code_hash := NULL;
      NEW.whatsapp_verify_expires_at := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier AND NEW.subscription_tier <> 'free' THEN
        RAISE EXCEPTION 'Modification non autorisée de subscription_tier. Passage par le serveur requis.';
      END IF;
      IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
         OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
        RAISE EXCEPTION 'Modification non autorisée des identifiants Stripe.';
      END IF;
      IF NEW.virtual_balance IS DISTINCT FROM OLD.virtual_balance
         OR NEW.virtual_initial_capital IS DISTINCT FROM OLD.virtual_initial_capital THEN
        RAISE EXCEPTION 'Modification directe du solde virtuel interdite. Passage par le serveur requis.';
      END IF;

      -- Si l'identifiant Telegram change, révoquer automatiquement la vérification
      IF NEW.telegram_chat_id IS DISTINCT FROM OLD.telegram_chat_id THEN
        NEW.telegram_verified := FALSE;
        NEW.telegram_verify_code_hash := NULL;
        NEW.telegram_verify_expires_at := NULL;
      ELSIF NEW.telegram_verified IS DISTINCT FROM OLD.telegram_verified AND NEW.telegram_verified = TRUE THEN
        RAISE EXCEPTION 'Validation directe de telegram_verified interdite. Passage par le serveur requis.';
      END IF;

      -- Si le numéro WhatsApp change, révoquer automatiquement la vérification
      IF NEW.whatsapp_phone IS DISTINCT FROM OLD.whatsapp_phone THEN
        NEW.whatsapp_verified := FALSE;
        NEW.whatsapp_verify_code_hash := NULL;
        NEW.whatsapp_verify_expires_at := NULL;
      ELSIF NEW.whatsapp_verified IS DISTINCT FROM OLD.whatsapp_verified AND NEW.whatsapp_verified = TRUE THEN
        RAISE EXCEPTION 'Validation directe de whatsapp_verified interdite. Passage par le serveur requis.';
      END IF;

      -- Interdire au client d'écrire ses propres condensats OTP
      IF NEW.telegram_verify_code_hash IS DISTINCT FROM OLD.telegram_verify_code_hash
         AND NEW.telegram_verify_code_hash IS NOT NULL THEN
        RAISE EXCEPTION 'Modification directe du code de vérification Telegram interdite.';
      END IF;
      IF NEW.whatsapp_verify_code_hash IS DISTINCT FROM OLD.whatsapp_verify_code_hash
         AND NEW.whatsapp_verify_code_hash IS NOT NULL THEN
        RAISE EXCEPTION 'Modification directe du code de vérification WhatsApp interdite.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_profile_privileges ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profile_privileges
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_profile_privileged_fields();

-- 7. Transactions Atomiques Paper Trading (Anti-Race Condition TOCTOU avec SELECT ... FOR UPDATE & Date Serveur)
CREATE OR REPLACE FUNCTION public.execute_virtual_order(
  p_user_id UUID,
  p_symbol TEXT,
  p_type TEXT,
  p_quantity NUMERIC,
  p_price NUMERIC,
  p_buy_date TEXT,
  p_fee_rate NUMERIC DEFAULT 0.006
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(15, 2);
  v_value NUMERIC(15, 2);
  v_fee NUMERIC(15, 2);
  v_held_qty NUMERIC;
  v_tx public.portfolio_transactions;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_price IS NULL OR p_price <= 0 THEN
    RAISE EXCEPTION 'Quantité et prix doivent être strictement positifs.';
  END IF;

  IF p_type NOT IN ('BUY', 'SELL') THEN
    RAISE EXCEPTION 'Type d''ordre invalide (BUY ou SELL attendu).';
  END IF;

  -- Garantir l'existence du profil avant verrouillage
  INSERT INTO public.user_profiles (user_id, virtual_initial_capital, virtual_balance)
  VALUES (p_user_id, 100000, 100000)
  ON CONFLICT (user_id) DO NOTHING;

  -- Verrouillage exclusif de la ligne pour éliminer les conditions de course concurrentes
  SELECT COALESCE(virtual_balance, 100000)
  INTO v_balance
  FROM public.user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_value := p_quantity * p_price;
  v_fee := v_value * COALESCE(p_fee_rate, 0.006);

  IF p_type = 'BUY' THEN
    IF v_balance < (v_value + v_fee) THEN
      RAISE EXCEPTION 'Solde virtuel insuffisant (Trésorerie: % MAD vs Requis: % MAD)',
        ROUND(v_balance, 2), ROUND(v_value + v_fee, 2);
    END IF;

    UPDATE public.user_profiles
    SET virtual_balance = v_balance - (v_value + v_fee),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    SELECT COALESCE(SUM(CASE WHEN COALESCE(type, 'BUY') = 'BUY' THEN quantity ELSE -quantity END), 0)
    INTO v_held_qty
    FROM public.portfolio_transactions
    WHERE user_id = p_user_id
      AND is_virtual = TRUE
      AND LOWER(symbol) = LOWER(p_symbol);

    IF v_held_qty < p_quantity THEN
      RAISE EXCEPTION 'Quantité insuffisante d''actions à vendre (% possédées vs % demandées)',
        v_held_qty, p_quantity;
    END IF;

    UPDATE public.user_profiles
    SET virtual_balance = v_balance + (v_value - v_fee),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Forcer CURRENT_DATE côté base pour empêcher l'antidatage des ordres Paper Trading
  INSERT INTO public.portfolio_transactions (user_id, symbol, type, quantity, buy_price, buy_date, is_virtual)
  VALUES (p_user_id, UPPER(TRIM(p_symbol)), p_type, p_quantity, p_price, CURRENT_DATE, TRUE)
  RETURNING * INTO v_tx;

  RETURN to_jsonb(v_tx);
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_virtual_portfolio(
  p_user_id UUID,
  p_initial_capital NUMERIC DEFAULT 100000
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_initial_capital IS NULL OR p_initial_capital <= 0 OR p_initial_capital > 10000000 THEN
    RAISE EXCEPTION 'Le capital virtuel initial doit être compris entre 1 et 10 000 000 MAD.';
  END IF;

  DELETE FROM public.portfolio_transactions
  WHERE user_id = p_user_id AND is_virtual = TRUE;

  DELETE FROM public.portfolio_dividends
  WHERE user_id = p_user_id AND is_virtual = TRUE;

  INSERT INTO public.user_profiles (user_id, virtual_initial_capital, virtual_balance, updated_at)
  VALUES (p_user_id, p_initial_capital, p_initial_capital, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET virtual_initial_capital = EXCLUDED.virtual_initial_capital,
      virtual_balance = EXCLUDED.virtual_balance,
      updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.execute_virtual_order(UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_virtual_order(UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, NUMERIC) TO service_role;

REVOKE ALL ON FUNCTION public.reset_virtual_portfolio(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_virtual_portfolio(UUID, NUMERIC) TO service_role;
