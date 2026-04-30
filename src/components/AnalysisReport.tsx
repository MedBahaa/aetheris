import { useState } from 'react';
import { CompanyAnalysis, Sentiment } from '@/lib/agent-engine';
import { TrendingUp, TrendingDown, Minus, Info, Calendar, Building2, ChevronDown, ChevronUp, Newspaper } from 'lucide-react';

interface AnalysisReportProps {
  analysis: CompanyAnalysis;
}

const SentimentBadge = ({ sentiment }: { sentiment: Sentiment }) => {
  // Styles defined in global Emotion/CSS-in-JS block below via class names


  const Icons = {
    POSITIF: <TrendingUp size={12} />,
    NEGATIF: <TrendingDown size={12} />,
    NEUTRE: <Minus size={12} />,
  };

  return (
    <span className={`sent-badge sent-${sentiment.toLowerCase()}`}>
      {Icons[sentiment]}
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1).toLowerCase()}
    </span>
  );
};

export default function AnalysisReport({ analysis }: AnalysisReportProps) {
  const [expandedNews, setExpandedNews] = useState<string | null>(null);

  const toggleNews = (id: string) => {
    setExpandedNews(expandedNews === id ? null : id);
  };

  return (
    <div className="analysis-feed animate-fade-in">
      {/* Agent Identification */}
      <div className="feed-header">
        <div className="agent-identity">
          <div className="identity-glow"></div>
          <Building2 size={14} className="text-emerald" />
          <span className="mono-label">ANALYSE DE SENTIMENT & VEILLE MARCHÉ</span>

        </div>
        <div className="company-info-block">
          <h2 className="title-h2">{analysis.companyName}</h2>
          <div className="time-stamp">
            <Calendar size={12} className="opacity-50" />
            <span className="mono">DERNIÈRE SYNCHRO : {analysis.date}</span>
          </div>
        </div>
      </div>

      {/* FUNDAMENTALS SUMMARY */}
      {analysis.fundamentals && (
        <div className="fundamentals-grid animate-fade-in">
           <div className="fund-card glass-heavy" title="Price-to-Earnings Ratio : Mesure la valorisation de l'entreprise.">
              <div className="fund-hdr">
                <span className="mono-label">PER (PRICE-TO-EARNINGS RATIO)</span>

                {analysis.fundamentals.peRatio !== 'N/A' && <div className="verified-dot" title="Donnée vérifiée sur BMCE Capital"></div>}
              </div>
              <span className="fund-val mono">{analysis.fundamentals.peRatio || 'N/A'}</span>
           </div>
           <div className="fund-card glass-heavy" title="Rendement Dividende : Part des bénéfices reversée aux actionnaires.">
              <div className="fund-hdr">
                <span className="mono-label">RENDEMENT DU DIVIDENDE</span>

                {analysis.fundamentals.dividendYield !== 'N/A' && <div className="verified-dot" title="Donnée vérifiée sur BMCE Capital"></div>}
              </div>
              <span className="fund-val mono">{analysis.fundamentals.dividendYield || 'N/A'}</span>
           </div>
           <div className="fund-card glass-heavy" title="Capitalisation Boursière : Valeur totale des actions de l'entreprise.">
              <span className="mono-label">CAPITALISATION BOURSIÈRE</span>

              <span className="fund-val mono">{analysis.fundamentals.marketCap || 'N/A'}</span>
           </div>
           <div className="fund-card glass-heavy">
              <span className="mono-label">SECTEUR D'ACTIVITÉ</span>
              <span className="fund-val mono">{analysis.fundamentals.sector || 'N/A'}</span>
           </div>
        </div>
      )}

      {/* CORE SYNTHESIS */}
      <div className="synthesis-container">
        <div className="synthesis-card glass-heavy">
          <div className="card-top-glow"></div>
          <div className="synthesis-header">
            <Newspaper size={18} className="text-emerald" />
            <h3 className="mono-label" title="Analyse narrative générée par Gemini AI basée sur l'actualité et les données fondamentales.">RÉCIT ANALYTIQUE CONSOLIDÉ</h3>

          </div>
          <p className="narrative-body">
            &ldquo;{analysis.consolidatedSummary || "Génération du récit analytique en cours..."}&rdquo;
          </p>
          <div className="synthesis-data-footer">
            <div className="data-point">
              <span className="mono-label" title="Sentiment global extrait des sources textuelles récentes.">INDEX DE SENTIMENT GLOBAL</span>

              <SentimentBadge sentiment={analysis.globalSentiment} />
            </div>
            <div className="data-point">
              <span className="mono-label" title="Impact directionnel estimé sur le cours de bourse à court/moyen terme.">VECTEUR D'IMPACT ESTIMÉ</span>

              <div className="impact-pill glass">{analysis.probableImpact}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SOURCE LOG */}
      <div className="source-log-container">
        <div className="log-header">
          <div className="log-bracket"></div>
          <h4 className="mono-label">JOURNAL D'INTELLIGENCE MULTI-SOURCES ({analysis.news?.length || 0})</h4>

          <div className="log-line"></div>
        </div>
        
        <div className="log-stack">
          {analysis.news && analysis.news.length > 0 ? (
            analysis.news.map((item, index) => (
              <div key={item.id} className={`log-entry glass ${expandedNews === item.id ? 'active' : ''}`}>
                <div className="log-row" onClick={() => toggleNews(item.id)}>
                   <div className="log-main">
                      <span className="log-idx mono">[{String(index + 1).padStart(3, '0')}]</span>
                      <p className="log-summary">{item.summary}</p>
                   </div>
                   <div className="log-actions">
                      <span className={`action-tag mono ${item.sentiment.toLowerCase()}`}>{item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1).toLowerCase()}</span>
                      <button className="log-toggle">
                        {expandedNews === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                   </div>
                </div>

                {expandedNews === item.id && (
                  <div className="log-details animate-fade-in">
                    <div className="details-grid">
                      <div className="detail-meta">
                        <div className="meta-item">
                          <span className="mono-label">IMPACT ESTIMÉ</span>
                          <span className="m-val mono">{item.impact}</span>
                        </div>
                        <div className="meta-item">
                          <span className="mono-label" style={{ fontSize: '10px' }}>ORIENTATION DU FLUX</span>
                          <SentimentBadge sentiment={item.sentiment} />
                        </div>
                      </div>

                      <div className="analyst-note glass">
                        <div className="note-header">
                          <Info size={12} className="text-emerald" />
                          <span className="mono-label">INTERPRÉTATION ANALYSTE IA</span>
                        </div>
                        <p>{item.explanation}</p>
                        
                        <div className="note-footer">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="source-link">
                               Source: {item.source}
                            </a>
                          ) : (
                            <span className="source-text">Source: {item.source}</span>
                          )}
                          {item.date && <span className="date-text">[{item.date}]</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-log glass">
              <Info size={24} className="opacity-20" />
              <p className="mono-label opacity-40">AUCUNE DONNÉE SOURCE DÉTECTÉE</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .analysis-feed { display: flex; flex-direction: column; gap: 4rem; width: 100%; padding-bottom: 5rem; }
        
        .mono-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 850; color: var(--text-dim); letter-spacing: 0.15rem; text-transform: uppercase; }

        .mono { font-family: 'JetBrains Mono', monospace; }

        /* Header */
        .agent-identity { position: relative; display: flex; align-items: center; gap: 0.75rem; color: var(--accent-emerald); margin-bottom: 1.5rem; }
        .identity-glow { position: absolute; width: 100%; height: 100%; background: var(--accent-emerald); filter: blur(25px); opacity: 0.05; }
        
        .title-h2 { font-family: 'Outfit', sans-serif; font-size: 3.5rem; font-weight: 950; color: var(--text-main); letter-spacing: -0.05em; line-height: 0.9; margin: 0; }
        .time-stamp { display: flex; align-items: center; gap: 0.75rem; color: var(--text-dim); margin-top: 1rem; }


        /* Fundamentals */
        .fundamentals-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 4rem; }
        .fund-card { padding: 1.5rem; border-radius: 1.25rem; border: 1px solid var(--border-glass); display: flex; flex-direction: column; gap: 0.75rem; transition: all 0.3s var(--ease); position: relative; overflow: hidden; }
        .fund-card:hover { border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.02); }
        .fund-hdr { display: flex; align-items: center; justify-content: space-between; }
        .verified-dot { width: 5px; height: 5px; background: var(--accent-emerald); border-radius: 50%; box-shadow: 0 0 8px var(--accent-emerald); }
        .fund-val { font-size: 1.25rem; font-weight: 800; color: #fff; letter-spacing: -0.01em; }
        @media (max-width: 768px) { .fundamentals-grid { grid-template-columns: 1fr 1fr; } }

        /* Synthesis Card */
        .synthesis-card { 
          position: relative; 
          border-radius: 2rem; 
          padding: 3.5rem; 
          border: 1px solid var(--border-glass);
          box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.6);
        }
        .card-top-glow { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at 10% 10%, rgba(16, 185, 129, 0.05) 0%, transparent 60%); pointer-events: none; }
        
        .synthesis-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2.5rem; }
        .narrative-body { font-size: 1.75rem; line-height: 1.4; color: #f1f5f9; font-weight: 500; letter-spacing: -0.01em; margin-bottom: 3.5rem; }
        
        .synthesis-data-footer { display: flex; gap: 4rem; padding-top: 2.5rem; border-top: 1px solid var(--border-glass); }
        .data-point { display: flex; flex-direction: column; gap: 1rem; }
        .impact-pill { font-size: 11px; font-weight: 800; color: #fff; padding: 0.6rem 1.5rem; border-radius: 100px; border: 1px solid var(--border-glass); }

        /* Log Stack */
        .log-header { display: flex; align-items: center; gap: 2rem; margin-bottom: 3rem; }
        .log-bracket { width: 4px; height: 1.8rem; background: var(--accent-emerald); border-radius: 100px; box-shadow: 0 0 12px var(--accent-emerald); }
        .log-line { height: 1px; flex: 1; background: linear-gradient(to right, var(--border-glass), transparent); }

        .log-stack { display: flex; flex-direction: column; gap: 0.75rem; }
        .log-entry { border: 1px solid var(--border-glass); border-radius: 1rem; transition: all 0.3s var(--ease); overflow: hidden; }
        .log-entry:hover { background: rgba(255, 255, 255, 0.02); }
        .log-entry.active { border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.03); }

        .log-row { padding: 1.5rem 2rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; gap: 3rem; }
        .log-main { display: flex; align-items: center; gap: 2rem; flex: 1; }
        .log-idx { color: #334155; font-weight: 900; font-size: 10px; }
        .log-summary { font-size: 1.05rem; font-weight: 500; color: #fff; line-height: 1.4; letter-spacing: -0.01em; }
        
        .log-actions { display: flex; align-items: center; gap: 1.5rem; }
        .action-tag { 
          font-size: 9px; font-weight: 900; color: #475569; 
          border: 1px solid var(--border-glass); padding: 0.4rem 1.25rem; 
          border-radius: 6px; text-transform: uppercase; 
          transition: all 0.3s var(--ease);
        }
        .action-tag.positif { color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.03); }
        .action-tag.negatif { color: #f43f5e; border-color: rgba(244, 63, 94, 0.2); background: rgba(244, 63, 94, 0.03); }
        .action-tag.neutre { color: #f8fafc; border-color: rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.02); }

        .log-toggle { color: #334155; background: transparent; border: none; cursor: pointer; }

        .log-details { padding: 2.5rem; background: rgba(0,0,0,0.2); border-top: 1px solid var(--border-glass); }
        .details-grid { display: flex; flex-direction: column; gap: 2.5rem; }
        .detail-meta { display: flex; gap: 4rem; }
        .m-val { font-size: 11px; font-weight: 800; color: #fff; margin-top: 0.5rem; display: block; }

        .analyst-note { padding: 2rem; border-radius: 1.25rem; border: 1px solid var(--border-glass); border-left: 3px solid var(--accent-emerald); display: flex; flex-direction: column; gap: 1.25rem; }
        .note-header { display: flex; align-items: center; gap: 0.75rem; }
        .analyst-note p { font-size: 1rem; color: var(--text-muted); line-height: 1.7; font-weight: 500; margin: 0; }
        
        .note-footer { display: flex; align-items: center; gap: 0.75rem; border-top: 1px solid var(--border-glass); padding-top: 1rem; margin-top: 0.5rem;}
        .source-link { color: var(--accent-emerald); font-family: 'JetBrains Mono', monospace; font-size: 9px; text-decoration: none; font-weight: 700; transition: all 0.2s var(--ease); }
        .source-link:hover { text-decoration: underline; color: #fff; }
        .source-text { color: #64748b; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; }
        .date-text { color: #475569; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; }


        .empty-log { padding: 8rem 0; text-align: center; border: 1px dashed var(--border-glass); border-radius: 2rem; display: flex; flex-direction: column; align-items: center; gap: 2rem; }

        .sent-badge { 
          display: flex; align-items: center; gap: 0.75rem; 
          padding: 0.6rem 1.5rem; border-radius: 8px; 
          font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 950; 
          background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); 
          transition: all 0.3s var(--ease);
        }
        .sent-positif { 
          color: var(--accent-emerald); 
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.05);
          box-shadow: inset 0 0 10px rgba(16, 185, 129, 0.1);
          filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.15)); 
        }
        .sent-negatif { 
          color: #f43f5e; 
          border-color: rgba(244, 63, 94, 0.3);
          background: rgba(244, 63, 94, 0.05);
          box-shadow: inset 0 0 10px rgba(244, 63, 94, 0.1);
          filter: drop-shadow(0 0 12px rgba(244, 63, 94, 0.15)); 
        }
        .sent-neutre { 
          color: #f8fafc; 
          border-color: rgba(248, 250, 252, 0.2);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.05);
        }


        
        .text-emerald { color: var(--accent-emerald); }
      `}</style>
    </div>
  );
}
