import type { CompanyAnalysis, FundamentalData, OrchestratorResult, PortfolioHolding, ShariaResult } from './schemas';
import type { ValidatedPortfolioOptimization } from './gemini';
import type { ConsolidatedPurificationSummary } from './portfolio-service';

type RgbColor = [number, number, number];
type CalloutTone = 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_X = 14;
const CONTENT_WIDTH = PAGE_WIDTH_MM - MARGIN_X * 2; // 182 mm
const FOOTER_RESERVE_MM = 23;
const SAFE_BOTTOM_Y = PAGE_HEIGHT_MM - FOOTER_RESERVE_MM;

const PALETTE = {
  navyDark: [11, 18, 32] as RgbColor,
  slate900: [15, 23, 42] as RgbColor,
  slate700: [51, 65, 85] as RgbColor,
  slate500: [100, 116, 139] as RgbColor,
  slate200: [226, 232, 240] as RgbColor,
  slate50: [248, 250, 252] as RgbColor,
  white: [255, 255, 255] as RgbColor,
  emerald: [16, 185, 129] as RgbColor,
  emeraldDark: [4, 120, 87] as RgbColor,
  blue: [59, 130, 246] as RgbColor,
  blueDark: [29, 78, 216] as RgbColor,
  amber: [245, 158, 11] as RgbColor,
  amberDark: [180, 83, 9] as RgbColor,
  rose: [239, 68, 68] as RgbColor,
  roseDark: [190, 18, 60] as RgbColor,
  purple: [147, 51, 234] as RgbColor,
  cyan: [14, 165, 233] as RgbColor,
};

const TONE_MAP: Record<CalloutTone, { bg: RgbColor; border: RgbColor; title: RgbColor }> = {
  emerald: { bg: [236, 253, 245], border: PALETTE.emerald, title: PALETTE.emeraldDark },
  amber: { bg: [255, 251, 235], border: PALETTE.amber, title: PALETTE.amberDark },
  rose: { bg: [255, 241, 242], border: PALETTE.rose, title: PALETTE.roseDark },
  blue: { bg: [239, 246, 255], border: PALETTE.blue, title: PALETTE.blueDark },
  purple: { bg: [250, 245, 255], border: PALETTE.purple, title: [107, 33, 168] },
};

/**
 * Normalise toute valeur textuelle pour le rendu WinAnsi (Helvetica) de jsPDF :
 * - Supprime les emojis, paires de substitution et caractères hors ISO-8859-1.
 * - Remplace les espaces insécables (\u00A0, \u202F) d'Intl.NumberFormat('fr-FR') par de vrais espaces.
 * - Préserve les accents français (é, è, ê, à, ç, ô, û, î, etc.) sans jamais retourner [object Object].
 */
export function sanitizePdfText(input: unknown, fallback = 'N/A'): string {
  if (input === null || input === undefined) return fallback;

  let raw: string;
  if (typeof input === 'string') {
    raw = input;
  } else if (typeof input === 'number' || typeof input === 'boolean') {
    if (typeof input === 'number' && !Number.isFinite(input)) return fallback;
    raw = String(input);
  } else if (Array.isArray(input)) {
    const joined = input.map((v) => sanitizePdfText(v, '')).filter(Boolean).join(', ');
    return joined || fallback;
  } else if (typeof input === 'object') {
    const parts = Object.values(input as Record<string, unknown>)
      .map((v) => sanitizePdfText(v, ''))
      .filter(Boolean);
    return parts.join(' | ') || fallback;
  } else {
    raw = String(input);
  }

  const normalized = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u00A0\u202F\u2009\u2007\u2002-\u200B\uFEFF]/g, ' ')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[’‘‚]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/[—–−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·▪▫●○✦✓✔⚡🧬📈📉📊🤖⚠️✏️❓🏦🏢💰]/g, (ch) => (ch === '•' || ch === '·' ? '-' : ''))
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/×/g, 'x')
    .replace(/€/g, 'EUR')
    .replace(/▲/g, '(+)')
    .replace(/▼/g, '(-)')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/[^\x0A\x20-\x7E\xA0-\xFF]/g, '');

  const cleanedLines = normalized
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim());

  const finalStr = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return finalStr || fallback;
}

/**
 * Formate un nom de fichier PDF propre et ASCII-safe.
 */
export function formatPdfFilename(agentSlug: string, identifier: string, date: Date = new Date()): string {
  const cleanAgent = (agentSlug || 'Rapport')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Rapport';

  const cleanId = (identifier || 'Aetheris')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || 'ACTIF';

  const isoDate = !Number.isNaN(date.getTime())
    ? date.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return `Aetheris_${cleanAgent}_${cleanId}_${isoDate}.pdf`;
}

function formatNumberFr(val: number, decimals = 2): string {
  if (!Number.isFinite(val)) return 'N/A';
  return sanitizePdfText(
    val.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  );
}

function parseLocaleNumeric(raw?: string | number | null): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  if (!raw) return NaN;
  const cleaned = String(raw)
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/(MAD|DH|%)/gi, '');
  const match = cleaned.match(/-?[\d.,]+/);
  if (!match) return NaN;
  let token = match[0];
  if (token.includes('.') && token.includes(',')) {
    token = token.lastIndexOf(',') > token.lastIndexOf('.')
      ? token.replace(/\./g, '').replace(',', '.')
      : token.replace(/,/g, '');
  } else if (token.includes(',')) {
    token = token.replace(',', '.');
  }
  const parsed = parseFloat(token);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatMadValue(raw?: string | number | null, fallback = 'N/A'): string {
  if (raw === undefined || raw === null) return fallback;
  const s = sanitizePdfText(raw, '').trim();
  if (!s || s.toUpperCase() === 'N/A' || s.toUpperCase() === 'INDISPONIBLE') return fallback;
  if (/^\d+(?:[.,]\d+)?$/.test(s.replace(/\s+/g, ''))) {
    const n = parseLocaleNumeric(s);
    if (Number.isFinite(n)) {
      return `${sanitizePdfText(n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }))} MAD`;
    }
  }
  return /MAD|DH|Mrd|M\b/i.test(s) ? s : `${s} MAD`;
}

async function createPdfContext() {
  const jspdfMod: any = await import('jspdf');
  const JsPDF = jspdfMod.jsPDF || jspdfMod.default;
  const autoTableMod: any = await import('jspdf-autotable');
  const autoTableFn = autoTableMod.autoTable || autoTableMod.default;

  if (!JsPDF) {
    throw new Error('Impossible de charger le moteur jsPDF.');
  }
  if (!autoTableFn) {
    throw new Error('Impossible de charger le module jspdf-autotable.');
  }

  const doc = new JsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  });

  doc.setProperties({
    creator: 'Aetheris AI Platform',
    author: 'Aetheris AI - Bourse de Casablanca',
  });

  return { doc, autoTableFn };
}

function ensureSpace(doc: any, currentY: number, neededMm: number): number {
  if (currentY + neededMm > SAFE_BOTTOM_Y) {
    doc.addPage();
    return 16;
  }
  return currentY;
}

