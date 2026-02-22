/**
 * Salary Cap Rules Engine — Incentive Classification & Netting
 *
 * LTBE (Likely To Be Earned): Counts against the cap during the season.
 * NLTBE (Not Likely To Be Earned): Does NOT count during the season.
 *
 * Year-end netting adjusts the following year's cap based on actual results.
 * CBA Article 13 Section 6(c).
 */

import type {
  Incentive,
  IncentiveClassification,
  IncentiveNettingResult,
} from './salary-cap-types';

/**
 * Classify an incentive as LTBE or NLTBE based on CBA rules.
 *
 * Automatically LTBE:
 * - Year-1 rookie contract incentives
 * - Workout/weight bonuses (within player control)
 * - Per-game roster bonuses
 * - Any incentive met/exceeded in the prior season
 *
 * Otherwise: NLTBE.
 */
export function classifyIncentive(
  metPriorYear: boolean,
  isRookieYear1: boolean,
  isWorkoutOrWeight: boolean,
  isPerGameRoster: boolean,
): IncentiveClassification {
  if (isRookieYear1) return 'LTBE';
  if (isWorkoutOrWeight) return 'LTBE';
  if (isPerGameRoster) return 'LTBE';
  if (metPriorYear) return 'LTBE';
  return 'NLTBE';
}

/**
 * Calculate year-end incentive netting adjustment.
 *
 * The cap adjusts the following year based on what actually happened:
 * - LTBE earned: already counted, no adjustment needed
 * - LTBE not earned: team gets a credit (cap relief) next year
 * - NLTBE earned: team gets a charge next year
 * - NLTBE not earned: already not counted, no adjustment needed
 *
 * @param incentives - Array of incentives with `earned` resolved at year-end
 * @returns Net cap adjustment for the following year (positive = charge to team)
 */
export function calculateIncentiveNetting(
  incentives: Incentive[],
): IncentiveNettingResult {
  let earnedLtbe = 0;
  let unearnedLtbe = 0;
  let earnedNltbe = 0;
  let unearnedNltbe = 0;

  for (const incentive of incentives) {
    const isEarned = incentive.earned ?? false;

    if (incentive.classification === 'LTBE') {
      if (isEarned) {
        earnedLtbe += incentive.amount;
      } else {
        unearnedLtbe += incentive.amount;
      }
    } else {
      if (isEarned) {
        earnedNltbe += incentive.amount;
      } else {
        unearnedNltbe += incentive.amount;
      }
    }
  }

  // Net adjustment: NLTBE earned charges next year, unearned LTBE credits next year
  const nextYearAdjustment = earnedNltbe - unearnedLtbe;

  return {
    earnedLtbe,
    unearnedLtbe,
    earnedNltbe,
    unearnedNltbe,
    nextYearAdjustment,
  };
}
