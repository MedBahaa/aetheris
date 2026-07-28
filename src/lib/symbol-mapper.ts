/**
 * SYMBOL MAPPER & SECTOR RESOLVER - Intelligence Layer for Casablanca Stock Exchange (CSE) & Global Stocks
 * Normalizes company names, aliases, and resolves official sectors.
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
  'SOCIETE GENERALE': 'SGM',
  'CFG BANK': 'CFG',
  'CFG': 'CFG',
  'CIH BANK': 'CIH',
  'CIH': 'CIH',
  
  // Healthcare
  'AKDITAL': 'AKT',
  'AKD': 'AKT',
  'SOTHEMA': 'SOT',
  
  // Energy & Industry
  'TAQA MOROCCO': 'TQM',
  'TAQA': 'TQM',
  'TAQ': 'TQM',
  'CIMENTS DU MAROC': 'CMA',
  'LAFARGEHOLCIM': 'LHM',
  'LAFARGE': 'LHM',
  'HOLCIM': 'LHM',
  
  // Real Estate & Construction
  'ALLIANCES': 'ADI',
  'DOHA': 'ADH',
  'ADDOHA': 'ADH',
  'TGCC': 'TGC',
  'TGC': 'TGC',
  'SGTM': 'GTM',
  'GTM': 'GTM',
  'RESIDENCES DAR SAADA': 'RDS',
  'RESID DAR SAADA': 'RDS',
  'DAR SAADA': 'RDS',
  'ARADEI CAPITAL': 'ARD',
  'ARADEI': 'ARD',
  'FENIE BROSSETTE': 'FBR',
  'FENIE': 'FBR',
  
  // Retail & Services
  'LABEL VIE': 'LBV',
  'MARSA MAROC': 'MSA',
  'SODEP': 'MSA',
  'SOD': 'MSA',
  'MSA': 'MSA',
  'TOTALENERGIES': 'TMA',
  'TOTAL': 'TMA',
  'TMA': 'TMA',
  'DISTY TECHNOLOGIES': 'DSH',
  'DISTY': 'DSH',

  // Agroalimentaire
  'COSUMAR': 'CSR',
  'CSM': 'CSR',
  'CSR': 'CSR',
  'LESSEUR': 'LES',
  'LESIEUR TOURAUD': 'LES',
  'OULMES': 'OUL',

  // Holdings & Divers
  'DELTA HOLDING': 'DHO',
  'DHO': 'DHO',
  'CMGP GROUP': 'CMG',
  'CMG': 'CMG',

  // Assurances
  'ATLANTASANAD': 'ATH',
  'ASW': 'ATH',
  'ATH': 'ATH',
  'SANLAM': 'SAH',
  'SAHAM': 'SAH',
  'WAFA ASSURANCE': 'WAA',

  // Gaz
  'AFRIQUIA GAZ': 'AFI',
  'AFG': 'AFI',
  'AFI': 'AFI'
};

export const STATIC_SECTOR_MAP: Record<string, string> = {
  // Telecommunications
  'IAM': 'Télécommunications',
  
  // Banques & Finance
  'ATW': 'Banques',
  'BOA': 'Banques',
  'BCP': 'Banques',
  'CDM': 'Banques',
  'SGM': 'Banques',
  'CFG': 'Banques',
  'CIH': 'Banques',
  'EQD': 'Services Financiers',
  'SAL': 'Services Financiers',
  'WAA': 'Services Financiers',

  // Santé & Médical
  'AKT': 'Santé & Médical',
  'SOT': 'Santé & Médical',
  'PROM': 'Pharmacie',

  // Bâtiment, Matériaux & Immobilier
  'LHM': 'Bâtiment & Matériaux',
  'CMA': 'Bâtiment & Matériaux',
  'ADI': 'Immobilier',
  'ADH': 'Immobilier',
  'RDS': 'Immobilier',
  'TGC': 'Bâtiment & Matériaux',
  'GTM': 'Bâtiment & Matériaux',
  'ARD': 'Immobilier',
  'SNA': 'Bâtiment & Matériaux',
  'FBR': 'Bâtiment & Matériaux',

  // Énergie, Mines & Pétrole
  'TQM': 'Énergie & Utilities',
  'TMA': 'Énergie & Pétrole',
  'AFI': 'Énergie & Gaz',
  'MNG': 'Mines',
  'CMT': 'Mines',
  'SMI': 'Mines',

  // Agroalimentaire & Distribution
  'CSR': 'Agroalimentaire',
  'LBV': 'Distribution',
  'MSA': 'Transport & Logistique',
  'LES': 'Agroalimentaire',
  'UMH': 'Agroalimentaire',
  'OUL': 'Agroalimentaire',
  'BAL': 'Agroalimentaire',
  'MUT': 'Distribution',
  'DSH': 'Distribution Industrielle',

  // Holdings & Diversifié
  'DHO': 'Holdings',
  'CMG': 'Holdings',
  'ZLL': 'Holdings',

  // Assurances
  'ATH': 'Assurances',
  'SAH': 'Assurances',
  'AGMA': 'Assurances',

  // Tech & IT
  'HPS': 'Technologies',
  'DIS': 'Technologies',
  'IBO': 'Technologies',
  'M2M': 'Technologies',
  'NXI': 'Technologies',
  'S2M': 'Technologies',

  // International Tech / Stocks
  'AAPL': 'Technologies',
  'NVDA': 'Technologies',
  'MSFT': 'Technologies',
  'GOOGL': 'Technologies',
  'AMZN': 'E-Commerce & Tech',
  'TSLA': 'Automobile & Tech',
  'META': 'Technologies',
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
    for (const [alias, symbol] of Object.entries(SYMBOL_ALIASES)) {
      if (clean.includes(alias)) return symbol;
    }

    return clean;
  }

  /**
   * Resolves the official sector for a given symbol or company name with automatic heuristics fallback.
   */
  static getSector(symbolInput: string, companyNameOrProvidedSector?: string): string {
    if (companyNameOrProvidedSector && 
        companyNameOrProvidedSector !== 'Inconnu' && 
        companyNameOrProvidedSector !== 'inconnu' && 
        companyNameOrProvidedSector.trim() !== '') {
      return companyNameOrProvidedSector;
    }

    const symbol = SymbolMapper.resolve(symbolInput || '').toUpperCase();
    if (STATIC_SECTOR_MAP[symbol]) {
      return STATIC_SECTOR_MAP[symbol];
    }

    // Heuristic keyword matching on symbol or company name
    const text = (symbolInput + ' ' + (companyNameOrProvidedSector || '')).toUpperCase();
    if (text.includes('BANK') || text.includes('BANQUE') || text.includes('CREDIT') || text.includes('FINANCE') || text.includes('ATTIJARI') || text.includes('BOA')) return 'Banques';
    if (text.includes('IMMO') || text.includes('REAL ESTATE') || text.includes('DOHA') || text.includes('ALLIANCE') || text.includes('DAR SAADA') || text.includes('ARADEI')) return 'Immobilier';
    if (text.includes('CIMENT') || text.includes('HOLCIM') || text.includes('BUILD') || text.includes('TGCC') || text.includes('CONSTRUCT') || text.includes('SGTM')) return 'Bâtiment & Matériaux';
    if (text.includes('HEALTH') || text.includes('SANTE') || text.includes('AKDITAL') || text.includes('CLINIC') || text.includes('PHARMA') || text.includes('SOTHEMA')) return 'Santé & Médical';
    if (text.includes('TECH') || text.includes('SOFTWARE') || text.includes('SYSTEM') || text.includes('INFO') || text.includes('DATA') || text.includes('HPS')) return 'Technologies';
    if (text.includes('MINE') || text.includes('GOLD') || text.includes('OR') || text.includes('MANAGEM') || text.includes('CMT')) return 'Mines';
    if (text.includes('ENERGY') || text.includes('GAZ') || text.includes('PETROL') || text.includes('TAQA') || text.includes('POWER') || text.includes('TOTAL')) return 'Énergie & Utilities';
    if (text.includes('AGRO') || text.includes('FOOD') || text.includes('SUCRE') || text.includes('COSUMAR') || text.includes('LESIEUR')) return 'Agroalimentaire';
    if (text.includes('INSURANCE') || text.includes('ASSUR') || text.includes('SANAD') || text.includes('SAHAM') || text.includes('SANLAM')) return 'Assurances';
    if (text.includes('HOLDING') || text.includes('GROUP') || text.includes('DELTA')) return 'Holdings';

    return 'Autres Secteurs';
  }
}
