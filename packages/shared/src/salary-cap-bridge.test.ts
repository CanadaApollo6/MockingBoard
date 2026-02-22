import { describe, it, expect } from 'vitest';
import type { PlayerContract } from './types';
import { fromDisplayContract } from './salary-cap-bridge';

function makeDisplayContract(
  overrides: Partial<PlayerContract> = {},
): PlayerContract {
  return {
    player: 'Patrick Mahomes',
    baseSalary: 1_250_000,
    proratedBonus: 12_600_000,
    signingBonus: 63_000_000,
    optionBonus: 0,
    rosterBonus: 1_250_000,
    rosterBonusRegular: 1_250_000,
    rosterBonusPerGame: 0,
    workoutBonus: 250_000,
    otherBonus: 0,
    guaranteedSalary: 0,
    capNumber: 15_350_000,
    deadMoney: {
      cutPreJune1: 60_000_000,
      cutPostJune1: 12_600_000,
      tradePreJune1: 60_000_000,
      tradePostJune1: 12_600_000,
    },
    capSavings: {
      cutPreJune1: -44_650_000,
      cutPostJune1: 2_750_000,
      tradePreJune1: -44_650_000,
      tradePostJune1: 2_750_000,
    },
    restructureSavings: 0,
    extensionSavings: 0,
    ...overrides,
  };
}

describe('fromDisplayContract', () => {
  it('maps all fields correctly', () => {
    const display = makeDisplayContract();
    const cap = fromDisplayContract(display, 'KC', 'QB', 2025);

    expect(cap.playerId).toBe('Patrick Mahomes');
    expect(cap.playerName).toBe('Patrick Mahomes');
    expect(cap.team).toBe('KC');
    expect(cap.position).toBe('QB');
    expect(cap.totalSigningBonus).toBe(63_000_000);
    expect(cap.isRookieContract).toBe(false);
    expect(cap.years).toHaveLength(1);
  });

  it('creates a single-year contract', () => {
    const display = makeDisplayContract();
    const cap = fromDisplayContract(display, 'KC', 'QB', 2025);

    expect(cap.startYear).toBe(2025);
    expect(cap.endYear).toBe(2025);
    expect(cap.signingBonusYearsRemaining).toBe(1);
  });

  it('maps contract year components', () => {
    const display = makeDisplayContract();
    const cap = fromDisplayContract(display, 'KC', 'QB', 2025);
    const year = cap.years[0];

    expect(year.year).toBe(2025);
    expect(year.baseSalary).toBe(1_250_000);
    expect(year.signingBonusProration).toBe(12_600_000);
    expect(year.rosterBonus).toBe(1_250_000);
    expect(year.workoutBonus).toBe(250_000);
    expect(year.optionBonus).toBe(0);
    expect(year.otherBonus).toBe(0);
    expect(year.incentives).toEqual([]);
  });

  it('sets guaranteed flag from guaranteedSalary', () => {
    const withGuarantee = makeDisplayContract({ guaranteedSalary: 5_000_000 });
    const capG = fromDisplayContract(withGuarantee, 'KC', 'QB', 2025);
    expect(capG.years[0].isGuaranteed).toBe(true);
    expect(capG.years[0].guaranteedSalary).toBe(5_000_000);

    const noGuarantee = makeDisplayContract({ guaranteedSalary: 0 });
    const capN = fromDisplayContract(noGuarantee, 'KC', 'QB', 2025);
    expect(capN.years[0].isGuaranteed).toBe(false);
  });
});
