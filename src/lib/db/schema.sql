-- SCHEMA POUR AETHERIS AI (SUPABASE)

-- 1. Table des sociétés
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    symbol TEXT UNIQUE NOT NULL,
    bmce_id TEXT, -- L'ID utilisé pour le scraping BMCE Capital
    sector TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Historique des cours (pour calcul techniques)
CREATE TABLE IF NOT EXISTS market_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    price NUMERIC(15, 2) NOT NULL,
    variation TEXT,
    volume NUMERIC(20, 0),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Actualités collectées
CREATE TABLE IF NOT EXISTS news_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    source TEXT, -- Google News, Le360, Telquel, BMCE, etc.
    url TEXT,
    sentiment_score NUMERIC(3, 2), -- -1.00 à 1.00
    sentiment_label TEXT, -- POSITIF, NEGATIF, NEUTRE
    impact TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_news_url UNIQUE (url)
);

-- 4. Comptes-rendus d'analyses (Cache)
CREATE TABLE IF NOT EXISTS analyses_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    result JSONB NOT NULL,
    agent_type TEXT NOT NULL, -- STRATEGY, TECHNICAL, SENTIMENT
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Profils Utilisateurs (Paramètres)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    initial_capital NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_market_history_company ON market_history(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_company ON news_items(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_companies_symbol ON companies(symbol);

