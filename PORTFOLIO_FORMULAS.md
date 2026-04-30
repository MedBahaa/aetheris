# 📊 Documentation des Calculs du Portefeuille - HDBourse

Ce document récapitule les formules logiques et les définitions des indicateurs utilisés dans la gestion de votre portefeuille boursier.

---

## 🏗️ 1. Paramètres de Base
Les calculs reposent sur deux constantes fiscales et tarifaires (définies dans `config.php`) :
- **Frais de Courtage :** `0.99%` (soit `0.0099`) - Appliqués sur l'achat et sur la vente.
- **Taxe sur Plus-Value (TPV) :** `15%` (soit `0.15`) - Appliquée uniquement sur les bénéfices nets.

---

## 📈 2. Calculs par Action (Lignes du Tableau)

### A. Investissement Initial
- **Investi Net** : C'est le montant total réel sorti de votre poche à l'achat.
  > `Investi Net = (Quantité × PRU) × (1 + FRAIS)`

### B. État Actuel
- **Cours** : Prix actuel récupéré en direct.
- **Valorisation** : Valeur brute sur le marché.
  > `Valorisation = Quantité × Cours`

### C. Rentabilité Réelle (Simulée en cas de vente)
C'est ici que la logique est la plus fine, car elle prévoit les coûts de sortie.
1. **PV Brute de Sortie** : Gain avant impôt, après frais de vente.
   > `PV Brute de Sortie = (Valorisation × (1 - FRAIS)) - Investi Net`
2. **Plus-Value Nette** : Gain final "dans la poche".
   - **Si Gain (PV > 0)** : On retire 15% de taxe.
     > `PV Nette = PV Brute de Sortie × (1 - TAXE_PV)`
   - **Si Perte (PV ≤ 0)** : Pas de taxe applicable.
     > `PV Nette = PV Brute de Sortie`

### D. Performance
- **Perf %** : Rendement net de l'investissement.
  > `Perf % = (PV Nette / Investi Net) × 100`

---

## 🏦 3. Résumé Global du Portefeuille

| Indicateur | Formule Logique | Signification |
| :--- | :--- | :--- |
| **Total Investi (Net)** | `Σ(Investi Net)` | Capital total injecté dans le marché. |
| **Valeur Liquidative** | `Σ(Valorisation)` | Estimation brute du portefeuille aujourd'hui. |
| **PV Brute Globale** | `Valeur Liquidative - Total Investi` | Gain théorique avant frais de sortie et taxes. |
| **PV Nette Globale** | `Σ(PV Nette)` | Bénéfice réel total après toutes déductions. |
| **Performance Globale**| `(PV Nette Totale / Total Investi) × 100` | Santé globale de votre stratégie boursière. |

---

> [!IMPORTANT]
> **Note sur la Précision :**
> Les calculs dans `portefeuille.php` sont effectués côté client (JavaScript) pour une réactivité immédiate, tandis que le fichier `Calculator.php` assure la cohérence côté serveur.

---
*Document généré par l'Assistant Antigravity - 2026-04-18*
