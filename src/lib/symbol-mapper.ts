/**
 * SYMBOL MAPPER - Intelligence Layer for Casablanca Stock Exchange
 * Normalizes company names and aliases to their official ticker symbols.
 */

export const SYMBOL_ALIASES: Record<string, string> = {
  // Telecom
  'MAROC TELECOM': 'IAM',
  'ITISSALAT AL MAGHRIB': 'IAM',
  
  // Banks
  'ATTIJARIWAFA BANK': 'ATW',
  'ATTIJARI': 'ATW',
  'AWB': 'ATW',
  'BANK OF AFRICA': 'BOA',
  'BMCE': 'BOA',
  'BMCE BANK': 'BOA',
  'BANQUE POPULAIRE': 'BCP',
  'CENTRALE POPULAIRE': 'BCP',
  'CREDIT DU MAROC': 'CDM',
  'SOCIETE GENERALE': 'SGM', // If applicable
  
  // Healthcare
  'AKDITAL': 'AKT',
  
  // Energy & Industry
  'TAQA MOROCCO': 'TAQ',
  'TAQA': 'TAQ',
  'CIMENTS DU MAROC': 'CMA',
  'LAFARGEHOLCIM': 'LHM',
  'LAFARGE': 'LHM',
  'HOLCIM': 'LHM',
  
  // Real Estate & Construction
  'ALLIANCES': 'ADI',
  'DOHA': 'ADH',
  'ADDOHA': 'ADH',
  'TGCC': 'TGCC',
  'RESIDENCES DAR SAADA': 'RDS',
  'RESID DAR SAADA': 'RDS',
  'DAR SAADA': 'RDS',
  'FENIE BROSSETTE': 'FBR',
  'FENIE': 'FBR',
  
  // Retail & Services
  'LABEL VIE': 'LBV',
  'MARSA MAROC': 'SOD',
  'SODEP': 'SOD',
  'TOTALENERGIES': 'TQM',
  'TOTAL': 'TQM'
};

export class SymbolMapper {
  /**
   * Normalizes an input string to a canonical ticker if a match is found.
   */
  static resolve(input: string): string {
    if (!input) return '';
    
    // 1. Basic Cleaning
    const clean = input.toUpperCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^A-Z0-9\s]/g, ''); // keep only alpha-numeric and spaces
    
    // 2. Direct match in aliases
    if (SYMBOL_ALIASES[clean]) {
      return SYMBOL_ALIASES[clean];
    }
    
    // 3. Partial match or already a symbol
    // (Check if any alias is contained in the input)
    for (const [alias, symbol] of Object.entries(SYMBOL_ALIASES)) {
      if (clean.includes(alias)) return symbol;
    }

    return clean;
  }
}