function drawHeaderBanner(
  doc: any,
  opts: {
    accentRgb: RgbColor;
    agentBadge: string;
    title: string;
    subtitle: string;
    metaLines: string[];
  }
): number {
  const bannerHeight = 31;
  doc.setFillColor(...PALETTE.navyDark);
  doc.rect(0, 0, PAGE_WIDTH_MM, bannerHeight, 'F');

  doc.setFillColor(...opts.accentRgb);
  doc.rect(0, 0, PAGE_WIDTH_MM, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...opts.accentRgb);
  doc.text(sanitizePdfText(`AETHERIS AI  |  ${opts.agentBadge}`).toUpperCase(), MARGIN_X, 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...PALETTE.white);
  const titleLines = doc.splitTextToSize(sanitizePdfText(opts.title), 116);
  doc.text(titleLines[0] || 'RAPPORT AETHERIS', MARGIN_X, 17.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const subText = sanitizePdfText(opts.subtitle, '');
  const subLines = subText ? doc.splitTextToSize(subText, 118) : [];
  if (subLines.length > 0) {
    doc.text(subLines[0], MARGIN_X, 24.5);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  let metaY = 10.5;
  for (const line of opts.metaLines.slice(0, 3)) {
    doc.text(sanitizePdfText(line), PAGE_WIDTH_MM - MARGIN_X, metaY, { align: 'right' });
    metaY += 5.5;
  }

  return bannerHeight + 7;
}

function drawSectionTitle(doc: any, currentY: number, title: string, accentRgb: RgbColor): number {
  const y = ensureSpace(doc, currentY, 13);
  doc.setFillColor(...accentRgb);
  doc.rect(MARGIN_X, y, 2.2, 5.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PALETTE.slate900);
  doc.text(sanitizePdfText(title).toUpperCase(), MARGIN_X + 5, y + 4.1);

  doc.setDrawColor(...PALETTE.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, y + 7, PAGE_WIDTH_MM - MARGIN_X, y + 7);

  return y + 10.5;
}

interface KpiItem {
  label: string;
  value: string;
  accent?: RgbColor;
  sublabel?: string;
}

function drawKpiGrid(doc: any, currentY: number, items: KpiItem[], columns = 4): number {
  if (!items.length) return currentY;
  let y = currentY;
  const gap = 3.5;
  const colW = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
  const innerW = colW - 6.5;

  for (let i = 0; i < items.length; i += columns) {
    const rowItems = items.slice(i, i + columns);
    const measured = rowItems.map((item) => {
      const valText = sanitizePdfText(item.value);
      const tokens = valText.split(/\s+/).filter(Boolean);
      doc.setFont('helvetica', 'bold');
      let valFontSize = 10;
      for (const candidateSize of [10, 8.8, 7.8]) {
        doc.setFontSize(candidateSize);
        valFontSize = candidateSize;
        if (tokens.every((t) => doc.getTextWidth(t) <= innerW)) {
          break;
        }
      }
      doc.setFontSize(valFontSize);
      const valLines = doc.splitTextToSize(valText, innerW);
      const valLineH = valFontSize * 0.43;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const subLines = item.sublabel ? doc.splitTextToSize(sanitizePdfText(item.sublabel), innerW) : [];
      const h = Math.max(
        17,
        8.5 + valLines.length * valLineH + (subLines.length > 0 ? subLines.length * 3.5 + 1.5 : 1)
      );
      return { item, valLines, valFontSize, valLineH, subLines, h };
    });

    const rowHeight = Math.max(...measured.map((m) => m.h));
    y = ensureSpace(doc, y, rowHeight + 3);

    measured.forEach((entry, idx) => {
      const x = MARGIN_X + idx * (colW + gap);
      const accent = entry.item.accent || PALETTE.blue;

      doc.setFillColor(...PALETTE.slate50);
      doc.setDrawColor(...PALETTE.slate200);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, y, colW, rowHeight, 1.5, 1.5, 'FD');

      doc.setFillColor(...accent);
      doc.rect(x, y, 1.4, rowHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...PALETTE.slate500);
      doc.text(sanitizePdfText(entry.item.label).toUpperCase().slice(0, 36), x + 3.5, y + 4.8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(entry.valFontSize);
      doc.setTextColor(...(entry.item.accent || PALETTE.slate900));
      let valY = y + 10.2;
      for (const vl of entry.valLines) {
        doc.text(vl, x + 3.5, valY);
        valY += entry.valLineH;
      }

      if (entry.subLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...PALETTE.slate500);
        for (const sl of entry.subLines) {
          doc.text(sl, x + 3.5, valY + 0.5);
          valY += 3.3;
        }
      }
    });

    y += rowHeight + 3.5;
  }

  return y;
}

function drawCallout(
  doc: any,
  currentY: number,
  tone: CalloutTone,
  title: string,
  bodyParagraphs: string[]
): number {
  const cleanParagraphs = bodyParagraphs.map((p) => sanitizePdfText(p, '')).filter(Boolean);
  if (cleanParagraphs.length === 0) return currentY;

  const style = TONE_MAP[tone];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const allLines: string[] = [];
  for (const para of cleanParagraphs) {
    const wrapped = doc.splitTextToSize(para, CONTENT_WIDTH - 10);
    allLines.push(...wrapped);
  }

  const lineH = 4.1;
  const boxH = 10 + allLines.length * lineH + 2.5;
  const y = ensureSpace(doc, currentY, Math.min(boxH, 120));

  doc.setFillColor(...style.bg);
  doc.setDrawColor(...style.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, boxH, 1.5, 1.5, 'FD');

  doc.setFillColor(...style.border);
  doc.rect(MARGIN_X, y, 2, boxH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...style.title);
  doc.text(sanitizePdfText(title), MARGIN_X + 5, y + 5.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.slate900);
  let textY = y + 10.5;
  for (const line of allLines) {
    if (textY > SAFE_BOTTOM_Y) {
      doc.addPage();
      textY = 18;
    }
    doc.text(line, MARGIN_X + 5, textY);
    textY += lineH;
  }

  return Math.max(y + boxH + 4, textY + 3);
}

function drawVectorGauge(
  doc: any,
  currentY: number,
  label: string,
  pct: number,
  displayText: string,
  accentRgb: RgbColor,
  markers: number[] = []
): number {
  const y = ensureSpace(doc, currentY, 15);
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.slate700);
  doc.text(sanitizePdfText(label).toUpperCase(), MARGIN_X, y + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...accentRgb);
  doc.text(sanitizePdfText(displayText), PAGE_WIDTH_MM - MARGIN_X, y + 3.5, { align: 'right' });

  const trackY = y + 5.8;
  const trackH = 3.2;
  doc.setFillColor(...PALETTE.slate200);
  doc.roundedRect(MARGIN_X, trackY, CONTENT_WIDTH, trackH, 1.2, 1.2, 'F');

  if (clamped > 0) {
    doc.setFillColor(...accentRgb);
    doc.roundedRect(MARGIN_X, trackY, Math.max(2, (CONTENT_WIDTH * clamped) / 100), trackH, 1.2, 1.2, 'F');
  }

  for (const m of markers) {
    const mx = MARGIN_X + (CONTENT_WIDTH * Math.max(0, Math.min(100, m))) / 100;
    doc.setDrawColor(...PALETTE.slate700);
    doc.setLineWidth(0.35);
    doc.line(mx, trackY - 0.8, mx, trackY + trackH + 0.8);
  }

  return y + 13;
}

function runAutoTable(doc: any, autoTableFn: any, currentY: number, config: Record<string, any>): number {
  const y = ensureSpace(doc, currentY, 22);
  autoTableFn(doc, {
    startY: y,
    margin: { left: MARGIN_X, right: MARGIN_X, top: 16, bottom: FOOTER_RESERVE_MM },
    theme: 'grid',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: 8.2,
      cellPadding: 2.6,
      textColor: PALETTE.slate900,
      lineColor: PALETTE.slate200,
      lineWidth: 0.2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: PALETTE.slate900,
      textColor: PALETTE.white,
      fontStyle: 'bold',
      fontSize: 7.8,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: PALETTE.slate50,
    },
    ...config,
  });

  const finalY = doc.lastAutoTable?.finalY;
  return typeof finalY === 'number' ? finalY + 5.5 : y + 20;
}

function applyInstitutionalFooters(doc: any, disclaimerLine?: string): void {
  const totalPages = doc.getNumberOfPages();
  const legal = sanitizePdfText(
    disclaimerLine ||
      "Avertissement AMMC : Document purement informatif. Ne constitue pas un conseil en investissement financier."
  );

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = PAGE_HEIGHT_MM - 13;

    doc.setDrawColor(...PALETTE.slate200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, footerY - 3, PAGE_WIDTH_MM - MARGIN_X, footerY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.slate500);
    doc.text(legal, MARGIN_X, footerY + 1, { maxWidth: 145 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.slate700);
    doc.text(`Page ${p} / ${totalPages}`, PAGE_WIDTH_MM - MARGIN_X, footerY + 1, { align: 'right' });
  }
}

function computeSentimentRgb(sentiment?: string): RgbColor {
  const s = String(sentiment || '').toUpperCase();
  if (s.includes('POSITIF') || s === 'ACHETER') return PALETTE.emeraldDark;
  if (s.includes('NEGATIF') || s === 'VENDRE') return PALETTE.roseDark;
  return PALETTE.amberDark;
}

