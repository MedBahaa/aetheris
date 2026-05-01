'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, Loader2, Zap, Wifi, Database, Activity } from 'lucide-react';

/**
 * AETHERIS PREMIUM LOGIN GATEWAY
 * Institutional-grade terminal aesthetic with high-fidelity animations.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // For nice hydration handling
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
      } else {
        setSuccess("ACCÈS RÉSERVÉ. Vérifiez votre uplink (email) pour validation.");
        setLoading(false);
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("IDENTIFIANTS INVALIDES. ÉCHEC DE L'AUTHENTIFICATION.");
        setLoading(false);
      } else if (data.session) {
        // Session confirmée : redirection immédiate vers le portfolio
        router.push('/portfolio');
        // Timeout de sécurité : si la navigation bloque plus de 3s, on débloque le bouton
        setTimeout(() => setLoading(false), 3000);
      } else {
        // Cas rare : pas d'erreur mais pas de session (email non confirmé par exemple)
        setError("VÉRIFIEZ VOTRE EMAIL POUR CONFIRMER VOTRE COMPTE.");
        setLoading(false);
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="login-root">
      {/* Background Layer: grid & dynamic light */}
      <div className="technical-grid"></div>
      <div className="light-orb pulse-fast"></div>
      <div className="light-orb side pulse-slow"></div>

      <div className="login-container animate-fade-in">
        {/* Card Brackets */}
        <div className="bracket top-left"></div>
        <div className="bracket top-right"></div>
        <div className="bracket bottom-left"></div>
        <div className="bracket bottom-right"></div>

        {/* Vertical Scanning Beam */}
        <div className="scanning-beam"></div>

        <div className="login-glass glass-heavy">
          <div className="login-header">
            <div className="status-indicator">
              <span className="dot"></span>
              <span className="mono-label">UPLINK STATUS: SECURE</span>
            </div>

            <div className="logo-main">
              <div className="logo-box">
                <Zap size={24} fill="currentColor" />
                <div className="box-glow"></div>
              </div>
              <h1 className="brand-h1 tracking-tighter">AETHERIS <span className="text-emerald">AI</span></h1>
            </div>
            
            <div className="title-divider">
              <div className="divider-line"></div>
              <p className="mono-sub">
                {mode === 'login' ? 'GATEWAY TERMINAL 3.0' : 'ENROLLMENT PROTOCOL 3.0'}
              </p>
              <div className="divider-line"></div>
            </div>
          </div>

          <form onSubmit={handleAuth} className="login-form">
            <div className="input-field">
              <label className="mono-label">
                <Mail size={12} className="text-dim" />
                DÉSIGNATION COMPTE
              </label>
              <div className="input-wrapper">
                <div className="active-indicator"></div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="NOM UTILISATEUR@AETHERIS.SEC"
                  required 
                />
              </div>
            </div>

            <div className="input-field">
              <label className="mono-label">
                <Lock size={12} className="text-dim" />
                CLÉ D'ACCÈS
              </label>
              <div className="input-wrapper">
                <div className="active-indicator"></div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required 
                />
              </div>
            </div>

            {error && (
              <div className="status-msg error animate-shake">
                <div className="msg-icon"><Activity size={14} /></div>
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="status-msg success">
                <div className="msg-icon"><ShieldCheck size={14} /></div>
                <span>{success}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className={`login-btn ${loading ? 'loading' : ''}`}>
              <div className="btn-bg"></div>
              <div className="btn-content">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                <span>{loading ? "INITIALISATION..." : mode === 'login' ? "ÉTABLIR LIAISON" : "RÉSERVER ACCÈS"}</span>
              </div>
            </button>
          </form>

          <div className="mode-toggle">
            <div className="toggle-info mono-label">
              {mode === 'login' ? "ID NOT FOUND?" : "RECORD EXISTS?"}
            </div>
            <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="toggle-action">
              {mode === 'login' ? "CRÉER NOUVEAU PROFIL" : "RETOUR LOGIN"}
            </button>
          </div>

          {/* Institutional Footer */}
          <div className="login-system-footer">
            <div className="system-grid">
              <div className="stat">
                <Wifi size={10} />
                <span className="mono-tiny">NODE: CASABLANCA</span>
              </div>
              <div className="stat">
                <Database size={10} />
                <span className="mono-tiny">ENCRYPTION: AES-256</span>
              </div>
            </div>
            <p className="legal-tag">© 2026 AETHERIS SYSTÈME OPÉRATIONNEL | TOUS DROITS RÉSERVÉS</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #020617;
          position: relative;
          overflow: hidden;
          padding: 2rem;
        }

        .technical-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
        }

        .light-orb {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
          top: -300px;
          right: -300px;
          z-index: 0;
        }
        .light-orb.side {
          top: unset;
          right: unset;
          bottom: -300px;
          left: -300px;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.05) 0%, transparent 70%);
        }

        .login-container {
          position: relative;
          width: 100%;
          max-width: 440px;
          z-index: 10;
        }

        /* Card Decoration: Brackets */
        .bracket {
          position: absolute;
          width: 30px;
          height: 30px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 20;
        }
        .top-left { top: -10px; left: -10px; border-right: none; border-bottom: none; }
        .top-right { top: -10px; right: -10px; border-left: none; border-bottom: none; }
        .bottom-left { bottom: -10px; left: -10px; border-right: none; border-top: none; }
        .bottom-right { bottom: -10px; right: -10px; border-left: none; border-top: none; }

        /* Scanning Beam Animation */
        .scanning-beam {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(to right, transparent, rgba(16, 185, 129, 0.6), transparent);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
          z-index: 15;
          animation: scan 8s linear infinite;
        }

        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(600px); opacity: 0; }
        }

        .login-glass {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.5rem;
          padding: 3rem 2.5rem;
          box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }
        
        .logo-main { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .logo-box {
          width: 3.5rem;
          height: 3.5rem;
          background: #fff;
          color: #020617;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .box-glow {
          position: absolute;
          inset: -10px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%);
        }

        .brand-h1 { font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 900; color: #fff; }
        .text-emerald { color: #10b981; }

        .title-divider { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .divider-line { flex: 1; height: 1px; background: rgba(255, 255, 255, 0.05); }

        .login-form { display: flex; flex-direction: column; gap: 1.5rem; }

        .mono-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 850;
          color: #475569;
          letter-spacing: 0.15rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-transform: uppercase;
        }

        .input-field { display: flex; flex-direction: column; gap: 0.6rem; }
        .input-wrapper { position: relative; width: 100%; }
        .active-indicator {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 0px;
          background: #10b981;
          transition: width 0.3s var(--ease);
          border-radius: 4px 0 0 4px;
          opacity: 0.5;
        }
        .input-wrapper:focus-within .active-indicator { width: 3px; }

        input {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.5rem;
          padding: 1rem 1.25rem;
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.3s var(--ease);
        }
        input:focus {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.02);
        }

        .status-msg {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1.25rem;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .status-msg.error { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); }
        .status-msg.success { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(10, 185, 14, 0.2); }

        .login-btn {
          position: relative;
          padding: 1rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s;
          margin-top: 1rem;
        }
        .btn-bg {
          position: absolute;
          inset: 0;
          background: #fff;
          transition: background 0.3s;
        }
        .login-btn:hover .btn-bg { background: #10b981; }
        .btn-content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 900;
          font-size: 11px;
          color: #020617;
          letter-spacing: 0.1rem;
        }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .mode-toggle {
          margin-top: 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .toggle-action {
          background: none;
          border: none;
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 4px;
          transition: color 0.3s;
        }
        .toggle-action:hover { color: #10b981; }

        .login-system-footer {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .system-grid { display: flex; justify-content: center; gap: 2rem; color: #475569; }
        .stat { display: flex; align-items: center; gap: 0.4rem; }
        .mono-tiny { font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 800; letter-spacing: 0.05rem; }
        .legal-tag { font-size: 8px; color: #334155; text-align: center; }

        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .pulse-fast { animation: pulse 4s infinite cubic-bezier(0.4, 0, 0.6, 1); }
        .pulse-slow { animation: pulse 8s infinite cubic-bezier(0.4, 0, 0.6, 1); }

        .animate-fade-in { animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake { 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); } 30%, 50%, 70% { transform: translateX(-4px); } 40%, 60% { transform: translateX(4px); } }
      `}</style>
    </div>
  );
}
