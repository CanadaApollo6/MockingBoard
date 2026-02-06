/// <reference types="vitest/globals" />
import {
  formatHeight,
  formatMeasurement,
  buildCombineMetrics,
  formatStatValue,
  YEAR_LABELS,
  UNRANKED,
  KEY_STATS,
} from './player-utils.js';

describe('player-utils', () => {
  describe('formatHeight', () => {
    it('formats 72 inches as 6\'0"', () => {
      expect(formatHeight(72)).toBe('6\'0"');
    });

    it('formats 73 inches as 6\'1"', () => {
      expect(formatHeight(73)).toBe('6\'1"');
    });

    it('formats 77 inches as 6\'5"', () => {
      expect(formatHeight(77)).toBe('6\'5"');
    });

    it('formats 60 inches as 5\'0"', () => {
      expect(formatHeight(60)).toBe('5\'0"');
    });

    it('formats 69 inches as 5\'9"', () => {
      expect(formatHeight(69)).toBe('5\'9"');
    });

    it('rounds fractional inches', () => {
      expect(formatHeight(72.6)).toBe('6\'1"'); // rounds 72.6 → 73
      expect(formatHeight(72.4)).toBe('6\'0"'); // rounds 72.4 → 72
    });

    it('handles small values', () => {
      expect(formatHeight(12)).toBe('1\'0"');
      expect(formatHeight(11)).toBe('0\'11"');
    });
  });

  describe('formatMeasurement', () => {
    it('formats whole number with no fraction', () => {
      expect(formatMeasurement(32)).toBe('32"');
    });

    it('formats ⅛ fraction', () => {
      expect(formatMeasurement(32.125)).toBe('32⅛"');
    });

    it('formats ¼ fraction', () => {
      expect(formatMeasurement(32.25)).toBe('32¼"');
    });

    it('formats ⅜ fraction', () => {
      expect(formatMeasurement(32.375)).toBe('32⅜"');
    });

    it('formats ½ fraction', () => {
      expect(formatMeasurement(32.5)).toBe('32½"');
    });

    it('formats ⅝ fraction', () => {
      expect(formatMeasurement(32.625)).toBe('32⅝"');
    });

    it('formats ¾ fraction', () => {
      expect(formatMeasurement(32.75)).toBe('32¾"');
    });

    it('formats ⅞ fraction', () => {
      expect(formatMeasurement(32.875)).toBe('32⅞"');
    });

    it('rounds up values near 1.0', () => {
      expect(formatMeasurement(32.95)).toBe('33"');
    });

    it('treats very small fractions as whole number', () => {
      expect(formatMeasurement(32.03)).toBe('32"');
    });

    it('handles boundary between ⅛ and ¼', () => {
      // 0.1875 boundary: < 0.1875 = ⅛, >= 0.1875 = ¼
      expect(formatMeasurement(32.18)).toBe('32⅛"');
      expect(formatMeasurement(32.19)).toBe('32¼"');
    });
  });

  describe('buildCombineMetrics', () => {
    it('returns empty array when attributes is undefined', () => {
      expect(buildCombineMetrics(undefined)).toEqual([]);
    });

    it('returns empty array when no combine metrics present', () => {
      const attrs = { conference: 'SEC' };
      expect(buildCombineMetrics(attrs)).toEqual([]);
    });

    it('builds 40-yard metric', () => {
      const attrs = { conference: 'SEC', fortyYard: 4.38 };
      const metrics = buildCombineMetrics(attrs);
      expect(metrics).toEqual([{ label: '40-Yard', value: '4.38' }]);
    });

    it('builds vertical metric', () => {
      const attrs = { conference: 'SEC', vertical: 36 };
      const metrics = buildCombineMetrics(attrs);
      expect(metrics).toEqual([{ label: 'Vertical', value: '36"' }]);
    });

    it('builds bench metric', () => {
      const attrs = { conference: 'SEC', bench: 22 };
      const metrics = buildCombineMetrics(attrs);
      expect(metrics).toEqual([{ label: 'Bench', value: '22' }]);
    });

    it('builds broad jump metric', () => {
      const attrs = { conference: 'SEC', broad: 120 };
      const metrics = buildCombineMetrics(attrs);
      expect(metrics).toEqual([{ label: 'Broad', value: '120"' }]);
    });

    it('builds 3-cone metric', () => {
      const attrs = { conference: 'SEC', cone: 6.85 };
      const metrics = buildCombineMetrics(attrs);
      expect(metrics).toEqual([{ label: '3-Cone', value: '6.85' }]);
    });

    it('builds shuttle metric', () => {
      const attrs = { conference: 'SEC', shuttle: 4.15 };
      const metrics = buildCombineMetrics(attrs);
      expect(metrics).toEqual([{ label: 'Shuttle', value: '4.15' }]);
    });

    it('builds all metrics in correct order', () => {
      const attrs = {
        conference: 'Big Ten',
        fortyYard: 4.45,
        vertical: 38,
        bench: 25,
        broad: 124,
        cone: 7.01,
        shuttle: 4.22,
      };
      const metrics = buildCombineMetrics(attrs);
      expect(metrics).toHaveLength(6);
      expect(metrics[0].label).toBe('40-Yard');
      expect(metrics[1].label).toBe('Vertical');
      expect(metrics[2].label).toBe('Bench');
      expect(metrics[3].label).toBe('Broad');
      expect(metrics[4].label).toBe('3-Cone');
      expect(metrics[5].label).toBe('Shuttle');
    });

    it('skips metrics with value 0', () => {
      const attrs = { conference: 'SEC', fortyYard: 0, vertical: 36 };
      const metrics = buildCombineMetrics(attrs);
      expect(metrics).toEqual([{ label: 'Vertical', value: '36"' }]);
    });

    it('formats 40-yard to 2 decimal places', () => {
      const attrs = { conference: 'SEC', fortyYard: 4.4 };
      const metrics = buildCombineMetrics(attrs);
      expect(metrics[0].value).toBe('4.40');
    });
  });

  describe('formatStatValue', () => {
    it('returns empty string for null', () => {
      expect(formatStatValue(null)).toBe('');
    });

    it('returns string values as-is', () => {
      expect(formatStatValue('N/A')).toBe('N/A');
      expect(formatStatValue('Elite')).toBe('Elite');
    });

    it('formats integers without decimals', () => {
      expect(formatStatValue(42)).toBe('42');
      expect(formatStatValue(0)).toBe('0');
      expect(formatStatValue(100)).toBe('100');
    });

    it('formats floats to 1 decimal place', () => {
      expect(formatStatValue(4.5)).toBe('4.5');
      expect(formatStatValue(92.3)).toBe('92.3');
      expect(formatStatValue(0.7)).toBe('0.7');
    });

    it('rounds floats to 1 decimal', () => {
      // Note: JS toFixed uses banker's rounding, so 92.35 → '92.3' (IEEE 754)
      expect(formatStatValue(92.35)).toBe('92.3');
      expect(formatStatValue(4.449)).toBe('4.4');
      expect(formatStatValue(4.451)).toBe('4.5');
    });

    it('formats negative numbers', () => {
      expect(formatStatValue(-2.5)).toBe('-2.5');
      expect(formatStatValue(-3)).toBe('-3');
    });
  });

  describe('constants', () => {
    it('UNRANKED is 9999', () => {
      expect(UNRANKED).toBe(9999);
    });

    it('YEAR_LABELS has entries for all class years', () => {
      expect(YEAR_LABELS['FR']).toBe('Freshman');
      expect(YEAR_LABELS['SO']).toBe('Sophomore');
      expect(YEAR_LABELS['JR']).toBe('Junior');
      expect(YEAR_LABELS['SR']).toBe('Senior');
      expect(YEAR_LABELS['RS-FR']).toBe('RS-Freshman');
      expect(YEAR_LABELS['RS-SO']).toBe('RS-Sophomore');
      expect(YEAR_LABELS['RS-JR']).toBe('RS-Junior');
      expect(YEAR_LABELS['RS-SR']).toBe('RS-Senior');
    });

    it('KEY_STATS covers all major position groups', () => {
      const positions = Object.keys(KEY_STATS);
      expect(positions).toContain('QB');
      expect(positions).toContain('WR');
      expect(positions).toContain('RB');
      expect(positions).toContain('TE');
      expect(positions).toContain('OT');
      expect(positions).toContain('OG');
      expect(positions).toContain('EDGE');
      expect(positions).toContain('DL');
      expect(positions).toContain('LB');
      expect(positions).toContain('CB');
      expect(positions).toContain('S');
    });

    it('each position has 6 stat definitions', () => {
      for (const [, stats] of Object.entries(KEY_STATS)) {
        expect(stats).toHaveLength(6);
      }
    });

    it('each stat has key and label', () => {
      for (const [, stats] of Object.entries(KEY_STATS)) {
        for (const stat of stats!) {
          expect(stat.key).toBeTruthy();
          expect(stat.label).toBeTruthy();
        }
      }
    });
  });
});
