import { describe, it, expect } from 'vitest';
import { PortfolioService } from '../lib/portfolio-service';
import { PortfolioTransaction, DividendTransaction, PortfolioTransactionSchema, UserProfileClientInputSchema } from '../lib/schemas';
import { InputSanitizer } from '../lib/input-sanitizer';
import { DIVIDEND_NET_RATIO } from '../lib/portfolio-constants';

describe('PortfolioService', () => {
  describe('calculateDividendIncome', () => {
    it('should correctly calculate dividend based on historical quantity', () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          symbol: 'IAM',
          quantity: 100,
          buy_price: 100,
          buy_date: '2024-01-01',
          type: 'BUY',
          is_virtual: false,
          user_id: 'u1',
          created_at: ''
        },
        {
          id: '2',
          symbol: 'IAM',
          quantity: 50,
          buy_price: 110,
          buy_date: '2024-03-01', // After dividend date
          type: 'BUY',
          is_virtual: false,
          user_id: 'u1',
          created_at: ''
        }
      ];

      const dividends: DividendTransaction[] = [
        {
          id: 'd1',
          symbol: 'IAM',
          amount_per_share: 5,
          dividend_date: '2024-02-01',
          is_virtual: false,
          user_id: 'u1',
          created_at: ''
        }
      ];

      // At 2024-02-01, quantity was 100 (50 bought later), net after 13.45% withholding tax (86.55%)
      const result = PortfolioService.calculateDividendIncome(dividends, [], transactions);
      
      expect(result['IAM']).toBeCloseTo(500 * DIVIDEND_NET_RATIO, 2); // 100 shares * 5 MAD * 0.8655
    });

    it('should handle sell transactions before dividend', () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          symbol: 'BCP',
          quantity: 100,
          buy_price: 100,
          buy_date: '2024-01-01',
          type: 'BUY',
          is_virtual: false,
          user_id: 'u1',
          created_at: ''
        },
        {
          id: '2',
          symbol: 'BCP',
          quantity: 30,
          buy_price: 110,
          buy_date: '2024-01-15',
          type: 'SELL',
          is_virtual: false,
          user_id: 'u1',
          created_at: ''
        }
      ];

      const dividends: DividendTransaction[] = [
        {
          id: 'd1',
          symbol: 'BCP',
          amount_per_share: 10,
          dividend_date: '2024-02-01',
          is_virtual: false,
          user_id: 'u1',
          created_at: ''
        }
      ];

      // At 2024-02-01, quantity was 70 (100 - 30), net after 13.45% withholding tax (86.55%)
      const result = PortfolioService.calculateDividendIncome(dividends, [], transactions);
      
      expect(result['BCP']).toBeCloseTo(700 * DIVIDEND_NET_RATIO, 2); // 70 shares * 10 MAD * 0.8655
    });
  });

  describe('Security & Validation Controls', () => {
    it('should reject negative quantities and prices in PortfolioTransactionSchema', () => {
      const InputSchema = PortfolioTransactionSchema.omit({ id: true, created_at: true, user_id: true });
      const negativeQty = InputSchema.safeParse({
        symbol: 'ATW',
        type: 'BUY',
        quantity: -500,
        buy_price: 450,
        buy_date: '2026-01-01',
        is_virtual: true,
      });
      expect(negativeQty.success).toBe(false);

      const negativePrice = InputSchema.safeParse({
        symbol: 'ATW',
        type: 'BUY',
        quantity: 10,
        buy_price: -100,
        buy_date: '2026-01-01',
        is_virtual: true,
      });
      expect(negativePrice.success).toBe(false);
    });

    it('should validate client profile inputs and strip/reject invalid formats', () => {
      const valid = UserProfileClientInputSchema.safeParse({
        initial_capital: 100000,
        telegram_chat_id: '123456789',
        whatsapp_phone: '212600000000',
        alert_channel: 'ALL',
        notification_email: 'trader@aetheris.ma',
        username: 'AlphaTrader_01',
      });
      expect(valid.success).toBe(true);

      const invalidEmail = UserProfileClientInputSchema.safeParse({
        notification_email: 'not-an-email',
      });
      expect(invalidEmail.success).toBe(false);
    });

    it('should escape HTML special characters in InputSanitizer.escapeHtml', () => {
      const malicious = '<script>alert("xss")</script> & "quotes"';
      expect(InputSanitizer.escapeHtml(malicious)).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quotes&quot;'
      );
    });

    it('should neutralize CSV Formula Injection (DDE attacks) in InputSanitizer.sanitizeCsvCell', () => {
      expect(InputSanitizer.sanitizeCsvCell('=cmd|\'/C calc\'!A0')).toBe('"\'=cmd|\'/C calc\'!A0"');
      expect(InputSanitizer.sanitizeCsvCell('+SUM(A1:A10)')).toBe('"\'+SUM(A1:A10)"');
      expect(InputSanitizer.sanitizeCsvCell('@IMPORTXML()')).toBe('"\'@IMPORTXML()"');
      expect(InputSanitizer.sanitizeCsvCell('ATW')).toBe('ATW');
      expect(InputSanitizer.sanitizeCsvCell(450.5)).toBe('450.5');
    });
  });

  describe('calculateHoldings', () => {
    it('should calculate PMP correctly with multiple buys', () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          symbol: 'IAM',
          quantity: 100,
          buy_price: 100,
          buy_date: '2024-01-01',
          type: 'BUY',
          is_virtual: false,
          user_id: 'u1',
          created_at: ''
        },
        {
          id: '2',
          symbol: 'IAM',
          quantity: 100,
          buy_price: 120,
          buy_date: '2024-02-01',
          type: 'BUY',
          is_virtual: false,
          user_id: 'u1',
          created_at: ''
        }
      ];

      const holdings = PortfolioService.calculateHoldings(transactions);
      
      expect(holdings).toHaveLength(1);
      expect(holdings[0].totalQuantity).toBe(200);
      // PMP = (100*100*1.0099 + 100*120*1.0099) / 200 = 111.089
      expect(holdings[0].weightedAveragePrice).toBeCloseTo(111.089, 2);
    });
  });
});
