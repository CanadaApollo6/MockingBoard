import { describe, it, expect } from 'vitest';
import type { RookieSlotValue } from './salary-cap-types';
import {
  getRookieSlotValue,
  buildRookieContract,
  calculateFifthYearOption,
  calculateProvenPerformanceEscalator,
} from './salary-cap-rookie';

const MOCK_SLOT_TABLE: Record<number, RookieSlotValue> = {
  1: {
    overall: 1,
    year1: 12_200_000,
    year2: 12_800_000,
    year3: 13_400_000,
    year4: 14_000_000,
    totalValue: 52_400_000,
    signingBonus: 25_400_000,
  },
  32: {
    overall: 32,
    year1: 2_100_000,
    year2: 2_200_000,
    year3: 2_350_000,
    year4: 2_500_000,
    totalValue: 9_150_000,
    signingBonus: 3_800_000,
  },
  65: {
    overall: 65,
    year1: 1_000_000,
    year2: 1_100_000,
    year3: 1_200_000,
    year4: 1_300_000,
    totalValue: 4_600_000,
    signingBonus: 1_500_000,
  },
};

describe('getRookieSlotValue', () => {
  it('returns slot value for a valid pick', () => {
    const slot = getRookieSlotValue(1, MOCK_SLOT_TABLE);
    expect(slot).not.toBeNull();
    expect(slot!.signingBonus).toBe(25_400_000);
    expect(slot!.year1).toBe(12_200_000);
  });

  it('returns null for a pick not in the table', () => {
    expect(getRookieSlotValue(999, MOCK_SLOT_TABLE)).toBeNull();
  });
});

describe('buildRookieContract', () => {
  it('builds a 4-year contract from slot values', () => {
    const contract = buildRookieContract(
      'player-1',
      'Caleb Williams',
      'CHI',
      'QB',
      1,
      2024,
      MOCK_SLOT_TABLE,
    );

    expect(contract.playerId).toBe('player-1');
    expect(contract.playerName).toBe('Caleb Williams');
    expect(contract.team).toBe('CHI');
    expect(contract.position).toBe('QB');
    expect(contract.isRookieContract).toBe(true);
    expect(contract.draftPick).toBe(1);
    expect(contract.startYear).toBe(2024);
    expect(contract.endYear).toBe(2027);
    expect(contract.years).toHaveLength(4);
    expect(contract.hasFifthYearOption).toBe(true);
  });

  it('sets correct base salaries per year', () => {
    const contract = buildRookieContract(
      'player-1',
      'Test',
      'CHI',
      'QB',
      1,
      2024,
      MOCK_SLOT_TABLE,
    );

    expect(contract.years[0].baseSalary).toBe(12_200_000);
    expect(contract.years[1].baseSalary).toBe(12_800_000);
    expect(contract.years[2].baseSalary).toBe(13_400_000);
    expect(contract.years[3].baseSalary).toBe(14_000_000);
  });

  it('prorates signing bonus over 4 years', () => {
    const contract = buildRookieContract(
      'player-1',
      'Test',
      'CHI',
      'QB',
      1,
      2024,
      MOCK_SLOT_TABLE,
    );

    // $25.4M / 4 = $6,350,000 per year
    const expectedProration = Math.round(25_400_000 / 4);
    for (const year of contract.years) {
      expect(year.signingBonusProration).toBe(expectedProration);
    }
  });

  it('marks first year as guaranteed', () => {
    const contract = buildRookieContract(
      'player-1',
      'Test',
      'CHI',
      'QB',
      1,
      2024,
      MOCK_SLOT_TABLE,
    );

    expect(contract.years[0].isGuaranteed).toBe(true);
    expect(contract.years[1].isGuaranteed).toBe(false);
  });

  it('does not give 5th-year option to non-first-round picks', () => {
    const contract = buildRookieContract(
      'player-2',
      'Test',
      'ARI',
      'WR',
      65,
      2024,
      MOCK_SLOT_TABLE,
    );

    expect(contract.hasFifthYearOption).toBe(false);
  });

  it('throws for pick not in slot table', () => {
    expect(() =>
      buildRookieContract(
        'player-1',
        'Test',
        'KC',
        'QB',
        999,
        2024,
        MOCK_SLOT_TABLE,
      ),
    ).toThrow('No rookie slot value found');
  });
});

