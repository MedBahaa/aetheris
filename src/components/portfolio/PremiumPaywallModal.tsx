'use client';

import React, { useState } from 'react';
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

  if (!isOpen) return null;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
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
    let value = e.target.value.replace(/[^0-9]/gi, '');
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
        setStep('features'); // reset for next open
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
          // Sandbox Mode - display simulated virtual card
          setStep('checkout');
        } else if (res.url) {
          // Production Mode - redirect to secure Stripe Checkout
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

  // Détecte le type de carte pour l'affichage visuel
  const getCardType = (num: string) => {
    const clean = num.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5')) return 'Mastercard';
    return 'CB';
  };

  return (
    <div className="modal-overlay glass-heavy animate-fade-in" onClick={onClose}>
      <div className="modal-content glass-heavy premium-layout animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="premium-glow-effect"></div>
        
        <div className="modal-header-premium">
          <div className="premium-title-group">
            <Sparkles className="premium-icon animate-pulse" size={20} />
            <h2 className="mono premium-text">AETHERIS PRO</h2>
          </div>
          <button onClick={onClose} className="close-modal"><X size={18} /></button>
        </div>

        {step === 'features' && (
          <div className="premium-body animate-fade-in">
            <p className="premium-subtitle">
              Activez la puissance analytique quantique et de l'IA pour maximiser vos arbitrages sur la Bourse de Casablanca.
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
              <span className="price-desc mono-tiny">SANS ENGAGEMENT · PAIEMENT SÉCURISÉ SSL</span>
            </div>

            <div className="premium-actions">
              <button type="button" className="upgrade-btn mono" onClick={handleCheckout}>
                <Zap size={14} /> SOUSCRIRE À L'OFFRE PRO
              </button>
              <button type="button" className="dismiss-btn mono" onClick={onClose}>PLUS TARD</button>
            </div>
          </div>
        )}

        {step === 'checkout' && (
          <div className="premium-body animate-fade-in">
            {/* Visual Credit Card */}
            <div className="virtual-card glass">
              <div className="card-top">
                <span className="card-brand-label mono">AETHERIS DEBIT</span>
                <span className="card-logo mono">{getCardType(cardNumber)}</span>
              </div>
              
              <div className="card-chip-container">
                <div className="card-chip"></div>
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
                  <span className="c-value mono truncate max-w-[180px]">{name || 'NOM DU TITULAIRE'}</span>
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
                />
                {errors.name && <span className="input-err">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="mono-tiny">NUMÉRO DE CARTE DE CRÉDIT</label>
                <div className="input-with-icon">
                  <CreditCard size={14} className="input-icon-left" />
                  <input 
                    type="text" 
                    className={`payment-input pad-left ${errors.cardNumber ? 'error' : ''}`}
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4000 1234 5678 9010"
                  />
                </div>
                {errors.cardNumber && <span className="input-err">{errors.cardNumber}</span>}
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="mono-tiny">EXPIRATION (MM/AA)</label>
                  <input 
                    type="text" 
                    className={`payment-input ${errors.expiry ? 'error' : ''}`}
                    value={expiry}
                    onChange={handleExpiryChange}
                    placeholder="09/28"
                  />
                  {errors.expiry && <span className="input-err">{errors.expiry}</span>}
                </div>
                <div className="form-group flex-1">
                  <label className="mono-tiny">CODE CVV (CVC)</label>
                  <input 
                    type="password" 
                    className={`payment-input ${errors.cvv ? 'error' : ''}`}
                    value={cvv}
                    onChange={handleCvvChange}
                    placeholder="•••"
                  />
                  {errors.cvv && <span className="input-err">{errors.cvv}</span>}
                </div>
              </div>

              <div className="security-note">
                <Lock size={12} className="text-emerald" />
                <span className="mono-tiny text-slate-500">PAIEMENT CRÉDITÉ 199.00 MAD VIA SYSTEM DE CRYPTAGE SSL SÉCURISÉ</span>
              </div>

              <div className="premium-actions">
                <button type="submit" className="upgrade-btn mono">
                  <ShieldCheck size={14} /> CONFIRMER LE PAIEMENT
                </button>
                <button type="button" className="dismiss-btn mono" onClick={() => setStep('features')}>RETOUR</button>
              </div>
            </form>
          </div>
        )}

        {step === 'processing' && (
          <div className="premium-body processing-view animate-fade-in">
            <Loader2 className="animate-spin text-purple-500" size={48} />
            <div className="text-center space-y-2">
              <h3 className="mono font-bold text-white tracking-widest text-sm">SÉCURISATION DU CANAL SSL...</h3>
              <p className="mono-tiny text-slate-500">AUTORISATION TRANSACTIONNELLE DE LA BANQUE EN COURS</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="premium-body success-view animate-fade-in">
            <div className="success-badge-glow">
              <Check size={32} className="text-emerald" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="mono font-bold text-emerald tracking-widest text-sm">PAIEMENT EFFECTUÉ AVEC SUCCÈS</h3>
              <p className="mono-tiny text-slate-400">BIENVENUE DANS L'ÉNERGIE PRO AETHERIS CORE v3</p>
            </div>
          </div>
        )}

        <style jsx>{`
          .premium-layout {
            max-width: 480px;
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
            font-size: 1.25rem;
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
          
          /* Visual card */
          .virtual-card {
            padding: 1.5rem;
            border-radius: 1rem;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            position: relative;
            box-shadow: 0 15px 35px rgba(0,0,0,0.3);
          }
          .card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .card-brand-label {
            font-size: 8px;
            font-weight: 800;
            color: #64748b;
            letter-spacing: 0.1rem;
          }
          .card-logo {
            font-size: 11px;
            font-weight: 900;
            color: #fff;
            letter-spacing: 0.05rem;
            background: rgba(255,255,255,0.05);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
          }
          
          .card-chip-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .card-chip {
            width: 32px;
            height: 24px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border-radius: 4px;
          }
          .card-contactless {
            color: #64748b;
          }
          
          .card-number-display {
            font-size: 1.35rem;
            font-weight: 800;
            color: #fff;
            letter-spacing: 0.15rem;
            word-spacing: 0.25rem;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
          }
          
          .card-bottom {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .card-holder-group, .card-expiry-group {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .c-label-mini {
            font-size: 7px;
            color: #475569;
            font-weight: 850;
            letter-spacing: 0.05rem;
          }
          .c-value {
            font-size: 10px;
            font-weight: 800;
            color: #e2e8f0;
            letter-spacing: 0.02rem;
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
          
          /* Checkout form */
          .payment-form {
            display: flex;
            flex-direction: column;
            gap: 1.15rem;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .form-group label {
            color: #64748b;
            font-weight: 900;
            letter-spacing: 0.05rem;
          }
          .form-row {
            display: flex;
            gap: 1.25rem;
          }
          .payment-input {
            width: 100%;
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border-glass);
            border-radius: 0.6rem;
            padding: 0.75rem 1rem;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            outline: none;
            transition: all 0.3s;
          }
          .payment-input:focus {
            border-color: rgba(168, 85, 247, 0.5);
            background: rgba(168, 85, 247, 0.02);
            box-shadow: 0 0 15px rgba(168, 85, 247, 0.05);
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
            left: 1rem;
            color: #64748b;
            pointer-events: none;
          }
          .pad-left {
            padding-left: 2.75rem;
          }
          .input-err {
            font-size: 8px;
            font-weight: 850;
            color: #f43f5e;
            font-family: 'JetBrains Mono', monospace;
          }
          
          .security-note {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: rgba(16, 185, 129, 0.04);
            border: 1px solid rgba(16, 185, 129, 0.1);
            padding: 0.75rem 1rem;
            border-radius: 6px;
          }
          .security-note span {
            color: #64748b;
          }

          .premium-actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-top: 0.5rem;
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
            text-align: center;
          }
          .dismiss-btn:hover {
            color: #fff;
            background: rgba(255,255,255,0.03);
          }
          
          /* Processing and success views */
          .processing-view, .success-view {
            padding: 3rem 1.5rem;
            align-items: center;
            justify-content: center;
            gap: 1.75rem;
            min-height: 280px;
          }
          .success-badge-glow {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.25);
            animation: pulse-glow 1.5s infinite;
          }
          
          @keyframes pulse-glow {
            0%, 100% { transform: scale(0.95); box-shadow: 0 0 20px rgba(16, 185, 129, 0.2); }
            50% { transform: scale(1.05); box-shadow: 0 0 35px rgba(16, 185, 129, 0.35); }
          }
        `}</style>
      </div>
    </div>
  );
};
