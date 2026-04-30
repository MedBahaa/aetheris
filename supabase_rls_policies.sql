-- ──────────────────────────────────────────────────────────
-- SCRIPT DE CRÉATION DES TABLES ET DE SÉCURISATION RLS
-- Exécuter ce script dans l'éditeur SQL de Supabase
-- ──────────────────────────────────────────────────────────

-- 0. Création des tables manquantes si elles n'existent pas

CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    initial_capital NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portfolio_dividends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    amount_per_share NUMERIC(10, 4) NOT NULL,
    dividend_date DATE NOT NULL,
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

-- 2. Création des Politiques pour portfolio_transactions
CREATE POLICY "Les utilisateurs peuvent voir leurs propres transactions" 
ON public.portfolio_transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent insérer leurs propres transactions" 
ON public.portfolio_transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres transactions" 
ON public.portfolio_transactions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres transactions" 
ON public.portfolio_transactions FOR DELETE 
USING (auth.uid() = user_id);

-- 3. Création des Politiques pour portfolio_dividends
CREATE POLICY "Les utilisateurs peuvent voir leurs propres dividendes" 
ON public.portfolio_dividends FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent insérer leurs propres dividendes" 
ON public.portfolio_dividends FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres dividendes" 
ON public.portfolio_dividends FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Création des Politiques pour portfolio_alerts
CREATE POLICY "Les utilisateurs peuvent voir leurs propres alertes" 
ON public.portfolio_alerts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent gérer leurs propres alertes" 
ON public.portfolio_alerts FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 5. Création des Politiques pour user_profiles
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent gérer leur propre profil" 
ON public.user_profiles FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- Note: Le rôle "service_role" (utilisé par supabaseAdmin dans les crons)
-- bypasse automatiquement ces règles RLS. Les routes utilisateurs standard
-- DOIVENT utiliser le client public avec le header d'autorisation.
-- ──────────────────────────────────────────────────────────
