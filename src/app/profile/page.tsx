'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Mail,
  Send,
  Phone,
  Info,
  ExternalLink,
  CreditCard,
  Zap,
  X,
  LogOut,
  KeyRound,
  Lock,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AccountOverview from '@/components/profile/AccountOverview';
import { useToast } from '@/components/ToastProvider';
import { useUserSession } from '@/hooks/useUserSession';
import type { UserProfileData } from '@/types/profile';
import {
  getUserProfileAction,
  upsertUserProfileAction,
  sendTestAlertAction,
  requestChannelVerificationAction,
  confirmChannelVerificationAction,
  getAlertsAction,
  getPortfolioTransactionsAction,
} from '@/lib/portfolio-actions';
import { cancelSubscriptionAction, activateSandboxSubscriptionAction } from '@/lib/stripe-actions';
import { supabase, performCleanLogout } from '@/lib/supabase';
import { PremiumPaywallModal } from '@/components/portfolio/PremiumPaywallModal';

const CAPITAL_PRESETS = [
  { label: '50 000 DH', value: '50000' },
  { label: '100 000 DH', value: '100000' },
  { label: '250 000 DH', value: '250000' },
  { label: '500 000 DH', value: '500000' },
];

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const { refreshSession } = useUserSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Non-blocking inline feedback + global toast
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Authenticated user & workspace overview states
  const [authEmail, setAuthEmail] = useState('');
  const [authProvider, setAuthProvider] = useState('email');
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [virtualBalance, setVirtualBalance] = useState<number>(100000);
  const [virtualInitialCapital, setVirtualInitialCapital] = useState<number>(100000);
  const [openPositionsCount, setOpenPositionsCount] = useState<number>(0);
  const [transactionsCount, setTransactionsCount] = useState<number>(0);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);

  // Form & subscription states
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [newCapital, setNewCapital] = useState('0');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramVerified, setTelegramVerified] = useState(false);
  const [telegramOtp, setTelegramOtp] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [whatsappOtp, setWhatsappOtp] = useState('');
  const [verifyingChannel, setVerifyingChannel] = useState<string | null>(null);
  const [alertChannel, setAlertChannel] = useState('EMAIL');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [username, setUsername] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  const showFeedback = useCallback(
    (type: 'success' | 'error', text: string, durationMs = 4500) => {
      setSaveMessage({ type, text });
      toast.showToast({ type, message: text, durationMs });
      if (durationMs > 0) {
        setTimeout(() => {
          setSaveMessage((prev) => (prev?.text === text ? null : prev));
        }, durationMs);
      }
    },
    [toast]
  );

  useEffect(() => {
    setMounted(true);
    // 🔒 SÉCURITÉ PII : purger toute ancienne copie locale non chiffrée
    try {
      window.localStorage.removeItem('aetheris_user_profile');
    } catch {
      // Ignorer
    }
  }, []);

  useEffect(() => {
    if (!showCancelConfirmModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCancelConfirmModal(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [showCancelConfirmModal]);

  const loadProfile = useCallback(async (showSpinner: boolean = true) => {
    try {
      if (showSpinner) setLoading(true);

      const [authRes, profileRes, alertsRes, txRes] = await Promise.allSettled([
        supabase.auth.getUser(),
        getUserProfileAction(),
        getAlertsAction(),
        getPortfolioTransactionsAction(false),
      ]);

      let resolvedUserEmail = '';
      if (authRes.status === 'fulfilled') {
        const user = authRes.value?.data?.user;
        if (user) {
          resolvedUserEmail = user.email || '';
          setAuthEmail(resolvedUserEmail);
          setAuthProvider(String(user.app_metadata?.provider || 'email'));
          setMemberSince(user.created_at || null);
          setLastSignIn(user.last_sign_in_at || null);
        }
      }

      if (profileRes.status === 'fulfilled' && profileRes.value?.success && profileRes.value.data) {
        const prof = profileRes.value.data;
        setProfile(prof);
        if (prof.initial_capital !== undefined && prof.initial_capital !== null) {
          setNewCapital(String(prof.initial_capital));
        }
        setTelegramChatId(prof.telegram_chat_id || '');
        setTelegramVerified(Boolean(prof.telegram_verified));
        setWhatsappPhone(prof.whatsapp_phone || '');
        setWhatsappVerified(Boolean(prof.whatsapp_verified));
        if (prof.alert_channel) setAlertChannel(prof.alert_channel);
        setNotificationEmail(prof.notification_email || resolvedUserEmail || '');
        setUsername(prof.username || '');
        if (prof.subscription_tier) setSubscriptionTier(prof.subscription_tier);
        setVirtualBalance(Number(prof.virtual_balance ?? 100000));
        setVirtualInitialCapital(Number(prof.virtual_initial_capital ?? 100000));
      } else if (resolvedUserEmail) {
        setNotificationEmail((prev) => prev || resolvedUserEmail);
      }

      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) {
        const count = alertsRes.value.filter(
          (a) => a.sl_price !== null && a.sl_price !== undefined || a.tp_price !== null && a.tp_price !== undefined
        ).length;
        setActiveAlertsCount(count);
      }

      if (txRes.status === 'fulfilled' && Array.isArray(txRes.value)) {
        const txs = txRes.value;
        setTransactionsCount(txs.length);
        const qtyMap = new Map<string, number>();
        for (const tx of txs) {
          const sym = String(tx.symbol || '').toUpperCase();
          if (!sym) continue;
          const prevQty = qtyMap.get(sym) || 0;
          const delta = tx.type === 'SELL' ? -Number(tx.quantity || 0) : Number(tx.quantity || 0);
          qtyMap.set(sym, prevQty + delta);
        }
        let openCount = 0;
        qtyMap.forEach((qty) => {
          if (qty > 0.0001) openCount += 1;
        });
        setOpenPositionsCount(openCount);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      if (showSpinner) setLoading(false);
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
              showFeedback('success', 'Paiement Stripe validé ! Bienvenue chez Aetheris Pro.', 6000);
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              showFeedback('error', 'Échec de validation : ' + res.error, 6000);
            }
          } catch (err: any) {
            showFeedback('error', 'Erreur réseau : ' + err.message, 6000);
          } finally {
            loadProfile();
          }
        });
      } else {
        loadProfile();
      }
    }
  }, [mounted, loadProfile, showFeedback]);

  const handleSaveProfile = async (e?: React.FormEvent, forceTier?: string) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const cap = parseFloat(newCapital) || 0;
      const targetTier = forceTier !== undefined ? forceTier : subscriptionTier;

      const payload = {
        initial_capital: cap,
        telegram_chat_id: telegramChatId,
        whatsapp_phone: whatsappPhone,
        alert_channel: alertChannel,
        notification_email: notificationEmail,
        username: username,
      };

      const res = await upsertUserProfileAction(payload);
      if (res && !res.success) {
        showFeedback('error', res.error || 'Erreur lors de la sauvegarde', 5000);
        return;
      }

      setSubscriptionTier(targetTier);
      showFeedback('success', 'Paramètres enregistrés et validés avec succès !', 4500);
      loadProfile(false);
      void refreshSession();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de la sauvegarde', 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async () => {
    try {
      setTestingAlert(true);
      showFeedback('success', "Envoi du test d'alerte en cours...", 4000);
      const res = await sendTestAlertAction();
      if (res && res.success) {
        showFeedback('success', res.message || 'Notification de test envoyée avec succès !', 6000);
      } else {
        showFeedback('error', res?.error || "Erreur lors de l'envoi du test.", 6000);
      }
    } catch (err: any) {
      showFeedback('error', err.message || "Erreur lors de l'envoi du test.", 6000);
    } finally {
      setTestingAlert(false);
    }
  };

  const handleRequestChannelOtp = async (channel: 'TELEGRAM' | 'WHATSAPP') => {
    try {
      setVerifyingChannel(`${channel}_REQ`);
      const res = await requestChannelVerificationAction(channel);
      showFeedback(
        res.success ? 'success' : 'error',
        (res.success ? res.message : res.error) || 'Opération terminée.',
        6000
      );
    } finally {
      setVerifyingChannel(null);
    }
  };

  const handleConfirmChannelOtp = async (channel: 'TELEGRAM' | 'WHATSAPP') => {
    const code = channel === 'TELEGRAM' ? telegramOtp : whatsappOtp;
    try {
      setVerifyingChannel(`${channel}_CONFIRM`);
      const res = await confirmChannelVerificationAction(channel, code);
      showFeedback(
        res.success ? 'success' : 'error',
        (res.success ? res.message : res.error) || 'Opération terminée.',
        6000
      );
      if (res.success) {
        if (channel === 'TELEGRAM') setTelegramOtp('');
        else setWhatsappOtp('');
        loadProfile(false);
      }
    } finally {
      setVerifyingChannel(null);
    }
  };

  const handleUpgrade = async () => {
    try {
      const sbRes = await activateSandboxSubscriptionAction();
      if (!sbRes.success) {
        showFeedback('error', sbRes.error || 'Veuillez utiliser le paiement Stripe officiel.', 5000);
        return;
      }
      setSubscriptionTier('premium');
      setShowPaywallModal(false);
      showFeedback('success', 'Abonnement activé avec succès ! Bienvenue chez Aetheris Pro.', 5000);
      loadProfile();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || 'Erreur lors de la mise à niveau.', 5000);
    }
  };

  const confirmDowngrade = async () => {
    try {
      setSaving(true);
      const cancelRes = await cancelSubscriptionAction();
      if (!cancelRes.success) {
        throw new Error(cancelRes.error || "Impossible de résilier l'abonnement.");
      }
      setSubscriptionTier('free');
      setShowCancelConfirmModal(false);
      showFeedback('success', 'Abonnement résilié avec succès.', 5000);
      loadProfile();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || 'Erreur lors de la résiliation.', 5000);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!authEmail) {
      showFeedback('error', 'Aucune adresse email vérifiée associée à ce compte.', 4500);
      return;
    }
    try {
      setResettingPassword(true);
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        showFeedback('error', error.message || "Impossible d'envoyer le lien de réinitialisation.", 5000);
      } else {
        showFeedback('success', `Email de réinitialisation envoyé à ${authEmail}.`, 6000);
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erreur lors de la demande.', 5000);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await performCleanLogout('/login');
  };

  // Derived display metadata
  const displayName = useMemo(() => {
    if (username.trim()) return username.trim();
    if (authEmail) return authEmail.split('@')[0];
    return 'Investisseur Aetheris';
  }, [username, authEmail]);

  const avatarInitials = useMemo(() => {
    const clean = displayName.replace(/[^a-zA-Z0-9\s._-]/g, ' ').trim();
    const parts = clean.split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (clean.length >= 2) {
      return clean.slice(0, 2).toUpperCase();
    }
    return 'AE';
  }, [displayName]);

  const formattedMemberSince = useMemo(() => {
    if (!memberSince) return 'Session active';
    const d = new Date(memberSince);
    if (Number.isNaN(d.getTime())) return 'Session active';
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }, [memberSince]);

  const formattedLastSignIn = useMemo(() => {
    if (!lastSignIn) return 'À l’instant';
    const d = new Date(lastSignIn);
    if (Number.isNaN(d.getTime())) return 'Récente';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [lastSignIn]);

  const capitalNum = Math.max(0, parseFloat(newCapital) || 0);
  const isPro = subscriptionTier === 'premium';

  const isEmailConfigured = Boolean((notificationEmail || authEmail).trim());
  const isChannelOperational = useMemo(() => {
    if (alertChannel === 'EMAIL') return isEmailConfigured;
    if (alertChannel === 'TELEGRAM') return telegramVerified;
    if (alertChannel === 'WHATSAPP') return whatsappVerified;
    return isEmailConfigured && (telegramVerified || whatsappVerified);
  }, [alertChannel, isEmailConfigured, telegramVerified, whatsappVerified]);

  const readinessChecks = useMemo(
    () => [
      { key: 'email', label: 'Email vérifié', done: Boolean(authEmail) },
      { key: 'pseudo', label: 'Pseudo défini', done: Boolean(username.trim()) },
      { key: 'capital', label: 'Capital configuré', done: capitalNum > 0 },
      { key: 'channel', label: 'Canal actif prêt', done: isChannelOperational },
    ],
    [authEmail, username, capitalNum, isChannelOperational]
  );

  const completionScore = useMemo(() => {
    const doneCount = readinessChecks.filter((c) => c.done).length;
    return Math.round((doneCount / readinessChecks.length) * 100);
  }, [readinessChecks]);

  const isEmailMismatch = Boolean(
    authEmail &&
      notificationEmail.trim() &&
      notificationEmail.trim().toLowerCase() !== authEmail.trim().toLowerCase()
  );

  const telegramUnsavedChange = Boolean(
    profile && telegramChatId.trim() !== String(profile.telegram_chat_id || '').trim()
  );
  const whatsappUnsavedChange = Boolean(
    profile && whatsappPhone.trim() !== String(profile.whatsapp_phone || '').trim()
  );

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
            animation: ssrSpin 1s linear infinite;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
          }
          .mono-tiny {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            font-weight: 800;
            letter-spacing: 0.08em;
          }
          .text-emerald {
            color: #10b981;
          }
          @keyframes ssrSpin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar
        history={[]}
        onSelect={() => {}}
        activeAgent="STRATEGY"
        onAgentChange={() => {}}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <Header onOpenSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <main className="main-content">
        <div className="max-container">
          {/* Header Top Bar */}
          <header className="terminal-header animate-fade-in">
            <div className="header-identity">
              <div className="identity-block">
                <ShieldCheck size={14} className="text-emerald" />
                <span className="mono-tiny text-emerald">AETHERIS COMPTE & ACCÈS</span>
              </div>
              <div className="title-row">
                <h1 className="title-h1">Mon Espace</h1>
                <div className={`subscription-pill ${isPro ? 'premium' : ''}`}>
                  {isPro ? '👑 AETHERIS PRO' : '⭐ COMPTE GRATUIT'}
                </div>
              </div>
              <p className="header-subtitle">
                Pilotez votre identité trader, votre capital de référence, vos canaux d&apos;alerte vérifiés et votre abonnement.
              </p>
            </div>

            <button type="button" onClick={() => router.back()} className="back-btn">
              <ArrowLeft size={14} /> <span>RETOUR</span>
            </button>
          </header>

          {/* Non-blocking feedback banner */}
          {saveMessage && (
            <div className={`alert-banner ${saveMessage.type}`} role="status">
              {saveMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{saveMessage.text}</span>
            </div>
          )}

          {loading ? (
            <div className="profile-skeleton-wrap" aria-busy="true" aria-label="Chargement du profil">
              <div className="skeleton-hero skeleton-pulse" />
              <div className="skeleton-kpi-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton-kpi skeleton-pulse" />
                ))}
              </div>
              <div className="skeleton-cols">
                <div className="skeleton-panel skeleton-pulse" />
                <div className="skeleton-panel side skeleton-pulse" />
              </div>
            </div>
          ) : (
            <>
              <AccountOverview
                isPro={isPro}
                avatarInitials={avatarInitials}
                displayName={displayName}
                authEmail={authEmail}
                formattedMemberSince={formattedMemberSince}
                completionScore={completionScore}
                readinessChecks={readinessChecks}
                capitalNum={capitalNum}
                virtualBalance={virtualBalance}
                virtualInitialCapital={virtualInitialCapital}
                openPositionsCount={openPositionsCount}
                transactionsCount={transactionsCount}
                activeAlertsCount={activeAlertsCount}
                alertChannel={alertChannel}
                isChannelOperational={isChannelOperational}
              />

              {/* Main 2-Column Workspace */}
              <div className="profile-grid">
                {/* Left Column */}
                <div className="settings-panel">
                  <form onSubmit={handleSaveProfile} className="settings-stack">
                    {/* Card 1: Identité & Capital */}
                    <section className="glass-card">
                      <div className="card-header">
                        <div className="card-title-group">
                          <User size={18} className="text-emerald" />
                          <div>
                            <h2>IDENTITÉ &amp; CAPITAL DE RÉFÉRENCE</h2>
                            <p className="card-sub">Paramètres utilisés par le classement Paper Trading et les graphiques de rendement</p>
                          </div>
                        </div>
                      </div>

                      <div className="form-fields">
                        {/* Username */}
                        <div className="field-group">
                          <div className="field-label-row">
                            <label htmlFor="profile-username" className="field-label">
                              PSEUDO COMPÉTITION (PAPER TRADING)
                            </label>
                            <span className="preview-chip mono">Classement : @{displayName}</span>
                          </div>
                          <div className="input-wrapper">
                            <span className="input-prefix">@</span>
                            <input
                              id="profile-username"
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="Entrez votre pseudo"
                              className="terminal-input"
                            />
                          </div>
                          <p className="field-help">
                            Votre pseudonyme public dans le classement des performances BVC.
                          </p>
                        </div>

                        {/* Capital de Référence */}
                        <div className="field-group">
                          <label htmlFor="profile-capital" className="field-label">
                            CAPITAL PORTFOLIO RÉEL (MAD)
                          </label>
                          <div className="input-wrapper">
                            <input
                              id="profile-capital"
                              type="number"
                              min="0"
                              step="any"
                              value={newCapital}
                              onChange={(e) => setNewCapital(e.target.value)}
                              placeholder="Ex: 100000"
                              className="terminal-input"
                            />
                            <span className="input-suffix">MAD</span>
                          </div>

                          <div className="presets-row" role="group" aria-label="Paliers rapides de capital">
                            {CAPITAL_PRESETS.map((preset) => {
                              const isSelected = String(parseFloat(newCapital) || 0) === preset.value;
                              return (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => setNewCapital(preset.value)}
                                  className={`preset-chip mono ${isSelected ? 'active' : ''}`}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>
                          <p className="field-help">
                            Base de référence utilisée pour calculer votre ROI net et vos allocations sectorielles.
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* Card 2: Centre de Notifications & Canaux */}
                    <section className="glass-card">
                      <div className="card-header">
                        <div className="card-title-group">
                          <Bell size={18} className="text-purple-accent" />
                          <div>
                            <h2>CENTRE DE NOTIFICATIONS &amp; CANAUX</h2>
                            <p className="card-sub">Alertes instantanées de franchissement Stop-Loss et Take-Profit</p>
                          </div>
                        </div>
                      </div>

                      <div className="form-fields">
                        {/* Visual Channel Selector Cards */}
                        <div className="field-group">
                          <span className="field-label">CANAL DE DIFFUSION PRÉFÉRÉ</span>
                          <div className="channel-grid" role="radiogroup" aria-label="Canal de notification">
                            {[
                              {
                                id: 'EMAIL',
                                title: 'Email Sécurisé',
                                desc: 'Rapports & alertes SMTP',
                                statusText: isEmailConfigured ? 'Actif' : 'Requis',
                                statusClass: isEmailConfigured ? 'ok' : 'warn',
                                icon: <Mail size={16} />,
                              },
                              {
                                id: 'TELEGRAM',
                                title: 'Telegram Bot',
                                desc: 'Push ultra-rapide @AetherisAlertBot',
                                statusText: telegramVerified ? 'Vérifié' : 'OTP requis',
                                statusClass: telegramVerified ? 'ok' : 'warn',
                                icon: <Send size={16} />,
                              },
                              {
                                id: 'WHATSAPP',
                                title: 'WhatsApp Direct',
                                desc: 'Passerelle mobile chiffrée',
                                statusText: whatsappVerified ? 'Vérifié' : 'OTP requis',
                                statusClass: whatsappVerified ? 'ok' : 'warn',
                                icon: <Phone size={16} />,
                              },
                              {
                                id: 'ALL',
                                title: 'Multi-Canaux',
                                desc: 'Email + Telegram + WhatsApp',
                                statusText: isPro ? 'Recommandé' : 'Complet',
                                statusClass: 'accent',
                                icon: <Zap size={16} />,
                              },
                            ].map((ch) => {
                              const isSelected = alertChannel === ch.id;
                              return (
                                <button
                                  key={ch.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={isSelected}
                                  onClick={() => setAlertChannel(ch.id)}
                                  className={`channel-card ${isSelected ? 'selected' : ''}`}
                                >
                                  <div className="channel-card-top">
                                    <span className={`channel-icon ${isSelected ? 'selected' : ''}`}>{ch.icon}</span>
                                    <span className={`channel-pill mono ${ch.statusClass}`}>{ch.statusText}</span>
                                  </div>
                                  <div className="channel-card-title">{ch.title}</div>
                                  <div className="channel-card-desc">{ch.desc}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Notification Email Input */}
                        {(alertChannel === 'EMAIL' || alertChannel === 'ALL') && (
                          <div className="field-group animate-slide-down">
                            <label htmlFor="profile-email" className="field-label field-label-emerald">
                              <Mail size={12} />
                              <span>EMAIL DE RÉCEPTION DES ALERTES</span>
                            </label>
                            <div className="input-wrapper">
                              <input
                                id="profile-email"
                                type="email"
                                value={notificationEmail}
                                onChange={(e) => setNotificationEmail(e.target.value)}
                                placeholder="votre_email@exemple.com"
                                className="terminal-input"
                              />
                            </div>
                            {isEmailMismatch ? (
                              <div className="email-sync-warning">
                                <span>
                                  Par sécurité, l&apos;adresse d&apos;alerte doit correspondre à l&apos;email vérifié du compte (
                                  <strong>{authEmail}</strong>).
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setNotificationEmail(authEmail)}
                                  className="sync-email-btn mono"
                                >
                                  SYNCHRONISER
                                </button>
                              </div>
                            ) : (
                              <p className="field-help">
                                Synchronisée avec l&apos;adresse vérifiée de votre compte pour la livraison garantie des alertes SL/TP.
                              </p>
                            )}
                          </div>
                        )}

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
                                onChange={(e) => setTelegramChatId(e.target.value)}
                                placeholder="Votre Chat ID Telegram (ex: 182736452)"
                                className="terminal-input"
                              />
                            </div>

                            {telegramUnsavedChange && (
                              <div className="unsaved-hint">
                                Chat ID modifié localement — cliquez d&apos;abord sur <strong>Sauvegarder</strong> avant de demander un code OTP.
                              </div>
                            )}

                            <div className="otp-verify-row">
                              <span className={`otp-status-badge ${telegramVerified && !telegramUnsavedChange ? 'ok' : 'pending'}`}>
                                {telegramVerified && !telegramUnsavedChange
                                  ? '✅ CANAL VÉRIFIÉ'
                                  : '⚠️ VÉRIFICATION OTP REQUISE'}
                              </span>
                              {(!telegramVerified || telegramUnsavedChange) && telegramChatId.trim() && (
                                <div className="otp-controls">
                                  <button
                                    type="button"
                                    onClick={() => handleRequestChannelOtp('TELEGRAM')}
                                    disabled={verifyingChannel !== null}
                                    className="integration-link purple otp-action-btn"
                                  >
                                    {verifyingChannel === 'TELEGRAM_REQ' ? 'ENVOI...' : 'ENVOYER CODE OTP'}
                                  </button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={telegramOtp}
                                    onChange={(e) => setTelegramOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Code 6 chiffres"
                                    className="terminal-input otp-code-input"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmChannelOtp('TELEGRAM')}
                                    disabled={verifyingChannel !== null || telegramOtp.length !== 6}
                                    className="integration-link emerald otp-action-btn"
                                  >
                                    {verifyingChannel === 'TELEGRAM_CONFIRM' ? '...' : 'VALIDER'}
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="setup-guide">
                              <h4>Instructions rapides :</h4>
                              <ol>
                                <li>
                                  Cliquez sur <strong>Démarrer le Bot</strong> ci-dessus ou cherchez{' '}
                                  <strong>@AetherisAlertBot</strong> sur Telegram et cliquez sur <em>Démarrer</em>.
                                </li>
                                <li>
                                  Pour récupérer votre Chat ID, écrivez à <strong>@userinfobot</strong> ou tapez{' '}
                                  <code>/my_id</code> dans notre Bot.
                                </li>
                                <li>Enregistrez l&apos;ID puis validez le code OTP à 6 chiffres reçu sur Telegram.</li>
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
                                onChange={(e) => setWhatsappPhone(e.target.value)}
                                placeholder="Ex: 212661000000 (sans le +)"
                                className="terminal-input"
                              />
                            </div>

                            {whatsappUnsavedChange && (
                              <div className="unsaved-hint">
                                Numéro modifié localement — cliquez d&apos;abord sur <strong>Sauvegarder</strong> avant de demander un code OTP.
                              </div>
                            )}

                            <div className="otp-verify-row">
                              <span className={`otp-status-badge ${whatsappVerified && !whatsappUnsavedChange ? 'ok' : 'pending'}`}>
                                {whatsappVerified && !whatsappUnsavedChange
                                  ? '✅ NUMÉRO VÉRIFIÉ'
                                  : '⚠️ VÉRIFICATION OTP REQUISE'}
                              </span>
                              {(!whatsappVerified || whatsappUnsavedChange) && whatsappPhone.trim() && (
                                <div className="otp-controls">
                                  <button
                                    type="button"
                                    onClick={() => handleRequestChannelOtp('WHATSAPP')}
                                    disabled={verifyingChannel !== null}
                                    className="integration-link emerald otp-action-btn"
                                  >
                                    {verifyingChannel === 'WHATSAPP_REQ' ? 'ENVOI...' : 'ENVOYER CODE OTP'}
                                  </button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={whatsappOtp}
                                    onChange={(e) => setWhatsappOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Code 6 chiffres"
                                    className="terminal-input otp-code-input"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmChannelOtp('WHATSAPP')}
                                    disabled={verifyingChannel !== null || whatsappOtp.length !== 6}
                                    className="integration-link emerald otp-action-btn"
                                  >
                                    {verifyingChannel === 'WHATSAPP_CONFIRM' ? '...' : 'VALIDER'}
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="setup-guide">
                              <h4>Instructions rapides :</h4>
                              <ol>
                                <li>
                                  Cliquez sur <strong>Lier mon compte</strong> ci-dessus pour autoriser notre passerelle sécurisée.
                                </li>
                                <li>
                                  Enregistrez votre numéro au format international sans <code>+</code> ni <code>00</code> (ex: 212661000000).
                                </li>
                                <li>Sauvegardez puis confirmez avec le code OTP à 6 chiffres envoyé sur WhatsApp.</li>
                              </ol>
                            </div>
                          </div>
                        )}

                        {/* Save & Test Alert Bar */}
                        <div className="form-actions-grid">
                          <button type="submit" className="submit-btn" disabled={saving || testingAlert}>
                            {saving ? (
                              <>
                                <RefreshCw className="icon-spin" size={14} />
                                <span>ENREGISTREMENT...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={15} />
                                <span>SAUVEGARDER LES PARAMÈTRES</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleTestAlert}
                            className="test-alert-btn"
                            disabled={saving || testingAlert}
                          >
                            {testingAlert ? (
                              <>
                                <RefreshCw className="icon-spin" size={14} />
                                <span>ENVOI DU TEST...</span>
                              </>
                            ) : (
                              <>
                                <Zap size={14} />
                                <span>TESTER L&apos;ALERTE</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </section>
                  </form>

                  {/* Card 3: Sécurité & Session (outside form) */}
                  <section className="glass-card security-card">
                    <div className="card-header">
                      <div className="card-title-group">
                        <Lock size={18} className="text-blue-accent" />
                        <div>
                          <h2>SÉCURITÉ &amp; SESSION</h2>
                          <p className="card-sub">Contrôle d&apos;accès, fournisseur d&apos;authentification et fermeture de session</p>
                        </div>
                      </div>
                    </div>

                    <div className="security-rows">
                      <div className="security-row">
                        <div className="sec-info">
                          <span className="sec-label mono">ADRESSE DE CONNEXION</span>
                          <span className="sec-value">{authEmail || 'Non renseignée'}</span>
                        </div>
                        <span className="provider-pill mono">
                          {authProvider === 'email' ? 'EMAIL & MOT DE PASSE' : `OAUTH : ${authProvider.toUpperCase()}`}
                        </span>
                      </div>

                      <div className="security-row">
                        <div className="sec-info">
                          <span className="sec-label mono">DERNIÈRE CONNEXION</span>
                          <span className="sec-value">{formattedLastSignIn}</span>
                        </div>
                        {authProvider === 'email' && authEmail ? (
                          <button
                            type="button"
                            onClick={handlePasswordReset}
                            disabled={resettingPassword}
                            className="sec-action-btn mono"
                          >
                            {resettingPassword ? (
                              <>
                                <RefreshCw size={13} className="icon-spin" />
                                <span>ENVOI EN COURS...</span>
                              </>
                            ) : (
                              <>
                                <KeyRound size={13} />
                                <span>RÉINITIALISER MOT DE PASSE</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="sec-oauth-note">Géré par votre fournisseur OAuth</span>
                        )}
                      </div>
                    </div>

                    <div className="profile-logout-section">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="profile-logout-btn"
                      >
                        {loggingOut ? <RefreshCw size={15} className="icon-spin" /> : <LogOut size={15} />}
                        <span>{loggingOut ? 'DÉCONNEXION EN COURS...' : 'SE DÉCONNECTER DU TERMINAL'}</span>
                      </button>
                    </div>
                  </section>
                </div>

                {/* Right Column: Offre & Abonnement Pro */}
                <aside className="premium-panel">
                  <div className={`premium-card ${isPro ? 'premium-active' : ''}`}>
                    <div className="premium-badge">
                      <Sparkles size={14} />
                      <span>OFFRE DE SERVICES AETHERIS</span>
                    </div>

                    <h2 className="premium-title">
                      {isPro ? 'Suite Institutionnelle Active' : "Basculez vers la puissance de l'IA"}
                    </h2>

                    {isPro ? (
                      <div className="pro-active-box">
                        <div className="pro-details-row">
                          <span className="pro-detail-label mono">PLAN ACTIF</span>
                          <h3 className="pro-plan-title">AETHERIS PRO</h3>
                        </div>
                        <div className="pro-details-row">
                          <span className="pro-detail-label mono">FACTURATION</span>
                          <p className="pro-plan-price mono">199.00 MAD / mois</p>
                        </div>
                        <div className="pro-details-row card-row">
                          <span className="pro-detail-label mono">MODE DE PAIEMENT</span>
                          <div className="c-details">
                            <CreditCard size={13} className="payment-icon" />
                            <span className="payment-text mono">Facturation Stripe Sécurisée</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowCancelConfirmModal(true)}
                          className="cancel-pro-btn mono"
                        >
                          RÉSILIER L&apos;ABONNEMENT PRO
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
                      <h3 className="features-list-title">CAPACITÉS &amp; PRIVILÈGES :</h3>

                      <div className="feature-row">
                        <div className="feature-status check">✓</div>
                        <div className="feature-desc">
                          <h4>Marché Live BVC &amp; Palmarès Dividendes</h4>
                          <p>Cours temps réel, rendements dividendes et suivi macroéconomique.</p>
                        </div>
                      </div>

                      <div className="feature-row">
                        <div className="feature-status check">✓</div>
                        <div className="feature-desc">
                          <h4>Portefeuille, Paper Trading &amp; Purification</h4>
                          <p>Suivi PMP réel, portefeuille virtuel 100K MAD et ratio de purification AAOIFI.</p>
                        </div>
                      </div>

                      <div className={`feature-row ${!isPro ? 'disabled' : ''}`}>
                        <div className={`feature-status ${isPro ? 'premium-check' : 'lock'}`}>
                          {isPro ? '✓' : '★'}
                        </div>
                        <div className="feature-desc">
                          <h4>Orchestrateur Multi-Agents (Gemini 3.8 Flash)</h4>
                          <p>Veille narrative, trading quant, fondamentale et consensus Alpha orchestré.</p>
                        </div>
                      </div>

                      <div className={`feature-row ${!isPro ? 'disabled' : ''}`}>
                        <div className={`feature-status ${isPro ? 'premium-check' : 'lock'}`}>
                          {isPro ? '✓' : '★'}
                        </div>
                        <div className="feature-desc">
                          <h4>Robo-Advisor IA &amp; Optimiseur</h4>
                          <p>Rééquilibrage sectoriel intelligent et gestion avancée du drawdown.</p>
                        </div>
                      </div>

                      <div className={`feature-row ${!isPro ? 'disabled' : ''}`}>
                        <div className={`feature-status ${isPro ? 'premium-check' : 'lock'}`}>
                          {isPro ? '✓' : '★'}
                        </div>
                        <div className="feature-desc">
                          <h4>Sharia Screener Automatique AAOIFI</h4>
                          <p>Audit automatisé de la dette financière, trésorerie et revenus illicites.</p>
                        </div>
                      </div>

                      <div className={`feature-row ${!isPro ? 'disabled' : ''}`}>
                        <div className={`feature-status ${isPro ? 'premium-check' : 'lock'}`}>
                          {isPro ? '✓' : '★'}
                        </div>
                        <div className="feature-desc">
                          <h4>Alertes Prix Multi-Canaux Temps Réel</h4>
                          <p>Notifications automatisées Stop-Loss / Take-Profit sur Telegram &amp; WhatsApp.</p>
                        </div>
                      </div>
                    </div>

                    {!isPro && (
                      <div className="premium-footer-banner">
                        <Info size={14} style={{ flexShrink: 0 }} />
                        <span>Activez Aetheris Pro pour débloquer les agents IA, le Robo-Advisor et le Sharia Screener automatique.</span>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      <PremiumPaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        onUpgrade={handleUpgrade}
      />

      {showCancelConfirmModal && (
        <div
          className="modal-overlay glass-heavy animate-fade-in"
          onClick={() => setShowCancelConfirmModal(false)}
        >
          <div
            className="modal-content glass-heavy cancel-modal-content cancel-slide-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Résiliation Aetheris Pro"
          >
            <div className="sheet-handle" />
            <div className="cancel-header">
              <div className="cancel-title-group">
                <AlertTriangle className="cancel-icon" size={20} />
                <h2 className="mono cancel-title">RÉSILIATION AETHERIS PRO</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelConfirmModal(false)}
                className="cancel-close-btn"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cancel-body">
              <p className="cancel-subtitle">
                Êtes-vous sûr de vouloir résilier votre abonnement{' '}
                <strong className="cancel-strong">AETHERIS PRO</strong> ? En confirmant la résiliation,
                vous perdrez instantanément l&apos;accès aux privilèges suivants :
              </p>

              <div className="cancel-features">
                <div className="cancel-feature-item">
                  <span className="cancel-x">✖</span>
                  <div className="cancel-feature-text">
                    <strong>Robo-Advisor d&apos;Allocation :</strong> Plus d&apos;optimisation automatisée de portefeuille.
                  </div>
                </div>
                <div className="cancel-feature-item">
                  <span className="cancel-x">✖</span>
                  <div className="cancel-feature-text">
                    <strong>Synthèse Stratégique IA :</strong> Perte des rapports stratégiques et analyses multi-agents.
                  </div>
                </div>
                <div className="cancel-feature-item">
                  <span className="cancel-x">✖</span>
                  <div className="cancel-feature-text">
                    <strong>Alertes Prix Illimitées :</strong> Désactivation des alertes en temps réel sur WhatsApp &amp; Telegram.
                  </div>
                </div>
              </div>
            </div>

            <div className="cancel-actions">
              <button type="button" onClick={confirmDowngrade} className="btn-danger-new mono">
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
          padding-bottom: 3.5rem;
          min-height: 100vh;
        }

        .max-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .mono {
          font-family: 'JetBrains Mono', monospace;
        }

        /* Header Top Bar */
        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1.25rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
          padding-bottom: 1.15rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .header-identity {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          min-width: 0;
        }

        .identity-block {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        :global(.text-emerald) {
          color: #10b981;
        }

        :global(.text-purple-accent) {
          color: #c084fc;
        }

        :global(.text-blue-accent) {
          color: #38bdf8;
        }

        .mono-tiny {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
        }

        .title-h1 {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 2rem;
          letter-spacing: -0.03em;
          margin: 0;
          color: #ffffff;
        }

        .header-subtitle {
          margin: 0;
          font-size: 0.9rem;
          color: #94a3b8;
          line-height: 1.45;
          max-width: 680px;
        }

        .subscription-pill {
          padding: 0.3rem 0.7rem;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.66rem;
          font-weight: 800;
        }

        .subscription-pill.premium {
          background: rgba(168, 85, 247, 0.14);
          border-color: rgba(168, 85, 247, 0.35);
          color: #d8b4fe;
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.16);
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 40px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0 1rem;
          border-radius: 0.6rem;
          color: #cbd5e1;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        /* Alert Banner */
        .alert-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.95rem 1.15rem;
          border-radius: 0.85rem;
          margin-bottom: 1.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 600;
          animation: slideDown 0.3s ease;
        }

        .alert-banner.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.28);
          color: #34d399;
        }

        .alert-banner.error {
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.28);
          color: #fda4af;
        }

        /* Structured Skeleton Loader */
        .profile-skeleton-wrap {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }
        .skeleton-pulse {
          animation: skPulse 1.5s ease-in-out infinite;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .skeleton-hero {
          height: 118px;
          border-radius: 1.15rem;
        }
        .skeleton-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.9rem;
        }
        .skeleton-kpi {
          height: 92px;
          border-radius: 0.95rem;
        }
        .skeleton-cols {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 1.25rem;
        }
        .skeleton-panel {
          height: 360px;
          border-radius: 1.05rem;
        }
        @keyframes skPulse {
          0%, 100% {
            opacity: 0.45;
          }
          50% {
            opacity: 0.85;
          }
        }
        @media (max-width: 1024px) {
          .skeleton-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .skeleton-cols {
            grid-template-columns: 1fr;
          }
        }

        :global(.icon-spin) {
          animation: profileSpin 0.9s linear infinite;
        }

        @keyframes profileSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Layout Grid */
        .profile-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 1.25rem;
          align-items: start;
        }

        .settings-panel,
        .settings-stack {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .premium-panel {
          position: sticky;
          top: calc(var(--header-height) + 1rem);
        }

        @media (max-width: 1024px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
          .premium-panel {
            position: static;
          }
        }

        /* Glass Card */
        .glass-card {
          background: rgba(11, 16, 27, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 1.05rem;
          padding: 1.5rem;
          backdrop-filter: blur(20px);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 1.35rem;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .card-title-group {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .card-header h2 {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 1.02rem;
          letter-spacing: 0.04em;
          margin: 0;
          color: #ffffff;
        }

        .card-sub {
          margin: 0.25rem 0 0 0;
          font-size: 0.78rem;
          color: #94a3b8;
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .field-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.06em;
        }

        .field-label-emerald {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: #34d399;
        }

        .preview-chip {
          font-size: 0.68rem;
          font-weight: 700;
          color: #34d399;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.22);
          padding: 2px 8px;
          border-radius: 999px;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          transition: all 0.25s ease;
          overflow: hidden;
        }

        .input-wrapper:focus-within {
          border-color: #10b981;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.12);
        }

        .input-prefix,
        .input-suffix {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          color: #94a3b8;
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
          min-width: 0;
          background: transparent;
          border: none;
          padding: 0.85rem 1rem;
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.88rem;
          outline: none;
        }

        .presets-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-top: 0.15rem;
        }

        .preset-chip {
          padding: 0.35rem 0.7rem;
          border-radius: 0.55rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .preset-chip:hover {
          border-color: rgba(16, 185, 129, 0.4);
          color: #ffffff;
        }

        .preset-chip.active {
          background: rgba(16, 185, 129, 0.16);
          border-color: rgba(16, 185, 129, 0.45);
          color: #34d399;
        }

        .field-help {
          font-size: 0.76rem;
          color: #94a3b8;
          margin: 0;
          line-height: 1.45;
        }

        .email-sync-warning {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          padding: 0.65rem 0.85rem;
          border-radius: 0.65rem;
          background: rgba(245, 158, 11, 0.09);
          border: 1px solid rgba(245, 158, 11, 0.28);
          color: #fde68a;
          font-size: 0.76rem;
          line-height: 1.4;
        }

        .sync-email-btn {
          padding: 0.35rem 0.65rem;
          border-radius: 0.45rem;
          border: 1px solid rgba(245, 158, 11, 0.4);
          background: rgba(245, 158, 11, 0.16);
          color: #fef3c7;
          font-size: 0.68rem;
          font-weight: 800;
          cursor: pointer;
        }

        /* Visual Channel Selector Grid */
        .channel-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.65rem;
        }

        .channel-card {
          text-align: left;
          padding: 0.85rem 0.95rem;
          border-radius: 0.85rem;
          background: rgba(0, 0, 0, 0.24);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .channel-card:hover {
          border-color: rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.04);
        }

        .channel-card.selected {
          background: rgba(16, 185, 129, 0.09);
          border-color: rgba(16, 185, 129, 0.45);
          box-shadow: 0 0 18px rgba(16, 185, 129, 0.1);
        }

        .channel-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .channel-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: #94a3b8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .channel-icon.selected {
          background: rgba(16, 185, 129, 0.18);
          color: #34d399;
        }

        .channel-pill {
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 999px;
          letter-spacing: 0.04em;
        }

        .channel-pill.ok {
          background: rgba(16, 185, 129, 0.14);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.28);
        }

        .channel-pill.warn {
          background: rgba(245, 158, 11, 0.14);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.28);
        }

        .channel-pill.accent {
          background: rgba(168, 85, 247, 0.14);
          color: #d8b4fe;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .channel-card-title {
          font-family: 'Outfit', sans-serif;
          font-size: 0.9rem;
          font-weight: 800;
          color: #ffffff;
        }

        .channel-card-desc {
          font-size: 0.74rem;
          color: #94a3b8;
          line-height: 1.3;
        }

        /* Dynamic collapsible setup boxes */
        .dynamic-box {
          background: rgba(0, 0, 0, 0.25);
          border-radius: 0.85rem;
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .dynamic-box.telegram {
          border: 1px solid rgba(168, 85, 247, 0.22);
        }

        .dynamic-box.whatsapp {
          border: 1px solid rgba(16, 185, 129, 0.22);
        }

        .dynamic-box-header {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .unsaved-hint {
          font-size: 0.76rem;
          color: #fde68a;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.22);
          border-radius: 0.55rem;
          padding: 0.5rem 0.75rem;
        }

        .otp-verify-row {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .otp-status-badge {
          font-size: 11px;
          font-weight: 800;
        }

        .otp-status-badge.ok {
          color: #34d399;
        }

        .otp-status-badge.pending {
          color: #fbbf24;
        }

        .otp-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
        }

        .otp-action-btn {
          cursor: pointer;
          border: none;
          min-height: 40px;
          padding: 0 0.85rem !important;
        }

        .otp-code-input {
          width: 140px !important;
          min-height: 40px !important;
          padding: 0 0.75rem !important;
          font-size: 14px !important;
          text-align: center;
          letter-spacing: 0.12em;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: 0.5rem;
          background: rgba(0, 0, 0, 0.3) !important;
        }

        .dynamic-box.telegram .dynamic-box-header {
          color: #d8b4fe;
        }

        .dynamic-box.whatsapp .dynamic-box-header {
          color: #34d399;
        }

        .dynamic-box-header h3 {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 0.82rem;
          letter-spacing: 0.03em;
          margin: 0;
          flex: 1;
        }

        .integration-link {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.66rem;
          font-weight: 800;
          text-decoration: none;
          padding: 0.42rem 0.75rem;
          border-radius: 0.4rem;
          transition: all 0.2s ease;
        }

        .integration-link.purple {
          background: rgba(168, 85, 247, 0.12);
          border: 1px solid rgba(168, 85, 247, 0.28);
          color: #d8b4fe;
        }

        .integration-link.purple:hover {
          background: rgba(168, 85, 247, 0.22);
          color: #ffffff;
        }

        .integration-link.emerald {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.28);
          color: #34d399;
        }

        .integration-link.emerald:hover {
          background: rgba(16, 185, 129, 0.22);
          color: #ffffff;
        }

        .setup-guide {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 0.55rem;
          padding: 0.8rem 1rem;
          font-size: 0.78rem;
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .setup-guide h4 {
          margin: 0 0 0.45rem 0;
          color: #cbd5e1;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 0.8rem;
        }

        .setup-guide ol {
          margin: 0;
          padding-left: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .setup-guide li {
          line-height: 1.45;
        }

        /* Action Buttons Grid */
        .form-actions-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 0.85rem;
          margin-top: 0.25rem;
        }

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
          padding: 0.95rem 1rem;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.14);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(16, 185, 129, 0.25);
          filter: brightness(1.06);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .test-alert-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: rgba(168, 85, 247, 0.12);
          border: 1px solid rgba(168, 85, 247, 0.32);
          color: #d8b4fe;
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 0.84rem;
          letter-spacing: 0.02em;
          padding: 0.95rem 1rem;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .test-alert-btn:hover:not(:disabled) {
          background: rgba(168, 85, 247, 0.24);
          border-color: rgba(168, 85, 247, 0.55);
          color: #ffffff;
          transform: translateY(-1px);
        }

        .test-alert-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Security & Session Card */
        .security-rows {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .security-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          flex-wrap: wrap;
          padding: 0.85rem 1rem;
          border-radius: 0.75rem;
          background: rgba(0, 0, 0, 0.24);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sec-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 0;
        }

        .sec-label {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.06em;
        }

        .sec-value {
          font-size: 0.88rem;
          font-weight: 600;
          color: #f8fafc;
          word-break: break-word;
        }

        .provider-pill {
          font-size: 10px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.28);
          color: #7dd3fc;
        }

        .sec-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          min-height: 38px;
          padding: 0 0.85rem;
          border-radius: 0.6rem;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
          font-size: 0.7rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sec-action-btn:hover:not(:disabled) {
          border-color: rgba(56, 189, 248, 0.45);
          background: rgba(56, 189, 248, 0.14);
          color: #ffffff;
        }

        .sec-action-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .sec-oauth-note {
          font-size: 0.76rem;
          color: #94a3b8;
        }

        .profile-logout-section {
          margin-top: 1.25rem;
          padding-top: 1.15rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .profile-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          background: rgba(239, 68, 68, 0.09);
          border: 1px solid rgba(239, 68, 68, 0.26);
          color: #fca5a5;
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 0.85rem;
          letter-spacing: 0.04em;
          padding: 0.85rem;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .profile-logout-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
          color: #ffffff;
        }

        .profile-logout-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        /* Premium Panel styling */
        .premium-card {
          background: rgba(11, 16, 27, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 1.05rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
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
        }

        .premium-card.premium-active {
          border-color: rgba(168, 85, 247, 0.28);
          box-shadow: 0 10px 40px rgba(168, 85, 247, 0.06);
        }

        .premium-card.premium-active::before {
          background: linear-gradient(90deg, #a855f7, #6366f1);
        }

        .premium-badge {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          color: #cbd5e1;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.64rem;
          font-weight: 800;
        }

        .premium-card.premium-active .premium-badge {
          background: rgba(168, 85, 247, 0.14);
          border-color: rgba(168, 85, 247, 0.3);
          color: #d8b4fe;
        }

        .premium-title {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 1.45rem;
          line-height: 1.25;
          letter-spacing: -0.02em;
          margin: 0;
          color: #ffffff;
        }

        .pro-active-box {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: rgba(168, 85, 247, 0.05);
          border: 1px dashed rgba(168, 85, 247, 0.28);
          padding: 1.3rem;
          border-radius: 0.95rem;
        }

        .pro-details-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
        }

        .pro-detail-label {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.07em;
        }

        .pro-plan-title {
          margin: 0;
          font-family: 'Outfit', sans-serif;
          font-size: 1.05rem;
          font-weight: 900;
          color: #ffffff;
        }

        .pro-plan-price {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: #34d399;
        }

        .c-details {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        :global(.payment-icon) {
          color: #c084fc;
        }

        .payment-text {
          font-size: 0.76rem;
          color: #cbd5e1;
        }

        .cancel-pro-btn {
          margin-top: 0.35rem;
          background: transparent;
          border: 1px solid rgba(244, 63, 94, 0.28);
          border-radius: 0.75rem;
          color: #fb7185;
          padding: 0.78rem;
          font-weight: 800;
          font-size: 10px;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-pro-btn:hover {
          background: rgba(244, 63, 94, 0.1);
          border-color: rgba(244, 63, 94, 0.45);
          color: #ffffff;
        }

        .pro-inactive-box {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          padding: 0.75rem 0;
        }

        .pro-price-tag {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.3rem;
        }

        .pro-price-tag .price {
          font-size: 2.25rem;
          font-weight: 900;
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
        }

        .pro-price-tag .period {
          font-size: 0.9rem;
          color: #c084fc;
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
          color: #ffffff;
          font-weight: 800;
          font-size: 11px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.28);
          transition: all 0.2s;
        }

        .activate-pro-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(124, 58, 237, 0.4);
        }

        /* Features List */
        .features-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 0.4rem;
        }

        .features-list-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.06em;
          margin: 0 0 0.25rem 0;
        }

        .feature-row {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          transition: opacity 0.25s ease;
        }

        .feature-row.disabled {
          opacity: 0.62;
        }

        .feature-status {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 900;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .feature-status.premium-check {
          background: rgba(168, 85, 247, 0.18);
          border-color: rgba(168, 85, 247, 0.35);
          color: #d8b4fe;
        }

        .feature-status.lock {
          background: rgba(168, 85, 247, 0.08);
          border-color: rgba(168, 85, 247, 0.22);
          color: #c084fc;
        }

        .feature-desc h4 {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 0.86rem;
          color: #f8fafc;
          margin: 0 0 0.18rem 0;
        }

        .feature-desc p {
          font-size: 0.76rem;
          color: #94a3b8;
          margin: 0;
          line-height: 1.42;
        }

        .premium-footer-banner {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.18);
          padding: 0.8rem 1rem;
          border-radius: 0.75rem;
          color: #93c5fd;
          font-size: 0.76rem;
          line-height: 1.45;
        }

        /* Cancel Modal Styles */
        .cancel-modal-content {
          max-width: 460px;
          width: 100%;
          padding: 1.5rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(244, 63, 94, 0.3) !important;
          box-shadow: 0 0 40px rgba(244, 63, 94, 0.15) !important;
        }
        .cancel-slide-up {
          animation: cancelSlideUp 0.25s ease forwards;
        }
        @keyframes cancelSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .cancel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 1rem;
        }
        .cancel-title-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        :global(.cancel-icon) {
          color: #f43f5e;
          flex-shrink: 0;
        }
        .cancel-title {
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #f43f5e;
          margin: 0;
        }
        .cancel-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #94a3b8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .cancel-body {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .cancel-subtitle {
          font-size: 0.88rem;
          color: #cbd5e1;
          line-height: 1.55;
          margin: 0;
        }
        .cancel-strong {
          color: #ffffff;
        }
        .cancel-features {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .cancel-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.75rem 0.9rem;
          border-radius: 0.75rem;
          background: rgba(244, 63, 94, 0.06);
          border: 1px solid rgba(244, 63, 94, 0.18);
        }
        .cancel-x {
          color: #f43f5e;
          font-weight: 900;
          flex-shrink: 0;
        }
        .cancel-feature-text {
          font-size: 0.8rem;
          color: #cbd5e1;
          line-height: 1.45;
        }
        .cancel-feature-text strong {
          color: #ffffff;
        }
        .cancel-actions {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-top: 1.25rem;
        }
        .dismiss-btn {
          width: 100%;
          min-height: 46px;
          padding: 0.8rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          cursor: pointer;
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
          color: #ffffff;
          font-weight: 800;
          font-size: 11px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(244, 63, 94, 0.22);
          transition: all 0.2s;
        }
        .btn-danger-new:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(244, 63, 94, 0.34);
        }

        /* Animations */
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-down {
          animation: slideDown 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (max-width: 1024px) {
          .main-content {
            padding-bottom: calc(var(--bottom-nav-height) + var(--sab) + 32px);
          }
        }

        @media (max-width: 768px) {
          .max-container {
            padding: 0 0.75rem;
          }
          .terminal-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.9rem;
          }
          .title-h1 {
            font-size: 1.55rem;
          }
          .account-hero {
            padding: 1.1rem;
          }
          .back-btn {
            min-height: 42px;
          }
          .terminal-input,
          .otp-code-input {
            font-size: 16px !important;
          }
          .otp-controls {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          .otp-controls .otp-code-input {
            grid-column: span 2;
            width: 100% !important;
            order: -1;
          }
          .btn-danger-new,
          .dismiss-btn,
          .activate-pro-btn,
          .cancel-pro-btn {
            min-height: 48px;
          }
        }

        @media (max-width: 640px) {
          .account-kpi-grid {
            grid-template-columns: 1fr;
          }
          .channel-grid {
            grid-template-columns: 1fr;
          }
          .glass-card,
          .premium-card {
            padding: 1.2rem !important;
            border-radius: 1rem !important;
          }
          .form-actions-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .submit-btn,
          .test-alert-btn,
          .profile-logout-btn {
            min-height: 48px;
            font-size: 0.8rem;
          }
          .cancel-modal-content {
            max-width: none !important;
            border-radius: 20px 20px 0 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
