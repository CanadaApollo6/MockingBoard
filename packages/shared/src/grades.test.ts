import { describe, it, expect } from 'vitest';
import {
  GRADE_SYSTEMS,
  getGradeDisplay,
  getGradeOptions,
  nflGradeToInternal,
  internalToNflGrade,
} from './grades';
import type { GradeSystem } from './types';

describe('GRADE_SYSTEMS', () => {
  it('contains all four systems', () => {
    const ids = GRADE_SYSTEMS.map((s) => s.id);
    expect(ids).toEqual(['tier', 'nfl', 'letter', 'projection']);
  });
});

describe('getGradeDisplay', () => {
  it('returns correct tier label for boundary values', () => {
    expect(getGradeDisplay(95, 'tier').shortLabel).toBe('Elite');
    expect(getGradeDisplay(90, 'tier').shortLabel).toBe('Elite');
    expect(getGradeDisplay(89, 'tier').shortLabel).toBe('Pro Bowl');
    expect(getGradeDisplay(0, 'tier').shortLabel).toBe('PS');
  });

  it('returns correct NFL label for boundary values', () => {
    expect(getGradeDisplay(95, 'nfl').shortLabel).toBe('8.0');
    expect(getGradeDisplay(88, 'nfl').shortLabel).toBe('7.5');
    expect(getGradeDisplay(87, 'nfl').shortLabel).toBe('7.0');
    expect(getGradeDisplay(0, 'nfl').shortLabel).toBe('5.5');
  });

  it('returns correct letter grade for boundary values', () => {
    expect(getGradeDisplay(100, 'letter').shortLabel).toBe('A+');
    expect(getGradeDisplay(97, 'letter').shortLabel).toBe('A+');
    expect(getGradeDisplay(96, 'letter').shortLabel).toBe('A');
    expect(getGradeDisplay(59, 'letter').shortLabel).toBe('F');
    expect(getGradeDisplay(0, 'letter').shortLabel).toBe('F');
  });

  it('returns correct projection for boundary values', () => {
    expect(getGradeDisplay(92, 'projection').shortLabel).toBe('Top 5');
    expect(getGradeDisplay(91, 'projection').shortLabel).toBe('Top 15');
    expect(getGradeDisplay(0, 'projection').shortLabel).toBe('UDFA');
  });
});

describe('getGradeOptions', () => {
  const systems: GradeSystem[] = ['tier', 'nfl', 'letter', 'projection'];

  it('returns expected option counts', () => {
    expect(getGradeOptions('tier')).toHaveLength(7);
    expect(getGradeOptions('nfl')).toHaveLength(13);
    expect(getGradeOptions('letter')).toHaveLength(13);
    expect(getGradeOptions('projection')).toHaveLength(8);
  });

  it.each(systems)('%s covers full 0-100 range', (system) => {
    const options = getGradeOptions(system);
    for (const grade of [0, 25, 50, 75, 100]) {
      const display = getGradeDisplay(grade, system);
      expect(display.label).toBeTruthy();
    }
    // Every option value should round-trip to a valid display
    for (const opt of options) {
      const display = getGradeDisplay(opt.value, system);
      expect(display.shortLabel).toBe(opt.shortLabel);
    }
  });
});

describe('NFL grade conversions', () => {
  it('round-trips NFL → internal → NFL preserving tier', () => {
    const nflValues = [
      8.0, 7.5, 7.0, 6.8, 6.5, 6.4, 6.3, 6.2, 6.1, 6.0, 5.9, 5.6, 5.5,
    ];
    for (const nfl of nflValues) {
      const internal = nflGradeToInternal(nfl);
      const back = internalToNflGrade(internal);
      expect(back).toBe(nfl);
    }
  });

  it('maps 8.0 to a high internal value', () => {
    expect(nflGradeToInternal(8.0)).toBeGreaterThanOrEqual(95);
  });

  it('maps 5.5 to a low internal value', () => {
    expect(nflGradeToInternal(5.5)).toBeLessThanOrEqual(19);
  });
});
