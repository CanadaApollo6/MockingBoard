import { describe, it, expect } from 'vitest';
import type {
  CapContract,
  ContractYear,
  DeadCapEntry,
} from './salary-cap-types';
import {
  applyTop51Rule,
  calculateCapRollover,
  calculateTeamCap,
  checkSpendingFloor,
} from './salary-cap-team';

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

describe('applyTop51Rule', () => {
  it('sums only the top 51 cap hits', () => {
    const capHits = Array.from({ length: 53 }, (_, i) => ({
      capHit: (53 - i) * 1_000_000,
      accruedSeasons: 2,
    }));

    const result = applyTop51Rule(capHits);

    // Top 51: sum of 53M down to 3M = 51 * (53 + 3) / 2 = 51 * 28 = 1428M
    const expectedTop51 = Array.from(
      { length: 51 },
      (_, i) => (53 - i) * 1_000_000,
    ).reduce((a, b) => a + b, 0);
    // Excluded: $2M and $1M players, charged excess over minimum ($985K for 2-year vet)
    const excluded1Excess = Math.max(0, 2_000_000 - 985_000);
    const excluded2Excess = Math.max(0, 1_000_000 - 985_000);

    expect(result.top51Total).toBe(
      expectedTop51 + excluded1Excess + excluded2Excess,
    );
    expect(result.excludedPlayers).toBe(2);
  });

  it('handles fewer than 51 players', () => {
    const capHits = [
      { capHit: 10_000_000, accruedSeasons: 4 },
      { capHit: 5_000_000, accruedSeasons: 2 },
    ];

    const result = applyTop51Rule(capHits);
    expect(result.top51Total).toBe(15_000_000);
    expect(result.excludedPlayers).toBe(0);
  });

  it('handles exactly 51 players', () => {
    const capHits = Array.from({ length: 51 }, () => ({
      capHit: 2_000_000,
      accruedSeasons: 3,
    }));

    const result = applyTop51Rule(capHits);
    expect(result.top51Total).toBe(102_000_000);
    expect(result.excludedPlayers).toBe(0);
  });

  it('handles empty roster', () => {
    const result = applyTop51Rule([]);
    expect(result.top51Total).toBe(0);
    expect(result.excludedPlayers).toBe(0);
  });
});

describe('calculateCapRollover', () => {
  it('returns unused cap space', () => {
    expect(calculateCapRollover(272_500_000, 250_000_000)).toBe(22_500_000);
  });

  it('returns 0 when at cap', () => {
    expect(calculateCapRollover(272_500_000, 272_500_000)).toBe(0);
  });

  it('returns 0 when over cap (should not happen but defensive)', () => {
    expect(calculateCapRollover(272_500_000, 280_000_000)).toBe(0);
  });
});

describe('calculateTeamCap', () => {
  it('calculates full roster cap in-season', () => {
    const contracts = Array.from({ length: 3 }, (_, i) =>
      makeContract({
        playerId: `player-${i}`,
        years: [makeContractYear({ year: 2025, baseSalary: 5_000_000 })],
        startYear: 2020, // not a new player, won't trigger vet benefit
      }),
    );
    const deadCap: DeadCapEntry[] = [
      { name: 'Cut Player', capNumber: 2_000_000 },
    ];

    const result = calculateTeamCap(
      contracts,
      2025,
      false,
      deadCap,
      10_000_000,
    );

    expect(result.year).toBe(2025);
    expect(result.playerCount).toBe(3);
    expect(result.deadMoney).toBe(2_000_000);
    expect(result.isOffseason).toBe(false);
    expect(result.rolledOverFromPriorYear).toBe(10_000_000);
    // Cap = base cap + rollover
    expect(result.salaryCap).toBe(272_500_000 + 10_000_000);
    expect(result.top51Total).toBeUndefined();
  });

  it('applies top-51 rule in offseason', () => {
    const contracts = Array.from({ length: 53 }, (_, i) =>
      makeContract({
        playerId: `player-${i}`,
        years: [
          makeContractYear({ year: 2025, baseSalary: (53 - i) * 100_000 }),
        ],
        startYear: 2020,
      }),
    );

    const result = calculateTeamCap(contracts, 2025, true, [], 0);

    expect(result.isOffseason).toBe(true);
    expect(result.top51Total).toBeDefined();
    expect(result.playerCount).toBe(53);
  });

  it('includes rollover in salary cap', () => {
    const result = calculateTeamCap([], 2025, false, [], 15_000_000);
    expect(result.salaryCap).toBe(272_500_000 + 15_000_000);
    expect(result.capSpaceRemaining).toBe(272_500_000 + 15_000_000);
  });

  it('handles empty roster', () => {
    const result = calculateTeamCap([], 2025, false, [], 0);
    expect(result.playerCount).toBe(0);
    expect(result.totalCapCharges).toBe(0);
    expect(result.capSpaceRemaining).toBe(272_500_000);
  });
});

