'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, Zap, CreditCard, Lock, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { createCheckoutSessionAction } from '@/lib/stripe-actions';

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
  const [step, setStep] = useState<'features' | 'checkout' | 'processing' | 'success'>('features');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += value[i];
    }
    setCardNumber(formatted.substring(0, 19));
    if (errors.cardNumber) setErrors(prev => ({ ...prev, cardNumber: '' }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setExpiry(value.substring(0, 5));
    if (errors.expiry) setErrors(prev => ({ ...prev, expiry: '' }));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/gi, '');
    setCvv(value.substring(0, 3));
    if (errors.cvv) setErrors(prev => ({ ...prev, cvv: '' }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.toUpperCase());
    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (cardNumber.replace(/\s/g, '').length < 16) {
      newErrors.cardNumber = 'Numéro de carte requis (16 chiffres)';
    }
    if (expiry.length < 5) {
      newErrors.expiry = 'Date requise (MM/AA)';
    }
    if (cvv.length < 3) {
      newErrors.cvv = 'CVV requis (3 chiffres)';
    }
    if (!name.trim()) {
      newErrors.name = 'Nom du titulaire requis';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setStep('processing');
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onUpgrade();
        setStep('features');
        setCardNumber('');
        setExpiry('');
        setCvv('');
        setName('');
      }, 1500);
    }, 2500);
  };

  const handleCheckout = async () => {
    setStep('processing');
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await createCheckoutSessionAction(origin);
      if (res.success) {
        if (res.sandbox) {
          setStep('checkout');
        } else if (res.url) {
          window.location.href = res.url;
        }
      } else {
        alert("Erreur de redirection Stripe : " + res.error);
        setStep('features');
      }
    } catch (err: any) {
      alert("Erreur de communication : " + err.message);
      setStep('features');
    }
  };

  const getCardType = (num: string) => {
    const clean = num.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5')) return 'Mastercard';
    return 'CB';
  };

  return (
    <div
      className="modal-overlay glass-heavy animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Abonnement Aetheris Pro"
    >
      <div className="modal-content glass-heavy premium-layout animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="premium-glow-effect" aria-hidden="true" />

        <div className="modal-header-premium">
          <div className="premium-title-group">
            <Sparkles className="premium-icon animate-pulse" size={20} />
            <h2 className="mono premium-text">AETHERIS PRO</h2>
          </div>
          <button type="button" onClick={onClose} className="close-modal touch-target" aria-label="Fermer la fenêtre">
            <X size={20} />
          </button>
        </div>

        {step === 'features' && (
          <div className="premium-body animate-fade-in">
            <p className="premium-subtitle">
              Activez la puissance analytique quantique et de l&apos;IA pour maximiser vos arbitrages sur la Bourse de Casablanca.
            </p>

            <div className="premium-features-list">
              <div className="feature-item">
                <CheckCircle2 className="check-icon" size={16} />
                <div className="feature-text">
                  <strong>Robo-Advisor d&apos;Allocation :</strong> Optimisation mathématique (Markowitz) et rééquilibrage de portefeuille en un clic.
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
              <span className="price-desc mono-tiny">SANS ENGAGEMENT · PAIEMENT SÉCURISÉ SSL</span>
            </div>

            <div className="premium-actions">
              <button type="button" className="upgrade-btn mono" onClick={handleCheckout}>
                <Zap size={15} /> SOUSCRIRE À L&apos;OFFRE PRO
              </button>
              <button type="button" className="dismiss-btn mono" onClick={onClose}>PLUS TARD</button>
            </div>
          </div>
        )}

        {step === 'checkout' && (
          <div className="premium-body animate-fade-in">
            <div className="virtual-card glass">
              <div className="card-top">
                <span className="card-brand-label mono">AETHERIS DEBIT</span>
                <span className="card-logo mono">{getCardType(cardNumber)}</span>
              </div>

              <div className="card-chip-container">
                <div className="card-chip" />
                <div className="card-contactless">
                  <svg className="wifi-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19c-1.46-1.83-2.35-4.14-2.35-6.66 0-5.8 4.7-10.5 10.5-10.5h.01c2.14 0 4.14.64 5.8 1.74l-1.34 1.55c-1.3-.8-2.83-1.28-4.47-1.28z M12 6c-3.31 0-6 2.69-6 6 0 1.48.54 2.83 1.44 3.88l1.39-1.39c-.52-.66-.83-1.49-.83-2.49 0-2.21 1.79-4 4-4 1.34 0 2.53.66 3.26 1.67l1.45-1.45c-1.12-1.43-2.85-2.31-4.71-2.31z M12 9c-1.66 0-3 1.34-3 3 0 .76.28 1.45.75 1.99l1.43-1.43c-.11-.16-.18-.35-.18-.56 0-1.1.9-2 2-2 .21 0 .4.07.56.18l1.43-1.43c-.54-.47-1.23-.75-1.99-.75z" />
                  </svg>
                </div>
              </div>

              <div className="card-middle">
                <span className="card-number-display mono">
                  {cardNumber || '•••• •••• •••• ••••'}
                </span>
              </div>

              <div className="card-bottom">
                <div className="card-holder-group">
                  <span className="c-label-mini mono">HOLDER</span>
                  <span className="c-value c-holder-truncate mono">{name || 'NOM DU TITULAIRE'}</span>
                </div>
                <div className="card-expiry-group">
                  <span className="c-label-mini mono">EXPIRES</span>
                  <span className="c-value mono">{expiry || 'MM/AA'}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="payment-form">
              <div className="form-group">
                <label className="mono-tiny">NOM SUR LA CARTE</label>
                <input
                  type="text"
                  className={`payment-input ${errors.name ? 'error' : ''}`}
                  value={name}
                  onChange={handleNameChange}
                  placeholder="EX. KHALID BENJELLOUN"
                  autoComplete="cc-name"
                />
                {errors.name && <span className="input-err">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="mono-tiny">NUMÉRO DE CARTE DE CRÉDIT</label>
                <div className="input-with-icon">
                  <CreditCard size={15} className="input-icon-left" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    className={`payment-input pad-left ${errors.cardNumber ? 'error' : ''}`}
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4000 1234 5678 9010"
                  />
                </div>
                {errors.cardNumber && <span className="input-err">{errors.cardNumber}</span>}
              </div>

              <div className="form-row">
                <div className="form-group form-col-flex">
                  <label className="mono-tiny">EXPIRATION (MM/AA)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    className={`payment-input ${errors.expiry ? 'error' : ''}`}
                    value={expiry}
                    onChange={handleExpiryChange}
                    placeholder="09/28"
                  />
                  {errors.expiry && <span className="input-err">{errors.expiry}</span>}
                </div>
                <div className="form-group form-col-flex">
                  <label className="mono-tiny">CODE CVV (CVC)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    className={`payment-input ${errors.cvv ? 'error' : ''}`}
                    value={cvv}
                    onChange={handleCvvChange}
                    placeholder="•••"
                  />
                  {errors.cvv && <span className="input-err">{errors.cvv}</span>}
                </div>
              </div>

              <div className="security-note">
                <Lock size={13} className="text-emerald" />
                <span className="mono-tiny">PAIEMENT 199.00 MAD · CRYPTAGE SSL SÉCURISÉ</span>
              </div>

              <div className="premium-actions">
                <button type="submit" className="upgrade-btn mono">
                  <ShieldCheck size={15} /> CONFIRMER LE PAIEMENT
                </button>
                <button type="button" className="dismiss-btn mono" onClick={() => setStep('features')}>RETOUR</button>
              </div>
            </form>
          </div>
        )}

        {step === 'processing' && (
          <div className="premium-body processing-view animate-fade-in">
            <Loader2 className="animate-spin proc-spinner" size={44} />
            <div className="status-center">
              <h3 className="status-title mono">SÉCURISATION DU CANAL SSL...</h3>
              <p className="status-sub mono-tiny">AUTORISATION TRANSACTIONNELLE EN COURS</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="premium-body success-view animate-fade-in">
            <div className="success-badge-glow">
              <Check size={32} className="text-emerald" />
            </div>
            <div className="status-center">
              <h3 className="status-title emerald mono">PAIEMENT EFFECTUÉ AVEC SUCCÈS</h3>
              <p className="status-sub mono-tiny">BIENVENUE DANS AETHERIS PRO CORE v3</p>
            </div>
          </div>
        )}

        <style jsx>{`
          .premium-layout {
            max-width: 480px;
            overflow-x: hidden;
            overflow-y: auto;
            border: 1px solid rgba(168, 85, 247, 0.32) !important;
            box-shadow: 0 0 40px rgba(168, 85, 247, 0.16) !important;
          }
          .premium-glow-effect {
            position: absolute;
            top: -140px;
            left: 50%;
            transform: translateX(-50%);
            width: 280px;
            height: 280px;
            background: radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%);
            pointer-events: none;
            z-index: 0;
          }
          .modal-header-premium {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.15rem;
            position: relative;
            z-index: 1;
          }
          .premium-title-group {
            display: flex;
            align-items: center;
            gap: 0.65rem;
          }
          .premium-icon {
            color: #a855f7;
          }
          .premium-text {
            font-size: 1.2rem;
            font-weight: 900;
            background: linear-gradient(135deg, #fff 30%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 0.14rem;
          }
          .premium-body {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            gap: 1.2rem;
          }

          /* Visual card */
          .virtual-card {
            padding: 1.15rem 1.25rem;
            border-radius: 1rem;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            gap: 1rem;
            position: relative;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.35);
          }
          .card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .card-brand-label {
            font-size: 9px;
            font-weight: 800;
            color: #94a3b8;
            letter-spacing: 0.1rem;
          }
          .card-logo {
            font-size: 11px;
            font-weight: 900;
            color: #fff;
            letter-spacing: 0.05rem;
            background: rgba(255, 255, 255, 0.06);
            padding: 0.2rem 0.55rem;
            border-radius: 4px;
          }
          .card-chip-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .card-chip {
            width: 30px;
            height: 22px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border-radius: 4px;
          }
          .card-contactless {
            color: #94a3b8;
          }
          .card-number-display {
            font-size: clamp(1rem, 4.4vw, 1.3rem);
            font-weight: 800;
            color: #fff;
            letter-spacing: 0.12rem;
            word-spacing: 0.2rem;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          }
          .card-bottom {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 0.75rem;
          }
          .card-holder-group, .card-expiry-group {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
          }
          .c-holder-truncate {
            max-width: 180px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .c-label-mini {
            font-size: 8px;
            color: #64748b;
            font-weight: 850;
            letter-spacing: 0.05rem;
          }
          .c-value {
            font-size: 11px;
            font-weight: 800;
            color: #e2e8f0;
          }

          .premium-subtitle {
            color: #cbd5e1;
            font-size: 0.88rem;
            line-height: 1.5;
          }
          .premium-features-list {
            display: flex;
            flex-direction: column;
            gap: 0.85rem;
          }
          .feature-item {
            display: flex;
            gap: 0.7rem;
            align-items: flex-start;
          }
          .check-icon {
            color: #a855f7;
            margin-top: 2px;
            flex-shrink: 0;
          }
          .feature-text {
            font-size: 0.82rem;
            color: #e2e8f0;
            line-height: 1.42;
          }
          .feature-text strong {
            color: #fff;
          }
          .premium-price-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 1rem;
            border-radius: 1rem;
            background: rgba(168, 85, 247, 0.06);
            border: 1px solid rgba(168, 85, 247, 0.2);
          }
          .price-tag {
            font-size: 1.7rem;
            font-weight: 900;
            color: #fff;
          }
          .price-tag .period {
            font-size: 0.95rem;
            color: #a855f7;
          }
          .price-desc {
            font-size: 9px;
            color: #94a3b8;
            letter-spacing: 0.08rem;
            margin-top: 0.35rem;
            text-align: center;
          }

          /* Checkout form */
          .payment-form {
            display: flex;
            flex-direction: column;
            gap: 0.95rem;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .form-group label {
            color: #94a3b8;
            font-weight: 900;
            font-size: 10px;
            letter-spacing: 0.05rem;
          }
          .form-row {
            display: flex;
            gap: 0.85rem;
          }
          .form-col-flex {
            flex: 1;
            min-width: 0;
          }
          .payment-input {
            width: 100%;
            min-height: 46px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-glass);
            border-radius: 0.75rem;
            padding: 0.75rem 0.95rem;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            outline: none;
            transition: all 0.25s;
          }
          @media (max-width: 767px) {
            .payment-input {
              font-size: 16px;
            }
          }
          .payment-input:focus {
            border-color: rgba(168, 85, 247, 0.6);
            background: rgba(168, 85, 247, 0.04);
          }
          .payment-input.error {
            border-color: #f43f5e;
          }
          .input-with-icon {
            position: relative;
            display: flex;
            align-items: center;
          }
          .input-icon-left {
            position: absolute;
            left: 0.9rem;
            color: #64748b;
            pointer-events: none;
          }
          .pad-left {
            padding-left: 2.6rem;
          }
          .input-err {
            font-size: 10px;
            font-weight: 700;
            color: #fb7185;
            font-family: 'JetBrains Mono', monospace;
          }

          .security-note {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            background: rgba(16, 185, 129, 0.05);
            border: 1px solid rgba(16, 185, 129, 0.15);
            padding: 0.7rem 0.9rem;
            border-radius: 10px;
            color: #94a3b8;
            font-size: 10px;
          }

          .premium-actions {
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
            margin-top: 0.25rem;
          }
          .upgrade-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            width: 100%;
            min-height: 48px;
            padding: 0.85rem;
            border-radius: 12px;
            border: none;
            background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
            color: #fff;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(168, 85, 247, 0.32);
            transition: all 0.2s;
          }
          .upgrade-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 24px rgba(168, 85, 247, 0.42);
          }
          .dismiss-btn {
            background: transparent;
            border: 1px solid var(--border-glass);
            min-height: 46px;
            padding: 0.75rem;
            border-radius: 12px;
            color: #94a3b8;
            cursor: pointer;
            font-weight: 700;
            font-size: 11px;
            transition: all 0.2s;
            text-align: center;
          }
          .dismiss-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.04);
          }

          .processing-view, .success-view {
            padding: 2.5rem 1rem;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
            min-height: 240px;
          }
          :global(.proc-spinner) {
            color: #a855f7;
          }
          .status-center {
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          .status-title {
            font-weight: 800;
            color: #fff;
            letter-spacing: 0.1em;
            font-size: 0.85rem;
          }
          .status-title.emerald {
            color: #10b981;
          }
          .status-sub {
            color: #94a3b8;
            font-size: 10px;
          }
          .success-badge-glow {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.25);
          }
        `}</style>
      </div>
    </div>
  );
};
