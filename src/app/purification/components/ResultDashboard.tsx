import React, { useState } from 'react';
import { FileText, ShieldCheck, XCircle, AlertTriangle, Coins, Check, Copy, ChevronDown, ChevronUp, ExternalLink, Info, Shield, BookOpen, Globe, FileCheck, PenLine } from 'lucide-react';
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
  // Credibility props
  dataQuality?: 'MANUAL' | 'UNVERIFIED' | 'INSUFFICIENT';
  dataWarning?: string;
  sources?: string[];
  explanation?: string;
  confidenceScore?: number;
  estimatedCompliance?: boolean;
  isAIEstimated?: boolean;
}

// ─── Confidence Gauge Component ────────────────────────────
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield size={14} style={{ color: zone.color }} />
          <span style={{ color: zone.color, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>{zone.label}</span>
        </div>
        <span style={{ color: zone.color, fontSize: '20px', fontWeight: 900, fontFamily: 'monospace' }}>{clampedScore}%</span>
      </div>
      {/* Progress bar */}
      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{
          height: '100%',
          width: `${clampedScore}%`,
          borderRadius: '3px',
          background: `linear-gradient(90deg, ${zone.color}88, ${zone.color})`,
          transition: 'width 0.6s ease'
        }} />
      </div>
      <p style={{ fontSize: '11px', color: 'rgba(148,163,184,0.8)', margin: 0 }}>{zone.sublabel}</p>
    </div>
  );
}

