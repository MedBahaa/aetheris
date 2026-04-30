import { describe, it, expect } from 'vitest';
import { PortfolioService } from '../lib/portfolio-service';
import { PortfolioTransaction, DividendTransaction } from '../lib/schemas';

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
          user_id: 'u1',
          created_at: ''
        }
      ];

      // At 2024-02-01, quantity was 100 (50 bought later)
      const result = PortfolioService.calculateDividendIncome(dividends, [], transactions);
      
      expect(result['IAM']).toBe(500); // 100 shares * 5 MAD
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
          user_id: 'u1',
          created_at: ''
        }
      ];

      // At 2024-02-01, quantity was 70 (100 - 30)
      const result = PortfolioService.calculateDividendIncome(dividends, [], transactions);
      
      expect(result['BCP']).toBe(700); // 70 shares * 10 MAD
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
