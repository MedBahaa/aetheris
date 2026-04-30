// Mock minimal de safeJsonParse (copié de src/lib/gemini.ts après modif)
function safeJsonParse(text) {
  if (!text) return null;
  try {
    let cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(jsonString);
        } catch (innerError) {
          console.error("[JSON Parser] Échec du parse du bloc extrait:", innerError);
        }
      }
    }
  } catch (e) {
    console.error("[JSON Parser] Échec critique d'extraction JSON");
  }
  return null;
}

const testCases = [
  {
    name: "JSON Propre",
    input: '{"key": "value"}',
    expected: {key: "value"}
  },
  {
    name: "JSON avec Markdown",
    input: '```json\n{"key": "value"}\n```',
    expected: {key: "value"}
  },
  {
    name: "JSON avec Préambule (Cas Akdital)",
    input: 'Expert Quantitative Analyst of the Casablanca Stock\n{\n  "peRatio": "36.53",\n  "roe": "N/A"\n}',
    expected: {peRatio: "36.53", roe: "N/A"}
  },
  {
    name: "JSON avec Postambule",
    input: '{"ok": true}\nEspero que te sirva.',
    expected: {ok: true}
  }
];

testCases.forEach(t => {
  const result = safeJsonParse(t.input);
  const success = JSON.stringify(result) === JSON.stringify(t.expected);
  console.log(`${success ? '✅' : '❌'} [${t.name}]`);
  if (!success) console.log(`   Obtenu: ${JSON.stringify(result)}`);
});
