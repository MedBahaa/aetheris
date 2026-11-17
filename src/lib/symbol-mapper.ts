/**
 * SYMBOL MAPPER & SECTOR RESOLVER - Intelligence Layer for Casablanca Stock Exchange (CSE) & Global Stocks
 * Normalizes company names, aliases, BMCE IDs, and resolves official sectors.
 * Supports dynamic runtime registration for newly introduced stocks (IPOs).
 */

export const SYMBOL_ALIASES: Record<string, string> = {
  // Telecom
  'MAROC TELECOM': 'IAM',
  'ITISSALAT AL MAGHRIB': 'IAM',
  'IAM': 'IAM',

  // Banks
  'ATTIJARIWAFA BANK': 'ATW',
  'ATTIJARI': 'ATW',
  'AWB': 'ATW',
  'ATW': 'ATW',
  'BANK OF AFRICA': 'BOA',
  'BMCE': 'BOA',
  'BMCE BANK': 'BOA',
  'BOA': 'BOA',
  'BANQUE POPULAIRE': 'BCP',
  'CENTRALE POPULAIRE': 'BCP',
  'BANQUE CENTRALE POPULAIRE': 'BCP',
  'BCP': 'BCP',
  'CREDIT DU MAROC': 'CDM',
  'CDM': 'CDM',
  'SOCIETE GENERALE': 'SGM',
  'CFG BANK': 'CFG',
  'CFG': 'CFG',
  'CIH BANK': 'CIH',
  'CIH': 'CIH',
  'BMCI': 'BCI',
  'BCI': 'BCI',

  // Financial Services & Fintech (incl. Cash Plus IPO)
  'CASH PLUS': 'CAP',
  'CASHPLUS': 'CAP',
  'CAP': 'CAP',
  'EQDOM': 'EQD',
  'EQD': 'EQD',
  'SALAFIN': 'SLF',
  'SAL': 'SLF',
  'SLF': 'SLF',
  'MAGHREBAIL': 'MAB',
  'MAB': 'MAB',
  'MAROC LEASING': 'MLE',
  'MLE': 'MLE',

  // Healthcare & Pharma (incl. Akdital, Vicenne, T2S IPOs)
  'AKDITAL': 'AKT',
  'AKD': 'AKT',
  'AKT': 'AKT',
  'SOTHEMA': 'SOT',
  'SOT': 'SOT',
  'PROMOPHARM': 'PRO',
  'PROM': 'PRO',
  'PRO': 'PRO',
  'VICENNE': 'VCN',
  'VCN': 'VCN',
  'T2S GRO HOLDING': 'T2S',
  'T2S GRO': 'T2S',
  'T2S': 'T2S',

  // Energy & Utilities
  'TAQA MOROCCO': 'TQM',
  'TAQA': 'TQM',
  'TAQ': 'TQM',
  'TQM': 'TQM',
  'TOTALENERGIES': 'TMA',
  'TOTALENERGIE MM': 'TMA',
  'TOTALENERGIES MARKETING MAROC': 'TMA',
  'TOTAL': 'TMA',
  'TMA': 'TMA',
  'AFRIQUIA GAZ': 'AFI',
  'AFG': 'AFI',
  'AFI': 'AFI',

  // Construction, Building Materials & Real Estate (incl. TGCC, SGTM IPOs)
  'CIMENTS DU MAROC': 'CMA',
  'CIMENTS MAROC': 'CMA',
  'CIMR': 'CMA',
  'CMA': 'CMA',
  'LAFARGEHOLCIM': 'LHM',
  'LAFARGEHOLCIM MAROC': 'LHM',
  'LAFARGE': 'LHM',
  'HOLCIM': 'LHM',
  'LHM': 'LHM',
  'ALLIANCES': 'ADI',
  'ADI': 'ADI',
  'DOHA': 'ADH',
  'ADDOHA': 'ADH',
  'ADH': 'ADH',
  'TGCC': 'TGC',
  'TGC': 'TGC',
  'SGTM': 'GTM',
  'GTM': 'GTM',
  'RESIDENCES DAR SAADA': 'RDS',
  'RESID DAR SAADA': 'RDS',
  'DAR SAADA': 'RDS',
  'RDS': 'RDS',
  'ARADEI CAPITAL': 'ARD',
  'ARADEI': 'ARD',
  'ARD': 'ARD',
  'IMMORENTE': 'IMO',
  'IMMORENTE INVEST': 'IMO',
  'IMO': 'IMO',
  'BALIMA': 'BAL',
  'BAL': 'BAL',
  'FENIE BROSSETTE': 'FBR',
  'FENIE': 'FBR',
  'FBR': 'FBR',
  'SONASID': 'SID',
  'SID': 'SID',
  'ALUMINIUM DU MAROC': 'ALM',
  'ALUMINIUM MAROC': 'ALM',
  'ALM': 'ALM',
  'COLORADO': 'COL',
  'COL': 'COL',
  'JET CONTRACTORS': 'JET',
  'JET': 'JET',
  'AFRIC INDUSTRIES': 'AFI_IND',
  'AFRIC INDUS': 'AFI_IND',

  // Retail, Auto & Transport
  'LABEL VIE': 'LBV',
  'LBV': 'LBV',
  'MARSA MAROC': 'MSA',
  'SODEP': 'MSA',
  'SOD': 'MSA',
  'MSA': 'MSA',
  'STOKVIS NORD AFRIQUE': 'SNA',
  'STOKVIS': 'SNA',
  'SNA': 'SNA',
  'AUTO HALL': 'AUH',
  'AUH': 'AUH',
  'AUTO NEJMA': 'NEJ',
  'NEJ': 'NEJ',
  'ENNAKL': 'NKL',
  'NKL': 'NKL',
  'CTM': 'CTM',
  'SRM': 'SRM',
  'RISMA': 'RIS',
  'RIS': 'RIS',

  // Agroalimentaire & Agriculture (incl. CMGP Group IPO)
  'COSUMAR': 'CSR',
  'CSM': 'CSR',
  'CSR': 'CSR',
  'LESIEUR': 'LES',
  'LESSEUR': 'LES',
  'LESIEUR CRISTAL': 'LES',
  'LESIEUR TOURAUD': 'LES',
  'LES': 'LES',
  'OULMES': 'OUL',
  'OUL': 'OUL',
  'MUTANDIS': 'MUT',
  'MUT': 'MUT',
  'DARI COUSPATE': 'DRI',
  'DRI': 'DRI',
  'CARTIER SAADA': 'CRS',
  'CRS': 'CRS',
  'STE BOISSONS': 'SBM',
  'SOCIETE DES BOISSONS DU MAROC': 'SBM',
  'SBM': 'SBM',
  'UNIMER': 'UMR',
  'UMH': 'UMR',
  'UMR': 'UMR',
  'CMGP GROUP': 'CMG',
  'CMGP': 'CMG',
  'CMG': 'CMG',

  // Mines & Industry
  'MANAGEM': 'MNG',
  'MNG': 'MNG',
  'COMPAGNIE MINIERE DE TOUISSIT': 'CMT',
  'CMT': 'CMT',
  'SMI': 'SMI',
  'REBAB COMPANY': 'REB',
  'REB': 'REB',
  'SNEP': 'SNP',
  'SNP': 'SNP',
  'MAGHREB OXYGENE': 'MOX',
  'MOX': 'MOX',
  'MED PAPER': 'MDP',
  'MDP': 'MDP',
  'DELATTRE LEVIVIER': 'DLM',
  'DELATTRE LEV': 'DLM',
  'DLM': 'DLM',
  'STROC INDUSTRIE': 'STR',
  'STROC INDUS': 'STR',
  'STR': 'STR',

  // Holdings
  'DELTA HOLDING': 'DHO',
  'DHO': 'DHO',
  'ZELLIDJA': 'ZDJ',
  'ZLL': 'ZDJ',
  'ZDJ': 'ZDJ',

  // Insurance
  'ATLANTASANAD': 'ATH',
  'ASW': 'ATH',
  'ATH': 'ATH',
  'SANLAM': 'SAH',
  'SANLAM MAROC': 'SAH',
  'SAHAM': 'SAH',
  'SAH': 'SAH',
  'WAFA ASSURANCE': 'WAA',
  'WAFA ASSUR': 'WAA',
  'WAA': 'WAA',
  'AFMA': 'AFM',
  'AFM': 'AFM',
  'AGMA': 'AGM',
  'AGM': 'AGM',

  // Tech & IT
  'HPS': 'HPS',
  'DISWAY': 'DWY',
  'DIS': 'DWY',
  'DWY': 'DWY',
  'DISTY TECHNOLOGIES': 'DSH',
  'DISTY TECHNOLOG': 'DSH',
  'DISTY': 'DSH',
  'DSH': 'DSH',
  'MICRODATA': 'MIC',
  'MIC': 'MIC',
  'S2M': 'S2M',
  'M2M GROUP': 'M2M',
  'M2M': 'M2M',
  'INVOLYS': 'INV',
  'INV': 'INV',
  'IBMAROC': 'IBC',
  'IBMAROC COM': 'IBC',
  'IBO': 'IBC',
  'IBC': 'IBC',
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
  'BCI': 'Banques',
  'CAP': 'Services Financiers',
  'EQD': 'Services Financiers',
  'SAL': 'Services Financiers',
  'SLF': 'Services Financiers',
  'MAB': 'Services Financiers',
  'MLE': 'Services Financiers',

  // Santé & Médical
  'AKT': 'Santé & Médical',
  'SOT': 'Santé & Médical',
  'PROM': 'Pharmacie',
  'PRO': 'Pharmacie',
  'T2S': 'Santé & Médical',
  'VCN': 'Santé & Médical',

  // Bâtiment, Matériaux & Immobilier
  'LHM': 'Bâtiment & Matériaux',
  'CMA': 'Bâtiment & Matériaux',
  'ADI': 'Immobilier',
  'ADH': 'Immobilier',
  'RDS': 'Immobilier',
  'TGC': 'Bâtiment & Matériaux',
  'GTM': 'Bâtiment & Matériaux',
  'ARD': 'Immobilier',
  'IMO': 'Immobilier',
  'BAL': 'Immobilier',
  'SNA': 'Distribution',
  'FBR': 'Bâtiment & Matériaux',
  'SID': 'Bâtiment & Matériaux',
  'ALM': 'Bâtiment & Matériaux',
  'COL': 'Bâtiment & Matériaux',
  'JET': 'Bâtiment & Matériaux',
  'AFI_IND': 'Industrie',

  // Énergie, Mines & Chimie
  'TQM': 'Énergie & Utilities',
  'TMA': 'Énergie & Pétrole',
  'AFI': 'Énergie & Gaz',
  'MNG': 'Mines',
  'CMT': 'Mines',
  'SMI': 'Mines',
  'REB': 'Mines',
  'SNP': 'Chimie & Industrie',
  'MOX': 'Chimie & Industrie',
  'MDP': 'Industrie',
  'DLM': 'Industrie',
  'STR': 'Industrie',

  // Agroalimentaire, Agriculture & Distribution
  'CSR': 'Agroalimentaire',
  'LBV': 'Distribution',
  'MSA': 'Transport & Logistique',
  'CTM': 'Transport & Logistique',
  'RIS': 'Tourisme & Hôtellerie',
  'LES': 'Agroalimentaire',
  'UMH': 'Agroalimentaire',
  'UMR': 'Agroalimentaire',
  'OUL': 'Agroalimentaire',
  'MUT': 'Agroalimentaire',
  'DRI': 'Agroalimentaire',
  'CRS': 'Agroalimentaire',
  'SBM': 'Agroalimentaire',
  'CMG': 'Équipements Agricoles',
  'DSH': 'Distribution Industrielle',
  'SRM': 'Distribution Industrielle',
  'AUH': 'Distribution Automobile',
  'NEJ': 'Distribution Automobile',
  'NKL': 'Distribution Automobile',

  // Holdings & Diversifié
  'DHO': 'Holdings',
  'ZLL': 'Holdings',
  'ZDJ': 'Holdings',

  // Assurances
  'ATH': 'Assurances',
  'SAH': 'Assurances',
  'WAA': 'Assurances',
  'AGMA': 'Assurances',
  'AGM': 'Assurances',
  'AFM': 'Assurances',

  // Tech & IT
  'HPS': 'Technologies',
  'DIS': 'Technologies',
  'DWY': 'Technologies',
  'IBO': 'Technologies',
  'IBC': 'Technologies',
  'M2M': 'Technologies',
  'NXI': 'Technologies',
  'S2M': 'Technologies',
  'MIC': 'Technologies',
  'INV': 'Technologies',

  // International Tech / Stocks
  'AAPL': 'Technologies',
  'NVDA': 'Technologies',
  'MSFT': 'Technologies',
  'GOOGL': 'Technologies',
  'AMZN': 'E-Commerce & Tech',
  'TSLA': 'Automobile & Tech',
  'META': 'Technologies',
};

