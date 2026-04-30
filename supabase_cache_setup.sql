-- Création de la table de cache pour les analyses multi-agents
CREATE TABLE IF NOT EXISTS public.analysis_cache (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker text NOT NULL,
    type text NOT NULL, -- 'SENTIMENT', 'TECHNICAL', 'STRATEGY'
    data jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    
    -- Unicité pour le upsert : une seule analyse par ticker/type
    CONSTRAINT unique_ticker_type UNIQUE (ticker, type)
);

-- Index pour accélérer les recherches par ticker
CREATE INDEX IF NOT EXISTS idx_analysis_cache_ticker ON public.analysis_cache(ticker);

-- RLS (Row Level Security) - Optionnel si utilisé uniquement côté serveur avec service_role
ALTER TABLE public.analysis_cache ENABLE ROW LEVEL SECURITY;

-- Autoriser le service_role à tout faire
CREATE POLICY "Service Role Full Access" ON public.analysis_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
