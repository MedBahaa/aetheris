-- Création de la table des transactions de portefeuille
CREATE TABLE IF NOT EXISTS public.portfolio_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol text NOT NULL,
    type text DEFAULT 'BUY' NOT NULL CHECK (type IN ('BUY', 'SELL')),
    quantity numeric NOT NULL CHECK (quantity > 0),
    buy_price numeric NOT NULL CHECK (buy_price >= 0),
    buy_date date DEFAULT CURRENT_DATE NOT NULL,
    is_virtual boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour accélérer les recherches par utilisateur et symbole
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON public.portfolio_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_symbol ON public.portfolio_transactions(symbol);

-- Activation de la sécurité au niveau des lignes (RLS)
ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;

-- Suppression d'éventuelles anciennes politiques permissives
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.portfolio_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.portfolio_transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.portfolio_transactions;
DROP POLICY IF EXISTS "Service Role Full Access Portfolio" ON public.portfolio_transactions;

-- Politiques alignées Zero Trust (écritures directes limitées au portefeuille réel is_virtual = FALSE)
CREATE POLICY "Les utilisateurs peuvent voir leurs propres transactions" ON public.portfolio_transactions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent insérer leurs propres transactions" ON public.portfolio_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres transactions" ON public.portfolio_transactions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE)
    WITH CHECK (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres transactions" ON public.portfolio_transactions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND COALESCE(is_virtual, FALSE) = FALSE);