/**
 * Référentiel statique des identifiants BMCE Capital Bourse (extrait du flux institutionnel BKB Bourse)
 */
export const STATIC_BMCE_ID_MAP: Record<string, string> = {
  'ADH': '2585582',
  'AFM': '30475766',
  'AFI_IND': '14506826',
  'AFI': '1035527',
  'AGM': '1028379',
  'AKT': '123429130',
  'ADI': '4402446',
  'ALM': '521641',
  'ARD': '58537666',
  'ATH': '3428404',
  'ATW': '56107421',
  'AUH': '1028380',
  'NEJ': '1041513',
  'BAL': '11737507',
  'BCP': '4998885',
  'BCI': '781122',
  'BOA': '53613625',
  'CRS': '4826973',
  'CAP': '150349775',
  'CDM': '781650',
  'CFG': '131057160',
  'CIH': '2395856',
  'CMA': '18337',
  'CMG': '140242147',
  'CMT': '4240267',
  'COL': '11349116',
  'CSR': '26545773',
  'CTM': '277392',
  'DRI': '2199434',
  'DLM': '122620985',
  'DHO': '4625623',
  'DSH': '120097655',
  'DWY': '2966429',
  'NKL': '11527959',
  'EQD': '490590',
  'FBR': '2789058',
  'HPS': '129902470',
  'IBC': '1480974',
  'IMO': '41302964',
  'INV': '2829140',
  'JET': '14333999',
  'LBV': '4307141',
  'LHM': '33076955',
  'LES': '12479758',
  'M2M': '3250676',
  'MOX': '821506',
  'MAB': '680975',
  'MNG': '1103450',
  'MLE': '608605',
  'IAM': '1832967',
  'MDP': '123578755',
  'MIC': '18738219',
  'MUT': '45444984',
  'OUL': '783261',
  'PRO': '3208143',
  'REB': '1033204',
  'RDS': '26125006',
  'RIS': '1730672',
  'S2M': '14524535',
  'SLF': '3570640',
  'SAH': '11994556',
  'GTM': '150904121',
  'SMI': '659253',
  'SNA': '138953776',
  'SNP': '3469755',
  'MSA': '32976479',
  'SID': '499831',
  'SOT': '112290536',
  'SRM': '2829208',
  'SBM': '16693',
  'STR': '13194665',
  'TQM': '23057746',
  'TGC': '115038557',
  'TMA': '28148390',
  'UMR': '12342334',
  'VCN': '146374042',
  'WAA': '935037',
  'ZDJ': '783273',
};

