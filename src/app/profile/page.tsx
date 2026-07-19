'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Activity, Bell, Sparkles, CheckCircle2, AlertTriangle, 
  RefreshCw, ArrowLeft, ShieldCheck, Mail, Send, Phone, Info,
  ExternalLink, CreditCard, ChevronRight, HelpCircle, Zap, X
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { getUserProfileAction, upsertUserProfileAction } from '@/lib/portfolio-actions';
import { useRouter } from 'next/navigation';
import { PremiumPaywallModal } from '@/components/portfolio/PremiumPaywallModal';

export default function ProfilePage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Non-blocking toast state
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form states
  const [profile, setProfile] = useState<any>(null);
  const [newCapital, setNewCapital] = useState('0');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [alertChannel, setAlertChannel] = useState('EMAIL');
  const [username, setUsername] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  // Client-only mounting guard to prevent SSR/Hydration errors in production
  useEffect(() => {
    setMounted(true);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getUserProfileAction();
      if (res && res.success && res.data) {
        const prof = res.data;
        setProfile(prof);
        setNewCapital(prof.initial_capital.toString());
        setTelegramChatId(prof.telegram_chat_id || '');
        setWhatsappPhone(prof.whatsapp_phone || '');
        setAlertChannel(prof.alert_channel || 'EMAIL');
        setUsername(prof.username || '');
        setSubscriptionTier(prof.subscription_tier || 'free');
      } else {
        console.error('Failed to load profile:', res?.error);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      if (sessionId) {
        setLoading(true);
        import('@/lib/stripe-actions').then(async ({ verifyStripeSessionAction }) => {
          try {
            const res = await verifyStripeSessionAction(sessionId);
            if (res.success) {
              setSaveMessage({ type: 'success', text: 'Paiement Stripe validé ! Bienvenue chez Aetheris Pro.' });
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              setSaveMessage({ type: 'error', text: 'Échec de validation : ' + res.error });
            }
          } catch (err: any) {
            setSaveMessage({ type: 'error', text: 'Erreur réseau : ' + err.message });
          } finally {
            loadProfile();
          }
        });
      } else {
        loadProfile();
      }
    }
  }, [mounted, loadProfile]);

  const handleSaveProfile = async (e?: React.FormEvent, forceTier?: string) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const cap = parseFloat(newCapital) || 0;
      const targetTier = forceTier !== undefined ? forceTier : subscriptionTier;

      const payload = {
        initial_capital: cap,
        subscription_tier: targetTier,
        telegram_chat_id: telegramChatId,
        whatsapp_phone: whatsappPhone,
        alert_channel: alertChannel,
        username: username
      };

      const res = await upsertUserProfileAction(payload);
      if (res && !res.success) {
        setSaveMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde' });
        setTimeout(() => setSaveMessage(null), 4000);
        return;
      }

      setSubscriptionTier(targetTier);
      
      // Show smooth glass feedback
      setSaveMessage({ type: 'success', text: 'Paramètres mis à jour avec succès !' });
      setTimeout(() => setSaveMessage(null), 4000);
      
      loadProfile();
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Erreur lors de la sauvegarde' });
      setTimeout(() => setSaveMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setSubscriptionTier('premium');
      const cap = parseFloat(newCapital) || 0;
      await upsertUserProfileAction({
        initial_capital: cap,
        subscription_tier: 'premium',
        telegram_chat_id: telegramChatId,
        whatsapp_phone: whatsappPhone,
        alert_channel: alertChannel,
        username: username
      });
      setShowPaywallModal(false);
      setSaveMessage({ type: 'success', text: 'Abonnement activé avec succès ! Bienvenue chez Aetheris Pro.' });
      setTimeout(() => setSaveMessage(null), 4000);
      loadProfile();
    } catch (err: any) {
      console.error(err);
      setSaveMessage({ type: 'error', text: err.message || 'Erreur lors de la mise à niveau.' });
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  const confirmDowngrade = async () => {
    try {
      setSaving(true);
      const cap = parseFloat(newCapital) || 0;
      await upsertUserProfileAction({
        initial_capital: cap,
        subscription_tier: 'free',
        telegram_chat_id: telegramChatId,
        whatsapp_phone: whatsappPhone,
        alert_channel: alertChannel,
        username: username
      });
      setSubscriptionTier('free');
      setShowCancelConfirmModal(false);
      setSaveMessage({ type: 'success', text: 'Abonnement résilié avec succès.' });
      setTimeout(() => setSaveMessage(null), 4000);
      loadProfile();
    } catch (err: any) {
      console.error(err);
      setSaveMessage({ type: 'error', text: err.message || 'Erreur lors de la résiliation.' });
      setTimeout(() => setSaveMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Safe SSR placeholder
  if (!mounted) {
    return (
      <div className="ssr-placeholder">
        <div className="spinner-glow"></div>
        <span className="mono-tiny text-emerald">CONNEXION SÉCURISÉE AU TERMINAL...</span>
        <style jsx>{`
          .ssr-placeholder {
            background: #080a0f;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
          }
          .spinner-glow {
            width: 40px;
            height: 40px;
            border: 2px solid rgba(16, 185, 129, 0.1);
            border-top: 2px solid #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar history={[]} onSelect={() => {}} activeAgent="STRATEGY" onAgentChange={() => {}} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
      
      <main className="main-content">
        <div className="max-container">
          
          {/* Header Cyber/Terminal */}
          <header className="terminal-header animate-fade-in">
            <div className="header-identity">
              <div className="identity-block">
                <ShieldCheck size={14} className="text-emerald" />
                <span className="mono-tiny text-emerald">AETHERIS COMPTE & ACCÈS</span>
              </div>
              <div className="title-row">
                <h1 className="title-h1">Paramètres du Profil</h1>
                <div className={`subscription-pill ${subscriptionTier === 'premium' ? 'premium' : ''}`}>
                  {subscriptionTier === 'premium' ? '👑 PREMIUM' : '⭐ COMPTE GRATUIT'}
                </div>
              </div>
            </div>
            
            <button onClick={() => router.back()} className="back-btn">
              <ArrowLeft size={14} /> <span>RETOUR</span>
            </button>
          </header>

          {/* Smooth feedback alert banner */}
          {saveMessage && (
            <div className={`alert-banner ${saveMessage.type}`}>
              {saveMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{saveMessage.text}</span>
            </div>
          )}

          {loading ? (
            <div className="loading-container">
              <RefreshCw className="animate-spin" size={28} />
              <span className="mono-tiny">CHARGEMENT DES DONNÉES DU COMPTE...</span>
            </div>
          ) : (
            <div className="profile-grid">
              
              {/* Formulaire des Paramètres */}
              <div className="settings-panel">
                <form onSubmit={handleSaveProfile} className="glass-card">
                  <div className="card-header">
                    <User size={18} className="text-emerald" />
                    <h2>CONFIGURATION GÉNÉRALE</h2>
                  </div>
                  
                  <div className="form-fields">
                    
                    {/* Username */}
                    <div className="field-group">
                      <label className="field-label">
                        PSEUDO COMPÉTITION (PAPER TRADING)
                      </label>
                      <div className="input-wrapper">
                        <span className="input-prefix">@</span>
                        <input 
                          type="text" 
                          value={username} 
                          onChange={e => setUsername(e.target.value)} 
                          placeholder="Entrez votre pseudo" 
                          className="terminal-input"
                        />
                      </div>
                      <p className="field-help">Votre nom d'affichage public dans le classement hebdomadaire.</p>
                    </div>

                    {/* Capital de Référence */}
                    <div className="field-group">
                      <label className="field-label">
                        CAPITAL PORTFOLIO RÉEL (MAD)
                      </label>
                      <div className="input-wrapper">
                        <input 
                          type="number" 
                          value={newCapital} 
                          onChange={e => setNewCapital(e.target.value)} 
                          placeholder="Ex: 100000" 
                          className="terminal-input"
                        />
                        <span className="input-suffix">MAD</span>
                      </div>
                      <p className="field-help">Utilisé pour indexer les graphiques et allocations de votre portefeuille réel.</p>
                    </div>

                    {/* Alert Channel */}
                    <div className="field-group">
                      <label className="field-label">
                        CANAL DE NOTIFICATION PRÉFÉRÉ
                      </label>
                      <div className="select-wrapper">
                        <select 
                          value={alertChannel} 
                          onChange={e => setAlertChannel(e.target.value)}
                          className="terminal-select"
                        >
                          <option value="EMAIL">📧 Email uniquement</option>
                          <option value="TELEGRAM">✈️ Telegram Bot</option>
                          <option value="WHATSAPP">💬 WhatsApp direct</option>
                          <option value="ALL">🔥 Email + Telegram + WhatsApp</option>
                        </select>
                      </div>
                      <p className="field-help">Canal d'alerte instantané pour les franchissements de seuils (Stop Loss / Take Profit).</p>
                    </div>

                    {/* Telegram Section */}
                    {(alertChannel === 'TELEGRAM' || alertChannel === 'ALL') && (
                      <div className="dynamic-box telegram animate-slide-down">
                        <div className="dynamic-box-header">
                          <Send size={14} />
                          <h3>CONFIGURATION DE TELEGRAM</h3>
                          <a 
                            href="https://t.me/AetherisAlertBot" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="integration-link purple"
                          >
                            DÉMARRER LE BOT <ExternalLink size={10} />
                          </a>
                        </div>
                        
                        <div className="input-wrapper">
                          <input 
                            type="text" 
                            value={telegramChatId} 
                            onChange={e => setTelegramChatId(e.target.value)} 
                            placeholder="Votre Chat ID Telegram (ex: 182736452)" 
                            className="terminal-input purple-focus"
                          />
                        </div>

                        <div className="setup-guide">
                          <h4>🛠️ Instructions rapides :</h4>
                          <ol>
                            <li>Cliquez sur <strong>Démarrer le Bot</strong> ci-dessus ou cherchez <strong>@AetherisAlertBot</strong> sur Telegram et cliquez sur <em>Démarrer</em>.</li>
                            <li>Pour récupérer votre Chat ID, écrivez à <strong>@userinfobot</strong> ou tapez <code>/my_id</code> dans notre Bot.</li>
                            <li>Collez le numéro à 9 ou 10 chiffres ci-dessus.</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp Section */}
                    {(alertChannel === 'WHATSAPP' || alertChannel === 'ALL') && (
                      <div className="dynamic-box whatsapp animate-slide-down">
                        <div className="dynamic-box-header">
                          <Phone size={14} />
                          <h3>AUTHENTIFICATION WHATSAPP</h3>
                          <a 
                            href="https://wa.me/34644975014?text=I%20allow%20callmebot%20to%20send%20me%20messages" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="integration-link emerald"
                          >
                            LIER MON COMPTE <ExternalLink size={10} />
                          </a>
                        </div>
                        
                        <div className="input-wrapper">
                          <input 
                            type="text" 
                            value={whatsappPhone} 
                            onChange={e => setWhatsappPhone(e.target.value)} 
                            placeholder="Ex: 212661000000 (sans le +)" 
                            className="terminal-input emerald-focus"
                          />
                        </div>

                        <div className="setup-guide">
                          <h4>🛠️ Instructions rapides :</h4>
                          <ol>
                            <li>Cliquez sur <strong>Lier mon compte</strong> ci-dessus pour envoyer le message d'autorisation pré-rempli à notre passerelle sécurisée.</li>
                            <li>Enregistrez le numéro de la passerelle dans vos contacts pour voir les liens interactifs.</li>
                            <li>Saisissez votre numéro au format international sans <code>+</code> ni <code>00</code> (ex: 212 pour le Maroc).</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button 
                      type="submit" 
                      className="submit-btn"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="animate-spin" size={14} />
                          <span>ENREGISTREMENT...</span>
                        </>
                      ) : (
                        <span>SAUVEGARDER LES PARAMÈTRES</span>
                      )}
                    </button>

                  </div>
                </form>
              </div>

              {/* Panneau Offre & Premium */}
              <div className="premium-panel">
                <div className={`premium-card ${subscriptionTier === 'premium' ? 'premium-active' : ''}`}>
                  <div className="premium-badge">
                    <Sparkles size={14} />
                    <span>OFFRE DE SERVICES AETHERIS</span>
                  </div>

                  <h2 className="premium-title">Basculez vers la puissance de l'IA</h2>
                  
                  {subscriptionTier === 'premium' ? (
                    <div className="pro-active-box">
                      <div className="pro-details-row">
                        <span className="mono-tiny text-slate-500">PLAN ACTIF</span>
                        <h3 className="pro-plan-title font-bold text-white">AETHERIS PRO</h3>
                      </div>
                      <div className="pro-details-row">
                        <span className="mono-tiny text-slate-500">FACTURATION</span>
                        <p className="pro-plan-price font-bold text-emerald">199.00 MAD / mois</p>
                      </div>
                      <div className="pro-details-row card-row">
                        <span className="mono-tiny text-slate-500">MODE DE PAIEMENT</span>
                        <div className="c-details">
                          <CreditCard size={12} className="text-purple" />
                          <span className="mono text-slate-300">VISA •••• 4242</span>
                        </div>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => setShowCancelConfirmModal(true)}
                        className="cancel-pro-btn mono"
                      >
                        RÉSILIER L'ABONNEMENT PRO
                      </button>
                    </div>
                  ) : (
                    <div className="pro-inactive-box">
                      <div className="pro-price-tag">
                        <span className="price">199 MAD</span>
                        <span className="period">/mois</span>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => setShowPaywallModal(true)}
                        className="activate-pro-btn mono"
                      >
                        <Zap size={14} /> ACTIVER AETHERIS PRO
                      </button>
                    </div>
                  )}

                  <div className="features-list">
                    <h3 className="features-list-title">TABLEAU DES AVANTAGES :</h3>

                    <div className="feature-row">
                      <div className="feature-status check">✓</div>
                      <div className="feature-desc">
                        <h4>Graphiques du Portefeuille</h4>
                        <p>Visualisation des plus-values, dividendes et PMP réels.</p>
                      </div>
                    </div>

                    <div className="feature-row">
                      <div className="feature-status check">✓</div>
                      <div className="feature-desc">
                        <h4>Mode Paper Trading & Classement</h4>
                        <p>Simulation virtuelle avec capital fictif à 100K MAD.</p>
                      </div>
                    </div>

                    <div className={`feature-row ${subscriptionTier !== 'premium' ? 'disabled' : ''}`}>
                      <div className={`feature-status ${subscriptionTier === 'premium' ? 'premium-check' : 'lock'}`}>
                        {subscriptionTier === 'premium' ? '✓' : '✖'}
                      </div>
                      <div className="feature-desc">
                        <h4>Robo-Advisor IA & Optimiseur</h4>
                        <p>Analyse de risque et génération de rapports d'arbitrage automatisés.</p>
                      </div>
                    </div>

                    <div className={`feature-row ${subscriptionTier !== 'premium' ? 'disabled' : ''}`}>
                      <div className={`feature-status ${subscriptionTier === 'premium' ? 'premium-check' : 'lock'}`}>
                        {subscriptionTier === 'premium' ? '✓' : '✖'}
                      </div>
                      <div className="feature-desc">
                        <h4>Fiches Valeurs Fondamentales</h4>
                        <p>Accès illimité aux analyses fondamentales générées par l'agent IA.</p>
                      </div>
                    </div>
                  </div>

                  {subscriptionTier !== 'premium' && (
                    <div className="premium-footer-banner">
                      <Info size={14} />
                      <span>Activer le mode Premium pour débloquer les agents d'Intelligence Stratégique.</span>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      <PremiumPaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        onUpgrade={handleUpgrade}
      />

      {showCancelConfirmModal && (
        <div className="modal-overlay glass-heavy animate-fade-in" onClick={() => setShowCancelConfirmModal(false)}>
          <div className="modal-content glass-heavy cancel-modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div className="premium-title-group">
                <AlertTriangle className="text-rose-500 animate-bounce" size={20} />
                <h2 className="mono text-rose-500 font-bold tracking-widest text-sm">RÉSILIATION AETHERIS PRO</h2>
              </div>
              <button onClick={() => setShowCancelConfirmModal(false)} className="close-modal"><X size={18} /></button>
            </div>
            
            <div className="premium-body">
              <p className="premium-subtitle">
                Êtes-vous sûr de vouloir résilier votre abonnement <strong className="text-white">AETHERIS PRO</strong> ? 
                En confirmant la résiliation, vous perdrez instantanément l'accès aux privilèges suivants :
              </p>
              
              <div className="premium-features-list">
                <div className="feature-item">
                  <span className="text-rose-500">✖</span>
                  <div className="feature-text">
                    <strong>Robo-Advisor d'Allocation :</strong> Plus d'optimisation automatisée de portefeuille.
                  </div>
                </div>
                <div className="feature-item">
                  <span className="text-rose-500">✖</span>
                  <div className="feature-text">
                    <strong>Synthèse Stratégique IA :</strong> Perte des rapports stratégiques et analyses multi-agents.
                  </div>
                </div>
                <div className="feature-item">
                  <span className="text-rose-500">✖</span>
                  <div className="feature-text">
                    <strong>Alertes Prix Illimitées :</strong> Désactivation des alertes en temps réel sur WhatsApp & Telegram.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="premium-actions" style={{ marginTop: '1rem' }}>
              <button 
                type="button" 
                onClick={confirmDowngrade} 
                className="btn-danger-new mono"
              >
                RÉSILIER MON ACCÈS PRO
              </button>
              <button 
                type="button" 
                onClick={() => setShowCancelConfirmModal(false)} 
                className="dismiss-btn mono"
              >
                CONSERVER MON ABONNEMENT
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .app-container {
          min-height: 100vh;
          background: #080a0f;
          color: #f8fafc;
        }

        .main-content {
          padding-top: calc(var(--header-height) + 1.5rem);
          padding-bottom: 3rem;
          min-height: 100vh;
        }

        .max-container {
          max-width: var(--max-width);
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* Header Styles */
        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .header-identity {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .identity-block {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .text-emerald {
          color: #10b981;
        }

        .mono-tiny {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .title-h1 {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 2rem;
          letter-spacing: -0.02em;
          margin: 0;
          color: #fff;
        }

        .subscription-pill {
          padding: 0.25rem 0.6rem;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          font-weight: 700;
        }

        .subscription-pill.premium {
          background: rgba(168, 85, 247, 0.1);
          border-color: rgba(168, 85, 247, 0.3);
          color: #c084fc;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.1);
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.6rem 1rem;
          border-radius: 0.5rem;
          color: #94a3b8;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        /* Alert Banner */
        .alert-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 0.75rem;
          margin-bottom: 2rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 600;
          animation: slideDown 0.3s ease;
        }

        .alert-banner.success {
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .alert-banner.error {
          background: rgba(244, 63, 94, 0.06);
          border: 1px solid rgba(244, 63, 94, 0.2);
          color: #fb7185;
        }

        /* Loading */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          padding: 6rem 0;
          color: #64748b;
        }

        /* Layout Grid */
        .profile-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Glass Card */
        .glass-card {
          background: rgba(10, 14, 23, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 1rem;
          padding: 2rem;
          backdrop-filter: blur(20px);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .card-header h2 {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 0.05em;
          margin: 0;
          color: #fff;
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.05em;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .input-wrapper:focus-within {
          border-color: #10b981;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.08);
        }

        .input-prefix, .input-suffix {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.02);
          color: #64748b;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 700;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .input-suffix {
          border-right: none;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
        }

        .terminal-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 0.85rem 1rem;
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          outline: none;
        }

        .terminal-input.purple-focus:focus-within {
          border-color: #a855f7;
        }

        .terminal-input.emerald-focus:focus-within {
          border-color: #10b981;
        }

        .field-help {
          font-size: 0.7rem;
          color: #475569;
          margin: 0;
          line-height: 1.4;
        }

        /* Select styling */
        .select-wrapper {
          position: relative;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .select-wrapper:focus-within {
          border-color: #10b981;
        }

        .terminal-select {
          width: 100%;
          background: transparent;
          border: none;
          padding: 0.85rem 1rem;
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          outline: none;
          cursor: pointer;
        }

        .terminal-select option {
          background: #0d131f;
          color: #fff;
        }

        /* Dynamic collapsible setup boxes */
        .dynamic-box {
          background: rgba(0, 0, 0, 0.25);
          border-radius: 0.75rem;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .dynamic-box.telegram {
          border: 1px solid rgba(168, 85, 247, 0.15);
        }

        .dynamic-box.whatsapp {
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .dynamic-box-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .dynamic-box.telegram .dynamic-box-header {
          color: #c084fc;
        }

        .dynamic-box.whatsapp .dynamic-box-header {
          color: #34d399;
        }

        .dynamic-box-header h3 {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 0.8rem;
          letter-spacing: 0.02em;
          margin: 0;
          flex: 1;
        }

        .integration-link {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          font-weight: 800;
          text-decoration: none;
          padding: 0.4rem 0.75rem;
          border-radius: 0.375rem;
          transition: all 0.2s ease;
        }

        .integration-link.purple {
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.2);
          color: #c084fc;
        }

        .integration-link.purple:hover {
          background: rgba(168, 85, 247, 0.2);
          color: #fff;
        }

        .integration-link.emerald {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .integration-link.emerald:hover {
          background: rgba(16, 185, 129, 0.2);
          color: #fff;
        }

        .setup-guide {
          font-family: sans-serif;
          background: rgba(255, 255, 255, 0.01);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          color: #64748b;
          border: 1px solid rgba(255, 255, 255, 0.02);
        }

        .setup-guide h4 {
          margin: 0 0 0.5rem 0;
          color: #94a3b8;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
        }

        .setup-guide ol {
          margin: 0;
          padding-left: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .setup-guide li {
          line-height: 1.4;
        }

        /* Submit Button */
        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #022c22;
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 0.85rem;
          letter-spacing: 0.02em;
          border: none;
          padding: 1rem;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.1);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.2);
          filter: brightness(1.1);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Premium Panel styling */
        .premium-card {
          background: rgba(10, 14, 23, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 1rem;
          padding: 2.5rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: all 0.5s ease;
          position: relative;
          overflow: hidden;
        }

        .premium-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: transparent;
          transition: all 0.5s ease;
        }

        .premium-card.premium-active {
          border-color: rgba(168, 85, 247, 0.2);
          box-shadow: 0 10px 40px rgba(168, 85, 247, 0.04);
        }

        .premium-card.premium-active::before {
          background: linear-gradient(90deg, #a855f7, #6366f1);
        }

        .premium-badge {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          color: #94a3b8;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.6rem;
          font-weight: 800;
        }

        .premium-card.premium-active .premium-badge {
          background: rgba(168, 85, 247, 0.1);
          border-color: rgba(168, 85, 247, 0.25);
          color: #c084fc;
        }

        .premium-title {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 1.5rem;
          line-height: 1.25;
          letter-spacing: -0.02em;
          margin: 0;
          color: #fff;
        }

        .pro-active-box {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          background: rgba(168, 85, 247, 0.03);
          border: 1px dashed rgba(168, 85, 247, 0.2);
          padding: 1.5rem;
          border-radius: 1rem;
        }

        .cancel-modal-content {
          max-width: 440px;
          border: 1px solid rgba(244, 63, 94, 0.3) !important;
          box-shadow: 0 0 40px rgba(244, 63, 94, 0.15) !important;
        }

        .btn-danger-new {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.85rem;
          border-radius: 0.75rem;
          border: none;
          background: linear-gradient(135deg, #f43f5e 0%, #be123c 100%);
          color: #fff;
          font-weight: 800;
          font-size: 11px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(244, 63, 94, 0.2);
          transition: all 0.2s;
        }

        .btn-danger-new:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(244, 63, 94, 0.3);
        }

        .pro-details-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .c-details {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .cancel-pro-btn {
          margin-top: 0.5rem;
          background: transparent;
          border: 1px solid rgba(244, 63, 94, 0.2);
          border-radius: 0.75rem;
          color: #f43f5e;
          padding: 0.75rem;
          font-weight: 800;
          font-size: 9px;
          letter-spacing: 0.05rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .cancel-pro-btn:hover {
          background: rgba(244, 63, 94, 0.06);
          border-color: rgba(244, 63, 94, 0.4);
          transform: translateY(-1px);
        }

        .pro-inactive-box {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1rem 0;
        }

        .pro-price-tag {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.25rem;
        }

        .pro-price-tag .price {
          font-size: 2.25rem;
          font-weight: 900;
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
        }

        .pro-price-tag .period {
          font-size: 0.9rem;
          color: #a855f7;
          font-weight: 700;
        }

        .activate-pro-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.95rem;
          border-radius: 0.75rem;
          border: none;
          background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
          color: #fff;
          font-weight: 800;
          font-size: 11px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.25);
          transition: all 0.2s;
        }

        .activate-pro-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(124, 58, 237, 0.35);
        }

        /* Features List */
        .features-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .features-list-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.05em;
          margin: 0 0 0.5rem 0;
        }

        .feature-row {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          transition: opacity 0.3s ease;
        }

        .feature-row.disabled {
          opacity: 0.35;
        }

        .feature-status {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 900;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .feature-status.premium-check {
          background: rgba(168, 85, 247, 0.15);
          border-color: rgba(168, 85, 247, 0.3);
          color: #c084fc;
        }

        .feature-status.lock {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.06);
          color: #475569;
        }

        .feature-desc h4 {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 0.85rem;
          color: #f1f5f9;
          margin: 0 0 0.2rem 0;
        }

        .feature-desc p {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .premium-footer-banner {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.1);
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          color: #60a5fa;
          font-size: 0.7rem;
          line-height: 1.4;
        }

        /* Animations */
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease forwards;
        }

        .animate-slide-down {
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

    </div>
  );
}
