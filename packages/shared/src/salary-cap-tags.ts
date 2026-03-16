/**
 * Salary Cap Rules Engine — Franchise & Transition Tags
 *
 * Non-exclusive franchise: average of top 5 salaries at position (or top 5 overall if higher).
 * Exclusive franchise: average of top 5 cap numbers at position.
 * Transition: average of top 10 salaries at position.
 * Consecutive tags: 120% (2nd year), 144% (3rd+ year).
 *
 * CBA Article 10.
 */

import type {
  TagType,
  TagResult,
  PositionSalaryData,
} from './salary-cap-types';
import {
  FRANCHISE_TAG_ESCALATOR_YEAR_2,
  FRANCHISE_TAG_ESCALATOR_YEAR_3_PLUS,
} from './salary-cap-constants';

function averageTopN(salaries: number[], n: number): number {
  const sorted = [...salaries].sort((a, b) => b - a);
  const top = sorted.slice(0, n);
  if (top.length === 0) return 0;
  return Math.round(top.reduce((sum, s) => sum + s, 0) / top.length);
}

/**
 * Calculate franchise or transition tag amount.
 *
 * @param tagType - The type of tag
 * @param positionData - Top salaries at the position (sorted descending, needs 10+ entries for transition)
 * @param priorTagAmount - The player's tag amount from prior year (0 if first tag)
 * @param consecutiveTagYears - How many consecutive years tagged (0 if first)
 */
export function calculateTag(
  tagType: TagType,
  positionData: PositionSalaryData,
  priorTagAmount: number,
  consecutiveTagYears: number,
): TagResult {
  let baseAmount: number;

  switch (tagType) {
    case 'franchise-nonexclusive':
      baseAmount = averageTopN(positionData.topSalaries, 5);
      break;
    case 'franchise-exclusive':
      baseAmount = averageTopN(positionData.topSalaries, 5);
      break;
    case 'transition':
      baseAmount = averageTopN(positionData.topSalaries, 10);
      break;
  }

  // Apply consecutive-year escalators
  let amount = baseAmount;
  const isConsecutiveTag = consecutiveTagYears > 0;

  if (consecutiveTagYears === 1) {
    // 2nd consecutive tag: max of position average or 120% of prior tag
    const escalated = Math.round(
      priorTagAmount * FRANCHISE_TAG_ESCALATOR_YEAR_2,
    );
    amount = Math.max(baseAmount, escalated);
  } else if (consecutiveTagYears >= 2) {
    // 3rd+ consecutive tag: max of position average or 144% of prior tag
    const escalated = Math.round(
      priorTagAmount * FRANCHISE_TAG_ESCALATOR_YEAR_3_PLUS,
    );
    amount = Math.max(baseAmount, escalated);
  }

  return {
    tagType,
    amount,
    isConsecutiveTag,
    consecutiveYears: consecutiveTagYears + 1,
  };
}
