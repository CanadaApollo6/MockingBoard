import {
  getPickValue,
  getFuturePickValue,
  getPickRound,
  evaluateTradeValue,
} from './tradeValues';

describe('tradeValues', () => {
  describe('getPickValue', () => {
    it('returns 1000 for pick #1', () => {
      expect(getPickValue(1)).toBe(1000);
    });

    it('returns correct value for pick #32', () => {
      expect(getPickValue(32)).toBe(184.3);
    });

    it('returns correct value for pick #64', () => {
      expect(getPickValue(64)).toBe(79.69);
    });

    it('returns correct value for pick #256', () => {
      expect(getPickValue(256)).toBe(1.12);
    });

    it('returns 0 for invalid pick numbers', () => {
      expect(getPickValue(0)).toBe(0);
      expect(getPickValue(-1)).toBe(0);
      expect(getPickValue(257)).toBe(0);
    });

    it('values decrease monotonically', () => {
      for (let i = 1; i < 256; i++) {
        expect(getPickValue(i)).toBeGreaterThan(getPickValue(i + 1));
      }
    });
  });

  describe('getPickRound', () => {
    it('returns 1 for picks 1-32', () => {
      expect(getPickRound(1)).toBe(1);
      expect(getPickRound(16)).toBe(1);
      expect(getPickRound(32)).toBe(1);
    });

    it('returns 2 for picks 33-64', () => {
      expect(getPickRound(33)).toBe(2);
      expect(getPickRound(48)).toBe(2);
      expect(getPickRound(64)).toBe(2);
    });

    it('returns 7 for picks 193-224', () => {
      expect(getPickRound(193)).toBe(7);
      expect(getPickRound(224)).toBe(7);
    });
  });

  describe('getFuturePickValue', () => {
    it('applies 32-pick penalty per year out', () => {
      // A 1st round pick (mid-round = pick 16) 1 year out
      // effective_pick = 16 + 32 = 48
      const futureFirst = getFuturePickValue(1, 1);
      const pick48Value = getPickValue(48);
      expect(futureFirst).toBe(pick48Value);
    });

    it('applies 64-pick penalty for 2 years out', () => {
      // A 1st round pick 2 years out
      // effective_pick = 16 + 64 = 80
      const futureFirst = getFuturePickValue(1, 2);
      const pick80Value = getPickValue(80);
      expect(futureFirst).toBe(pick80Value);
    });

    it('caps at pick 256', () => {
      // A 7th round pick 3 years out would exceed 256
      // effective_pick = (7-1)*32 + 16 + 96 = 208 + 96 = 304 -> capped at 256
      const futureSeventh = getFuturePickValue(7, 3);
      const pick256Value = getPickValue(256);
      expect(futureSeventh).toBe(pick256Value);
    });
  });

  describe('evaluateTradeValue', () => {
    it('calculates net value correctly', () => {
      const result = evaluateTradeValue([1], [32]);
      expect(result.givingTotal).toBe(1000);
      expect(result.receivingTotal).toBe(184.3);
      expect(result.net).toBeLessThan(0); // User is getting less value
    });

    it('marks trade as fair when receiving value matches giving value', () => {
      // User gives pick 32 (184.3), receives pick 1 (1000)
      // Fairness check: 1000 >= 184.3 * 0.95 = 175.08 -> true (user is getting great value)
      const result = evaluateTradeValue([32], [1]);
      expect(result.isFair).toBe(true);
    });

    it('marks trade as unfair when receiving much less than giving', () => {
      // User gives pick 1 (1000), receives pick 64 (79.69)
      // Fairness check: 79.69 >= 1000 * 0.95 = 950 -> false (user is losing value)
      const result = evaluateTradeValue([1], [64]);
      expect(result.isFair).toBe(false);
    });

    it('applies Round 1 premium when acquiring first round pick', () => {
      const withPremium = evaluateTradeValue([33, 65], [15], true);
      const withoutPremium = evaluateTradeValue([33, 65], [15], false);

      expect(withPremium.premium).toBe(45);
      expect(withoutPremium.premium).toBe(0);
      // Premium is added to the giving side (cost of acquiring R1)
      // So the "adjusted" giving = givingTotal + premium
      // net = receiving - (giving + premium)
      expect(withPremium.net).toBe(withoutPremium.net - 45);
    });

    it('handles multi-pick trades', () => {
      // User gives picks 10 and 42, receives pick 1
      const result = evaluateTradeValue([10, 42], [1]);
      expect(result.givingTotal).toBeCloseTo(369.09 + 141.82, 2);
      expect(result.receivingTotal).toBe(1000);
    });
  });
});