function renderDataQualityWarnings(doc: any, y: number, analysis: CompanyAnalysis): number {
  let nextY = y;
  if (analysis.liquidityWarning && !analysis.liquidityWarning.isLiquid) {
    const msg = analysis.liquidityWarning.message || 'Liquidité limitée détectée sur ce titre.';
    const vol =
      analysis.liquidityWarning.dailyVolume !== undefined
        ? `Volume journalier observé : ${formatNumberFr(analysis.liquidityWarning.dailyVolume, 0)} titres.`
        : '';
    nextY = drawCallout(doc, nextY, 'amber', 'Alerte Liquidité BVC', [msg, vol].filter(Boolean));
  }

  if (analysis.dataQuality?.warnings && analysis.dataQuality.warnings.length > 0) {
    nextY = drawCallout(
      doc,
      nextY,
      'amber',
      `Contrôle Qualité des Données (${analysis.dataQuality.score}/100)`,
      analysis.dataQuality.warnings
    );
  }
  return nextY;
}

function renderSentimentSections(doc: any, autoTableFn: any, startY: number, analysis: CompanyAnalysis): number {
  let y = startY;
  y = drawSectionTitle(doc, y, 'Synthèse Narrative & Collecte Sentiment', PALETTE.emerald);

  const scoreStr =
    typeof analysis.globalScore === 'number' && Number.isFinite(analysis.globalScore)
      ? analysis.globalScore.toFixed(2)
      : 'N/A';

  const momentumStr = analysis.sentimentMomentum
    ? `${analysis.sentimentMomentum.direction} (${analysis.sentimentMomentum.variation})`
    : 'Non disponible';

  const collStr = analysis.collectionStatus
    ? `${analysis.collectionStatus.feedsSuccess}/${analysis.collectionStatus.feedsTotal} flux (${analysis.collectionStatus.articlesFound} art.)`
    : 'N/A';

  y = drawKpiGrid(doc, y, [
    { label: 'Sentiment Global', value: sanitizePdfText(analysis.globalSentiment), accent: computeSentimentRgb(analysis.globalSentiment) },
    { label: 'Score Pondéré [-1 ; +1]', value: scoreStr, accent: computeSentimentRgb(analysis.globalSentiment) },
    { label: 'Momentum Sentiment', value: momentumStr, accent: PALETTE.blue },
    { label: 'Couverture Flux RSS', value: collStr, accent: PALETTE.emerald },
  ]);

  if (analysis.detectedEvents && analysis.detectedEvents.length > 0) {
    y = drawCallout(doc, y, 'blue', 'Événements Financiers Détectés (Multiplicateurs BVC)', [
      analysis.detectedEvents.join('  |  '),
    ]);
  }

  y = drawCallout(doc, y, 'emerald', 'Récit Analytique Consolidé & Vecteur d\'Impact', [
    analysis.consolidatedSummary || 'Aucun récit analytique généré.',
    `Vecteur d'impact estimé : ${analysis.probableImpact || 'N/A'}`,
  ]);

  if (analysis.fundamentals) {
    y = drawKpiGrid(doc, y, [
      { label: 'PER', value: sanitizePdfText(analysis.fundamentals.peRatio) },
      { label: 'Rendement Dividende', value: sanitizePdfText(analysis.fundamentals.dividendYield), accent: PALETTE.emeraldDark },
      { label: 'Capitalisation', value: formatMadValue(analysis.fundamentals.marketCap) },
      { label: 'Secteur', value: sanitizePdfText(analysis.fundamentals.sector || analysis.sector) },
    ]);
  }

  y = drawSectionTitle(
    doc,
    y,
    `Journal d'Intelligence Multi-Sources (${analysis.news?.length || 0} dépêches)`,
    PALETTE.emerald
  );

  if (analysis.news && analysis.news.length > 0) {
    const rows = analysis.news.map((item, idx) => [
      String(idx + 1).padStart(2, '0'),
      sanitizePdfText(`${item.source || 'Presse'}\n${item.date || 'Récent'}`),
      sanitizePdfText(
        `${item.eventCategory || 'GENERAL'}${
          item.corroboratingSourcesCount && item.corroboratingSourcesCount > 1
            ? `\n(${item.corroboratingSourcesCount} sources)`
            : ''
        }`
      ),
      sanitizePdfText(`${item.sentiment}\n${item.impact}`),
      sanitizePdfText(`${item.summary}\n-> Analyse : ${item.explanation || 'Non disponible'}`),
    ]);

    y = runAutoTable(doc, autoTableFn, y, {
      head: [['#', 'Source & Date', 'Événement', 'Sentiment', 'Titre & Interprétation IA Complète']],
      body: rows,
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 30 },
        2: { cellWidth: 26 },
        3: { cellWidth: 26 },
        4: { cellWidth: 91 },
      },
    });
  } else {
    y = drawCallout(doc, y, 'amber', 'Journal Multi-Sources', ['Aucune dépêche pertinente détectée sur la période analysée.']);
  }

  return y;
}

