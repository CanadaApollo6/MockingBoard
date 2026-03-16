import { describe, it, expect } from 'vitest';
import type { Incentive } from './salary-cap-types';
import {
  classifyIncentive,
  calculateIncentiveNetting,
} from './salary-cap-incentives';

function makeIncentive(overrides: Partial<Incentive> = {}): Incentive {
  return {
    description: 'Test incentive',
    amount: 500_000,
    classification: 'LTBE',
    ...overrides,
  };
}

describe('classifyIncentive', () => {
  it('classifies year-1 rookie incentives as LTBE', () => {
    expect(classifyIncentive(false, true, false, false)).toBe('LTBE');
  });

  it('classifies workout/weight bonuses as LTBE', () => {
    expect(classifyIncentive(false, false, true, false)).toBe('LTBE');
  });

  it('classifies per-game roster bonuses as LTBE', () => {
    expect(classifyIncentive(false, false, false, true)).toBe('LTBE');
  });

  it('classifies met-prior-year incentives as LTBE', () => {
    expect(classifyIncentive(true, false, false, false)).toBe('LTBE');
  });

  it('classifies unmet non-special incentives as NLTBE', () => {
    expect(classifyIncentive(false, false, false, false)).toBe('NLTBE');
  });

  it('rookie year takes priority over other flags', () => {
    // Even if metPriorYear is false, rookie year 1 is LTBE
    expect(classifyIncentive(false, true, false, false)).toBe('LTBE');
  });
});

describe('calculateIncentiveNetting', () => {
  it('credits unearned LTBE back to team (negative adjustment)', () => {
    const incentives = [
      makeIncentive({ classification: 'LTBE', amount: 500_000, earned: false }),
    ];
    const result = calculateIncentiveNetting(incentives);

    expect(result.unearnedLtbe).toBe(500_000);
    expect(result.nextYearAdjustment).toBe(-500_000); // Credit
  });

  it('charges earned NLTBE to team (positive adjustment)', () => {
    const incentives = [
      makeIncentive({
        classification: 'NLTBE',
        amount: 1_000_000,
        earned: true,
      }),
    ];
    const result = calculateIncentiveNetting(incentives);

    expect(result.earnedNltbe).toBe(1_000_000);
    expect(result.nextYearAdjustment).toBe(1_000_000); // Charge
  });

  it('no adjustment for earned LTBE (already counted)', () => {
    const incentives = [
      makeIncentive({ classification: 'LTBE', amount: 500_000, earned: true }),
    ];
    const result = calculateIncentiveNetting(incentives);

    expect(result.earnedLtbe).toBe(500_000);
    expect(result.nextYearAdjustment).toBe(0);
  });

  it('no adjustment for unearned NLTBE (already not counted)', () => {
    const incentives = [
      makeIncentive({
        classification: 'NLTBE',
        amount: 1_000_000,
        earned: false,
      }),
    ];
    const result = calculateIncentiveNetting(incentives);

    expect(result.unearnedNltbe).toBe(1_000_000);
    expect(result.nextYearAdjustment).toBe(0);
  });

  it('nets multiple incentives correctly', () => {
    const incentives = [
      makeIncentive({ classification: 'LTBE', amount: 500_000, earned: true }), // no adj
      makeIncentive({ classification: 'LTBE', amount: 300_000, earned: false }), // -300K
      makeIncentive({
        classification: 'NLTBE',
        amount: 1_000_000,
        earned: true,
      }), // +1M
      makeIncentive({
        classification: 'NLTBE',
        amount: 200_000,
        earned: false,
      }), // no adj
    ];
    const result = calculateIncentiveNetting(incentives);

    expect(result.earnedLtbe).toBe(500_000);
    expect(result.unearnedLtbe).toBe(300_000);
    expect(result.earnedNltbe).toBe(1_000_000);
    expect(result.unearnedNltbe).toBe(200_000);
    expect(result.nextYearAdjustment).toBe(700_000); // +1M - 300K
  });

  it('handles empty incentive list', () => {
    const result = calculateIncentiveNetting([]);
    expect(result.nextYearAdjustment).toBe(0);
    expect(result.earnedLtbe).toBe(0);
    expect(result.unearnedLtbe).toBe(0);
    expect(result.earnedNltbe).toBe(0);
    expect(result.unearnedNltbe).toBe(0);
  });

  it('treats undefined earned as false', () => {
    const incentives = [
      makeIncentive({
        classification: 'LTBE',
        amount: 500_000,
        earned: undefined,
      }),
    ];
    const result = calculateIncentiveNetting(incentives);

    // undefined earned → false → unearned LTBE → credit
    expect(result.unearnedLtbe).toBe(500_000);
    expect(result.nextYearAdjustment).toBe(-500_000);
  });
});