export const CANONICAL_COMPANY_NAMES: Record<string, string> = {
  'IAM': 'MAROC TELECOM',
  'ATW': 'ATTIJARIWAFA BANK',
  'BOA': 'BANK OF AFRICA',
  'BCP': 'BCP',
  'CDM': 'CREDIT DU MAROC',
  'CFG': 'CFG BANK',
  'CIH': 'CIH BANK',
  'BCI': 'BMCI',
  'CAP': 'CASH PLUS',
  'EQD': 'EQDOM',
  'SLF': 'SALAFIN',
  'MAB': 'MAGHREBAIL',
  'MLE': 'MAROC LEASING',
  'AKT': 'AKDITAL',
  'SOT': 'SOTHEMA',
  'PRO': 'PROMOPHARM',
  'VCN': 'VICENNE',
  'T2S': 'T2S GRO HOLDING',
  'TQM': 'TAQA MOROCCO',
  'TMA': 'TOTALENERGIES MARKETING MAROC',
  'AFI': 'AFRIQUIA GAZ',
  'CMA': 'CIMENTS DU MAROC',
  'LHM': 'LAFARGEHOLCIM MAROC',
  'ADI': 'ALLIANCES',
  'ADH': 'ADDOHA',
  'TGC': 'TGCC',
  'GTM': 'SGTM',
  'RDS': 'RESIDENCES DAR SAADA',
  'ARD': 'ARADEI CAPITAL',
  'IMO': 'IMMORENTE INVEST',
  'BAL': 'BALIMA',
  'FBR': 'FENIE BROSSETTE',
  'SID': 'SONASID',
  'ALM': 'ALUMINIUM DU MAROC',
  'COL': 'COLORADO',
  'JET': 'JET CONTRACTORS',
  'AFI_IND': 'AFRIC INDUSTRIES',
  'LBV': 'LABEL VIE',
  'MSA': 'MARSA MAROC (SODEP)',
  'SNA': 'STOKVIS NORD AFRIQUE',
  'AUH': 'AUTO HALL',
  'NEJ': 'AUTO NEJMA',
  'NKL': 'ENNAKL',
  'CTM': 'CTM',
  'SRM': 'SRM',
  'RIS': 'RISMA',
  'CSR': 'COSUMAR',
  'LES': 'LESIEUR CRISTAL',
  'OUL': 'OULMES',
  'MUT': 'MUTANDIS',
  'DRI': 'DARI COUSPATE',
  'CRS': 'CARTIER SAADA',
  'SBM': 'SOCIETE DES BOISSONS DU MAROC',
  'UMR': 'UNIMER',
  'CMG': 'CMGP GROUP',
  'MNG': 'MANAGEM',
  'CMT': 'COMPAGNIE MINIERE DE TOUISSIT',
  'SMI': 'SMI',
  'REB': 'REBAB COMPANY',
  'SNP': 'SNEP',
  'MOX': 'MAGHREB OXYGENE',
  'MDP': 'MED PAPER',
  'DLM': 'DELATTRE LEVIVIER',
  'STR': 'STROC INDUSTRIE',
  'DHO': 'DELTA HOLDING',
  'ZDJ': 'ZELLIDJA',
  'ATH': 'ATLANTASANAD',
  'SAH': 'SANLAM MAROC',
  'WAA': 'WAFA ASSURANCE',
  'AFM': 'AFMA',
  'AGM': 'AGMA',
  'HPS': 'HPS',
  'DWY': 'DISWAY',
  'DSH': 'DISTY TECHNOLOGIES',
  'MIC': 'MICRODATA',
  'S2M': 'S2M',
  'M2M': 'M2M GROUP',
  'INV': 'INVOLYS',
  'IBC': 'IBMAROC.COM',
};

