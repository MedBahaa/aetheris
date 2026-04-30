-- Création de la table des transactions de portefeuille
CREATE TABLE IF NOT EXISTS public.portfolio_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol text NOT NULL,
    quantity numeric NOT NULL CHECK (quantity > 0),
    buy_price numeric NOT NULL CHECK (buy_price >= 0),
    buy_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour accélérer les recherches par utilisateur et symbole
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON public.portfolio_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_symbol ON public.portfolio_transactions(symbol);

-- Activation de la sécurité au niveau des lignes (RLS)
ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;

-- Politique : Un utilisateur ne peut voir que SES transactions
CREATE POLICY "Users can view their own transactions" ON public.portfolio_transactions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Politique : Un utilisateur ne peut insérer que SES transactions
CREATE POLICY "Users can insert their own transactions" ON public.portfolio_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Politique : Un utilisateur ne peut supprimer que SES transactions
CREATE POLICY "Users can delete their own transactions" ON public.portfolio_transactions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Autoriser le rôle service_role (Admin) à tout faire
CREATE POLICY "Service Role Full Access Portfolio" ON public.portfolio_transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
