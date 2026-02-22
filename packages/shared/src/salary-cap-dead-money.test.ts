import { describe, it, expect } from 'vitest';
import type { CapContract, ContractYear } from './salary-cap-types';
import {
  calculateDeadMoney,
  calculateTradeDeadMoney,
} from './salary-cap-dead-money';

function makeContractYear(overrides: Partial<ContractYear> = {}): ContractYear {
  return {
    year: 2025,
    baseSalary: 1_000_000,
    signingBonusProration: 2_000_000,
    rosterBonus: 0,
    optionBonus: 0,
    workoutBonus: 0,
    otherBonus: 0,
    incentives: [],
    isVoidYear: false,
    isGuaranteed: false,
    guaranteedSalary: 0,
    ...overrides,
  };
}

function makeContract(overrides: Partial<CapContract> = {}): CapContract {
  return {
    playerId: 'player-1',
    playerName: 'Test Player',
    team: 'DEN',
    position: 'QB',
    totalSigningBonus: 10_000_000,
    signingBonusYearsRemaining: 5,
    years: [
      makeContractYear({
        year: 2025,
        baseSalary: 5_000_000,
        signingBonusProration: 2_000_000,
      }),
      makeContractYear({
        year: 2026,
        baseSalary: 10_000_000,
        signingBonusProration: 2_000_000,
      }),
      makeContractYear({
        year: 2027,
        baseSalary: 15_000_000,
        signingBonusProration: 2_000_000,
      }),
    ],
    startYear: 2025,
    endYear: 2027,
    isRookieContract: false,
    ...overrides,
  };
}

describe('calculateDeadMoney', () => {
  describe('pre-June 1', () => {
    it('accelerates all future proration into current year', () => {
      const contract = makeContract();
      const result = calculateDeadMoney(contract, 2025, 'pre-june-1');

      // Current year proration ($2M) + future proration (2026: $2M + 2027: $2M) = $6M
      expect(result.currentYearDeadMoney).toBe(6_000_000);
      expect(result.nextYearDeadMoney).toBe(0);
    });

    it('calculates cap savings as hit minus dead money', () => {
      const contract = makeContract();
      const result = calculateDeadMoney(contract, 2025, 'pre-june-1');

      // Current year hit was $7M (5M base + 2M proration), dead money is $6M
      expect(result.currentYearCapSavings).toBe(7_000_000 - 6_000_000);
    });

    it('includes future year savings from eliminated cap hits', () => {
      const contract = makeContract();
      const result = calculateDeadMoney(contract, 2025, 'pre-june-1');

      // Future cap hits: 2026 ($12M) + 2027 ($17M) = $29M saved
      expect(result.nextYearCapSavings).toBe(29_000_000);
    });

    it('handles contract with no future years', () => {
      const contract = makeContract({
        years: [makeContractYear({ year: 2025 })],
        endYear: 2025,
      });
      const result = calculateDeadMoney(contract, 2025, 'pre-june-1');

      expect(result.currentYearDeadMoney).toBe(2_000_000);
      expect(result.nextYearDeadMoney).toBe(0);
      expect(result.nextYearCapSavings).toBe(0);
    });
  });

  describe('post-June 1', () => {
    it('splits proration between current and next year', () => {
      const contract = makeContract();
      const result = calculateDeadMoney(contract, 2025, 'post-june-1');

      // Current year: just this year's proration ($2M)
      expect(result.currentYearDeadMoney).toBe(2_000_000);
      // Next year: future proration ($2M + $2M = $4M)
      expect(result.nextYearDeadMoney).toBe(4_000_000);
    });

    it('calculates current year savings correctly', () => {
      const contract = makeContract();
      const result = calculateDeadMoney(contract, 2025, 'post-june-1');

      // Current year hit was $7M, dead money is $2M
      expect(result.currentYearCapSavings).toBe(5_000_000);
    });

    it('calculates next year savings accounting for dead money', () => {
      const contract = makeContract();
      const result = calculateDeadMoney(contract, 2025, 'post-june-1');

      // Future cap hits: $29M, minus $4M dead money = $25M savings
      expect(result.nextYearCapSavings).toBe(25_000_000);
    });
  });

  it('returns zeros when year is not in contract', () => {
    const contract = makeContract();
    const result = calculateDeadMoney(contract, 2030, 'pre-june-1');

    expect(result.currentYearDeadMoney).toBe(0);
    expect(result.nextYearDeadMoney).toBe(0);
    expect(result.currentYearCapSavings).toBe(0);
    expect(result.nextYearCapSavings).toBe(0);
  });

  // Real-world inspired: large dead money acceleration
  it('handles large signing bonus acceleration', () => {
    const contract = makeContract({
      years: [
        makeContractYear({
          year: 2025,
          baseSalary: 17_000_000,
          signingBonusProration: 13_000_000,
        }),
        makeContractYear({
          year: 2026,
          baseSalary: 20_000_000,
          signingBonusProration: 13_000_000,
        }),
        makeContractYear({
          year: 2027,
          baseSalary: 25_000_000,
          signingBonusProration: 13_000_000,
        }),
        makeContractYear({
          year: 2028,
          baseSalary: 30_000_000,
          signingBonusProration: 13_000_000,
        }),
      ],
      totalSigningBonus: 65_000_000,
    });

    const result = calculateDeadMoney(contract, 2025, 'pre-june-1');

    // All proration: $13M × 4 = $52M dead money
    expect(result.currentYearDeadMoney).toBe(52_000_000);
  });
});

describe('calculateTradeDeadMoney', () => {
  it('charges only signing bonus proration to original team (pre-June 1)', () => {
    const contract = makeContract();
    const result = calculateTradeDeadMoney(contract, 2025, 'pre-june-1');

    // All remaining proration accelerates: $2M + $2M + $2M = $6M
    expect(result.currentYearDeadMoney).toBe(6_000_000);
    expect(result.nextYearDeadMoney).toBe(0);
  });

  it('splits proration for post-June 1 trade', () => {
    const contract = makeContract();
    const result = calculateTradeDeadMoney(contract, 2025, 'post-june-1');

    expect(result.currentYearDeadMoney).toBe(2_000_000);
    expect(result.nextYearDeadMoney).toBe(4_000_000);
  });

  it('calculates cap savings for original team', () => {
    const contract = makeContract();
    const result = calculateTradeDeadMoney(contract, 2025, 'pre-june-1');

    // Original team cap hit was $7M, dead money $6M → savings $1M
    expect(result.currentYearCapSavings).toBe(1_000_000);
  });

  it('returns zeros for year not in contract', () => {
    const contract = makeContract();
    const result = calculateTradeDeadMoney(contract, 2030, 'pre-june-1');

    expect(result.currentYearDeadMoney).toBe(0);
    expect(result.nextYearDeadMoney).toBe(0);
  });
});