function renderTechnicalSections(doc: any, autoTableFn: any, startY: number, analysis: CompanyAnalysis): number {
  let y = startY;
  y = drawSectionTitle(doc, y, 'Tableau de Bord Technique & Momentum Alpha', PALETTE.blue);

  const rsiRaw = typeof analysis.rsi === 'object' ? analysis.rsi.value : analysis.rsi;
  const rsiNum = parseLocaleNumeric(rsiRaw);
  const rsiInterp = typeof analysis.rsi === 'object' ? analysis.rsi.interpretation : '';
  const rsiDisplay = Number.isFinite(rsiNum) ? `${rsiNum} (${rsiInterp || 'RSI 14'})` : sanitizePdfText(rsiRaw);

  const atrDisplay = analysis.atr
    ? `${analysis.atr.atr14.toFixed(2)} MAD (${analysis.atr.atrPercent.toFixed(2)}%)`
    : sanitizePdfText((analysis as any).volatility || 'N/A');

  y = drawKpiGrid(doc, y, [
    { label: 'Cours de Marché', value: formatMadValue(analysis.price), accent: PALETTE.blue },
    {
      label: 'Tendance Technique',
      value: sanitizePdfText(analysis.technicalTrend || 'Neutre'),
      accent: computeSentimentRgb(
        analysis.technicalTrend === 'Haussière' ? 'POSITIF' : analysis.technicalTrend === 'Baissière' ? 'NEGATIF' : 'NEUTRE'
      ),
    },
    { label: 'RSI (14 séances)', value: rsiDisplay, accent: PALETTE.blue },
    { label: analysis.atr ? 'Volatilité ATR (14)' : 'Volatilité', value: atrDisplay, accent: PALETTE.slate700 },
  ]);

  if (Number.isFinite(rsiNum)) {
    const rsiColor = rsiNum >= 70 ? PALETTE.roseDark : rsiNum <= 30 ? PALETTE.emeraldDark : PALETTE.blue;
    y = drawVectorGauge(doc, y, 'Jauge RSI (Zones Survente 30 / Surachat 70)', rsiNum, rsiDisplay, rsiColor, [30, 70]);
  }

  const levelsRows: string[][] = [
    ['Support Technique', formatMadValue(analysis.support), 'Point Pivot', formatMadValue(analysis.pivot)],
    ['Résistance Technique', formatMadValue(analysis.resistance), 'Moyenne Mobile MMS 20', analysis.sma20 !== undefined ? formatMadValue(analysis.sma20) : 'N/A'],
    ['Label MMS Réel', sanitizePdfText(analysis.smaLabel), 'Moyenne Mobile MMS 50', analysis.sma50 !== undefined ? formatMadValue(analysis.sma50) : 'N/A'],
  ];
  if (analysis.fibonacci) {
    levelsRows.push([
      'Fibonacci 23.6% / 38.2%',
      `${formatMadValue(analysis.fibonacci.h23)} / ${formatMadValue(analysis.fibonacci.h38)}`,
      'Fibonacci 50.0% / 61.8%',
      `${formatMadValue(analysis.fibonacci.h50)} / ${formatMadValue(analysis.fibonacci.h61)}`,
    ]);
  }

  y = runAutoTable(doc, autoTableFn, y, {
    head: [['Indicateur Clé', 'Valeur', 'Indicateur Clé', 'Valeur']],
    body: levelsRows,
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 49 },
      2: { cellWidth: 42, fontStyle: 'bold' },
      3: { cellWidth: 49 },
    },
  });

  // Indicateurs Quantitatifs Avancés (MACD, ATR, Volume Breakout & Bollinger, Alpha MASI)
  const quantRows: string[][] = [];
  if (analysis.macd) {
    const histVal = parseLocaleNumeric(analysis.macd.histogram as any);
    const macdVal = parseLocaleNumeric(analysis.macd.macd as any);
    const sigVal = parseLocaleNumeric(analysis.macd.signal as any);
    quantRows.push([
      'MACD (12, 26, 9)',
      sanitizePdfText(analysis.macd.trend),
      `MACD : ${Number.isFinite(macdVal) ? macdVal.toFixed(2) : 'N/A'} | Signal : ${Number.isFinite(sigVal) ? sigVal.toFixed(2) : 'N/A'} | Hist : ${Number.isFinite(histVal) ? histVal.toFixed(2) : 'N/A'}`,
    ]);
  }
  if (analysis.atr) {
    quantRows.push([
      'Niveaux Dynamiques ATR(14)',
      `${analysis.atr.atr14.toFixed(2)} MAD (${analysis.atr.atrPercent.toFixed(2)}%)`,
      `Achat -> SL ${analysis.atr.dynamicStopBuy.toFixed(2)} / TP ${analysis.atr.dynamicTargetBuy.toFixed(2)} MAD | Vente -> SL ${analysis.atr.dynamicStopSell.toFixed(2)} / TP ${analysis.atr.dynamicTargetSell.toFixed(2)} MAD`,
    ]);
  }
  if (analysis.volumeBreakout) {
    quantRows.push([
      'Volume Breakout & Bollinger',
      analysis.volumeBreakout.isBreakout ? 'CASSURE CONFIRMÉE' : analysis.volumeBreakout.isBollingerSqueeze ? 'COMPRESSION (SQUEEZE)' : 'NORMAL',
      `Ratio Vol/MM20 : ${analysis.volumeBreakout.ratio.toFixed(2)}x (Moy. 20j : ${formatNumberFr(analysis.volumeBreakout.avgVolume20, 0)}) | Largeur BB : ${analysis.volumeBreakout.bollingerBandwidth !== undefined ? `${analysis.volumeBreakout.bollingerBandwidth.toFixed(2)}%` : 'N/A'}`,
    ]);
  }
  if (analysis.relativeStrengthMasi) {
    quantRows.push([
      'Force Relative vs MASI',
      sanitizePdfText(analysis.relativeStrengthMasi.label),
      `Titre : ${analysis.relativeStrengthMasi.stockVariationPct >= 0 ? '+' : ''}${analysis.relativeStrengthMasi.stockVariationPct.toFixed(2)}% | MASI : ${analysis.relativeStrengthMasi.masiVariationPct >= 0 ? '+' : ''}${analysis.relativeStrengthMasi.masiVariationPct.toFixed(2)}% | Alpha : ${analysis.relativeStrengthMasi.alphaPct >= 0 ? '+' : ''}${analysis.relativeStrengthMasi.alphaPct.toFixed(2)}%`,
    ]);
  }

  if (quantRows.length > 0) {
    y = drawSectionTitle(doc, y, 'Indicateurs Quantitatifs Avancés (ATR, Breakout, Alpha MASI)', PALETTE.blue);
    y = runAutoTable(doc, autoTableFn, y, {
      head: [['Module Quantitatif', 'Statut / Valeur', 'Détails & Seuils Dynamiques']],
      body: quantRows,
      columnStyles: {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 100 },
      },
    });
  }

  if (analysis.signals && analysis.signals.length > 0) {
    y = drawSectionTitle(doc, y, `Registre des Signaux Techniques (${analysis.signals.length})`, PALETTE.blue);
    const sigRows = analysis.signals.map((sig, i) => [String(i + 1).padStart(2, '0'), sanitizePdfText(sig)]);
    y = runAutoTable(doc, autoTableFn, y, {
      head: [['#', 'Signal / Observation Technique']],
      body: sigRows,
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 170 },
      },
    });
  }

  y = drawCallout(doc, y, 'blue', 'Synthèse de Convergence Technique', [
    analysis.marketSituation || 'Analyse technique quantitative calculée.',
  ]);

  return y;
}

function renderFundamentalSections(doc: any, autoTableFn: any, startY: number, analysis: CompanyAnalysis): number {
  let y = startY;
  const f: FundamentalData = analysis.fundamentals || {
    peRatio: 'N/A',
    dividendYield: 'N/A',
    marketCap: 'N/A',
    netProfit: 'N/A',
    roe: 'N/A',
    margin: 'N/A',
    revenueGrowth: 'N/A',
    profitGrowth: 'N/A',
    sector: analysis.sector || 'N/A',
  };

  if (f.fundamentalQualityScore) {
    y = drawSectionTitle(doc, y, 'Score de Qualité Fondamentale (Modèle BVC)', PALETTE.amber);
    const q = f.fundamentalQualityScore;
    const gradeColor = q.grade === 'A' ? PALETTE.emeraldDark : q.grade === 'B' ? PALETTE.blue : q.grade === 'C' ? PALETTE.amberDark : PALETTE.roseDark;
    y = drawVectorGauge(doc, y, `Notation Qualité Aetheris (Grade ${q.grade})`, q.score, `${q.score} / 100  (Grade ${q.grade})`, gradeColor);
    if (q.highlights && q.highlights.length > 0) {
      y = drawCallout(doc, y, q.grade === 'A' || q.grade === 'B' ? 'emerald' : 'amber', 'Points Forts & Vigilances Qualité', [
        q.highlights.map((h) => `- ${h}`).join('\n'),
      ]);
    }
  }

  y = drawSectionTitle(doc, y, 'Ratios Fondamentaux CSEMA & Traçabilité', PALETTE.amber);
  const src = f.dataSources || {};
  const metricRows: string[][] = [
    ['PER (Price-to-Earnings)', sanitizePdfText(f.peRatio), sanitizePdfText(src.peRatio || 'BVC / TradingView')],
    ['Rendement du Dividende (Brut)', sanitizePdfText(f.dividendYield), sanitizePdfText(src.dividendYield || 'BVC / TradingView')],
    ['Capitalisation Boursière', formatMadValue(f.marketCap), sanitizePdfText(src.marketCap || 'BVC / TradingView')],
    ['ROE (Rentabilité Fonds Propres)', sanitizePdfText(f.roe), sanitizePdfText(src.roe || 'TradingView')],
    ['Résultat Net Consolidé', formatMadValue(f.netProfit), sanitizePdfText(src.netProfit || 'États Financiers')],
    ['Marge Nette', sanitizePdfText(f.margin), sanitizePdfText(src.margin || 'TradingView')],
    ['Croissance Chiffre d\'Affaires', sanitizePdfText(f.revenueGrowth), sanitizePdfText(src.revenueGrowth || 'TradingView')],
    ['Croissance Résultat Net', sanitizePdfText(f.profitGrowth), sanitizePdfText(src.profitGrowth || 'TradingView')],
    ['Secteur d\'Activité', sanitizePdfText(f.sector || analysis.sector), 'Référentiel BVC'],
  ];

  y = runAutoTable(doc, autoTableFn, y, {
    head: [['Indicateur Fondamental', 'Valeur Extraite / Calculée', 'Source de Donnée']],
    body: metricRows,
    columnStyles: {
      0: { cellWidth: 68, fontStyle: 'bold' },
      1: { cellWidth: 62 },
      2: { cellWidth: 52 },
    },
  });

  if (f.sectorBenchmark) {
    const sb = f.sectorBenchmark;
    y = drawSectionTitle(doc, y, 'Benchmark Sectoriel Bourse de Casablanca', PALETTE.amber);
    const benchRows = [
      [
        sanitizePdfText(sb.sectorName),
        String(sb.peerCount),
        sb.medianPe !== null ? `${sb.medianPe.toFixed(1)}x` : 'N/A',
        sb.peVsSectorPct !== null ? `${sb.peVsSectorPct >= 0 ? '+' : ''}${sb.peVsSectorPct.toFixed(1)}%` : 'N/A',
        sanitizePdfText(sb.valuationVerdict),
        sb.medianDividendYield !== null ? `${sb.medianDividendYield.toFixed(2)}%` : 'N/A',
        sb.medianRoe !== null ? `${sb.medianRoe.toFixed(1)}%` : 'N/A',
      ],
    ];
    y = runAutoTable(doc, autoTableFn, y, {
      head: [['Secteur', 'Pairs', 'PER Médian', 'Écart Titre', 'Verdict', 'Div. Médian', 'ROE Médian']],
      body: benchRows,
    });
  }

  const parsedPE = parseLocaleNumeric(f.peRatio);
  const profileSummary =
    Number.isFinite(parsedPE) && parsedPE > 0
      ? `L'analyse fondamentale situe la valeur sur un profil de type ${parsedPE < 15 ? 'Value (PER < 15x)' : 'Growth (PER >= 15x)'} au sein du secteur ${sanitizePdfText(f.sector || analysis.sector)}.`
      : `Les multiples actuels ne permettent pas de qualifier automatiquement le profil Value/Growth dans le secteur ${sanitizePdfText(f.sector || analysis.sector)}.`;

  y = drawCallout(doc, y, 'emerald', 'Conclusion Fondamentale & Profil', [profileSummary]);
  return y;
}