// ─── Data Provenance Icon ──────────────────────────────────
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
  isAIEstimated
}: ResultDashboardProps) {
  const [copied, setCopied] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);

  if (!result) return null;

  // Determine the effective compliance for display
  const isUnverified = dataQuality === 'UNVERIFIED' || isAIEstimated;
  const effectiveCompliant = isManualResult ? result.isCompliant : (result.isCompliant ?? estimatedCompliance ?? null);

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

  return (
    <div className={`data-terminal glass-heavy animate-fade-in mt-6 border-l-4 ${isManualResult ? 'border-l-emerald-500' : isUnverified ? 'border-l-amber-500' : 'border-l-emerald-500'}`} style={{ padding: '2rem' }}>
      
      {/* PDF EXPORT BUTTON */}
      <div className="flex justify-end mb-4 no-print">
        <button onClick={() => window.print()} className="action-btn-terminal white" style={{ padding: '6px 12px', fontSize: '11px', height: 'auto' }}>
          <FileText size={14} className="mr-2 inline" />
          <span>EXPORTER REÇU (PDF)</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          1. DATA PROVENANCE BANNER — The most critical credibility element
          ═══════════════════════════════════════════════════════════ */}
      {isUnverified && !result.isHaramSector && (
        <div className="mb-6" style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: '12px',
          padding: '16px 20px'
        }}>
          <div className="flex items-start gap-3">
            <Globe size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px', letterSpacing: '0.04em' }}>
                DONNÉES EXTRAITES PAR IA — NON VÉRIFIÉES
              </h4>
              <p style={{ fontSize: '12px', color: 'rgba(251,191,36,0.8)', lineHeight: 1.5, margin: 0 }}>
                {dataWarning || "Les données financières ont été extraites automatiquement depuis des sources web. Les montants peuvent contenir des erreurs. Vérifiez toujours avec les rapports AMMC et les états financiers certifiés."}
              </p>
            </div>
          </div>
        </div>
      )}

      {isManualResult && (
        <div className="mb-6" style={{
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: '12px',
          padding: '16px 20px'
        }}>
          <div className="flex items-start gap-3">
            <FileCheck size={20} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', marginBottom: '4px', letterSpacing: '0.04em' }}>
                DONNÉES SAISIES MANUELLEMENT
              </h4>
              <p style={{ fontSize: '12px', color: 'rgba(52,211,153,0.8)', lineHeight: 1.5, margin: 0 }}>
                Les chiffres proviennent de votre saisie. Le calcul des ratios est déterministe et exact pour les montants fournis.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          2. HARAM SECTOR ALERT (unchanged logic, refined styling)
          ═══════════════════════════════════════════════════════════ */}
      {result.isHaramSector && (
        <div className="mb-8 bg-rose-500/10 border border-rose-500/30 p-6 rounded-xl flex items-start gap-4 text-rose-300">
          <AlertTriangle size={32} className="text-rose-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-lg text-rose-400 mb-1">SECTEUR ILLICITE PAR NATURE</h3>
            <p className="text-sm opacity-90 mb-2">L'entreprise appartient à un secteur d'activité non conforme à la Sharia ({result.sector}). Les activités telles que la banque conventionnelle, l'assurance conventionnelle, l'alcool, le tabac et les jeux de hasard sont proscrites.</p>
            <p className="text-sm font-bold opacity-100">Aucun calcul de purification n'est applicable car l'investissement principal est illicite.</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          3. COMPLIANCE HERO BADGE — Conditional verdict
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col items-center justify-center mb-8 pb-8 border-b border-white/5">
        {/* Icon */}
        <div className={`p-4 rounded-full mb-3 ${
          result.isHaramSector ? 'bg-rose-500/20 text-rose-400' :
          effectiveCompliant ? (isUnverified ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400') :
          effectiveCompliant === false ? 'bg-rose-500/20 text-rose-400' :
          'bg-slate-500/20 text-slate-400'
        }`}>
          {result.isHaramSector ? <XCircle size={48} /> :
           effectiveCompliant ? <ShieldCheck size={48} /> :
           effectiveCompliant === false ? <XCircle size={48} /> :
           <AlertTriangle size={48} />}
        </div>

        {/* Verdict label */}
        {isUnverified && !result.isHaramSector && (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#f59e0b',
            background: 'rgba(245,158,11,0.12)',
            padding: '4px 12px',
            borderRadius: '4px',
            marginBottom: '8px'
          }}>
            ⚠️ ESTIMATION — DONNÉES NON VÉRIFIÉES
          </span>
        )}

        <h2 className={`text-4xl font-black mb-1 text-center ${
          result.isHaramSector ? 'text-rose-400' :
          effectiveCompliant ? (isUnverified ? 'text-amber-400' : 'text-emerald-400') :
          effectiveCompliant === false ? 'text-rose-400' :
          'text-slate-400'
        }`}>
          {result.isHaramSector ? 'SECTEUR ILLICITE' :
           effectiveCompliant ? (isUnverified ? 'ESTIMATION : CONFORME' : 'CONFORME (HALAL)') :
           effectiveCompliant === false ? (isUnverified ? 'ESTIMATION : NON CONFORME' : 'NON CONFORME') :
           'DONNÉES INSUFFISANTES'}
        </h2>

        {/* Company info badges */}
        <div className="flex gap-4 mt-4 opacity-80 flex-wrap justify-center">
          <span className="mono-tiny bg-slate-800 px-3 py-1 rounded">{result.companyName}</span>
          <span className="mono-tiny bg-slate-800 px-3 py-1 rounded">TICKER: {result.ticker}</span>
          <span className="mono-tiny bg-slate-800 px-3 py-1 rounded">ANNÉE: {result.fiscalYear}</span>
          {result.sector && <span className="mono-tiny bg-slate-800 px-3 py-1 rounded">SECTEUR: {result.sector}</span>}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            4. CONFIDENCE GAUGE — Replaces the old tiny badge
            ═══════════════════════════════════════════════════════════ */}
        {!isManualResult && typeof confidenceScore === 'number' && confidenceScore > 0 && (
          <div className="mt-6 w-full max-w-md">
            <ConfidenceGauge score={confidenceScore} />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          5. AI EXPLANATION — Dedicated readable section
          ═══════════════════════════════════════════════════════════ */}
      {!isManualResult && explanation && (
        <div className="mb-6">
          <button 
            onClick={() => setExplanationOpen(!explanationOpen)}
            className="w-full flex items-center justify-between p-4 rounded-xl transition-colors hover:bg-slate-800/50"
            style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <Info size={16} style={{ color: '#38bdf8' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>
                MÉTHODE D'EXTRACTION IA — COMMENT LES CHIFFRES ONT ÉTÉ TROUVÉS
              </span>
            </div>
            {explanationOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>
          {explanationOpen && (
            <div style={{
              padding: '16px 20px',
              background: 'rgba(15,23,42,0.3)',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
              borderTop: 'none'
            }}>
              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          6. AAOIFI FINANCIAL RATIOS — Now with provenance icons
          ═══════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-slate-400 mb-4 tracking-widest flex justify-between items-end">
          <span>RATIOS FINANCIERS (Normes AAOIFI)</span>
          <div className="flex gap-2 items-center">
            {isManualResult && <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">SAISIE MANUELLE</span>}
            {isUnverified && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1"><ProvenanceIcon quality="UNVERIFIED" /> EXTRACTION IA</span>}
          </div>
        </h3>
        
        {/* DESKTOP TABLE */}
        <div className="hidden md:block border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-white/5">
                <th className="p-4 mono-tiny text-slate-500">MÉTRIQUE</th>
                <th className="p-4 mono-tiny text-slate-500">LIMITE SHARIA</th>
                <th className="p-4 mono-tiny text-slate-500">VALEUR EXTRAITE <ProvenanceIcon quality={dataQuality} /></th>
                <th className="p-4 mono-tiny text-slate-500">RÉSULTAT RATIO</th>
                <th className="p-4 mono-tiny text-slate-500">STATUT</th>
              </tr>
            </thead>
            <tbody className="mono text-sm">
              <tr className="border-b border-white/5 hover:bg-slate-900/50 transition-colors">
                <td className="p-4 font-bold text-slate-300">Revenus Illicites / Chiffre d'Affaires</td>
                <td className="p-4 text-slate-500">&lt; 5%</td>
                <td className="p-4 text-slate-400">
                  Intérêts: <span className="text-white">{Number(result.financialData.interestIncome).toLocaleString('fr-FR')}</span><br/>
                  CA: <span className="text-white">{Number(result.financialData.totalRevenue).toLocaleString('fr-FR')}</span>
                </td>
                <td className="p-4 font-bold text-white">{result.purificationRate.toFixed(2)}%</td>
                <td className="p-4">
                  <div className={`px-2 py-1 rounded text-xs font-bold inline-block ${result.purificationRate <= 5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {result.purificationRate <= 5 ? 'OK' : 'DÉPASSÉ'}
                  </div>
                </td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-slate-900/50 transition-colors">
                <td className="p-4 font-bold text-slate-300">Dettes / Dénominateur (Capitalisation/Actif)</td>
                <td className="p-4 text-slate-500">&lt; 33.33%</td>
                <td className="p-4 text-slate-400">
                  Dettes: <span className="text-white">{Number(result.financialData.interestDebt).toLocaleString('fr-FR')}</span><br/>
                  Dénominateur: <span className="text-white">{Number(result.financialData.marketCap).toLocaleString('fr-FR')}</span>
                </td>
                <td className="p-4 font-bold text-white">{result.debtRatio.toFixed(2)}%</td>
                <td className="p-4">
                  <div className={`px-2 py-1 rounded text-xs font-bold inline-block ${result.debtRatio <= 33.33 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {result.debtRatio <= 33.33 ? 'OK' : 'DÉPASSÉ'}
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-slate-900/50 transition-colors">
                <td className="p-4 font-bold text-slate-300">Trésorerie / Dénominateur</td>
                <td className="p-4 text-slate-500">&lt; 33.33%</td>
                <td className="p-4 text-slate-400">
                  Cash: <span className="text-white">{Number(result.financialData.interestCash).toLocaleString('fr-FR')}</span><br/>
                  Dénominateur: <span className="text-white">{Number(result.financialData.marketCap).toLocaleString('fr-FR')}</span>
                </td>
                <td className="p-4 font-bold text-white">{result.cashRatio.toFixed(2)}%</td>
                <td className="p-4">
                  <div className={`px-2 py-1 rounded text-xs font-bold inline-block ${result.cashRatio <= 33.33 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {result.cashRatio <= 33.33 ? 'OK' : 'DÉPASSÉ'}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* MOBILE TABLE CARDS */}
        <div className="mobile-only-container gap-3 mb-8 md:hidden">
          {[
            { label: "Revenus Illicites", val: result.purificationRate, limit: 5, tip: "AAOIFI: Max 5% des revenus totaux" },
            { label: "Endettement Bancaire", val: result.debtRatio, limit: 33, tip: "AAOIFI: Max 33% du dénominateur" },
            { label: "Trésorerie Placée", val: result.cashRatio, limit: 33, tip: "AAOIFI: Max 33% du dénominateur" }
          ].map((metric, i) => {
            const isOk = metric.val <= metric.limit;
            return (
              <div key={i} className="live-market-mobile-card p-4 bg-slate-900/50 rounded-xl border border-white/5 mb-2">
                <div className="flex justify-between items-center">
                  <div className="stock-titles">
                    <span className="stock-symbol-title font-bold text-white flex items-center gap-1">{metric.label} <span title={metric.tip} className="cursor-help opacity-50 hover:opacity-100 text-xs">ⓘ</span></span>
                    <span className="mono-tiny text-slate-500">MAX {metric.limit}%</span>
                  </div>
                  <div className="price-hero-block flex flex-col items-end">
                    <div className="hero-price font-bold mono text-lg">{metric.val.toFixed(2)}%</div>
                    <div className={`pnl-hero-pill mt-1 px-2 py-0.5 rounded text-xs font-bold ${isOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {isOk ? 'CONFORME' : 'DÉPASSÉ'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          7. SOURCES & TRACEABILITY SECTION
          ═══════════════════════════════════════════════════════════ */}
      {!isManualResult && sources && sources.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-400 mb-3 tracking-widest flex items-center gap-2">
            <BookOpen size={14} />
            <span>SOURCES & TRAÇABILITÉ</span>
          </h3>
          <div style={{
            background: 'rgba(15,23,42,0.4)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '16px 20px'
          }}>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {sources.map((source, i) => {
                const isUrl = source.startsWith('http');
                return (
                  <li key={i} style={{
                    padding: '8px 0',
                    borderBottom: i < sources.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {isUrl ? (
                      <>
                        <ExternalLink size={12} style={{ color: '#38bdf8', flexShrink: 0 }} />
                        <a
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '12px', color: '#38bdf8', textDecoration: 'none', wordBreak: 'break-all' }}
                        >
                          {source.length > 80 ? source.substring(0, 80) + '...' : source}
                        </a>
                      </>
                    ) : (
                      <>
                        <FileText size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{source}</span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          8. METHODOLOGY SECTION (collapsible)
          ═══════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <button
          onClick={() => setMethodologyOpen(!methodologyOpen)}
          className="w-full flex items-center justify-between p-4 rounded-xl transition-colors hover:bg-slate-800/50"
          style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} style={{ color: '#64748b' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em' }}>
              MÉTHODOLOGIE — NORMES AAOIFI (STANDARD N°21)
            </span>
          </div>
          {methodologyOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </button>
        {methodologyOpen && (
          <div style={{
            padding: '20px',
            background: 'rgba(15,23,42,0.2)',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            borderTop: 'none'
          }}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>1. Ratio de revenus illicites</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  <strong style={{ color: '#f59e0b' }}>Seuil : &lt; 5%</strong> — Les produits financiers issus d'intérêts (Riba) divisés par le chiffre d'affaires total. Si ce ratio dépasse 5%, l'action n'est pas éligible à l'investissement islamique.
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>2. Ratio d'endettement</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  <strong style={{ color: '#f59e0b' }}>Seuil : &lt; 33.33%</strong> — Les dettes porteuses d'intérêts divisées par la capitalisation boursière (moyenne 36 mois) ou le total actif. Ce ratio mesure la dépendance de l'entreprise au financement conventionnel.
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>3. Ratio de trésorerie</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  <strong style={{ color: '#f59e0b' }}>Seuil : &lt; 33.33%</strong> — La trésorerie et les placements porteurs d'intérêts divisés par le même dénominateur. Ce ratio vérifie que l'entreprise ne détient pas une part excessive d'actifs liquides rémunérés par des intérêts.
                </p>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>Calcul de purification</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  Si l'action est conforme, le taux de purification (ratio 1) est appliqué au dividende brut reçu. Le montant résultant doit être versé en aumône (Sadaqah) pour purifier le revenu. L'arrondi est fait à l'unité supérieure par précaution religieuse.
                </p>
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(100,116,139,0.1)', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                ⚖️ Avertissement juridique : Cet outil fournit une analyse technique basée sur les normes AAOIFI (Accounting and Auditing Organization for Islamic Financial Institutions). Il ne constitue pas une fatwa ni un avis juridique islamique. Pour toute décision de conformité Sharia, consultez un Comité Sharia certifié ou un conseiller qualifié.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          9. CALCULATEUR D'AUMÔNE (preserved, with disclaimer)
          ═══════════════════════════════════════════════════════════ */}
      {canCalculate && <div className="glass p-6 rounded-2xl bg-slate-900 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <Coins size={18} />
            <span className="font-bold tracking-wide">CALCULATEUR DE PURIFICATION</span>
          </div>
          <button onClick={copyToClipboard} className="action-btn-terminal white" style={{ padding: '6px 12px', fontSize: '11px', height: 'auto' }}>
            {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
            <span>{copied ? 'COPIÉ' : 'COPIER RÉSULTAT'}</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="mono-tiny text-slate-400">MON DIVIDENDE REÇU (MAD)</label>
              <div className="flex items-center gap-1 bg-slate-800 rounded px-1 py-0.5">
                <button onClick={() => setDividendType('BRUT')} className={`text-[10px] px-2 py-0.5 rounded font-bold ${dividendType === 'BRUT' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>BRUT</button>
                <button onClick={() => setDividendType('NET')} className={`text-[10px] px-2 py-0.5 rounded font-bold ${dividendType === 'NET' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>NET</button>
              </div>
            </div>
            <input 
              type="number" 
              value={dividendAmount} 
              onChange={e => setDividendAmount(e.target.value)}
              placeholder="Ex: 6024"
              className="terminal-input"
              style={{ fontSize: '1.5rem', fontWeight: 800, padding: '1rem', width: '100%', borderRadius: '0.75rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
            />
            {dividendType === 'NET' && (
              <p className="text-[10px] text-amber-500 mt-2 leading-tight">
                <AlertTriangle size={10} className="inline mr-1" />
                La majorité des comités Sharia exigent de purifier sur la base du dividende <strong>BRUT</strong> (avant retenue à la source).
              </p>
            )}
          </div>

          <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-500 font-bold text-xs uppercase tracking-wider block mb-1">PART HALAL CONSERVÉE ({(100 - result.purificationRate).toFixed(2)}%)</span>
            <span className="mono text-2xl font-black text-white">
              +{halalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-slate-400">MAD</span>
            </span>
          </div>

          <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-rose-500 font-bold text-xs uppercase tracking-wider block mb-1">À PURIFIER / AUMÔNE ({result.purificationRate.toFixed(2)}%)</span>
            <span className="mono text-2xl font-black text-rose-500">
              -{purificationAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-rose-500/50">MAD</span>
            </span>
            <p className="text-[10px] text-rose-400/70 mt-2 italic">*Arrondi à l'unité supérieure par précaution religieuse</p>
          </div>
        </div>

        {/* Disclaimer for AI-estimated results in the calculator */}
        {isUnverified && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '11px', color: 'rgba(245,158,11,0.8)', lineHeight: 1.5, margin: 0 }}>
              <AlertTriangle size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Ce montant de purification est basé sur des données extraites par IA. Vérifiez les chiffres avec le rapport annuel certifié avant d'effectuer le versement.
            </p>
          </div>
        )}
      </div>}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .data-terminal, .data-terminal * {
            visibility: visible;
          }
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
          .no-print {
            display: none !important;
          }
          .text-amber-400, .text-amber-500, .text-rose-400, .text-rose-500, .text-emerald-400, .text-emerald-500, .text-white, .text-slate-300, .text-slate-400, .text-slate-500 {
            color: black !important;
          }
          .bg-slate-900\\/50, .bg-slate-800, .glass-heavy, .bg-emerald-500\\/20, .bg-amber-500\\/20, .bg-rose-500\\/20, .bg-amber-950\\/30 {
            background: #f8fafc !important;
            border-color: #cbd5e1 !important;
          }
          .inst-row {
            border-bottom: 1px solid #ccc !important;
          }
          .pnl-hero-pill {
            border: 1px solid #000 !important;
            color: #000 !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