export interface DynamicCompanyRegistration {
  symbol: string;
  name?: string;
  sector?: string;
  bmceId?: string;
}

export class SymbolMapper {
  // Registres dynamiques en mémoire pour les nouvelles introductions (IPO) détectées à chaud
  private static dynamicAliases: Record<string, string> = {};
  private static dynamicSectors: Record<string, string> = {};
  private static dynamicBmceIds: Record<string, string> = {};
  private static dynamicNames: Record<string, string> = {};

  private static cleanKey(input: string): string {
    if (!input) return '';
    return input
      .toUpperCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Enregistre dynamiquement à chaud une nouvelle société (IPO) découverte sur le marché.
   */
  static registerDynamicCompany(entry: DynamicCompanyRegistration): void {
    const rawSym = (entry.symbol || '').trim().toUpperCase();
    if (!rawSym) return;

    const canonicalSymbol = SYMBOL_ALIASES[this.cleanKey(rawSym)] || this.cleanKey(rawSym);
    if (!canonicalSymbol) return;

    const cleanSym = this.cleanKey(rawSym);
    if (cleanSym) {
      this.dynamicAliases[cleanSym] = canonicalSymbol;
    }

    if (entry.name) {
      const cleanName = this.cleanKey(entry.name);
      if (cleanName) {
        this.dynamicAliases[cleanName] = canonicalSymbol;
      }
      if (!CANONICAL_COMPANY_NAMES[canonicalSymbol] && !this.dynamicNames[canonicalSymbol]) {
        this.dynamicNames[canonicalSymbol] = entry.name.trim().toUpperCase();
      }
    }

    if (entry.sector && entry.sector !== 'Inconnu' && entry.sector !== 'inconnu') {
      if (!STATIC_SECTOR_MAP[canonicalSymbol]) {
        this.dynamicSectors[canonicalSymbol] = entry.sector.trim();
      }
    }

    if (entry.bmceId) {
      const cleanId = entry.bmceId.split(',')[0].trim();
      if (/^\d+$/.test(cleanId)) {
        this.dynamicBmceIds[canonicalSymbol] = cleanId;
        if (cleanSym) this.dynamicBmceIds[cleanSym] = cleanId;
      }
    }
  }

  /**
   * Normalizes an input string to a canonical ticker if a match is found.
   */
  static resolve(input: string): string {
    if (!input) return '';

    const clean = this.cleanKey(input);
    if (!clean) return '';

    // 1. Direct match in static or dynamic aliases
    if (SYMBOL_ALIASES[clean]) {
      return SYMBOL_ALIASES[clean];
    }
    if (this.dynamicAliases[clean]) {
      return this.dynamicAliases[clean];
    }

    // 2. Partial match on longer aliases (>= 4 chars to avoid false positives on short 3-letter codes)
    for (const [alias, symbol] of Object.entries(SYMBOL_ALIASES)) {
      if (alias.length >= 4 && clean.includes(alias)) return symbol;
    }
    for (const [alias, symbol] of Object.entries(this.dynamicAliases)) {
      if (alias.length >= 4 && clean.includes(alias)) return symbol;
    }

    return clean;
  }

  /**
   * Retourne le nom officiel lisible d'une société à partir de son symbole ou alias.
   */
  static getCanonicalName(input: string): string {
    if (!input) return '';
    const symbol = this.resolve(input);
    return CANONICAL_COMPANY_NAMES[symbol] || this.dynamicNames[symbol] || input.trim().toUpperCase();
  }

  /**
   * Retourne l'identifiant numérique BMCE Capital Bourse connu (statique ou découvert dynamiquement).
   */
  static getBmceId(input: string): string | null {
    if (!input) return null;
    const symbol = this.resolve(input);
    const clean = this.cleanKey(input);
    return (
      this.dynamicBmceIds[symbol] ||
      this.dynamicBmceIds[clean] ||
      STATIC_BMCE_ID_MAP[symbol] ||
      STATIC_BMCE_ID_MAP[clean] ||
      null
    );
  }

  /**
   * Resolves the official sector for a given symbol or company name with automatic heuristics fallback.
   */
  static getSector(symbolInput: string, companyNameOrProvidedSector?: string): string {
    if (
      companyNameOrProvidedSector &&
      companyNameOrProvidedSector !== 'Inconnu' &&
      companyNameOrProvidedSector !== 'inconnu' &&
      companyNameOrProvidedSector !== 'Autres Secteurs' &&
      companyNameOrProvidedSector.trim() !== ''
    ) {
      return companyNameOrProvidedSector;
    }

    const symbol = SymbolMapper.resolve(symbolInput || '').toUpperCase();
    if (STATIC_SECTOR_MAP[symbol]) {
      return STATIC_SECTOR_MAP[symbol];
    }
    if (this.dynamicSectors[symbol]) {
      return this.dynamicSectors[symbol];
    }

    // Heuristic keyword matching on symbol or company name
    const text = (symbolInput + ' ' + (companyNameOrProvidedSector || '')).toUpperCase();
    if (text.includes('BANK') || text.includes('BANQUE') || text.includes('CREDIT') || text.includes('FINANCE') || text.includes('ATTIJARI') || text.includes('BOA') || text.includes('CASH') || text.includes('LEASING')) return 'Banques & Services Financiers';
    if (text.includes('IMMO') || text.includes('REAL ESTATE') || text.includes('DOHA') || text.includes('ALLIANCE') || text.includes('DAR SAADA') || text.includes('ARADEI')) return 'Immobilier';
    if (text.includes('CIMENT') || text.includes('HOLCIM') || text.includes('BUILD') || text.includes('TGCC') || text.includes('CONSTRUCT') || text.includes('SGTM') || text.includes('BTP') || text.includes('TRAVAUX')) return 'Bâtiment & Matériaux';
    if (text.includes('HEALTH') || text.includes('SANTE') || text.includes('AKDITAL') || text.includes('CLINIC') || text.includes('PHARMA') || text.includes('SOTHEMA') || text.includes('VICENNE') || text.includes('MEDICAL')) return 'Santé & Médical';
    if (text.includes('TECH') || text.includes('SOFTWARE') || text.includes('SYSTEM') || text.includes('INFO') || text.includes('DATA') || text.includes('HPS') || text.includes('DIGITAL')) return 'Technologies';
    if (text.includes('MINE') || text.includes('GOLD') || text.includes('OR') || text.includes('MANAGEM') || text.includes('CMT')) return 'Mines';
    if (text.includes('ENERGY') || text.includes('GAZ') || text.includes('PETROL') || text.includes('TAQA') || text.includes('POWER') || text.includes('TOTAL')) return 'Énergie & Utilities';
    if (text.includes('AGRO') || text.includes('FOOD') || text.includes('SUCRE') || text.includes('COSUMAR') || text.includes('LESIEUR') || text.includes('BOISSON') || text.includes('CMGP')) return 'Agroalimentaire';
    if (text.includes('INSURANCE') || text.includes('ASSUR') || text.includes('SANAD') || text.includes('SAHAM') || text.includes('SANLAM') || text.includes('AFMA') || text.includes('AGMA')) return 'Assurances';
    if (text.includes('HOLDING') || text.includes('GROUP') || text.includes('DELTA')) return 'Holdings';

    return 'Autres Secteurs';
  }
}
