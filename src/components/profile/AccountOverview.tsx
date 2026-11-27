'use client';

import React from 'react';
import Link from 'next/link';
import {
  Mail,
  Clock,
  Check,
  Briefcase,
  LayoutGrid,
  Scale,
  Wallet,
  Award,
  Layers,
  BellRing,
} from 'lucide-react';

export interface ReadinessCheckItem {
  key: string;
  label: string;
  done: boolean;
}

interface AccountOverviewProps {
  isPro: boolean;
  avatarInitials: string;
  displayName: string;
  authEmail: string;
  formattedMemberSince: string;
  completionScore: number;
  readinessChecks: ReadinessCheckItem[];
  capitalNum: number;
  virtualBalance: number;
  virtualInitialCapital: number;
  openPositionsCount: number;
  transactionsCount: number;
  activeAlertsCount: number;
  alertChannel: string;
  isChannelOperational: boolean;
}

export default function AccountOverview({
  isPro,
  avatarInitials,
  displayName,
  authEmail,
  formattedMemberSince,
  completionScore,
  readinessChecks,
  capitalNum,
  virtualBalance,
  virtualInitialCapital,
  openPositionsCount,
  transactionsCount,
  activeAlertsCount,
  alertChannel,
  isChannelOperational,
}: AccountOverviewProps) {
  return (
    <>
      {/* Executive Account Hero Banner */}
      <section className={`account-hero animate-fade-in ${isPro ? 'is-pro' : ''}`} aria-label="Synthèse du compte">
        <div className="hero-left">
          <div className={`avatar-circle ${isPro ? 'is-pro' : ''}`}>
            <span className="mono">{avatarInitials}</span>
          </div>

          <div className="hero-identity">
            <div className="hero-name-row">
              <h2 className="hero-display-name">{displayName}</h2>
              <span className={`hero-tier-badge mono ${isPro ? 'pro' : 'free'}`}>
                {isPro ? 'MEMBRE PRO' : 'ACCÈS STANDARD'}
              </span>
            </div>

            <div className="hero-meta-row">
              <span className="hero-meta-item">
                <Mail size={13} />
                <span>{authEmail || 'Session non identifiée'}</span>
              </span>
              <span className="hero-meta-sep">•</span>
              <span className="hero-meta-item">
                <Clock size={13} />
                <span>Membre depuis {formattedMemberSince}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="readiness-box">
            <div className="readiness-top">
              <span className="readiness-label mono">ÉTAT DU PROFIL</span>
              <span className="readiness-pct mono">{completionScore}%</span>
            </div>
            <div
              className="readiness-track"
              role="progressbar"
              aria-valuenow={completionScore}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="readiness-fill" style={{ width: `${completionScore}%` }} />
            </div>
            <div className="readiness-pills">
              {readinessChecks.map((item) => (
                <span key={item.key} className={`readiness-chip ${item.done ? 'done' : 'todo'}`}>
                  {item.done ? <Check size={10} /> : <span className="dot-pending" />}
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="quick-shortcuts">
            <Link href="/portfolio" className="shortcut-btn">
              <Briefcase size={13} />
              <span>Portefeuille</span>
            </Link>
            <Link href="/console" className="shortcut-btn">
              <LayoutGrid size={13} />
              <span>Console Alpha</span>
            </Link>
            <Link href="/purification" className="shortcut-btn">
              <Scale size={13} />
              <span>Purification</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4-Card Account KPI Strip */}
      <section className="account-kpi-grid animate-fade-in" aria-label="Indicateurs clés du compte">
        <div className="kpi-tile">
          <div className="kpi-head">
            <span className="kpi-label mono">CAPITAL RÉEL</span>
            <Wallet size={15} className="kpi-icon emerald" />
          </div>
          <div className="kpi-value mono">{capitalNum.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</div>
          <div className="kpi-sub">Base d&apos;indexation portefeuille</div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-head">
            <span className="kpi-label mono">PAPER TRADING</span>
            <Award size={15} className="kpi-icon amber" />
          </div>
          <div className="kpi-value mono">{virtualBalance.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</div>
          <div className="kpi-sub">
            Capital initial : {virtualInitialCapital.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-head">
            <span className="kpi-label mono">POSITIONS RÉELLES</span>
            <Layers size={15} className="kpi-icon blue" />
          </div>
          <div className="kpi-value mono">
            {openPositionsCount} {openPositionsCount > 1 ? 'valeurs' : 'valeur'}
          </div>
          <div className="kpi-sub">{transactionsCount} transaction(s) enregistrée(s)</div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-head">
            <span className="kpi-label mono">ALERTES SL / TP</span>
            <BellRing size={15} className="kpi-icon purple" />
          </div>
          <div className="kpi-value mono">
            {activeAlertsCount} {activeAlertsCount > 1 ? 'actives' : 'active'}
          </div>
          <div className="kpi-sub">
            Canal actif : {alertChannel} · {isChannelOperational ? 'Opérationnel' : 'À finaliser'}
          </div>
        </div>
      </section>

      <style jsx>{`
        .mono {
          font-family: var(--font-mono);
        }
        .account-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
          padding: 1.35rem 1.5rem;
          border-radius: 1.15rem;
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.07) 0%,
            rgba(15, 23, 42, 0.85) 60%,
            rgba(10, 14, 23, 0.92) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 1.1rem;
        }
        .account-hero.is-pro {
          background: linear-gradient(
            135deg,
            rgba(168, 85, 247, 0.1) 0%,
            rgba(15, 23, 42, 0.88) 55%,
            rgba(16, 185, 129, 0.06) 100%
          );
          border-color: rgba(168, 85, 247, 0.25);
        }
        .hero-left {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          min-width: 0;
          flex: 1 1 320px;
        }
        .avatar-circle {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34d399;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 900;
          flex-shrink: 0;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.14);
        }
        .avatar-circle.is-pro {
          background: rgba(168, 85, 247, 0.18);
          border-color: rgba(168, 85, 247, 0.45);
          color: #e9d5ff;
          box-shadow: 0 0 26px rgba(168, 85, 247, 0.22);
        }
        .hero-identity {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
        }
        .hero-name-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }
        .hero-display-name {
          margin: 0;
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -0.02em;
        }
        .hero-tier-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 999px;
          letter-spacing: 0.06em;
        }
        .hero-tier-badge.pro {
          background: rgba(168, 85, 247, 0.16);
          border: 1px solid rgba(168, 85, 247, 0.38);
          color: #d8b4fe;
        }
        .hero-tier-badge.free {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
        }
        .hero-meta-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 0.82rem;
          color: #94a3b8;
        }
        .hero-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: #cbd5e1;
        }
        .hero-meta-sep {
          color: #475569;
        }
        .hero-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.8rem;
          flex: 1 1 360px;
          min-width: 260px;
        }
        .readiness-box {
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 0.85rem;
          padding: 0.75rem 0.9rem;
        }
        .readiness-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .readiness-label {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.07em;
        }
        .readiness-pct {
          font-size: 11px;
          font-weight: 900;
          color: #34d399;
        }
        .readiness-track {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          overflow: hidden;
        }
        .readiness-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
          transition: width 0.4s ease;
        }
        .readiness-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .readiness-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 10.5px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 999px;
        }
        .readiness-chip.done {
          background: rgba(16, 185, 129, 0.12);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.22);
        }
        .readiness-chip.todo {
          background: rgba(255, 255, 255, 0.04);
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .dot-pending {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #64748b;
        }
        .quick-shortcuts {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: flex-end;
        }
        :global(.shortcut-btn) {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          min-height: 36px;
          padding: 0 0.85rem;
          border-radius: 0.65rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          font-size: 0.78rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        :global(.shortcut-btn:hover) {
          background: rgba(16, 185, 129, 0.14);
          border-color: rgba(16, 185, 129, 0.35);
          color: #ffffff;
        }
        .account-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.9rem;
          margin-bottom: 1.35rem;
        }
        .kpi-tile {
          padding: 1rem 1.15rem;
          border-radius: 0.95rem;
          background: rgba(13, 19, 31, 0.76);
          border: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          min-width: 0;
        }
        .kpi-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .kpi-label {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.07em;
        }
        :global(.kpi-icon.emerald) {
          color: #34d399;
        }
        :global(.kpi-icon.amber) {
          color: #fbbf24;
        }
        :global(.kpi-icon.blue) {
          color: #38bdf8;
        }
        :global(.kpi-icon.purple) {
          color: #c084fc;
        }
        .kpi-value {
          font-size: 1.32rem;
          font-weight: 900;
          color: #ffffff;
          font-variant-numeric: tabular-nums;
          line-height: 1.2;
        }
        .kpi-sub {
          font-size: 0.76rem;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 1024px) {
          .account-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .hero-right {
            align-items: flex-start;
          }
          .readiness-box {
            max-width: none;
          }
          .quick-shortcuts {
            justify-content: flex-start;
          }
        }
        @media (max-width: 768px) {
          .account-hero {
            padding: 1.1rem;
          }
        }
        @media (max-width: 640px) {
          .account-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
