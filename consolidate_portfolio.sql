-- SCRIPT DE CONSOLIDATION DU PORTEFEUILLE
-- Ce script fusionne les transactions sous des noms d'usage vers les tickers officiels.

-- 1. MAROC TELECOM -> IAM
UPDATE portfolio_transactions 
SET symbol = 'IAM' 
WHERE symbol IN ('MAROC TELECOM', 'ITISSALAT AL MAGHRIB');

-- 2. AKDITAL -> AKT
UPDATE portfolio_transactions 
SET symbol = 'AKT' 
WHERE symbol = 'AKDITAL';

-- 3. ATTIJARIWAFA BANK -> ATW
UPDATE portfolio_transactions 
SET symbol = 'ATW' 
WHERE symbol IN ('ATTIJARIWAFA BANK', 'ATTIJARI', 'AWB');

-- 4. BANK OF AFRICA -> BOA
UPDATE portfolio_transactions 
SET symbol = 'BOA' 
WHERE symbol IN ('BANK OF AFRICA', 'BMCE', 'BMCE BANK');

-- 5. BANQUE POPULAIRE -> BCP
UPDATE portfolio_transactions 
SET symbol = 'BCP' 
WHERE symbol IN ('BANQUE POPULAIRE', 'CENTRALE POPULAIRE');

-- 6. LABEL VIE -> LBV
UPDATE portfolio_transactions 
SET symbol = 'LBV' 
WHERE symbol = 'LABEL VIE';

-- 7. MARSA MAROC -> SOD
UPDATE portfolio_transactions 
SET symbol = 'SOD' 
WHERE symbol IN ('MARSA MAROC', 'SODEP');
