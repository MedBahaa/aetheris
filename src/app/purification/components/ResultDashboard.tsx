'use client';

import React, { useState } from 'react';
import { FileText, ShieldCheck, XCircle, AlertTriangle, Coins, Check, Copy, ChevronDown, ChevronUp, ExternalLink, Info, Shield, BookOpen, Globe, FileCheck } from 'lucide-react';
import { ShariaResult } from '@/lib/schemas';

interface ResultDashboardProps {
  result: ShariaResult | null;
  isManualResult: boolean;
  dividendAmount: string;
  setDividendAmount: (val: string) => void;
  dividendType: 'BRUT' | 'NET';
  setDividendType: (val: 'BRUT' | 'NET') => void;
  canCalculate: boolean;
  halalAmount: number;
  purificationAmount: number;
  numericDividend: number;
  dataQuality?: 'MANUAL' | 'UNVERIFIED' | 'INSUFFICIENT';
  dataWarning?: string;
  sources?: string[];
  explanation?: string;
  confidenceScore?: number;
  estimatedCompliance?: boolean;
  isAIEstimated?: boolean;
  onPrefillManual?: () => void;
}

function ConfidenceGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const getZone = () => {
    if (clampedScore < 40) return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', label: 'FIABILITÉ FAIBLE', sublabel: 'Vérification obligatoire avec les rapports AMMC' };
    if (clampedScore < 70) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', label: 'FIABILITÉ MOYENNE', sublabel: 'Vérification recommandée' };
    return { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', label: 'FIABILITÉ ÉLEVÉE', sublabel: 'Données cohérentes détectées' };
  };
  const zone = getZone();

  return (
    <div style={{ background: zone.bg, border: `1px solid ${zone.border}`, borderRadius: '12px', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={14} style={{ color: zone.color }} />
          <span style={{ color: zone.color, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>{zone.label}</span>
        </div>
        <span style={{ color: zone.color, fontSize: '20px', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>{clampedScore}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{
          height: '100%',
          width: `${clampedScore}%`,
          borderRadius: '3px',
          background: `linear-gradient(90deg, ${zone.color}88, ${zone.color})`,
          transition: 'width 0.6s ease'
        }} />
      </div>
      <p style={{ fontSize: '11px', color: 'rgba(148,163,184,0.85)', margin: 0 }}>{zone.sublabel}</p>
    </div>
  );
}

function formatFinancialAmount(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null) return 'N/A';
  const str = String(raw).trim();
  if (!str || str.toUpperCase() === 'N/A') return 'N/A';
  const cleaned = str.replace(/[\s\u00A0\u202F]/g, '').replace(/(MAD|DH)$/i, '');
  let normalized = cleaned;
  if (normalized.includes('.') && normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }
  const num = Number(normalized);
  if (Number.isFinite(num)) {
    return num.toLocaleString('fr-FR');
  }
  return str;
}

function ProvenanceIcon({ quality }: { quality?: string }) {
  if (quality === 'MANUAL') return <span title="Saisie manuelle" style={{ fontSize: '12px', cursor: 'help' }}>✏️</span>;
  if (quality === 'UNVERIFIED') return <span title="Extraction IA (non vérifiée)" style={{ fontSize: '12px', cursor: 'help' }}>🤖</span>;
  return <span title="Source inconnue" style={{ fontSize: '12px', cursor: 'help' }}>❓</span>;
}

export default function ResultDashboard({
  result,
  isManualResult,
  dividendAmount,
  setDividendAmount,
  dividendType,
  setDividendType,
  canCalculate,
  halalAmount,
  purificationAmount,
  numericDividend,
  dataQuality,
  dataWarning,
  sources,
  explanation,
  confidenceScore,
  estimatedCompliance,
  isAIEstimated,
  onPrefillManual
}: ResultDashboardProps) {
  const [copied, setCopied] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);

  if (!result) return null;

  const isUnverified = dataQuality === 'UNVERIFIED' || isAIEstimated;
  const effectiveCompliant = isManualResult ? result.isCompliant : (result.isCompliant ?? estimatedCompliance ?? null);
  const isInterestMissing = !!result.interestIncomeMissing && !result.isHaramSector;

  const copyToClipboard = () => {
    if (!result || !canCalculate || !navigator.clipboard) return;
    const disclaimer = isUnverified ? '\n⚠️ AVERTISSEMENT: Résultat basé sur des données extraites par IA (non vérifiées). Confirmez avec les rapports AMMC.' : '';
    const text = `ANALYSE SHARIA & PURIFICATION DES DIVIDENDES (${result.companyName} - ${result.ticker})
- Statut: ${isUnverified ? 'ESTIMATION — ' : ''}${effectiveCompliant ? 'CONFORME (HALAL)' : 'NON CONFORME'}
- Secteur: ${result.sector || 'N/A'}
- Taux de Purification: ${result.purificationRate}%
- Dividende (${dividendType === 'BRUT' ? 'Brut avant impôts' : "Net d'impôts"}): ${numericDividend.toLocaleString('fr-FR')} MAD
- Part Halal: ${halalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
- Montant à Purifier (Aumône arrondie à l'unité supérieure): ${purificationAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD${disclaimer}
-- Généré via Aetheris Sharia Screener (AAOIFI 2026)`;

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => alert('La copie automatique est indisponible sur cet appareil.'));
  };

  const verdictTone = result.isHaramSector
    ? 'rose'
    : effectiveCompliant
      ? (isUnverified ? 'amber' : 'emerald')
      : effectiveCompliant === false
        ? 'rose'
        : 'slate';

  return (
    <div className={`data-terminal glass-heavy animate-fade-in sharia-result-root accent-${isManualResult ? 'emerald' : isUnverified ? 'amber' : 'emerald'}`}>
      {/* PDF EXPORT BUTTON */}
      <div className="sharia-export-row no-print">
        <button type="button" onClick={() => window.print()} className="sharia-ghost-btn">
          <FileText size={14} />
          <span>EXPORTER REÇU (PDF)</span>
        </button>
      </div>

      {/* 1. DATA PROVENANCE BANNER */}
      {isUnverified && !result.isHaramSector && (
        <div className="sharia-provenance-banner amber">
          <Globe size={20} className="prov-icon amber" />
          <div>
            <h4 className="prov-title amber">DONNÉES EXTRAITES PAR IA — NON VÉRIFIÉES</h4>
            <p className="prov-desc amber">
              {dataWarning || "Les données financières ont été extraites automatiquement depuis des sources web. Les montants peuvent contenir des erreurs. Vérifiez toujours avec les rapports AMMC et les états financiers certifiés."}
            </p>
          </div>
        </div>
      )}

      {isManualResult && (
        <div className="sharia-provenance-banner emerald">
          <FileCheck size={20} className="prov-icon emerald" />
          <div>
            <h4 className="prov-title emerald">DONNÉES SAISIES MANUELLEMENT</h4>
            <p className="prov-desc emerald">
              Les chiffres proviennent de votre saisie. Le calcul des ratios est déterministe et exact pour les montants fournis.
            </p>
          </div>
        </div>
      )}

      {/* 2. HARAM SECTOR ALERT */}
      {result.isHaramSector && (
        <div className="sharia-haram-alert">
          <AlertTriangle size={28} className="haram-icon" />
          <div>
            <h3 className="haram-title">SECTEUR ILLICITE PAR NATURE</h3>
            <p className="haram-text">
              L&apos;entreprise appartient à un secteur d&apos;activité non conforme à la Sharia ({result.sector}). Les activités telles que la banque conventionnelle, l&apos;assurance conventionnelle, l&apos;alcool, le tabac et les jeux de hasard sont proscrites.
            </p>
            <p className="haram-strong">
              Aucun calcul de purification n&apos;est applicable car l&apos;investissement principal est illicite.
            </p>
          </div>
        </div>
      )}

      {/* 3. COMPLIANCE HERO BADGE */}
      <div className="sharia-verdict-hero">
        <div className={`verdict-icon-ring ${verdictTone}`}>
          {result.isHaramSector ? <XCircle size={44} /> :
           effectiveCompliant ? <ShieldCheck size={44} /> :
           effectiveCompliant === false ? <XCircle size={44} /> :
           <AlertTriangle size={44} />}
        </div>

        {isUnverified && !result.isHaramSector && (
          <span className="est-pill">⚠️ ESTIMATION — DONNÉES NON VÉRIFIÉES</span>
        )}

        <h2 className={`verdict-title ${verdictTone}`}>
          {result.isHaramSector ? 'SECTEUR ILLICITE' :
           effectiveCompliant ? (isInterestMissing ? 'BILAN CONFORME (CPC À VÉRIFIER)' : (isUnverified ? 'ESTIMATION : CONFORME' : 'CONFORME (HALAL)')) :
           effectiveCompliant === false ? (isUnverified ? 'ESTIMATION : NON CONFORME' : 'NON CONFORME') :
           'DONNÉES INSUFFISANTES'}
        </h2>

        <div className="verdict-meta-pills">
          <span className="mono-tiny verdict-chip">{result.companyName}</span>
          <span className="mono-tiny verdict-chip">TICKER: {result.ticker}</span>
          <span className="mono-tiny verdict-chip">ANNÉE: {result.fiscalYear}</span>
          {result.sector && <span className="mono-tiny verdict-chip">SECTEUR: {result.sector}</span>}
        </div>

        {/* 4. CONFIDENCE GAUGE */}
        {!isManualResult && typeof confidenceScore === 'number' && confidenceScore > 0 && (
          <div className="confidence-wrap">
            <ConfidenceGauge score={confidenceScore} />
          </div>
        )}
      </div>

      {/* 5. AI EXPLANATION ACCORDION */}
      {!isManualResult && explanation && (
        <div className="sharia-accordion-block">
          <button
            type="button"
            onClick={() => setExplanationOpen(!explanationOpen)}
            className={`sharia-accordion-trigger ${explanationOpen ? 'open' : ''}`}
          >
            <div className="accordion-title-wrap">
              <Info size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <span>MÉTHODE D&apos;EXTRACTION IA — DÉTAILS DES CHIFFRES</span>
            </div>
            {explanationOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {explanationOpen && (
            <div className="sharia-accordion-body">
              <p className="accordion-pre">{explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* 6. AAOIFI FINANCIAL RATIOS */}
      <div className="sharia-ratios-section">
        <div className="ratios-header-row">
          <h3 className="ratios-heading">RATIOS FINANCIERS (NORMES AAOIFI)</h3>
          <div className="ratios-badges">
            {isManualResult && <span className="prov-badge emerald">SAISIE MANUELLE</span>}
            {isUnverified && (
              <span className="prov-badge amber">
                <ProvenanceIcon quality="UNVERIFIED" /> EXTRACTION IA
              </span>
            )}
          </div>
        </div>

        {/* DESKTOP TABLE (>= 1024px) */}
        <div className="desktop-only-container table-scroll sharia-table-wrap">
          <table className="sharia-ratios-table">
            <thead>
              <tr>
                <th>MÉTRIQUE</th>
                <th>LIMITE SHARIA</th>
                <th>VALEUR EXTRAITE <ProvenanceIcon quality={dataQuality} /></th>
                <th>RÉSULTAT RATIO</th>
                <th>STATUT</th>
              </tr>
            </thead>
            <tbody className="mono">
              <tr>
                <td className="metric-name-cell">Revenus Illicites / Chiffre d&apos;Affaires</td>
                <td className="limit-cell">&lt; 5%</td>
                <td className="extracted-cell">
                  Intérêts: <span className="val-white">{isInterestMissing ? 'Non publié (PDF / CPC requis)' : formatFinancialAmount(result.financialData.interestIncome)}</span><br />
                  CA: <span className="val-white">{formatFinancialAmount(result.financialData.totalRevenue)}</span>
                </td>
                <td className="ratio-val-cell">{isInterestMissing ? 'À vérifier' : `${result.purificationRate.toFixed(2)}%`}</td>
                <td>
                  {isInterestMissing ? (
                    <span className="ratio-status-pill warn">PDF REQUIS</span>
                  ) : (
                    <span className={`ratio-status-pill ${result.purificationRate <= 5 ? 'ok' : 'ko'}`}>
                      {result.purificationRate <= 5 ? 'OK' : 'DÉPASSÉ'}
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="metric-name-cell">Dettes / Dénominateur (Cap./Actif)</td>
                <td className="limit-cell">&lt; 33.33%</td>
                <td className="extracted-cell">
                  Dettes: <span className="val-white">{formatFinancialAmount(result.financialData.interestDebt)}</span><br />
                  Dénom.: <span className="val-white">{formatFinancialAmount(result.financialData.marketCap)}</span>
                </td>
                <td className="ratio-val-cell">{result.debtRatio.toFixed(2)}%</td>
                <td>
                  <span className={`ratio-status-pill ${result.debtRatio <= 33.33 ? 'ok' : 'ko'}`}>
                    {result.debtRatio <= 33.33 ? 'OK' : 'DÉPASSÉ'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="metric-name-cell">Trésorerie / Dénominateur</td>
                <td className="limit-cell">&lt; 33.33%</td>
                <td className="extracted-cell">
                  Cash: <span className="val-white">{formatFinancialAmount(result.financialData.interestCash)}</span><br />
                  Dénom.: <span className="val-white">{formatFinancialAmount(result.financialData.marketCap)}</span>
                </td>
                <td className="ratio-val-cell">{result.cashRatio.toFixed(2)}%</td>
                <td>
                  <span className={`ratio-status-pill ${result.cashRatio <= 33.33 ? 'ok' : 'ko'}`}>
                    {result.cashRatio <= 33.33 ? 'OK' : 'DÉPASSÉ'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* MOBILE RATIO CARDS (< 1024px) */}
        <div className="mobile-cards-list">
          {[
            {
              label: 'Revenus Illicites',
              val: result.purificationRate,
              limit: 5,
              isMissing: isInterestMissing,
              sub: isInterestMissing
                ? `Intérêts non publiés (PDF requis) / CA ${formatFinancialAmount(result.financialData.totalRevenue)}`
                : `Intérêts ${formatFinancialAmount(result.financialData.interestIncome)} / CA ${formatFinancialAmount(result.financialData.totalRevenue)}`
            },
            {
              label: 'Endettement Bancaire',
              val: result.debtRatio,
              limit: 33.33,
              isMissing: false,
              sub: `Dettes ${formatFinancialAmount(result.financialData.interestDebt)}`
            },
            {
              label: 'Trésorerie Placée',
              val: result.cashRatio,
              limit: 33.33,
              isMissing: false,
              sub: `Cash ${formatFinancialAmount(result.financialData.interestCash)}`
            }
          ].map((metric, i) => {
            const isOk = metric.val <= metric.limit;
            return (
              <div key={i} className="live-market-mobile-card ratio-mobile-card">
                <div className="ratio-card-row">
                  <div className="ratio-card-left">
                    <span className="ratio-card-title">{metric.label}</span>
                    <span className="mono-tiny ratio-card-limit">LIMITE AAOIFI &lt; {metric.limit}%</span>
                    <span className="ratio-card-sub">{metric.sub}</span>
                  </div>
                  <div className="ratio-card-right">
                    <div className="hero-price mono">{metric.isMissing ? 'À vérifier' : `${metric.val.toFixed(2)}%`}</div>
                    {metric.isMissing ? (
                      <span className="ratio-status-pill warn">PDF REQUIS</span>
                    ) : (
                      <span className={`ratio-status-pill ${isOk ? 'ok' : 'ko'}`}>
                        {isOk ? 'CONFORME' : 'DÉPASSÉ'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isInterestMissing && onPrefillManual && (
        <div className="sharia-prefill-cta no-print">
          <div className="prefill-cta-copy">
            <h4 className="prefill-cta-title">COMPLÉTER LE RATIO DE PURIFICATION (CPC)</h4>
            <p className="prefill-cta-desc">
              Le chiffre d&apos;affaires, les dettes, la trésorerie et la capitalisation sont déjà récupérés. Saisissez uniquement les produits d&apos;intérêts du rapport annuel pour obtenir le taux exact.
            </p>
          </div>
          <button type="button" onClick={onPrefillManual} className="sharia-prefill-btn">
            COMPLÉTER LES INTÉRÊTS EN MODE MANUEL (4/5 CHAMPS PRÉ-REMPLIS)
          </button>
        </div>
      )}

      {/* 7. SOURCES & TRACEABILITY */}
      {!isManualResult && sources && sources.length > 0 && (
        <div className="sharia-sources-section">
          <h3 className="ratios-heading with-icon">
            <BookOpen size={14} />
            <span>SOURCES &amp; TRAÇABILITÉ</span>
          </h3>
          <div className="sources-card">
            <ul className="sources-list">
              {sources.map((source, i) => {
                let safeSourceUrl: string | null = null;
                try {
                  const parsed = new URL(source.trim());
                  if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
                    safeSourceUrl = parsed.toString();
                  }
                } catch {
                  safeSourceUrl = null;
                }
                return (
                  <li key={i} className="source-item">
                    {safeSourceUrl ? (
                      <>
                        <ExternalLink size={12} style={{ color: '#38bdf8', flexShrink: 0 }} />
                        <a href={safeSourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                          {source.length > 80 ? source.substring(0, 80) + '...' : source}
                        </a>
                      </>
                    ) : (
                      <>
                        <FileText size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                        <span className="source-plain">{source}</span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* 8. METHODOLOGY ACCORDION */}
      <div className="sharia-accordion-block">
        <button
          type="button"
          onClick={() => setMethodologyOpen(!methodologyOpen)}
          className={`sharia-accordion-trigger muted ${methodologyOpen ? 'open' : ''}`}
        >
          <div className="accordion-title-wrap">
            <BookOpen size={16} style={{ color: '#64748b', flexShrink: 0 }} />
            <span>MÉTHODOLOGIE — NORMES AAOIFI (STANDARD N°21)</span>
          </div>
          {methodologyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {methodologyOpen && (
          <div className="sharia-accordion-body">
            <div className="method-grid">
              <div>
                <h4 className="method-item-title">1. Ratio de revenus illicites</h4>
                <p className="method-item-text">
                  <strong className="method-warn">Seuil : &lt; 5%</strong> — Les produits financiers issus d&apos;intérêts (Riba) divisés par le chiffre d&apos;affaires total. Si ce ratio dépasse 5%, l&apos;action n&apos;est pas éligible à l&apos;investissement islamique.
                </p>
              </div>
              <div>
                <h4 className="method-item-title">2. Ratio d&apos;endettement</h4>
                <p className="method-item-text">
                  <strong className="method-warn">Seuil : &lt; 33.33%</strong> — Les dettes porteuses d&apos;intérêts divisées par la capitalisation boursière (moyenne 36 mois) ou le total actif.
                </p>
              </div>
              <div>
                <h4 className="method-item-title">3. Ratio de trésorerie</h4>
                <p className="method-item-text">
                  <strong className="method-warn">Seuil : &lt; 33.33%</strong> — La trésorerie et les placements porteurs d&apos;intérêts divisés par le même dénominateur.
                </p>
              </div>
              <div className="method-sep">
                <h4 className="method-item-title">Calcul de purification</h4>
                <p className="method-item-text">
                  Si l&apos;action est conforme, le taux de purification (ratio 1) est appliqué au dividende brut reçu. Le montant résultant doit être versé en aumône (Sadaqah) avec arrondi à l&apos;unité supérieure.
                </p>
              </div>
            </div>
            <div className="method-disclaimer">
              <p>
                ⚖️ Avertissement juridique : Cet outil fournit une analyse technique basée sur les normes AAOIFI. Il ne constitue pas une fatwa ni un avis juridique islamique. Consultez un Comité Sharia certifié pour toute décision définitive.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 9. CALCULATEUR D'AUMÔNE */}
      {canCalculate && (
        <div className="purif-calc-card glass">
          <div className="purif-calc-header">
            <div className="purif-calc-title">
              <Coins size={18} />
              <span>CALCULATEUR DE PURIFICATION</span>
            </div>
            <button type="button" onClick={copyToClipboard} className="sharia-ghost-btn">
              {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              <span>{copied ? 'COPIÉ' : 'COPIER RÉSULTAT'}</span>
            </button>
          </div>

          <div className="purif-calc-grid">
            <div className="calc-input-col">
              <div className="calc-label-row">
                <label className="mono-tiny calc-label">MON DIVIDENDE REÇU (MAD)</label>
                <div className="brut-net-switch">
                  <button type="button" onClick={() => setDividendType('BRUT')} className={`bn-btn ${dividendType === 'BRUT' ? 'active' : ''}`}>BRUT</button>
                  <button type="button" onClick={() => setDividendType('NET')} className={`bn-btn ${dividendType === 'NET' ? 'active' : ''}`}>NET</button>
                </div>
              </div>
              <input
                type="number"
                inputMode="decimal"
                value={dividendAmount}
                onChange={e => setDividendAmount(e.target.value)}
                placeholder="Ex: 6024"
                className="calc-amount-input mono"
              />
              {dividendType === 'NET' && (
                <p className="calc-net-warn">
                  <AlertTriangle size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  La majorité des comités Sharia exigent de purifier sur la base du dividende <strong>BRUT</strong>.
                </p>
              )}
            </div>

            <div className="calc-result-box halal">
              <span className="result-box-label halal">PART HALAL CONSERVÉE ({(100 - result.purificationRate).toFixed(2)}%)</span>
              <span className="mono result-box-val">
                +{halalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="cur">MAD</span>
              </span>
            </div>

            <div className="calc-result-box purifier">
              <span className="result-box-label purifier">À PURIFIER / AUMÔNE ({result.purificationRate.toFixed(2)}%)</span>
              <span className="mono result-box-val purifier">
                -{purificationAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="cur purifier">MAD</span>
              </span>
              <p className="calc-rounding-note">*Arrondi à l&apos;unité supérieure par précaution</p>
            </div>
          </div>

          {!effectiveCompliant && !result.isHaramSector && (
            <div className="calc-ai-warn">
              <p>
                <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '5px' }} />
                Attention : ce titre dépasse un ou plusieurs seuils AAOIFI (dette/trésorerie &gt; 33.33% ou revenus illicites &gt; 5%). Selon les comités Sharia, la simple purification du dividende ne rend pas la détention du titre licite.
              </p>
            </div>
          )}

          {isUnverified && (
            <div className="calc-ai-warn">
              <p>
                <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '5px' }} />
                Ce montant de purification est basé sur des données extraites par IA. Vérifiez avec le rapport annuel certifié avant le versement.
              </p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .sharia-result-root {
          margin-top: 1.5rem;
          padding: 2rem;
          border-radius: 1.25rem;
          border-left: 4px solid #10b981;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .sharia-result-root.accent-amber { border-left-color: #f59e0b; }

        .sharia-export-row { display: flex; justify-content: flex-end; }
        .sharia-ghost-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          min-height: 38px;
          padding: 0 0.9rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: #f8fafc;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .sharia-provenance-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          border-radius: 12px;
          padding: 14px 18px;
        }
        .sharia-provenance-banner.amber { background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); }
        .sharia-provenance-banner.emerald { background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); }
        :global(.prov-icon.amber) { color: #f59e0b; flex-shrink: 0; margin-top: 2px; }
        :global(.prov-icon.emerald) { color: #10b981; flex-shrink: 0; margin-top: 2px; }
        .prov-title { font-size: 12.5px; font-weight: 800; margin: 0 0 4px; letter-spacing: 0.04em; }
        .prov-title.amber { color: #fbbf24; }
        .prov-title.emerald { color: #34d399; }
        .prov-desc { font-size: 12px; line-height: 1.5; margin: 0; }
        .prov-desc.amber { color: rgba(251, 191, 36, 0.85); }
        .prov-desc.emerald { color: rgba(52, 211, 153, 0.85); }

        .sharia-haram-alert {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          border-radius: 1rem;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.3);
          color: #fda4af;
        }
        :global(.haram-icon) { color: #f43f5e; flex-shrink: 0; margin-top: 2px; }
        .haram-title { font-size: 1.05rem; font-weight: 800; color: #fb7185; margin: 0 0 4px; }
        .haram-text { font-size: 0.85rem; line-height: 1.5; margin: 0 0 6px; }
        .haram-strong { font-size: 0.85rem; font-weight: 700; color: #fecdd3; margin: 0; }

        .sharia-verdict-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .verdict-icon-ring {
          padding: 1rem;
          border-radius: 999px;
          margin-bottom: 0.75rem;
          display: inline-flex;
        }
        .verdict-icon-ring.emerald { background: rgba(16, 185, 129, 0.18); color: #34d399; }
        .verdict-icon-ring.amber { background: rgba(245, 158, 11, 0.18); color: #fbbf24; }
        .verdict-icon-ring.rose { background: rgba(244, 63, 94, 0.18); color: #fb7185; }
        .verdict-icon-ring.slate { background: rgba(148, 163, 184, 0.18); color: #94a3b8; }

        .est-pill {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.14);
          padding: 4px 12px;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .verdict-title {
          font-size: clamp(1.6rem, 4.5vw, 2.35rem);
          font-weight: 950;
          margin: 0 0 0.75rem;
          letter-spacing: -0.02em;
        }
        .verdict-title.emerald { color: #34d399; }
        .verdict-title.amber { color: #fbbf24; }
        .verdict-title.rose { color: #fb7185; }
        .verdict-title.slate { color: #94a3b8; }

        .verdict-meta-pills {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .verdict-chip {
          background: rgba(30, 41, 59, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10px;
          color: #cbd5e1;
        }
        .confidence-wrap { margin-top: 1.25rem; width: 100%; max-width: 440px; }

        .sharia-accordion-block { display: flex; flex-direction: column; }
        .sharia-accordion-trigger {
          width: 100%;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: #94a3b8;
          cursor: pointer;
          text-align: left;
        }
        .sharia-accordion-trigger.open {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }
        .accordion-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }
        .sharia-accordion-body {
          padding: 1rem 1.15rem;
          background: rgba(15, 23, 42, 0.35);
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-top: none;
        }
        .accordion-pre { font-size: 13px; color: #cbd5e1; line-height: 1.65; margin: 0; white-space: pre-wrap; }

        .sharia-ratios-section { display: flex; flex-direction: column; gap: 0.85rem; }
        .ratios-header-row { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .ratios-heading {
          font-size: 12px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.1em;
          margin: 0;
        }
        .ratios-heading.with-icon { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.65rem; }
        .ratios-badges { display: flex; gap: 0.5rem; align-items: center; }
        .prov-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .prov-badge.emerald { background: rgba(16, 185, 129, 0.12); color: #34d399; }
        .prov-badge.amber { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }

        .sharia-table-wrap { border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; overflow: hidden; }
        .sharia-ratios-table { width: 100%; border-collapse: collapse; text-align: left; }
        .sharia-ratios-table thead tr { background: rgba(15, 23, 42, 0.9); border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        .sharia-ratios-table th { padding: 0.9rem 1rem; font-size: 10px; font-weight: 800; color: #64748b; }
        .sharia-ratios-table td { padding: 0.9rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); font-size: 13px; }
        .metric-name-cell { font-weight: 700; color: #e2e8f0; font-family: 'Inter', sans-serif; }
        .limit-cell { color: #64748b; }
        .extracted-cell { color: #94a3b8; line-height: 1.45; }
        .val-white { color: #fff; font-weight: 700; }
        .ratio-val-cell { font-weight: 800; color: #fff; }
        .ratio-status-pill {
          display: inline-block;
          padding: 3px 9px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
        }
        .ratio-status-pill.ok { background: rgba(16, 185, 129, 0.18); color: #34d399; }
        .ratio-status-pill.warn { background: rgba(245, 158, 11, 0.18); color: #fbbf24; }
        .ratio-status-pill.ko { background: rgba(244, 63, 94, 0.18); color: #fb7185; }

        .sharia-prefill-cta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.15rem 1.35rem;
          border-radius: 14px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.28);
        }
        .prefill-cta-copy { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 240px; }
        .prefill-cta-title { font-size: 12px; font-weight: 800; color: #fbbf24; margin: 0; letter-spacing: 0.05em; }
        .prefill-cta-desc { font-size: 12px; color: #cbd5e1; margin: 0; line-height: 1.45; }
        .sharia-prefill-btn {
          min-height: 44px;
          padding: 0.65rem 1.1rem;
          border-radius: 10px;
          border: 1px solid rgba(251, 191, 36, 0.45);
          background: rgba(245, 158, 11, 0.18);
          color: #fde68a;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .sharia-prefill-btn:hover { background: rgba(245, 158, 11, 0.28); transform: translateY(-1px); }

        .ratio-mobile-card { padding: 14px !important; }
        .ratio-card-row { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
        .ratio-card-left { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .ratio-card-title { font-size: 14px; font-weight: 800; color: #fff; }
        .ratio-card-limit { color: #64748b; font-size: 10px; }
        .ratio-card-sub { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ratio-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }

        .sources-card {
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 12px 16px;
        }
        .sources-list { margin: 0; padding: 0; list-style: none; }
        .source-item {
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .source-item:last-child { border-bottom: none; }
        .source-link { font-size: 12px; color: #38bdf8; text-decoration: none; word-break: break-all; }
        .source-plain { font-size: 12px; color: #cbd5e1; }

        .method-grid { display: grid; gap: 14px; }
        .method-item-title { font-size: 12px; font-weight: 700; color: #e2e8f0; margin: 0 0 4px; }
        .method-item-text { font-size: 12px; color: #94a3b8; line-height: 1.55; margin: 0; }
        .method-warn { color: #f59e0b; }
        .method-sep { border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 12px; }
        .method-disclaimer { margin-top: 14px; padding: 12px; background: rgba(100, 116, 139, 0.12); border-radius: 8px; }
        .method-disclaimer p { font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0; font-style: italic; }

        .purif-calc-card {
          padding: 1.5rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }
        .purif-calc-header { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .purif-calc-title { display: flex; align-items: center; gap: 0.5rem; color: #34d399; font-weight: 800; font-size: 0.95rem; }
        .purif-calc-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; align-items: stretch; }
        .calc-input-col { display: flex; flex-direction: column; justify-content: center; }
        .calc-label-row { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.45rem; }
        .calc-label { color: #94a3b8; font-size: 10px; font-weight: 700; }
        .brut-net-switch { display: inline-flex; gap: 2px; background: rgba(30, 41, 59, 0.9); border-radius: 6px; padding: 2px; }
        .bn-btn {
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
        }
        .bn-btn.active { background: #475569; color: #fff; }
        .calc-amount-input {
          width: 100%;
          min-height: 50px;
          font-size: 1.35rem;
          font-weight: 800;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          background: #0b111e;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #fff;
          outline: none;
        }
        .calc-net-warn { font-size: 10.5px; color: #f59e0b; margin: 6px 0 0; line-height: 1.4; }
        .calc-result-box {
          padding: 1.1rem;
          border-radius: 0.85rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
        }
        .calc-result-box.halal { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); }
        .calc-result-box.purifier { background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.25); }
        .result-box-label { font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
        .result-box-label.halal { color: #10b981; }
        .result-box-label.purifier { color: #f43f5e; }
        .result-box-val { font-size: 1.4rem; font-weight: 900; color: #fff; }
        .result-box-val.purifier { color: #fb7185; }
        .result-box-val .cur { font-size: 0.85rem; color: #94a3b8; }
        .result-box-val .cur.purifier { color: rgba(251, 113, 133, 0.7); }
        .calc-rounding-note { font-size: 10px; color: rgba(251, 113, 133, 0.75); margin: 2px 0 0; font-style: italic; }
        .calc-ai-warn {
          padding: 10px 14px;
          background: rgba(245, 158, 11, 0.07);
          border: 1px solid rgba(245, 158, 11, 0.18);
          border-radius: 8px;
        }
        .calc-ai-warn p { font-size: 11px; color: rgba(251, 191, 36, 0.85); line-height: 1.45; margin: 0; }

        @media (max-width: 1024px) {
          .purif-calc-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .sharia-result-root { padding: 1.1rem; gap: 1.15rem; }
          .sharia-haram-alert { flex-direction: column; gap: 0.65rem; }
          .purif-calc-card { padding: 1.1rem; }
          .calc-amount-input { font-size: 16px; }
        }
        @media print {
          body * { visibility: hidden; }
          .data-terminal, .data-terminal * { visibility: visible; }
          .data-terminal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
