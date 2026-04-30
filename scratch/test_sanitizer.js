/**
 * Test de validation pour le mécanisme de sanitisation IA
 */
function sanitizeAIResult(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const mapValue = (val, mapping, defaultVal) => {
    if (!val) return defaultVal;
    const normalized = String(val).toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    for (const [key, result] of Object.entries(mapping)) {
      if (normalized === key || normalized === result.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) {
        return result;
      }
    }
    return defaultVal;
  };

  const confidenceMap = { "faible": "Faible", "low": "Faible", "moyen": "Moyen", "medium": "Moyen", "eleve": "Élevé", "high": "Élevé" };
  const opportunityMap = { "oui": "Oui", "yes": "Oui", "non": "Non", "no": "Non", "surveiller": "À surveiller", "a surveiller": "À surveiller", "watch": "À surveiller" };
  const actionMap = { "acheter": "ACHETER", "buy": "ACHETER", "vendre": "VENDRE", "sell": "VENDRE", "attendre": "ATTENDRE", "hold": "ATTENDRE", "wait": "ATTENDRE" };

  const processEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return;
    if (entry.confidenceLevel) entry.confidenceLevel = mapValue(entry.confidenceLevel, confidenceMap, "Moyen");
    if (entry.risk) entry.risk = mapValue(entry.risk, confidenceMap, "Moyen");
    if (entry.opportunity) entry.opportunity = mapValue(entry.opportunity, opportunityMap, "À surveiller");
    if (entry.finalAction) entry.finalAction = mapValue(entry.finalAction, actionMap, "ATTENDRE");
  };

  processEntry(obj);
  if (obj.horizons) {
    if (obj.horizons.shortTerm) processEntry(obj.horizons.shortTerm);
    if (obj.horizons.mediumTerm) processEntry(obj.horizons.mediumTerm);
    if (obj.horizons.longTerm) processEntry(obj.horizons.longTerm);
  }
  return obj;
}

const testCase = {
  risk: "Elevé", // Pas d'accent
  opportunity: "a surveiller", // Pas d'accent
  horizons: {
    shortTerm: {
      confidenceLevel: "High", // Anglais
      finalAction: "buy" // Anglais
    },
    longTerm: {
      confidenceLevel: "low",
      opportunity: "Yes"
    }
  }
};

const result = sanitizeAIResult(testCase);
console.log(JSON.stringify(result, null, 2));

const success = 
  result.risk === "Élevé" && 
  result.opportunity === "À surveiller" &&
  result.horizons.shortTerm.confidenceLevel === "Élevé" &&
  result.horizons.shortTerm.finalAction === "ACHETER" &&
  result.horizons.longTerm.confidenceLevel === "Faible" &&
  result.horizons.longTerm.opportunity === "Oui";

console.log(success ? "✅ TEST RÉUSSI" : "❌ TEST ÉCHOUÉ");
if (!success) process.exit(1);
