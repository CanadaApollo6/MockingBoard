import { describe, it, expect } from 'vitest';
import type { CapContract, ContractYear } from './salary-cap-types';
import {
  calculateRestructure,
  maxRestructureAmount,
} from './salary-cap-restructure';

function makeContractYear(overrides: Partial<ContractYear> = {}): ContractYear {
  return {
    year: 2025,
    baseSalary: 10_000_000,
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
    team: 'DAL',
    position: 'QB',
    totalSigningBonus: 10_000_000,
    signingBonusYearsRemaining: 5,
    years: [
      makeContractYear({ year: 2025, baseSalary: 20_000_000 }),
      makeContractYear({ year: 2026, baseSalary: 25_000_000 }),
      makeContractYear({ year: 2027, baseSalary: 30_000_000 }),
    ],
    startYear: 2025,
    endYear: 2027,
    isRookieContract: false,
    ...overrides,
  };
}

describe('maxRestructureAmount', () => {
  it('returns base salary minus veteran minimum', () => {
    const contract = makeContract();
    // 4 accrued seasons → vet minimum $1,175,000
    const max = maxRestructureAmount(contract, 2025, 4);
    expect(max).toBe(20_000_000 - 1_175_000);
  });

  it('returns 0 for a year not in contract', () => {
    const contract = makeContract();
    expect(maxRestructureAmount(contract, 2030, 4)).toBe(0);
  });

  it('returns 0 when base salary equals minimum', () => {
    const contract = makeContract({
      years: [makeContractYear({ year: 2025, baseSalary: 1_175_000 })],
    });
    expect(maxRestructureAmount(contract, 2025, 4)).toBe(0);
  });

  it('returns 0 when base salary is below minimum', () => {
    const contract = makeContract({
      years: [makeContractYear({ year: 2025, baseSalary: 500_000 })],
    });
    expect(maxRestructureAmount(contract, 2025, 4)).toBe(0);
  });

  it('uses correct minimum for rookie', () => {
    const contract = makeContract({
      years: [makeContractYear({ year: 2025, baseSalary: 5_000_000 })],
    });
    // 0 accrued seasons → vet minimum $795,000
    expect(maxRestructureAmount(contract, 2025, 0)).toBe(5_000_000 - 795_000);
  });
});

describe('calculateRestructure', () => {
  it('converts salary to bonus prorated over remaining years', () => {
    const contract = makeContract();
    const result = calculateRestructure(contract, 2025, 15_000_000);

    expect(result.convertedAmount).toBe(15_000_000);
    expect(result.newBaseSalary).toBe(5_000_000); // 20M - 15M

    // 3 remaining years, 15M / 3 = 5M per year new proration
    expect(result.newProrationPerYear).toBe(5_000_000);
  });

  it('calculates current year savings', () => {
    const contract = makeContract();
    const result = calculateRestructure(contract, 2025, 15_000_000);

    // Savings = converted amount - one year of new proration = 15M - 5M = 10M
    expect(result.currentYearSavings).toBe(10_000_000);
  });

  it('caps proration at 5 years', () => {
    const contract = makeContract({
      years: [
        makeContractYear({ year: 2025, baseSalary: 20_000_000 }),
        makeContractYear({ year: 2026, baseSalary: 25_000_000 }),
        makeContractYear({ year: 2027, baseSalary: 25_000_000 }),
        makeContractYear({ year: 2028, baseSalary: 25_000_000 }),
        makeContractYear({ year: 2029, baseSalary: 25_000_000 }),
        makeContractYear({ year: 2030, baseSalary: 25_000_000 }),
      ],
      endYear: 2030,
    });
    const result = calculateRestructure(contract, 2025, 15_000_000);

    // 6 remaining years but capped at 5: 15M / 5 = 3M per year
    expect(result.newProrationPerYear).toBe(3_000_000);
  });

  it('includes void years in proration window', () => {
    const contract = makeContract({
      years: [
        makeContractYear({ year: 2025, baseSalary: 20_000_000 }),
        makeContractYear({ year: 2026, baseSalary: 0, isVoidYear: true }),
        makeContractYear({ year: 2027, baseSalary: 0, isVoidYear: true }),
      ],
      endYear: 2025,
      voidYearsEnd: 2027,
    });
    const result = calculateRestructure(contract, 2025, 15_000_000);

    // 3 years (including void): 15M / 3 = 5M per year
    expect(result.newProrationPerYear).toBe(5_000_000);
  });

  it('returns updated yearly cap hits', () => {
    const contract = makeContract();
    const result = calculateRestructure(contract, 2025, 15_000_000);

    expect(result.yearlyCapHits).toHaveLength(3);

    // Year 1 (2025): new base 5M + existing proration 2M + new proration 5M = 12M
    expect(result.yearlyCapHits[0].baseSalary).toBe(5_000_000);
    expect(result.yearlyCapHits[0].signingBonusProration).toBe(7_000_000);
    expect(result.yearlyCapHits[0].totalCapHit).toBe(12_000_000);

    // Year 2 (2026): base 25M + existing proration 2M + new proration 5M = 32M
    expect(result.yearlyCapHits[1].baseSalary).toBe(25_000_000);
    expect(result.yearlyCapHits[1].signingBonusProration).toBe(7_000_000);
    expect(result.yearlyCapHits[1].totalCapHit).toBe(32_000_000);
  });

  it('throws for year not in contract', () => {
    const contract = makeContract();
    expect(() => calculateRestructure(contract, 2030, 5_000_000)).toThrow(
      'Contract does not cover year 2030',
    );
  });

  it('throws for amount exceeding base salary', () => {
    const contract = makeContract();
    expect(() => calculateRestructure(contract, 2025, 25_000_000)).toThrow(
      'Cannot convert',
    );
  });

  it('throws for zero or negative amount', () => {
    const contract = makeContract();
    expect(() => calculateRestructure(contract, 2025, 0)).toThrow(
      'must be positive',
    );
    expect(() => calculateRestructure(contract, 2025, -1)).toThrow(
      'must be positive',
    );
  });
});