function renderStrategyAndOrchestratorSections(
  doc: any,
  autoTableFn: any,
  startY: number,
  analysis: CompanyAnalysis
): number {
  let y = startY;
  const orch: OrchestratorResult = analysis.orchestrator || analysis.horizons?.shortTerm || {};
  const action = orch.finalAction || analysis.recommendedAction || 'ATTENDRE';
  const actionRgb = computeSentimentRgb(action);
  const conf = sanitizePdfText(analysis.confidenceLevel || orch.confidenceLevel || 'Moyen');
  const risk = sanitizePdfText(orch.risk || 'Moyen');
  const regime = sanitizePdfText(analysis.marketRegime || 'RANGING');
  const reliability =
    analysis.dataQuality?.agentReliabilityScore !== undefined
      ? `${analysis.dataQuality.agentReliabilityScore}/100`
      : 'Non mesurée';

  y = drawSectionTitle(doc, y, 'Décision Exécutive & Régime de Marché', PALETTE.emerald);
  y = drawKpiGrid(doc, y, [
    { label: 'Verdict Stratégique', value: action, accent: actionRgb },
    { label: 'Confiance / Risque', value: `${conf} / ${risk}`, accent: PALETTE.blue },
    { label: 'Régime de Marché', value: regime, accent: PALETTE.cyan },
    { label: 'Fiabilité Historique', value: reliability, accent: PALETTE.emeraldDark },
  ]);

  if (analysis.isPremiumSignal) {
    y = drawCallout(doc, y, 'emerald', 'Signal Premium — Convergence Multi-Agents Détectée', [
      `Alignement fort entre le score Sentiment (${typeof analysis.globalScore === 'number' ? analysis.globalScore.toFixed(2) : 'N/A'}) et la configuration technique.`,
    ]);
  }

  if (orch.contradictionDetected) {
    y = drawCallout(doc, y, 'rose', 'Alerte Contradiction / Divergence Multi-Horizons', [
      String(orch.contradictionDetected),
    ]);
  }

  const priceVal = parseLocaleNumeric(analysis.price);
  const entryVal = parseLocaleNumeric(orch.idealEntryPoint || analysis.idealEntryPoint) || priceVal;
  const tpVal = parseLocaleNumeric(orch.takeProfit);
  const slVal = parseLocaleNumeric(orch.stopLoss);
  let rrLabel = sanitizePdfText(orch.riskRewardRatio, 'N/A');
  if (entryVal > 0 && tpVal > 0 && slVal > 0) {
    const isSell = action === 'VENDRE';
    const reward = isSell ? entryVal - tpVal : tpVal - entryVal;
    const riskSpan = isSell ? slVal - entryVal : entryVal - slVal;
    if (reward > 0 && riskSpan > 0) {
      rrLabel = `1:${(reward / riskSpan).toFixed(1)}`;
    }
  }

  y = drawSectionTitle(doc, y, 'Configuration Tactique Principale', PALETTE.emerald);
  y = drawKpiGrid(doc, y, [
    { label: 'Cours Référence', value: formatMadValue(analysis.price), accent: PALETTE.slate700 },
    { label: 'Entrée Optimisée', value: formatMadValue(orch.idealEntryPoint || analysis.idealEntryPoint, 'MARKET'), accent: PALETTE.blue },
    { label: 'Take-Profit', value: formatMadValue(orch.takeProfit), accent: PALETTE.emeraldDark },
    { label: 'Stop-Loss | R:R', value: `${formatMadValue(orch.stopLoss)} (${rrLabel})`, accent: PALETTE.roseDark },
  ]);

  y = drawCallout(doc, y, action === 'ACHETER' ? 'emerald' : action === 'VENDRE' ? 'rose' : 'blue', 'Plan d\'Exécution & Argumentaire Stratégique', [
    orch.why ? `Justification : ${orch.why}` : '',
    analysis.strategyPlan || orch.strategyPlan ? `Plan d'action : ${analysis.strategyPlan || orch.strategyPlan}` : '',
    analysis.riskExplication || orch.riskExplication ? `Gestion du risque : ${analysis.riskExplication || orch.riskExplication}` : '',
  ]);

  if (analysis.horizons) {
    y = drawSectionTitle(doc, y, 'Comparatif Multi-Horizons (Court / Moyen / Long Terme)', PALETTE.cyan);
    const horizonDefs: Array<{ key: 'shortTerm' | 'mediumTerm' | 'longTerm'; label: string }> = [
      { key: 'shortTerm', label: 'Court Terme (1-5J)' },
      { key: 'mediumTerm', label: 'Moyen Terme (2-4 Sem)' },
      { key: 'longTerm', label: 'Long Terme (6-12 Mois)' },
    ];
    const hRows: string[][] = [];
    for (const def of horizonDefs) {
      const hData = analysis.horizons[def.key];
      if (!hData) continue;
      hRows.push([
        def.label,
        sanitizePdfText(hData.finalAction),
        formatMadValue(hData.idealEntryPoint, 'MARKET'),
        formatMadValue(hData.takeProfit),
        formatMadValue(hData.stopLoss),
        sanitizePdfText(hData.riskRewardRatio || 'N/A'),
        sanitizePdfText(`${hData.confidenceLevel || 'N/A'} / ${hData.risk || 'Moyen'}`),
        sanitizePdfText(hData.why || hData.strategyPlan || 'Observation.'),
      ]);
    }
    if (hRows.length > 0) {
      y = runAutoTable(doc, autoTableFn, y, {
        head: [['Horizon', 'Action', 'Entrée', 'Take-Profit', 'Stop-Loss', 'R:R', 'Conf./Risque', 'Thèse']],
        body: hRows,
        columnStyles: {
          0: { cellWidth: 23, fontStyle: 'bold' },
          1: { cellWidth: 18 },
          2: { cellWidth: 20 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 13 },
          6: { cellWidth: 20 },
          7: { cellWidth: 44 },
        },
      });
    }
  }

  if (analysis.strategyBacktest) {
    const bt = analysis.strategyBacktest;
    y = drawSectionTitle(doc, y, 'Backtest Empirique Glissant (Validation Quantitative)', PALETTE.cyan);
    y = drawKpiGrid(doc, y, [
      { label: 'Échantillon', value: `${bt.sampleSize} signaux`, accent: PALETTE.slate700 },
      { label: 'Win Rate', value: `${bt.winRatePct.toFixed(1)}%`, accent: bt.winRatePct >= 50 ? PALETTE.emeraldDark : PALETTE.amberDark },
      { label: 'Rendement Moyen', value: `${bt.avgReturnPct >= 0 ? '+' : ''}${bt.avgReturnPct.toFixed(2)}%`, accent: bt.avgReturnPct >= 0 ? PALETTE.emeraldDark : PALETTE.roseDark },
      { label: 'Max Drawdown / Hor.', value: `-${bt.maxDrawdownPct.toFixed(2)}% (${bt.horizonSessions}j)`, accent: PALETTE.roseDark },
    ]);
  }

  const keyPoints = orch.keyPoints || analysis.horizons?.shortTerm?.keyPoints;
  if (keyPoints && keyPoints.length > 0) {
    y = drawSectionTitle(doc, y, 'Facteurs Clés de Décision Multi-Agents', PALETTE.emerald);
    const kpRows = keyPoints.map((pt, idx) => [String(idx + 1).padStart(2, '0'), sanitizePdfText(pt)]);
    y = runAutoTable(doc, autoTableFn, y, {
      head: [['#', 'Facteur Décisionnel']],
      body: kpRows,
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 170 },
      },
    });
  }

  // Annexe Consolidée Orchestrateur (toujours incluse dans le PDF même si l'accordéon UI est replié)
  y = drawSectionTitle(doc, y, 'Dossier Consolidé des Agents Travailleurs (Annexe Orchestrateur)', PALETTE.slate700);
  y = renderSentimentSections(doc, autoTableFn, y, analysis);
  y = renderTechnicalSections(doc, autoTableFn, y, analysis);
  y = renderFundamentalSections(doc, autoTableFn, y, analysis);

  return y;
}