describe('checkSpendingFloor', () => {
  it('identifies compliant spending', () => {
    const data = [
      { year: 2022, salaryCap: 208_200_000, totalCashSpent: 200_000_000 },
      { year: 2023, salaryCap: 224_800_000, totalCashSpent: 210_000_000 },
      { year: 2024, salaryCap: 255_400_000, totalCashSpent: 240_000_000 },
      { year: 2025, salaryCap: 272_500_000, totalCashSpent: 260_000_000 },
    ];
    const result = checkSpendingFloor(data);

    const aggregateCap = 208_200_000 + 224_800_000 + 255_400_000 + 272_500_000;
    expect(result.requiredMinimum).toBe(Math.round(aggregateCap * 0.89));
    expect(result.totalCashSpent).toBe(910_000_000);
    expect(result.isCompliant).toBe(true);
    expect(result.shortfall).toBe(0);
  });

  it('identifies non-compliant spending', () => {
    const data = [
      { year: 2022, salaryCap: 208_200_000, totalCashSpent: 150_000_000 },
      { year: 2023, salaryCap: 224_800_000, totalCashSpent: 150_000_000 },
      { year: 2024, salaryCap: 255_400_000, totalCashSpent: 150_000_000 },
      { year: 2025, salaryCap: 272_500_000, totalCashSpent: 150_000_000 },
    ];
    const result = checkSpendingFloor(data);

    expect(result.isCompliant).toBe(false);
    expect(result.shortfall).toBeGreaterThan(0);
    expect(result.totalCashSpent).toBe(600_000_000);
  });

  it('uses most recent 4-year window when given more data', () => {
    const data = [
      { year: 2020, salaryCap: 198_200_000, totalCashSpent: 100_000_000 },
      { year: 2021, salaryCap: 182_500_000, totalCashSpent: 100_000_000 },
      { year: 2022, salaryCap: 208_200_000, totalCashSpent: 200_000_000 },
      { year: 2023, salaryCap: 224_800_000, totalCashSpent: 210_000_000 },
      { year: 2024, salaryCap: 255_400_000, totalCashSpent: 240_000_000 },
      { year: 2025, salaryCap: 272_500_000, totalCashSpent: 260_000_000 },
    ];
    const result = checkSpendingFloor(data);

    // Should only use 2022-2025
    expect(result.periodStart).toBe(2022);
    expect(result.periodEnd).toBe(2025);
    expect(result.totalCashSpent).toBe(910_000_000);
  });

  it('handles exactly at the boundary (89%)', () => {
    const cap = 100_000_000;
    const data = [
      { year: 2022, salaryCap: cap, totalCashSpent: cap * 0.89 },
      { year: 2023, salaryCap: cap, totalCashSpent: cap * 0.89 },
      { year: 2024, salaryCap: cap, totalCashSpent: cap * 0.89 },
      { year: 2025, salaryCap: cap, totalCashSpent: cap * 0.89 },
    ];
    const result = checkSpendingFloor(data);

    expect(result.isCompliant).toBe(true);
    expect(result.shortfall).toBe(0);
  });

  it('handles empty data', () => {
    const result = checkSpendingFloor([]);
    expect(result.isCompliant).toBe(true);
    expect(result.shortfall).toBe(0);
  });
});
