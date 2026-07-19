# Documentation : API Temps Réel de la Bourse de Casablanca (BVC)

Cette API publique est hébergée sur **Firebase Realtime Database** et sert de flux de données principal pour les plateformes financières marocaines comme `boursa.ma` et en passerelle de secours pour `wafabourse.com`.

---

## 1. Informations de Connexion Directe (REST API)

Puisqu'il s'agit d'une base de données Firebase ouverte en lecture publique, vous pouvez récupérer l'intégralité des flux en effectuant des requêtes `GET` HTTP standards sur les points d'accès JSON suivants :

### 📈 Flux des Actions (Stocks Live)
* **URL :** `https://coronavirus-tracker-m.firebaseio.com/live/stocks.json`
* **Description :** Retourne les valeurs, variations, volumes et limites des 81 actions cotées à la Bourse de Casablanca.

### 📊 Flux des Indices (Indices Live)
* **URL :** `https://coronavirus-tracker-m.firebaseio.com/live/indices.json`
* **Description :** Retourne les valeurs des indices de marché (MASI, MASI 20, indices sectoriels comme BANK, IMMOB, etc.).

---

## 2. Structure des Données (Payload JSON)

### A. Format pour une Action (Stock)
Chaque clé correspond au code ticker officiel (ex : `AKT` pour Akdital, `IAM` pour Maroc Telecom) :

```json
"AKT": {
  "c": 1140.00,          // c = Cours courant / Closing price
  "o": 1145.00,          // o = Cours d'ouverture / Opening price
  "h": 1150.00,          // h = Plus haut de la séance / Session High
  "l": 1140.00,          // l = Plus bas de la séance / Session Low
  "rp": 1145.00,         // rp = Cours de référence / Reference Price
  "v": -0.70,            // v = Pourcentage de variation / Variation percentage (-0.70%)
  "vol": 3135975.00,     // vol = Volume d'échange global en MAD / Session volume
  "tr": 83,              // tr = Nombre de transactions / Trades count
  "t": 1784302214660     // t = Timestamp epoch Unix (millisecondes)
}
```

### B. Format pour un Indice
Chaque clé correspond au code de l'indice (ex : `MASI`, `MSI20`, `BANK`) :

```json
"MASI": {
  "v": 17578.83,         // v = Valeur actuelle / Current value
  "vp": -1.18,           // vp = Pourcentage de variation séance / Day variation percentage (-1.18%)
  "vv": 17788.33,        // vv = Veille / Previous close value
  "vy": -6.73,           // vy = Variation Year-to-Date / YTD variation percentage (-6.73%)
  "h": 17783.72,         // h = Plus haut de la séance / Session High
  "l": 17578.6,          // l = Plus bas de la séance / Session Low
  "t": 1784302214660     // t = Timestamp epoch Unix (millisecondes)
}
```

---

## 3. Proxies de Contournement Réseau (Cloudflare Workers)

Si l'accès direct à Firebase est restreint ou si vous souhaitez exécuter des requêtes de type SQL/PostgREST, les applications clientes interrogent ces deux proxys Cloudflare Workers via des requêtes `POST` avec un en-tête `Content-Type: application/json` :

1. **Proxy Primaire (Boursa) :** `https://boursa-proxy.badrhourimeche.workers.dev/`
2. **Proxy Fallback (Wafabourse) :** `https://www.wafabourse.com/api/proxy/data/JNNJ`

### Exemple de corps de requête POST :
```json
{
  "ACTIONS": [
    {
      "ACTION": {
        "NAME": "VALEUR-GRAPH",
        "TYPE": "SELECT",
        "VALUE": "VALEUR-GRAPH"
      },
      "PARAMS": [
        {
          "NAME": "Symbol_",
          "TYPE": "S",
          "VALUE": "AKT"
        }
      ]
    }
  ]
}
```
