/**
 * Salary Cap Rules Engine — Constants
 *
 * League-wide salary cap values, veteran minimums, and CBA rule parameters.
 * All dollar amounts in whole dollars (no cents in NFL cap accounting).
 * Sources: NFL CBA, Over The Cap.
 */

import type { FifthYearOptionTier } from './salary-cap-types';

// --- Salary Cap by Year ---

export const SALARY_CAP_BY_YEAR: Record<number, number> = {
  2020: 198_200_000,
  2021: 182_500_000,
  2022: 208_200_000,
  2023: 224_800_000,
  2024: 255_400_000,
  2025: 272_500_000,
  2026: 290_000_000,
};

// --- Veteran Minimum Salary by Accrued Seasons (2025 values) ---

export const VETERAN_MINIMUM_BY_YEARS: Record<number, number> = {
  0: 795_000,
  1: 915_000,
  2: 985_000,
  3: 1_055_000,
  4: 1_175_000,
  5: 1_175_000,
  6: 1_175_000,
};

/** Accrued seasons of 7+ use this floor. */
export const VETERAN_MINIMUM_7_PLUS = 1_210_000;

/** Veteran Salary Benefit credits vet-minimum contracts at the 2-year rate. */
export const VETERAN_BENEFIT_CREDITED_SEASONS = 2;

// --- CBA Rule Parameters ---

/** Maximum years a signing bonus can be prorated over. CBA 6(b). */
export const MAX_PRORATION_YEARS = 5;

/** Maximum post-June 1 designations per team per year. */
export const MAX_POST_JUNE_1_DESIGNATIONS = 2;

/** Cash spending floor: 89% of aggregate cap over 4-year rolling window. */
export const CASH_SPENDING_FLOOR_PCT = 0.89;
export const CASH_SPENDING_FLOOR_WINDOW_YEARS = 4;

/** Franchise tag consecutive-year escalators. */
export const FRANCHISE_TAG_ESCALATOR_YEAR_2 = 1.2;
export const FRANCHISE_TAG_ESCALATOR_YEAR_3_PLUS = 1.44;

/** Top-51 player count used during offseason cap accounting. */
export const TOP_51_COUNT = 51;

// --- Fifth-Year Option Amounts (2025 values) ---

export const FIFTH_YEAR_OPTION_AMOUNTS: Record<
  FifthYearOptionTier,
  { qb: number; nonQb: number }
> = {
  'top-10': { qb: 32_416_000, nonQb: 22_127_000 },
  'pro-bowl': { qb: 28_882_000, nonQb: 18_829_000 },
  participatory: { qb: 25_349_000, nonQb: 15_531_000 },
};

// --- Proven Performance Escalator ---

/** Snap percentage threshold for PPE eligibility (35%). */
export const PPE_SNAP_THRESHOLD = 0.35;

/** Number of qualifying seasons needed out of first 3 (2 of 3). */
export const PPE_QUALIFYING_SEASONS = 2;

/** PPE only applies to rounds 2-7. */
export const PPE_MIN_ROUND = 2;
export const PPE_MAX_ROUND = 7;

// --- Helper ---

export function getVeteranMinimum(accruedSeasons: number): number {
  if (accruedSeasons >= 7) return VETERAN_MINIMUM_7_PLUS;
  return (
    VETERAN_MINIMUM_BY_YEARS[accruedSeasons] ?? VETERAN_MINIMUM_BY_YEARS[0]
  );
}
