/**
 * INPUT SANITIZER — Protection contre le Prompt Injection, PostgREST Injection, XSS et CSV Formula Injection
 * 
 * Ce module est le point de contrôle unique pour toutes les entrées utilisateur
 * avant injection dans les prompts IA (Gemini), les requêtes Supabase et le rendu UI.
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
    /<\s*\/?\s*untrusted_data\s*>/i,
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
   * Sanitize pour les requêtes DB paramétrées (Supabase .ilike/.eq)
   * Échappe les caractères spéciaux SQL LIKE : % et _
   */
  static sanitizeForDb(input: string): string {
    let clean = this.sanitizeCompanyName(input);
    // Échapper % et _ qui sont des wildcards dans LIKE/ILIKE
    clean = clean.replace(/%/g, '').replace(/_/g, '');
    return clean;
  }

  /**
   * Sanitize strict pour l'interpolation dans un filtre PostgREST `.or(...)`.
   * Supprime tous les délimiteurs syntaxiques PostgREST (virgules, points, parenthèses, wildcards, quotes)
   * afin d'empêcher l'injection de prédicats logiques arbitraires.
   */
  static sanitizePostgrestFilter(input: string): string {
    if (!input) return '';
    return input
      .trim()
      .toUpperCase()
      .substring(0, this.MAX_COMPANY_NAME_LENGTH)
      .replace(/[^A-ZÀ-ÿ0-9\s\-&]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Valide qu'une URL externe utilise exclusivement les protocoles http: ou https:
   * Retourne null si l'URL est malformée ou utilise un schéma dangereux (javascript:, data:, vbscript:, file:).
   */
  static sanitizeHttpUrl(rawUrl: string | null | undefined): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  /**
   * Nettoie le texte externe non fiable avant inclusion dans une balise <untrusted_data>
   * afin d'empêcher la fermeture prématurée du délimiteur XML.
   */
  static wrapUntrustedForPrompt(label: string, content: string, maxChars: number = 15000): string {
    const safeLabel = label.replace(/[^A-Za-z0-9_\- ]/g, '').substring(0, 40);
    const cleaned = String(content || '')
      .substring(0, maxChars)
      .replace(/<\s*\/?\s*untrusted_data[^>]*>/gi, '[DELIMITER_STRIPPED]');
    return `<untrusted_data source="${safeLabel}">\n${cleaned}\n</untrusted_data>`;
  }

  /**
   * Échappe les caractères HTML spéciaux pour prévenir l'injection HTML/XSS
   * dans les emails transactionnels (Resend) et messages Telegram (parse_mode: HTML).
   */
  static escapeHtml(input: string): string {
    if (!input) return '';
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Protège contre l'injection de formules CSV (CSV / DDE Formula Injection)
   * Préfixe toute cellule commençant par =, +, -, @, \t ou \r et échappe les guillemets.
   */
  static sanitizeCsvCell(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') {
      return Number.isFinite(val) ? String(val) : '0';
    }
    const str = String(val).replace(/[\r\n]+/g, ' ').trim();
    const escaped = str.replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(escaped)) {
      return `"'${escaped}"`;
    }
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes(';')) {
      return `"${escaped}"`;
    }
    return escaped;
  }
}
