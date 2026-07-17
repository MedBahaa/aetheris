'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Activity, Bell, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, MessageSquare, ArrowLeft, ShieldCheck
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { getUserProfileAction, upsertUserProfileAction } from '@/lib/portfolio-actions';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const prof = await getUserProfileAction();
      if (prof) {
        setProfile(prof);
        setNewCapital(prof.initial_capital.toString());
        setTelegramChatId(prof.telegram_chat_id || '');
        setWhatsappPhone(prof.whatsapp_phone || '');
        setAlertChannel(prof.alert_channel || 'EMAIL');
        setUsername(prof.username || '');
        setSubscriptionTier(prof.subscription_tier || 'free');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

      await upsertUserProfileAction(payload);
      setSubscriptionTier(targetTier);
      
      // Show smooth glass feedback
      setSaveMessage({ type: 'success', text: 'Paramètres du compte enregistrés avec succès !' });
      setTimeout(() => setSaveMessage(null), 4000);
      
      loadProfile();
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Erreur lors de la sauvegarde' });
      setTimeout(() => setSaveMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar history={[]} onSelect={() => {}} activeAgent="STRATEGY" onAgentChange={() => {}} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
      <main className="main-content">
        <div className="max-container">
          
          <header className="terminal-header animate-fade-in" style={{ marginBottom: '1.5rem' }}>
            <div className="header-identity">
              <div className="identity-block">
                <User size={14} className="text-emerald" />
                <span className="mono-tiny text-emerald">PROFIL UTILISATEUR & PARAMÈTRES</span>
              </div>
              <div className="title-row">
                <h1 className="title-h1">Mon Compte</h1>
                <div className="market-badge opacity-70">
                  {subscriptionTier === 'premium' ? '👑 COMPTE PREMIUM' : '⭐ COMPTE GRATUIT'}
                </div>
              </div>
            </div>
            <div className="header-actions-row">
              <button onClick={() => router.back()} className="action-chip" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                <ArrowLeft size={12} /> <span className="mono-tiny">RETOUR</span>
              </button>
            </div>
          </header>

          {/* Smooth feedback alert banner */}
          {saveMessage && (
            <div 
              className="animate-fade-in" 
              style={{
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                background: saveMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: saveMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                color: saveMessage.type === 'success' ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '13px',
                fontWeight: 'bold',
                fontFamily: 'monospace'
              }}
            >
              {saveMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{saveMessage.text}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#64748b' }}>
              <RefreshCw className="animate-spin" size={24} />
            </div>
          ) : (
            <div className="profile-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Left Column: Settings Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Form Card */}
                <form onSubmit={handleSaveProfile} className="glass-heavy" style={{ padding: '2rem', borderRadius: '1rem', color: '#fff', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 className="mono font-bold text-base mb-4 text-emerald" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem 0' }}>
                    <User size={16} /> CONFIGURATION GÉNÉRALE
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label className="mono-tiny" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={12} className="text-emerald" /> PSEUDO DE COMPÉTITION (PAPER TRADING)
                      </label>
                      <input 
                        type="text" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        placeholder="Saisissez un pseudo" 
                        className="terminal-input-field"
                        style={{ padding: '0.75rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label className="mono-tiny" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Activity size={12} className="text-emerald" /> CAPITAL DE RÉFÉRENCE RÉEL (MAD)
                      </label>
                      <input 
                        type="number" 
                        value={newCapital} 
                        onChange={e => setNewCapital(e.target.value)} 
                        placeholder="100000" 
                        className="terminal-input-field"
                        style={{ padding: '0.75rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label className="mono-tiny" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Bell size={12} className="text-emerald" /> CANAL DE RÉCEPTION DES ALERTES
                      </label>
                      <select 
                        value={alertChannel} 
                        onChange={e => setAlertChannel(e.target.value)}
                        style={{
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '0.75rem',
                          padding: '0.75rem',
                          color: '#fff',
                          fontSize: '0.85rem',
                          outline: 'none',
                          cursor: 'pointer',
                          fontFamily: 'monospace'
                        }}
                      >
                        <option value="EMAIL">📧 Email uniquement</option>
                        <option value="TELEGRAM">✈️ Telegram uniquement</option>
                        <option value="WHATSAPP">💬 WhatsApp uniquement</option>
                        <option value="ALL">🔥 Tous les canaux (Email + Telegram + WhatsApp)</option>
                      </select>
                    </div>

                    {(alertChannel === 'TELEGRAM' || alertChannel === 'ALL') && (
                      <div className="form-group animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label className="mono-tiny" style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          ✈️ CHAT ID TELEGRAM
                        </label>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            value={telegramChatId} 
                            onChange={e => setTelegramChatId(e.target.value)} 
                            placeholder="Votre Chat ID (ex: 123456789)" 
                            className="terminal-input-field"
                            style={{ padding: '0.75rem', flex: 1 }}
                          />
                          <a 
                            href="https://t.me/AetherisAlertBot" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="action-chip purple"
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: '#fff',
                              background: 'rgba(168, 85, 247, 0.2)',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            ACTIVER LE BOT
                          </a>
                        </div>
                        
                        <span style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4', marginTop: '0.2rem' }}>
                          1. Cliquez sur le bouton pour démarrer le bot <b>@AetherisAlertBot</b>.<br/>
                          2. Envoyez un message à <b>@userinfobot</b> sur Telegram pour obtenir votre Chat ID.
                        </span>
                      </div>
                    )}

                    {(alertChannel === 'WHATSAPP' || alertChannel === 'ALL') && (
                      <div className="form-group animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label className="mono-tiny" style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          💬 NUMÉRO WHATSAPP
                        </label>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            value={whatsappPhone} 
                            onChange={e => setWhatsappPhone(e.target.value)} 
                            placeholder="Format international (ex: 212600000000)" 
                            className="terminal-input-field"
                            style={{ padding: '0.75rem', flex: 1 }}
                          />
                          <a 
                            href="https://wa.me/34644975014?text=I%20allow%20callmebot%20to%20send%20me%20messages" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="action-chip emerald"
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: '#fff',
                              background: 'rgba(52, 211, 153, 0.2)',
                              border: '1px solid rgba(52, 211, 153, 0.4)',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            AUTORISER WHATSAPP
                          </a>
                        </div>

                        <span style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4', marginTop: '0.2rem' }}>
                          1. Cliquez sur le bouton pour autoriser CallMeBot à vous envoyer des messages.<br/>
                          2. Le numéro doit être au format international (sans le symbole + ni les 00 de préfixe).
                        </span>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="action-btn-save mono"
                      disabled={saving}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#000',
                        fontWeight: 900,
                        border: 'none',
                        padding: '0.9rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        letterSpacing: '0.05rem',
                        transition: 'all 0.2s',
                        marginTop: '0.5rem'
                      }}
                    >
                      {saving ? 'ENREGISTREMENT...' : 'SAUVEGARDER LES PARAMÈTRES'}
                    </button>

                  </div>
                </form>
              </div>

              {/* Right Column: Premium Comparison & Showcase */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Premium Banner */}
                <div 
                  className={`glass-heavy ${subscriptionTier === 'premium' ? 'premium-glow-purple' : ''}`}
                  style={{
                    padding: '2rem',
                    borderRadius: '1rem',
                    color: '#fff',
                    border: subscriptionTier === 'premium' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                    background: subscriptionTier === 'premium' 
                      ? 'linear-gradient(185deg, rgba(8, 10, 15, 0.95) 0%, rgba(168, 85, 247, 0.03) 100%)'
                      : 'rgba(8, 10, 15, 0.9)'
                  }}
                >
                  <h3 className="mono font-bold text-base mb-4 text-purple" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem 0', color: '#c084fc' }}>
                    <Sparkles size={16} /> OFFRE & ABONNEMENT AETHERIS
                  </h3>

                  <div className="subscription-toggle-box" style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button 
                      type="button" 
                      onClick={() => handleSaveProfile(undefined, 'free')}
                      style={{
                        flex: 1,
                        background: subscriptionTier !== 'premium' ? 'rgba(255,255,255,0.08)' : 'transparent',
                        border: 'none',
                        color: subscriptionTier !== 'premium' ? '#fff' : '#64748b',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      GRATUIT (FREE)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleSaveProfile(undefined, 'premium')}
                      style={{
                        flex: 1,
                        background: subscriptionTier === 'premium' ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' : 'transparent',
                        border: 'none',
                        color: '#fff',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      👑 PREMIUM
                    </button>
                  </div>

                  <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 className="mono text-xs text-purple font-semibold" style={{ fontSize: '11px', color: '#c084fc' }}>FONCTIONNALITÉS COMPARAISON :</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '0.6rem', fontSize: '12px' }}>
                        <CheckCircle2 size={14} className="text-emerald" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong className="text-white">Portefeuille & Graphiques :</strong> Suivi des PMP, performances et répartition sectorielle. (Gratuit & Premium)
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'start', gap: '0.6rem', fontSize: '12px' }}>
                        <CheckCircle2 size={14} className="text-emerald" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong className="text-white">Mode Paper Trading :</strong> Simulation fictive à 100 000 MAD avec classement. (Gratuit & Premium)
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'start', gap: '0.6rem', fontSize: '12px', opacity: subscriptionTier === 'premium' ? 1 : 0.4 }}>
                        {subscriptionTier === 'premium' ? (
                          <CheckCircle2 size={14} className="text-purple" style={{ flexShrink: 0, marginTop: '2px', color: '#c084fc' }} />
                        ) : (
                          <AlertTriangle size={14} className="text-amber" style={{ flexShrink: 0, marginTop: '2px' }} />
                        )}
                        <div>
                          <strong className={subscriptionTier === 'premium' ? 'text-white' : 'text-gray'}>Robo-Advisor IA :</strong> Analyse du portefeuille par IA et optimisation automatique de vos lignes. (Premium uniquement)
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'start', gap: '0.6rem', fontSize: '12px', opacity: subscriptionTier === 'premium' ? 1 : 0.4 }}>
                        {subscriptionTier === 'premium' ? (
                          <CheckCircle2 size={14} className="text-purple" style={{ flexShrink: 0, marginTop: '2px', color: '#c084fc' }} />
                        ) : (
                          <AlertTriangle size={14} className="text-amber" style={{ flexShrink: 0, marginTop: '2px' }} />
                        )}
                        <div>
                          <strong className={subscriptionTier === 'premium' ? 'text-white' : 'text-gray'}>Agent IA Stratégie :</strong> Recherche fondamentale approfondie et rapports financiers complets par l'IA. (Premium uniquement)
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
