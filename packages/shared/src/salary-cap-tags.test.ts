import { describe, it, expect } from 'vitest';
import { calculateTag } from './salary-cap-tags';
import type { PositionSalaryData } from './salary-cap-types';

function makePositionData(
  overrides: Partial<PositionSalaryData> = {},
): PositionSalaryData {
  return {
    position: 'WR',
    // 10 salaries for transition tag calculation
    topSalaries: [
      30_000_000, 28_000_000, 26_000_000, 24_000_000, 22_000_000, 20_000_000,
      18_000_000, 16_000_000, 14_000_000, 12_000_000,
    ],
    ...overrides,
  };
}

describe('calculateTag', () => {
  describe('franchise-nonexclusive', () => {
    it('averages top 5 salaries', () => {
      const data = makePositionData();
      const result = calculateTag('franchise-nonexclusive', data, 0, 0);

      // Avg of 30M + 28M + 26M + 24M + 22M = 130M / 5 = 26M
      expect(result.amount).toBe(26_000_000);
      expect(result.tagType).toBe('franchise-nonexclusive');
      expect(result.isConsecutiveTag).toBe(false);
      expect(result.consecutiveYears).toBe(1);
    });
  });

  describe('franchise-exclusive', () => {
    it('averages top 5 salaries', () => {
      const data = makePositionData();
      const result = calculateTag('franchise-exclusive', data, 0, 0);

      expect(result.amount).toBe(26_000_000);
    });
  });

  describe('transition', () => {
    it('averages top 10 salaries', () => {
      const data = makePositionData();
      const result = calculateTag('transition', data, 0, 0);

      // Avg of all 10: 210M / 10 = 21M
      expect(result.amount).toBe(21_000_000);
    });

    it('handles fewer than 10 salaries', () => {
      const data = makePositionData({
        topSalaries: [30_000_000, 25_000_000, 20_000_000],
      });
      const result = calculateTag('transition', data, 0, 0);

      // Only 3 available, averages those: 75M / 3 = 25M
      expect(result.amount).toBe(25_000_000);
    });
  });

  describe('consecutive-year escalators', () => {
    it('applies 120% escalator for 2nd consecutive tag', () => {
      const data = makePositionData();
      const priorTag = 26_000_000;
      const result = calculateTag('franchise-nonexclusive', data, priorTag, 1);

      // 120% of $26M = $31.2M, which is higher than position avg ($26M)
      expect(result.amount).toBe(31_200_000);
      expect(result.isConsecutiveTag).toBe(true);
      expect(result.consecutiveYears).toBe(2);
    });

    it('applies 144% escalator for 3rd consecutive tag', () => {
      const data = makePositionData();
      const priorTag = 31_200_000;
      const result = calculateTag('franchise-nonexclusive', data, priorTag, 2);

      // 144% of $31.2M = $44,928,000
      expect(result.amount).toBe(44_928_000);
      expect(result.consecutiveYears).toBe(3);
    });

    it('uses position average if higher than escalated amount', () => {
      const data = makePositionData({
        topSalaries: [
          50_000_000, 48_000_000, 46_000_000, 44_000_000, 42_000_000,
        ],
      });
      const priorTag = 20_000_000;
      const result = calculateTag('franchise-nonexclusive', data, priorTag, 1);

      // 120% of $20M = $24M, but position avg is $46M → use $46M
      expect(result.amount).toBe(46_000_000);
    });

    it('first tag has no escalator', () => {
      const data = makePositionData();
      const result = calculateTag('franchise-nonexclusive', data, 0, 0);

      expect(result.isConsecutiveTag).toBe(false);
      expect(result.consecutiveYears).toBe(1);
    });
  });

  it('handles empty salary list', () => {
    const data = makePositionData({ topSalaries: [] });
    const result = calculateTag('franchise-nonexclusive', data, 0, 0);

    expect(result.amount).toBe(0);
  });
});