/**
 * Construit le document PDF complet pour Sentiment, Technique, Fondamental ou Stratégie/Orchestrateur.
 */
export async function buildAgentReportPdf(analysis: CompanyAnalysis): Promise<{ bytes: Uint8Array; filename: string; pageCount: number }> {
  const { doc, autoTableFn } = await createPdfContext();

  const agentMeta: Record<CompanyAnalysis['type'], { badge: string; accent: RgbColor; slug: string }> = {
    SENTIMENT: { badge: 'AGENT SENTIMENT & VEILLE PRESSE', accent: PALETTE.emerald, slug: 'Sentiment' },
    TECHNICAL: { badge: 'AGENT TECHNIQUE & QUANTITATIF', accent: PALETTE.blue, slug: 'Technique' },
    FUNDAMENTAL: { badge: 'AGENT AUDIT FONDAMENTAL CSEMA', accent: PALETTE.amber, slug: 'Fondamental' },
    STRATEGY: { badge: 'ORCHESTRATEUR & STRATEGIE ALPHA', accent: PALETTE.emerald, slug: 'Strategie_Alpha' },
  };

  const meta = agentMeta[analysis.type] || agentMeta.STRATEGY;
  const isAiStr = (analysis.isAI ?? analysis.orchestrator?.isAI ?? false) ? 'Synthèse IA' : 'Calcul Quantitatif';

  let y = drawHeaderBanner(doc, {
    accentRgb: meta.accent,
    agentBadge: meta.badge,
    title: `${analysis.companyName}`,
    subtitle: `${analysis.sector || analysis.fundamentals?.sector || 'Bourse de Casablanca (MASI)'}  -  Mode : ${isAiStr}`,
    metaLines: [
      `Réf : #${sanitizePdfText(analysis.id, 'N/A').slice(0, 18)}`,
      `Date : ${sanitizePdfText(analysis.date)}`,
      `Généré : ${new Date().toLocaleDateString('fr-FR')}`,
    ],
  });

  y = renderDataQualityWarnings(doc, y, analysis);

  if (analysis.type === 'SENTIMENT') {
    y = renderSentimentSections(doc, autoTableFn, y, analysis);
  } else if (analysis.type === 'TECHNICAL') {
    y = renderTechnicalSections(doc, autoTableFn, y, analysis);
  } else if (analysis.type === 'FUNDAMENTAL') {
    y = renderFundamentalSections(doc, autoTableFn, y, analysis);
  } else {
    y = renderStrategyAndOrchestratorSections(doc, autoTableFn, y, analysis);
  }

  applyInstitutionalFooters(doc);
  const buffer = doc.output('arraybuffer');
  return {
    bytes: new Uint8Array(buffer),
    filename: formatPdfFilename(meta.slug, analysis.companyName),
    pageCount: doc.getNumberOfPages(),
  };
}

/**
 * Construit le rapport PDF complet de l'Agent 6 (Robo-Advisor Portefeuille).
 */
export async function buildRoboAdvisorPdf(
  recommendation: ValidatedPortfolioOptimization | any,
  context?: { holdings?: PortfolioHolding[]; isVirtualMode?: boolean }
): Promise<{ bytes: Uint8Array; filename: string; pageCount: number }> {
  const { doc, autoTableFn } = await createPdfContext();
  const isSharia = Boolean(recommendation?.shariaMode);
  const blockedCount = Number(recommendation?.blockedHaramOrdersCount || 0);
  const modeLabel = context?.isVirtualMode ? 'Portefeuille Virtuel (Sandbox)' : 'Portefeuille Réel';

  let y = drawHeaderBanner(doc, {
    accentRgb: PALETTE.purple,
    agentBadge: 'AGENT ROBO-ADVISOR & OPTIMISATION PORTEFEUILLE',
    title: 'Plan de Rééquilibrage & Allocation',
    subtitle: `${modeLabel}  -  ${isSharia ? 'Mode Sharia AAOIFI Actif' : 'Allocation Standard BVC'}`,
    metaLines: [
      `Positions : ${context?.holdings?.length ?? recommendation?.allocations?.length ?? 0}`,
      `Mode : ${isSharia ? 'Sharia AAOIFI' : 'Standard'}`,
      `Généré : ${new Date().toLocaleDateString('fr-FR')}`,
    ],
  });

  if (isSharia && blockedCount > 0) {
    y = drawCallout(doc, y, 'emerald', 'Filtre Sharia AAOIFI Appliqué', [
      `${blockedCount} ordre(s) d'achat sur des valeurs/secteurs financiers conventionnels proscrits ont été automatiquement bloqués.`,
    ]);
  }

  const div = recommendation?.diversification;
  const fees = recommendation?.feesSummary;

  y = drawSectionTitle(doc, y, 'Synthèse Diversification (HHI) & Impact Frais BVC', PALETTE.purple);
  y = drawKpiGrid(doc, y, [
    {
      label: 'Score Diversification HHI',
      value: div ? `${div.scoreBefore}/100 -> ${div.scoreAfter}/100` : 'N/A',
      sublabel: div ? `HHI ${div.hhiCurrent} -> ${div.hhiTarget}` : undefined,
      accent: PALETTE.purple,
    },
    {
      label: 'Risque Concentration',
      value: div ? sanitizePdfText(div.concentrationRisk) : 'N/A',
      accent: div?.concentrationRisk === 'ÉLEVÉ' ? PALETTE.roseDark : div?.concentrationRisk === 'MODÉRÉ' ? PALETTE.amberDark : PALETTE.emeraldDark,
    },
    {
      label: fees ? `Frais Courtage (${fees.feeRatePct}%)` : 'Frais Courtage BVC',
      value: fees ? `${formatNumberFr(fees.totalEstimatedFeesMAD, 2)} MAD` : 'N/A',
      accent: PALETTE.amberDark,
    },
    {
      label: 'Impact Trésorerie Net',
      value: fees ? `${fees.netCashImpactMAD >= 0 ? '+' : ''}${formatNumberFr(fees.netCashImpactMAD, 2)} MAD` : 'N/A',
      accent: fees && fees.netCashImpactMAD >= 0 ? PALETTE.emeraldDark : PALETTE.blue,
    },
  ]);

  if (div) {
    y = drawVectorGauge(
      doc,
      y,
      'Score de Diversification Cible Après Rééquilibrage',
      div.scoreAfter,
      `${div.scoreAfter} / 100 (Avant : ${div.scoreBefore}/100)`,
      PALETTE.purple
    );
  }

  const allocations = Array.isArray(recommendation?.allocations) ? recommendation.allocations : [];
  if (allocations.length > 0) {
    y = drawSectionTitle(doc, y, 'Allocation Sectorielle (Actuelle vs Cible)', PALETTE.purple);
    const allocRows = allocations.map((a: any) => {
      const cur = Number(a.current || 0);
      const tgt = Number(a.target || 0);
      const diff = tgt - cur;
      return [
        sanitizePdfText(a.sector),
        `${cur.toFixed(1)}%`,
        `${tgt.toFixed(1)}%`,
        `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} pts`,
      ];
    });
    y = runAutoTable(doc, autoTableFn, y, {
      head: [['Secteur BVC', 'Pondération Actuelle', 'Cible Proposée', 'Écart']],
      body: allocRows,
    });
  }

  const orders = Array.isArray(recommendation?.orders) ? recommendation.orders : [];
  y = drawSectionTitle(doc, y, `Ordres de Rebalancement Suggérés (${orders.length})`, PALETTE.purple);
  if (orders.length > 0) {
    const orderRows = orders.map((o: any) => [
      sanitizePdfText(o.type),
      sanitizePdfText(o.symbol),
      String(o.quantity ?? 0),
      o.estimatedPriceMAD !== undefined ? `${formatNumberFr(Number(o.estimatedPriceMAD), 2)} MAD` : 'Au marché',
      o.estimatedAmountMAD !== undefined ? `${formatNumberFr(Number(o.estimatedAmountMAD), 2)} MAD` : 'N/A',
      o.estimatedFeeMAD !== undefined ? `${formatNumberFr(Number(o.estimatedFeeMAD), 2)} MAD` : 'N/A',
      sanitizePdfText(o.reason),
    ]);
    y = runAutoTable(doc, autoTableFn, y, {
      head: [['Sens', 'Symbole', 'Qté', 'Cours Est.', 'Montant Brut', 'Frais 0.99%', 'Justification']],
      body: orderRows,
      columnStyles: {
        0: { cellWidth: 14, fontStyle: 'bold' },
        1: { cellWidth: 18, fontStyle: 'bold' },
        2: { cellWidth: 14, halign: 'right' },
        3: { cellWidth: 23, halign: 'right' },
        4: { cellWidth: 26, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 65 },
      },
    });
  } else {
    y = drawCallout(doc, y, 'blue', 'Aucun Ordre Requis', [
      'Aucun ordre d\'ajustement n\'a été retenu compte tenu du budget disponible et des garde-fous actifs.',
    ]);
  }

  if (context?.holdings && context.holdings.length > 0) {
    y = drawSectionTitle(doc, y, `Positions Détenues (${context.holdings.length})`, PALETTE.slate700);
    const hRows = context.holdings.map((h) => [
      sanitizePdfText(h.symbol),
      sanitizePdfText(h.sector || 'Autres Secteurs'),
      String(h.totalQuantity),
      `${formatNumberFr(h.weightedAveragePrice, 2)} MAD`,
      `${formatNumberFr(Number(h.curPrice ?? h.currentPrice ?? 0), 2)} MAD`,
      `${formatNumberFr(Number(h.valuation ?? h.currentValue ?? h.totalCost ?? 0), 2)} MAD`,
    ]);
    y = runAutoTable(doc, autoTableFn, y, {
      head: [['Symbole', 'Secteur', 'Quantité', 'PRU', 'Cours Actuel', 'Valorisation']],
      body: hRows,
    });
  }

  y = drawCallout(doc, y, 'purple', 'Rationnel Analytique du Robo-Advisor', [
    recommendation?.rationale || 'Synthèse non disponible.',
  ]);

  applyInstitutionalFooters(doc);
  const buffer = doc.output('arraybuffer');
  return {
    bytes: new Uint8Array(buffer),
    filename: formatPdfFilename('RoboAdvisor', isSharia ? 'SHARIA_AAOIFI' : 'PORTFOLIO'),
    pageCount: doc.getNumberOfPages(),
  };
}