describe('calculateFifthYearOption', () => {
  it('assigns top-10 tier for picks 1-10', () => {
    const result = calculateFifthYearOption(1, 'QB', 0);
    expect(result.tier).toBe('top-10');
    expect(result.amount).toBe(32_416_000);
    expect(result.isFullyGuaranteed).toBe(true);
  });

  it('assigns top-10 tier for pick 10', () => {
    const result = calculateFifthYearOption(10, 'WR', 0);
    expect(result.tier).toBe('top-10');
    expect(result.amount).toBe(22_127_000); // Non-QB
  });

  it('assigns pro-bowl tier with 1+ Pro Bowl selection', () => {
    const result = calculateFifthYearOption(15, 'QB', 1);
    expect(result.tier).toBe('pro-bowl');
    expect(result.amount).toBe(28_882_000);
  });

  it('assigns participatory tier for other first-rounders', () => {
    const result = calculateFifthYearOption(25, 'CB', 0);
    expect(result.tier).toBe('participatory');
    expect(result.amount).toBe(15_531_000);
  });

  it('uses QB amounts for quarterbacks', () => {
    const qb = calculateFifthYearOption(15, 'QB', 0);
    const nonQb = calculateFifthYearOption(15, 'WR', 0);
    expect(qb.amount).toBeGreaterThan(nonQb.amount);
  });

  it('throws for non-first-round picks', () => {
    expect(() => calculateFifthYearOption(33, 'QB', 0)).toThrow(
      'only available for first-round picks',
    );
  });
});

describe('calculateProvenPerformanceEscalator', () => {
  it('is eligible for round 2-7 picks meeting snap threshold', () => {
    const result = calculateProvenPerformanceEscalator(
      3,
      [0.4, 0.5, 0.2],
      1_200_000,
      2_500_000,
    );
    expect(result.eligible).toBe(true);
    // Escalated to RFR tender since it's higher
    expect(result.escalatedSalary).toBe(2_500_000);
    expect(result.originalSalary).toBe(1_200_000);
  });

  it('is ineligible for first-round picks', () => {
    const result = calculateProvenPerformanceEscalator(
      1,
      [0.9, 0.9, 0.9],
      1_200_000,
      2_500_000,
    );
    expect(result.eligible).toBe(false);
    expect(result.escalatedSalary).toBe(1_200_000);
  });

  it('is ineligible with only 1 qualifying season', () => {
    const result = calculateProvenPerformanceEscalator(
      3,
      [0.4, 0.2, 0.1],
      1_200_000,
      2_500_000,
    );
    expect(result.eligible).toBe(false);
  });

  it('uses original salary when higher than tender', () => {
    const result = calculateProvenPerformanceEscalator(
      4,
      [0.5, 0.5, 0.5],
      3_000_000,
      2_500_000,
    );
    expect(result.eligible).toBe(true);
    expect(result.escalatedSalary).toBe(3_000_000);
  });

  it('handles exactly at snap threshold (35%)', () => {
    const result = calculateProvenPerformanceEscalator(
      5,
      [0.35, 0.35, 0.3],
      1_200_000,
      2_500_000,
    );
    expect(result.eligible).toBe(true);
  });

  it('handles round 7 (max eligible)', () => {
    const result = calculateProvenPerformanceEscalator(
      7,
      [0.5, 0.5, 0.5],
      1_200_000,
      2_500_000,
    );
    expect(result.eligible).toBe(true);
  });

  it('is ineligible for round 8+ (UDFA)', () => {
    const result = calculateProvenPerformanceEscalator(
      8,
      [0.9, 0.9, 0.9],
      1_200_000,
      2_500_000,
    );
    expect(result.eligible).toBe(false);
  });
});
