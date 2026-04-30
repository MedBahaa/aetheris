/**
 * INPUT SANITIZER — Protection contre le Prompt Injection et l'injection SQL/LIKE
 * 
 * Ce module est le point de contrôle unique pour toutes les entrées utilisateur
 * avant injection dans les prompts IA (Gemini) et les requêtes Supabase.
 */
export class InputSanitizer {

  // Max length pour un nom de société (ex: "ATTIJARIWAFA BANK" = 17 chars)
  private static readonly MAX_COMPANY_NAME_LENGTH = 60;

  // Patterns suspects de prompt injection
  private static readonly INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous/i,
    /system\s*:/i,
    /\bINSTRUCTION/i,
    /\bOUTPUT\s*\{/i,
    /\bRESPOND\s+WITH/i,
    /```/,
    /\breturn\s+/i,
    /you\s+are\s+now/i,
    /act\s+as\s+/i,
    /forget\s+(all|everything)/i,
    /new\s+instructions?/i,
    /\bprompt\s*:/i,
    /\brole\s*:/i,
    /do\s+not\s+follow/i,
    /override/i,
    /disregard/i,
  ];

  /**
   * Sanitize un nom de société pour injection sûre dans un prompt IA.
   * Supprime tout caractère non-alphanumérique (sauf espaces, tirets, apostrophes, points, parenthèses, &).
   */
  static sanitizeCompanyName(input: string): string {
    if (!input) return '';

    // 1. Trim + uppercase
    let clean = input.trim().toUpperCase();
    
    // 2. Tronquer à la longueur max
    clean = clean.substring(0, this.MAX_COMPANY_NAME_LENGTH);
    
    // 3. Supprimer les caractères non autorisés
    // Autorisés : lettres (avec accents), chiffres, espaces, tirets, apostrophes, points, parenthèses, &
    clean = clean.replace(/[^A-ZÀ-ÿ0-9\s\-'.()&]/gi, '');
    
    // 4. Normaliser les espaces multiples
    clean = clean.replace(/\s+/g, ' ').trim();
    
    return clean;
  }

  /**
   * Vérifie si une entrée contient des patterns de prompt injection.
   * Retourne true si un pattern suspect est détecté.
   */
  static detectInjection(input: string): boolean {
    if (!input) return false;
    return this.INJECTION_PATTERNS.some(p => p.test(input));
  }

  /**
   * Sanitize pour les requêtes DB (Supabase .ilike/.eq)
   * Échappe les caractères spéciaux SQL LIKE : % et _
   */
  static sanitizeForDb(input: string): string {
    let clean = this.sanitizeCompanyName(input);
    // Échapper % et _ qui sont des wildcards dans LIKE/ILIKE
    clean = clean.replace(/%/g, '').replace(/_/g, '');
    return clean;
  }
}
