'use client';

import React from 'react';
import { X, Sparkles, CheckCircle2, Zap } from 'lucide-react';

interface PremiumPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const PremiumPaywallModal: React.FC<PremiumPaywallModalProps> = ({
  isOpen,
  onClose,
  onUpgrade
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay glass-heavy animate-fade-in" onClick={onClose}>
      <div className="modal-content glass-heavy premium-layout animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="premium-glow-effect"></div>
        <div className="modal-header-premium">
          <div className="premium-title-group">
            <Sparkles className="premium-icon animate-pulse" size={24} />
            <h2 className="mono premium-text">AETHERIS PREMIUM</h2>
          </div>
          <button onClick={onClose} className="close-modal"><X size={20} /></button>
        </div>

        <div className="premium-body">
          <p className="premium-subtitle">
            Débloquez la puissance analytique des algorithmes quantitatifs et de l'IA sur la Bourse de Casablanca.
          </p>

          <div className="premium-features-list">
            <div className="feature-item">
              <CheckCircle2 className="check-icon" size={16} />
              <div className="feature-text">
                <strong>Robo-Advisor d'Allocation :</strong> Optimisation mathématique (Markowitz) et rééquilibrage de portefeuille en un clic.
              </div>
            </div>
            <div className="feature-item">
              <CheckCircle2 className="check-icon" size={16} />
              <div className="feature-text">
                <strong>Synthèse Stratégique IA :</strong> Rapports institutionnels complets avec stops, objectifs de gain et horizons de placement.
              </div>
            </div>
            <div className="feature-item">
              <CheckCircle2 className="check-icon" size={16} />
              <div className="feature-text">
                <strong>Alertes Prix Illimitées :</strong> Restez informé instantanément des franchissements de Stop-Loss et Take-Profit.
              </div>
            </div>
            <div className="feature-item">
              <CheckCircle2 className="check-icon" size={16} />
              <div className="feature-text">
                <strong>Calculateur Fiscal Précis :</strong> Prise en compte de la TPV, des frais réels de courtage et des dividendes historiques.
              </div>
            </div>
          </div>

          <div className="premium-price-box">
            <span className="price-tag mono">199 MAD<span className="period">/mois</span></span>
            <span className="price-desc mono-tiny">SANS ENGAGEMENT · ANNULATION SIMPLE</span>
          </div>

          <div className="premium-actions">
            <button type="button" className="upgrade-btn mono" onClick={onUpgrade}>
              <Zap size={14} /> DÉBLOQUER PREMIUM
            </button>
            <button type="button" className="dismiss-btn mono" onClick={onClose}>PLUS TARD</button>
          </div>
        </div>

        <style jsx>{`
          .premium-layout {
            max-width: 460px;
            overflow: hidden;
            border: 1px solid rgba(168, 85, 247, 0.3) !important;
            box-shadow: 0 0 40px rgba(168, 85, 247, 0.15) !important;
          }
          .premium-glow-effect {
            position: absolute;
            top: -150px;
            left: 50%;
            transform: translateX(-50%);
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%);
            pointer-events: none;
            z-index: 0;
          }
          .modal-header-premium {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            position: relative;
            z-index: 1;
          }
          .premium-title-group {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .premium-icon {
            color: #a855f7;
          }
          .premium-text {
            font-size: 1.4rem;
            font-weight: 900;
            background: linear-gradient(135deg, #fff 30%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 0.15rem;
          }
          .premium-body {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }
          .premium-subtitle {
            color: #94a3b8;
            font-size: 0.88rem;
            line-height: 1.5;
          }
          .premium-features-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .feature-item {
            display: flex;
            gap: 0.75rem;
            align-items: flex-start;
          }
          .check-icon {
            color: #a855f7;
            margin-top: 2px;
            flex-shrink: 0;
          }
          .feature-text {
            font-size: 0.8rem;
            color: #e2e8f0;
            line-height: 1.4;
          }
          .feature-text strong {
            color: #fff;
          }
          .premium-price-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 1.25rem;
            border-radius: 1rem;
            background: rgba(168, 85, 247, 0.05);
            border: 1px solid rgba(168, 85, 247, 0.15);
            margin: 0.5rem 0;
          }
          .price-tag {
            font-size: 1.8rem;
            font-weight: 900;
            color: #fff;
          }
          .price-tag .period {
            font-size: 1rem;
            color: #a855f7;
          }
          .price-desc {
            font-size: 8px;
            color: #64748b;
            letter-spacing: 0.1rem;
            margin-top: 0.4rem;
          }
          .premium-actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .upgrade-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0.85rem;
            border-radius: 0.75rem;
            border: none;
            background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
            color: #fff;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
            transition: all 0.2s;
          }
          .upgrade-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 24px rgba(168, 85, 247, 0.4);
          }
          .dismiss-btn {
            background: transparent;
            border: 1px solid var(--border-glass);
            padding: 0.75rem;
            border-radius: 0.75rem;
            color: #64748b;
            cursor: pointer;
            font-weight: 600;
            font-size: 11px;
            transition: all 0.2s;
          }
          .dismiss-btn:hover {
            color: #fff;
            background: rgba(255,255,255,0.03);
          }
        `}</style>
      </div>
    </div>
  );
};
