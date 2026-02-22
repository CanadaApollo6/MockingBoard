import { describe, it, expect } from 'vitest';
import type { CapContract, ContractYear, Incentive } from './salary-cap-types';
import {
  calculateProration,
  calculateCapHit,
  applyVeteranBenefit,
} from './salary-cap-core';

function makeContractYear(overrides: Partial<ContractYear> = {}): ContractYear {
  return {
    year: 2025,
    baseSalary: 1_000_000,
    signingBonusProration: 200_000,
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
    team: 'KC',
    position: 'QB',
    totalSigningBonus: 1_000_000,
    signingBonusYearsRemaining: 5,
    years: [makeContractYear()],
    startYear: 2025,
    endYear: 2029,
    isRookieContract: false,
    ...overrides,
  };
}

describe('calculateProration', () => {
  it('prorates evenly over contract years', () => {
    expect(calculateProration(10_000_000, 5)).toBe(2_000_000);
  });

  it('caps proration at 5 years for longer contracts', () => {
    expect(calculateProration(10_000_000, 8)).toBe(2_000_000);
  });

  it('prorates a 1-year deal entirely into one year', () => {
    expect(calculateProration(5_000_000, 1)).toBe(5_000_000);
  });

  it('prorates a 3-year deal', () => {
    expect(calculateProration(9_000_000, 3)).toBe(3_000_000);
  });

  it('returns 0 for zero bonus', () => {
    expect(calculateProration(0, 5)).toBe(0);
  });

  it('returns 0 for zero years', () => {
    expect(calculateProration(5_000_000, 0)).toBe(0);
  });

  it('returns 0 for negative bonus', () => {
    expect(calculateProration(-1_000_000, 5)).toBe(0);
  });

  it('rounds to nearest dollar', () => {
    // 10_000_001 / 3 = 3_333_333.67 → rounds to 3_333_334
    expect(calculateProration(10_000_001, 3)).toBe(3_333_334);
  });

  // Real-world: Mahomes 10-year extension, $63M signing bonus
  // Prorated over max 5 years = $12.6M/year
  it('matches Mahomes signing bonus proration', () => {
    expect(calculateProration(63_000_000, 10)).toBe(12_600_000);
  });
});

describe('calculateCapHit', () => {
  it('sums all components for a standard year', () => {
    const contract = makeContract({
      years: [
        makeContractYear({
          year: 2025,
          baseSalary: 5_000_000,
          signingBonusProration: 2_000_000,
          rosterBonus: 500_000,
          workoutBonus: 100_000,
        }),
      ],
    });

    const hit = calculateCapHit(contract, 2025);
    expect(hit).not.toBeNull();
    expect(hit!.totalCapHit).toBe(7_600_000);
    expect(hit!.baseSalary).toBe(5_000_000);
    expect(hit!.signingBonusProration).toBe(2_000_000);
    expect(hit!.rosterBonus).toBe(500_000);
    expect(hit!.workoutBonus).toBe(100_000);
  });

  it('includes LTBE incentives in cap hit', () => {
    const ltbe: Incentive = {
      description: 'Pro Bowl',
      amount: 500_000,
      classification: 'LTBE',
    };
    const nltbe: Incentive = {
      description: 'All-Pro',
      amount: 1_000_000,
      classification: 'NLTBE',
    };
    const contract = makeContract({
      years: [
        makeContractYear({
          year: 2025,
          baseSalary: 1_000_000,
          signingBonusProration: 200_000,
          incentives: [ltbe, nltbe],
        }),
      ],
    });

    const hit = calculateCapHit(contract, 2025);
    expect(hit!.ltbeIncentives).toBe(500_000);
    // NLTBE should NOT be included
    expect(hit!.totalCapHit).toBe(1_000_000 + 200_000 + 500_000);
  });

  it('returns null for a year not in the contract', () => {
    const contract = makeContract({
      years: [makeContractYear({ year: 2025 })],
    });

    expect(calculateCapHit(contract, 2030)).toBeNull();
  });

  it('handles void year (bonus-only, no base salary)', () => {
    const contract = makeContract({
      years: [
        makeContractYear({
          year: 2025,
          baseSalary: 0,
          signingBonusProration: 3_000_000,
          isVoidYear: true,
        }),
      ],
    });

    const hit = calculateCapHit(contract, 2025);
    expect(hit!.totalCapHit).toBe(3_000_000);
    expect(hit!.baseSalary).toBe(0);
  });

  it('handles a year with all bonus types', () => {
    const contract = makeContract({
      years: [
        makeContractYear({
          year: 2025,
          baseSalary: 10_000_000,
          signingBonusProration: 5_000_000,
          rosterBonus: 2_000_000,
          optionBonus: 1_000_000,
          workoutBonus: 250_000,
          otherBonus: 100_000,
        }),
      ],
    });

    const hit = calculateCapHit(contract, 2025);
    expect(hit!.totalCapHit).toBe(18_350_000);
  });
});

describe('applyVeteranBenefit', () => {
  it('applies benefit for veteran on minimum salary', () => {
    // 6-year vet minimum = $1,175,000, credited at 2-year rate = $985,000
    const result = applyVeteranBenefit(1_175_000, 6);
    expect(result.isEligible).toBe(true);
    expect(result.capCharge).toBe(985_000);
    expect(result.benefitCredit).toBe(190_000);
  });

  it('is not eligible for players at or below credited season threshold', () => {
    // 2-year vet: not eligible (must be ABOVE credited seasons)
    const result = applyVeteranBenefit(985_000, 2);
    expect(result.isEligible).toBe(false);
    expect(result.capCharge).toBe(985_000);
    expect(result.benefitCredit).toBe(0);
  });

  it('is not eligible for players above minimum salary', () => {
    // 6-year vet making more than minimum
    const result = applyVeteranBenefit(5_000_000, 6);
    expect(result.isEligible).toBe(false);
    expect(result.capCharge).toBe(5_000_000);
  });

  it('is not eligible for rookies', () => {
    const result = applyVeteranBenefit(795_000, 0);
    expect(result.isEligible).toBe(false);
  });

  it('applies benefit for 7+ year veteran', () => {
    // 7+ year vet minimum = $1,210,000, credited at 2-year rate = $985,000
    const result = applyVeteranBenefit(1_210_000, 7);
    expect(result.isEligible).toBe(true);
    expect(result.capCharge).toBe(985_000);
    expect(result.benefitCredit).toBe(225_000);
  });

  it('applies benefit for 3-year vet on minimum', () => {
    // 3-year vet minimum = $1,055,000, credited at 2-year rate = $985,000
    const result = applyVeteranBenefit(1_055_000, 3);
    expect(result.isEligible).toBe(true);
    expect(result.capCharge).toBe(985_000);
    expect(result.benefitCredit).toBe(70_000);
  });
});
