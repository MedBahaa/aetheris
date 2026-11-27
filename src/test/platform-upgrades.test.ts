// @vitest-environment node
import fs from 'fs';
import path from 'path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { getBvcMarketStatus } from '../lib/bvc-market-hours';
import { resolveAppOrigin } from '../lib/app-origin';
import { activateSandboxSubscriptionAction } from '../lib/stripe-actions';
import { checkRateLimitAsync } from '../lib/rate-limiter';

describe('Aetheris Phase 1-5 Platform & Security Upgrades', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    vi.restoreAllMocks();
  });

  describe('BVC Market Session Clock (Africa/Casablanca)', () => {
    function createCasablancaDate(isoDate: string, hour: number, minute: number): Date {
      const hh = String(hour).padStart(2, '0');
      const mm = String(minute).padStart(2, '0');
      const candidate = new Date(`${isoDate}T${hh}:${mm}:00Z`);
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Casablanca',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(candidate);

      const actualHour = Number(parts.find((p) => p.type === 'hour')?.value ?? hour) % 24;
      const actualMinute = Number(parts.find((p) => p.type === 'minute')?.value ?? minute);

      let diffMinutes = actualHour * 60 + actualMinute - (hour * 60 + minute);
      if (diffMinutes > 720) diffMinutes -= 1440;
      if (diffMinutes < -720) diffMinutes += 1440;

      return new Date(candidate.getTime() - diffMinutes * 60_000);
    }

    it('identifies OPEN session Mon-Fri between 09:30 and 15:40 Casablanca time', () => {
      // 2026-11-27 is Friday at 10:30 Africa/Casablanca wall-clock time
      const res = getBvcMarketStatus(createCasablancaDate('2026-11-27', 10, 30));
      expect(res.status).toBe('OPEN');
      expect(res.isOpen).toBe(true);
      expect(res.label).toBe('SÉANCE BVC OUVERTE');
    });

    it('identifies PRE_OPEN session Mon-Fri between 09:00 and 09:29 Casablanca time', () => {
      // 2026-11-27 is Friday at 09:15 Africa/Casablanca wall-clock time
      const res = getBvcMarketStatus(createCasablancaDate('2026-11-27', 9, 15));
      expect(res.status).toBe('PRE_OPEN');
      expect(res.isOpen).toBe(false);
    });

    it('identifies CLOSED_AFTER_HOURS outside trading hours on weekdays', () => {
      // 2026-11-27 is Friday at 17:00 Africa/Casablanca wall-clock time
      const res = getBvcMarketStatus(createCasablancaDate('2026-11-27', 17, 0));
      expect(res.status).toBe('CLOSED_AFTER_HOURS');
      expect(res.isOpen).toBe(false);
    });

    it('identifies CLOSED_WEEKEND on Saturday and Sunday', () => {
      // 2026-11-28 is Saturday at 11:00 Africa/Casablanca wall-clock time
      const sat = getBvcMarketStatus(createCasablancaDate('2026-11-28', 11, 0));
      expect(sat.status).toBe('CLOSED_WEEKEND');
      expect(sat.isOpen).toBe(false);

      // 2026-11-29 is Sunday at 11:00 Africa/Casablanca wall-clock time
      const sun = getBvcMarketStatus(createCasablancaDate('2026-11-29', 11, 0));
      expect(sun.status).toBe('CLOSED_WEEKEND');
      expect(sun.isOpen).toBe(false);
    });
  });

  describe('Production App Origin & Stripe Sandbox Guards', () => {
    it('prioritizes NEXT_PUBLIC_APP_URL, then VERCEL_PROJECT_PRODUCTION_URL, then VERCEL_URL', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.aetheris.ma/';
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'aetheris.vercel.app';
      expect(resolveAppOrigin('https://evil.example.com')).toBe('https://app.aetheris.ma');

      delete process.env.NEXT_PUBLIC_APP_URL;
      expect(resolveAppOrigin('http://localhost:3000')).toBe('https://aetheris.vercel.app');

      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      process.env.VERCEL_URL = 'aetheris-preview-123.vercel.app';
      expect(resolveAppOrigin('http://localhost:3000')).toBe('https://aetheris-preview-123.vercel.app');
    });

    it('rejects untrusted client origin and blocks sandbox upgrade in production', async () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      delete process.env.VERCEL_URL;
      expect(resolveAppOrigin('https://attacker.tld')).toBe('http://localhost:3000');

      const sandboxRes = await activateSandboxSubscriptionAction();
      expect(sandboxRes.success).toBe(false);
      expect(sandboxRes.error).toContain('désactivée');
    });
  });

  describe('Zero PII in localStorage Regression Guard', () => {
    it('ensures profile and portfolio pages never persist PII keys to localStorage', () => {
      const profileSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/profile/page.tsx'),
        'utf-8'
      );
      const portfolioSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/portfolio/page.tsx'),
        'utf-8'
      );

      expect(profileSrc).not.toContain("localStorage.setItem('aetheris_user_profile'");
      expect(profileSrc).not.toContain('localStorage.getItem(\'aetheris_user_profile\'');
      expect(portfolioSrc).not.toContain("localStorage.setItem('aetheris_capital'");
      expect(portfolioSrc).not.toContain("localStorage.getItem('aetheris_capital'");
    });
  });

  describe('Distributed Rate-Limiter Vercel KV / Upstash Compatibility', () => {
    it('supports Vercel Marketplace KV_REST_API_URL & KV_REST_API_TOKEN automatically', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.KV_REST_API_URL = 'https://kv-test.upstash.io';
      process.env.KV_REST_API_TOKEN = 'kv-secret-token';

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 1 }, { result: 1 }]), { status: 200 })
      );

      const res = await checkRateLimitAsync('test:kv-user', 5, 60_000);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toBe('https://kv-test.upstash.io/pipeline');
    });
  });
});
