-- ──────────────────────────────────────────────────────────
-- SCRIPT DE CRÉATION DES TABLES ET DE SÉCURISATION RLS
-- Exécuter ce script dans l'éditeur SQL de Supabase
-- ──────────────────────────────────────────────────────────

-- 0. Création des tables et colonnes manquantes (100% idempotent)

CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    initial_capital NUMERIC(15, 2) DEFAULT 0,
    subscription_tier TEXT DEFAULT 'free',
    telegram_chat_id TEXT,
    whatsapp_phone TEXT,
    alert_channel TEXT DEFAULT 'EMAIL',
    notification_email TEXT,
    username TEXT,
    virtual_initial_capital NUMERIC(15, 2) DEFAULT 100000,
    virtual_balance NUMERIC(15, 2) DEFAULT 100000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
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

-- 1. Activer RLS sur les tables sensibles
ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Création des Politiques pour portfolio_transactions (avec DROP IF EXISTS pour être ré-exécutable)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres transactions" ON public.portfolio_transactions;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres transactions" 
ON public.portfolio_transactions FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent insérer leurs propres transactions" ON public.portfolio_transactions;
CREATE POLICY "Les utilisateurs peuvent insérer leurs propres transactions" 
ON public.portfolio_transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs propres transactions" ON public.portfolio_transactions;
CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres transactions" 
ON public.portfolio_transactions FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs propres transactions" ON public.portfolio_transactions;
CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres transactions" 
ON public.portfolio_transactions FOR DELETE 
USING (auth.uid() = user_id);

-- 3. Création des Politiques pour portfolio_dividends
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres dividendes" ON public.portfolio_dividends;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres dividendes" 
ON public.portfolio_dividends FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent insérer leurs propres dividendes" ON public.portfolio_dividends;
CREATE POLICY "Les utilisateurs peuvent insérer leurs propres dividendes" 
ON public.portfolio_dividends FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs propres dividendes" ON public.portfolio_dividends;
CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres dividendes" 
ON public.portfolio_dividends FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Création des Politiques pour portfolio_alerts
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres alertes" ON public.portfolio_alerts;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres alertes" 
ON public.portfolio_alerts FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent gérer leurs propres alertes" ON public.portfolio_alerts;
CREATE POLICY "Les utilisateurs peuvent gérer leurs propres alertes" 
ON public.portfolio_alerts FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 5. Création des Politiques pour user_profiles
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON public.user_profiles;
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent gérer leur propre profil" ON public.user_profiles;
CREATE POLICY "Les utilisateurs peuvent gérer leur propre profil" 
ON public.user_profiles FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 6. Protection Anti-Élévation de Privilèges (Trigger PostgreSQL)
-- Empêche un utilisateur standard ('authenticated') de s'auto-attribuer 'premium'
-- directement via l'API REST Supabase côté navigateur. Seul 'service_role' peut activer 'premium'.
CREATE OR REPLACE FUNCTION public.protect_user_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_tier := 'free';
    ELSIF TG_OP = 'UPDATE' THEN
      -- Autoriser uniquement la conservation du tier actuel ou la résiliation vers 'free'
      IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier AND NEW.subscription_tier <> 'free' THEN
        RAISE EXCEPTION 'Modification non autorisée de subscription_tier. Passage par le serveur requis.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_user_profile_privileges ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profile_privileges
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_profile_privileged_fields();

-- ──────────────────────────────────────────────────────────
-- Note: Le rôle "service_role" (utilisé par supabaseAdmin dans les crons et webhooks Stripe)
-- bypasse automatiquement ces règles RLS. Les routes utilisateurs standard
-- DOIVENT utiliser le client public avec le header d'autorisation.
-- ──────────────────────────────────────────────────────────
