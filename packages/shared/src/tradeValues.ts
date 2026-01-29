/**
 * Rich Hill Draft Value Chart
 *
 * Notes from Rich Hill:
 * 1. Top picks are situational - values at top of draft are ad hoc based on
 *    that year's talent pool. Teams pay premiums in strong QB classes.
 *
 * 2. Future pick formula: effective_pick = current_pick + (years_in_future × 32)
 *    Example: A 2026 2nd round pick in a 2025 draft ≈ pick 82 value
 *
 * 3. Round 1 trade-back premium: Trading INTO Round 1 costs ~5th-6th round pick
 *    value as premium (compensates for 5th-year option on first-rounders)
 */

// All 256 pick values from Rich Hill trade value chart
const RICH_HILL_VALUES: number[] = [
  // Round 1 (picks 1-32)
  1000.0, 717.17, 514.33, 490.52, 467.81, 446.15, 425.5, 405.8, 387.01, 369.09,
  357.62, 346.51, 335.74, 325.31, 315.2, 305.41, 295.92, 286.72, 277.81, 269.18,
  260.82, 252.71, 244.86, 237.25, 229.88, 222.74, 215.81, 209.11, 202.61,
  196.31, 190.21, 184.3,
  // Round 2 (picks 33-64)
  179.54, 174.89, 170.37, 165.97, 161.67, 157.49, 153.42, 149.45, 145.59,
  141.82, 138.15, 134.58, 131.1, 127.71, 124.41, 121.19, 118.06, 115.0, 112.03,
  109.13, 106.31, 103.56, 100.88, 98.27, 95.73, 93.26, 90.84, 88.49, 86.21,
  83.98, 81.81, 79.69,
  // Round 3 (picks 65-96)
  77.95, 76.25, 74.59, 72.97, 71.38, 69.82, 68.3, 66.81, 65.36, 63.93, 62.54,
  61.18, 59.85, 58.54, 57.27, 56.02, 54.8, 53.6, 52.44, 51.29, 50.18, 49.08,
  48.01, 46.97, 45.94, 44.94, 43.96, 43.01, 42.07, 41.15, 40.26, 39.38,
  // Round 4 (picks 97-128)
  38.52, 37.68, 36.86, 36.06, 35.26, 34.49, 33.73, 32.98, 32.26, 31.55, 30.85,
  30.17, 29.51, 28.86, 28.22, 27.6, 27.0, 26.4, 25.82, 25.25, 24.7, 24.15,
  23.62, 23.1, 22.59, 22.09, 21.61, 21.13, 20.67, 20.21, 19.77, 19.33,
  // Round 5 (picks 129-160)
  18.91, 18.49, 18.08, 17.68, 17.29, 16.91, 16.54, 16.18, 15.82, 15.47, 15.13,
  14.8, 14.47, 14.15, 13.84, 13.54, 13.24, 12.95, 12.66, 12.38, 12.11, 11.85,
  11.58, 11.33, 11.08, 10.84, 10.6, 10.36, 10.14, 9.91, 9.69, 9.48,
  // Round 6 (picks 161-192)
  9.27, 9.07, 8.87, 8.67, 8.48, 8.3, 8.11, 7.93, 7.76, 7.59, 7.42, 7.26, 7.1,
  6.94, 6.79, 6.64, 6.49, 6.35, 6.21, 6.07, 5.94, 5.81, 5.68, 5.56, 5.43, 5.31,
  5.2, 5.08, 4.97, 4.86, 4.75, 4.65,
  // Round 7 (picks 193-224)
  4.55, 4.45, 4.35, 4.25, 4.16, 4.07, 3.98, 3.89, 3.81, 3.72, 3.64, 3.56, 3.48,
  3.4, 3.33, 3.26, 3.18, 3.11, 3.05, 2.98, 2.91, 2.85, 2.79, 2.73, 2.67, 2.61,
  2.55, 2.49, 2.44, 2.38, 2.33, 2.28,
  // Round 8 (picks 225-256)
  2.23, 2.18, 2.13, 2.09, 2.04, 2.0, 1.95, 1.91, 1.87, 1.83, 1.79, 1.75, 1.71,
  1.67, 1.63, 1.6, 1.56, 1.53, 1.49, 1.46, 1.43, 1.4, 1.37, 1.34, 1.31, 1.28,
  1.25, 1.22, 1.2, 1.17, 1.14, 1.12,
];

// Round 1 trade-back premium (~5th-6th round pick value)
const ROUND_1_PREMIUM = 45;

/**
 * Get the trade value for a specific overall pick number
 */
export function getPickValue(overall: number): number {
  if (overall < 1 || overall > 256) return 0;
  return RICH_HILL_VALUES[overall - 1];
}

/**
 * Get the trade value for a future pick using Rich Hill's formula:
 * effective_pick = estimated_current_pick + (years_in_future × 32)
 *
 * @param round - The round of the future pick (1-7)
 * @param yearsOut - How many years in the future (1 = next year, 2 = two years out)
 */
export function getFuturePickValue(round: number, yearsOut: number): number {
  // Estimate current pick position (mid-round position)
  const estimatedPick = (round - 1) * 32 + 16;
  const effectivePick = Math.min(256, estimatedPick + yearsOut * 32);
  return getPickValue(effectivePick);
}

/**
 * Get the round for a given overall pick
 */
export function getPickRound(overall: number): number {
  return Math.ceil(overall / 32);
}

export interface TradeEvaluation {
  givingTotal: number;
  receivingTotal: number;
  premium: number;
  net: number;
  isFair: boolean;
}

/**
 * Evaluate a trade's value for CPU decision making.
 * CPU accepts if receiving >= giving * 0.95 (5% discount for trade willingness)
 *
 * @param givingPicks - Array of overall pick numbers being given
 * @param receivingPicks - Array of overall pick numbers being received
 * @param acquiringRound1 - Whether the proposer is acquiring a Round 1 pick they didn't own
 */
export function evaluateTradeValue(
  givingPicks: number[],
  receivingPicks: number[],
  acquiringRound1: boolean = false,
): TradeEvaluation {
  const givingTotal = givingPicks.reduce(
    (sum, pick) => sum + getPickValue(pick),
    0,
  );
  const receivingTotal = receivingPicks.reduce(
    (sum, pick) => sum + getPickValue(pick),
    0,
  );
  const premium = acquiringRound1 ? ROUND_1_PREMIUM : 0;
  const adjustedGiving = givingTotal + premium;

  // CPU accepts if they're getting at least 95% of what they're giving
  const isFair = receivingTotal >= adjustedGiving * 0.95;

  return {
    givingTotal,
    receivingTotal,
    premium,
    net: receivingTotal - adjustedGiving,
    isFair,
  };
}