export interface ShariaPdfOptions {
  dividendAmount?: number;
  dividendType?: 'BRUT' | 'NET';
  purificationAmount?: number;
  halalAmount?: number;
  canCalculate?: boolean;
  consolidatedPurification?: ConsolidatedPurificationSummary | null;
}

/**
 * Construit l'attestation PDF officielle pour l'Agent 7 (Sharia Screener & Purification AAOIFI).
 */
export async function buildShariaCertificatePdf(
  result: ShariaResult,
  options?: ShariaPdfOptions
): Promise<{ bytes: Uint8Array; filename: string; pageCount: number }> {
  const { doc, autoTableFn } = await createPdfContext();
  const isManual = result.dataQuality === 'MANUAL';
  const isUnverified = result.dataQuality === 'UNVERIFIED' || Boolean(result.isAIEstimated);
  const effectiveCompliant = isManual ? result.isCompliant : (result.isCompliant ?? result.estimatedCompliance ?? null);
  const isInterestMissing = Boolean(result.interestIncomeMissing) && !result.isHaramSector;

  const accentRgb = result.isHaramSector
    ? PALETTE.roseDark
    : effectiveCompliant
      ? isUnverified ? PALETTE.amberDark : PALETTE.emeraldDark
      : effectiveCompliant === false ? PALETTE.roseDark : PALETTE.slate700;

  let y = drawHeaderBanner(doc, {
    accentRgb,
    agentBadge: 'ATTESTATION SHARIA & PURIFICATION (NORMES AAOIFI 2026)',
    title: `${result.companyName} (${result.ticker})`,
    subtitle: `Secteur : ${sanitizePdfText(result.sector || 'Non spécifié')}  -  Exercice : ${sanitizePdfText(result.fiscalYear)}`,
    metaLines: [
      `Qualité : ${isManual ? 'Saisie Manuelle Certifiée' : isUnverified ? 'Extraction IA / Web' : 'Données Bilan'}`,
      `Ticker : ${sanitizePdfText(result.ticker)}`,
      `Émis le : ${new Date().toLocaleDateString('fr-FR')}`,
    ],
  });

  if (result.isHaramSector) {
    y = drawCallout(doc, y, 'rose', 'Activité Financière Non Conforme (Secteur Illicite AAOIFI)', [
      `La société ${result.companyName} exerce une activité principale reposant sur les intérêts bancaires (Riba) ou l'assurance conventionnelle.`,
      'Selon les normes AAOIFI, ce titre est proscrit et la purification du dividende ne s\'applique pas.',
    ]);
  } else if (isUnverified) {
    y = drawCallout(doc, y, 'amber', 'Avertissement Provenance des Données', [
      result.dataWarning || 'Données extraites automatiquement depuis TradingView CSEMA / recherche web. Vérifiez toujours avec les rapports AMMC certifiés.',
    ]);
  }

  const verdictStr = result.isHaramSector
    ? 'SECTEUR NON CONFORME'
    : effectiveCompliant === true
      ? isUnverified ? 'CONFORME (ESTIMATION)' : 'CONFORME SHARIA (HALAL)'
      : effectiveCompliant === false
        ? 'NON CONFORME SHARIA'
        : 'DONNÉES INCOMPLÈTES';

  y = drawSectionTitle(doc, y, 'Verdict de Conformité AAOIFI', accentRgb);
  y = drawKpiGrid(doc, y, [
    { label: 'Statut AAOIFI', value: verdictStr, accent: accentRgb },
    { label: 'Taux Purification', value: isInterestMissing ? 'PDF / CPC requis' : `${result.purificationRate.toFixed(2)}%`, accent: PALETTE.amberDark },
    { label: 'Ratio Dette', value: `${result.debtRatio.toFixed(2)}% (max 33.33%)`, accent: result.debtRatio <= 33.33 ? PALETTE.emeraldDark : PALETTE.roseDark },
    { label: 'Ratio Trésorerie', value: `${result.cashRatio.toFixed(2)}% (max 33.33%)`, accent: result.cashRatio <= 33.33 ? PALETTE.emeraldDark : PALETTE.roseDark },
  ]);

  if (typeof result.confidenceScore === 'number') {
    const scoreColor = result.confidenceScore >= 70 ? PALETTE.emeraldDark : result.confidenceScore >= 40 ? PALETTE.amberDark : PALETTE.roseDark;
    y = drawVectorGauge(doc, y, 'Indice de Fiabilité de l\'Extraction', result.confidenceScore, `${Math.round(result.confidenceScore)}%`, scoreColor);
  }

  y = drawCallout(doc, y, result.isHaramSector || effectiveCompliant === false ? 'rose' : 'emerald', 'Synthèse Analytique AAOIFI', [
    result.summary || '',
    result.explanation || '',
  ]);

  y = drawSectionTitle(doc, y, 'Détail des Ratios Financiers (Standard N°21)', accentRgb);
  const ratioRows = [
    [
      'Revenus Illicites / CA Total',
      '< 5.00%',
      isInterestMissing
        ? `Intérêts : Non publié (PDF AMMC requis) / CA : ${formatMadValue(result.financialData?.totalRevenue)}`
        : `Intérêts : ${formatMadValue(result.financialData?.interestIncome)} / CA : ${formatMadValue(result.financialData?.totalRevenue)}`,
      isInterestMissing ? 'À vérifier' : `${result.purificationRate.toFixed(2)}%`,
      isInterestMissing ? 'PDF REQUIS' : result.purificationRate <= 5 ? 'OK' : 'DÉPASSÉ',
    ],
    [
      'Dettes Portant Intérêt / Dénom.',
      '<= 33.33%',
      `Dettes : ${formatMadValue(result.financialData?.interestDebt)} / Base : ${formatMadValue(result.financialData?.marketCap)}`,
      `${result.debtRatio.toFixed(2)}%`,
      result.debtRatio <= 33.33 ? 'OK' : 'DÉPASSÉ',
    ],
    [
      'Trésorerie Placée / Dénom.',
      '<= 33.33%',
      `Cash : ${formatMadValue(result.financialData?.interestCash)} / Base : ${formatMadValue(result.financialData?.marketCap)}`,
      `${result.cashRatio.toFixed(2)}%`,
      result.cashRatio <= 33.33 ? 'OK' : 'DÉPASSÉ',
    ],
  ];

  y = runAutoTable(doc, autoTableFn, y, {
    head: [['Ratio AAOIFI', 'Seuil', 'Données Brutes Extraites', 'Résultat', 'Statut']],
    body: ratioRows,
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 18 },
      2: { cellWidth: 78 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
    },
  });

  if (result.denominatorComparison) {
    const dc = result.denominatorComparison;
    const compRows: string[][] = [];
    if (dc.marketCap) {
      compRows.push([
        `Capitalisation Boursière${dc.activeMethod === 'MARKET_CAP' ? ' (Active)' : ''}`,
        sanitizePdfText(dc.marketCap.value),
        `${dc.marketCap.debtRatio.toFixed(2)}%`,
        `${dc.marketCap.cashRatio.toFixed(2)}%`,
        dc.marketCap.compliant ? 'Conforme <= 33.33%' : 'Non conforme',
      ]);
    }
    if (dc.totalAssets) {
      compRows.push([
        `Total Actif (Bilan)${dc.activeMethod === 'TOTAL_ASSETS' ? ' (Active)' : ''}`,
        sanitizePdfText(dc.totalAssets.value),
        `${dc.totalAssets.debtRatio.toFixed(2)}%`,
        `${dc.totalAssets.cashRatio.toFixed(2)}%`,
        dc.totalAssets.compliant ? 'Conforme <= 33.33%' : 'Non conforme',
      ]);
    }
    if (compRows.length > 0) {
      y = drawSectionTitle(doc, y, 'Comparaison Double Dénominateur (Cap. Boursière vs Total Actif)', accentRgb);
      y = runAutoTable(doc, autoTableFn, y, {
        head: [['Méthode', 'Base Retenue', 'Ratio Dette', 'Ratio Cash', 'Conformité']],
        body: compRows,
      });
    }
  }

  if (result.historicalYears && result.historicalYears.length > 0) {
    y = drawSectionTitle(doc, y, 'Évolution Pluriannuelle des Ratios', accentRgb);
    const histRows = result.historicalYears.map((yr) => [
      sanitizePdfText(yr.fiscalYear),
      typeof yr.debtRatio === 'number' ? `${yr.debtRatio.toFixed(2)}%` : 'N/A',
      typeof yr.purificationRate === 'number' ? `${yr.purificationRate.toFixed(2)}%` : 'N/A',
    ]);
    y = runAutoTable(doc, autoTableFn, y, {
      head: [['Exercice', 'Ratio d\'Endettement', 'Taux de Purification']],
      body: histRows,
    });
  }

  if (result.citations && result.citations.length > 0) {
    y = drawSectionTitle(doc, y, 'Extraits & Notes Financières Vérifiables (CPC / Bilan)', accentRgb);
    const citRows = result.citations.map((c) => [
      sanitizePdfText(c.metric),
      sanitizePdfText(c.pageOrNote),
      sanitizePdfText(c.excerpt),
    ]);
    y = runAutoTable(doc, autoTableFn, y, {
      head: [['Métrique', 'Référence / Note', 'Extrait Exact']],
      body: citRows,
      columnStyles: {
        0: { cellWidth: 38, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 106 },
      },
    });
  }

  const divAmt = Number(options?.dividendAmount || 0);
  if (options?.canCalculate && divAmt > 0) {
    const purif = Number(options.purificationAmount ?? Math.ceil(divAmt * (result.purificationRate / 100)));
    const halal = Number(options.halalAmount ?? Math.max(0, divAmt - purif));
    y = drawSectionTitle(doc, y, 'Calcul de Purification du Dividende', PALETTE.emeraldDark);
    y = drawKpiGrid(doc, y, [
      { label: `Dividende (${options.dividendType || 'BRUT'})`, value: `${formatNumberFr(divAmt, 2)} MAD`, accent: PALETTE.slate700 },
      { label: 'Taux Appliqué', value: `${result.purificationRate.toFixed(2)}%`, accent: PALETTE.amberDark },
      { label: 'À Purifier (Arrondi Sup.)', value: `-${formatNumberFr(purif, 2)} MAD`, accent: PALETTE.roseDark },
      { label: 'Part Halal Conservée', value: `+${formatNumberFr(halal, 2)} MAD`, accent: PALETTE.emeraldDark },
    ]);
  }

  if (options?.consolidatedPurification && options.consolidatedPurification.items.length > 0) {
    const cp = options.consolidatedPurification;
    y = drawSectionTitle(doc, y, 'Synthèse Purification Portefeuille Consolidée', PALETTE.emeraldDark);
    const cpRows = cp.items.map((it) => [
      sanitizePdfText(it.symbol),
      sanitizePdfText(it.dividendDate),
      String(it.sharesHeld),
      `${formatNumberFr(it.grossDividendMAD, 2)} MAD`,
      `${it.purificationRatePct.toFixed(2)}%`,
      `${it.purificationAmountMAD.toFixed(0)} MAD`,
      `${formatNumberFr(it.halalNetMAD, 2)} MAD`,
    ]);
    cpRows.push([
      'TOTAL',
      '-',
      '-',
      `${formatNumberFr(cp.totalGrossMAD, 2)} MAD`,
      '-',
      `${cp.totalPurificationMAD.toFixed(0)} MAD`,
      `${formatNumberFr(cp.totalHalalMAD, 2)} MAD`,
    ]);
    y = runAutoTable(doc, autoTableFn, y, {
      head: [['Symbole', 'Date', 'Titres', 'Brut', 'Taux', 'À Purifier', 'Net Halal']],
      body: cpRows,
    });
  }

  if (result.sources && result.sources.length > 0) {
    y = drawCallout(doc, y, 'blue', 'Sources & Traçabilité', result.sources.map((s) => `- ${s}`));
  }

  applyInstitutionalFooters(
    doc,
    'AAOIFI Standard N°21 : Cet outil fournit une analyse technique et ne remplace pas l\'avis d\'un Comité Sharia certifié.'
  );
  const buffer = doc.output('arraybuffer');
  return {
    bytes: new Uint8Array(buffer),
    filename: formatPdfFilename('Attestation_Sharia', result.ticker || result.companyName),
    pageCount: doc.getNumberOfPages(),
  };
}

function triggerBrowserPdfDownload(bytes: Uint8Array, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Téléchargement navigateur indisponible hors environnement client.');
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1500);
}

export async function downloadAgentReportPdf(analysis: CompanyAnalysis): Promise<string> {
  const { bytes, filename } = await buildAgentReportPdf(analysis);
  triggerBrowserPdfDownload(bytes, filename);
  return filename;
}

export async function downloadRoboAdvisorPdf(
  recommendation: ValidatedPortfolioOptimization | any,
  context?: { holdings?: PortfolioHolding[]; isVirtualMode?: boolean }
): Promise<string> {
  const { bytes, filename } = await buildRoboAdvisorPdf(recommendation, context);
  triggerBrowserPdfDownload(bytes, filename);
  return filename;
}

export async function downloadShariaCertificatePdf(
  result: ShariaResult,
  options?: ShariaPdfOptions
): Promise<string> {
  const { bytes, filename } = await buildShariaCertificatePdf(result, options);
  triggerBrowserPdfDownload(bytes, filename);
  return filename;
}
