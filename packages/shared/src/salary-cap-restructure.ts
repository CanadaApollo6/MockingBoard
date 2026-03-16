/**
 * Salary Cap Rules Engine — Restructure Calculations
 *
 * Salary-to-bonus conversion with reproration over remaining years.
 * CBA Article 13 Section 6(b).
 */

import type { CapContract, RestructureResult } from './salary-cap-types';
import { MAX_PRORATION_YEARS, getVeteranMinimum } from './salary-cap-constants';
import { calculateCapHit } from './salary-cap-core';

/**
 * Calculate the maximum base salary that can be converted to signing bonus.
 * The player must retain at least the veteran minimum as base salary.
 */
export function maxRestructureAmount(
  contract: CapContract,
  year: number,
  accruedSeasons: number,
): number {
  const contractYear = contract.years.find((y) => y.year === year);
  if (!contractYear) return 0;

  const minimum = getVeteranMinimum(accruedSeasons);
  return Math.max(0, contractYear.baseSalary - minimum);
}

/**
 * Calculate the result of converting base salary to signing bonus.
 *
 * The converted amount becomes a new signing bonus and is prorated
 * over the remaining contract years (including void years), max 5 years.
 * This reduces the current year's cap hit while spreading the cost forward.
 */
export function calculateRestructure(
  contract: CapContract,
  year: number,
  convertAmount: number,
): RestructureResult {
  const contractYear = contract.years.find((y) => y.year === year);
  if (!contractYear) {
    throw new Error(`Contract does not cover year ${year}`);
  }

  if (convertAmount <= 0) {
    throw new Error('Convert amount must be positive');
  }

  if (convertAmount > contractYear.baseSalary) {
    throw new Error(
      `Cannot convert $${convertAmount} — base salary is only $${contractYear.baseSalary}`,
    );
  }

  // Remaining years from the restructure year through contract end (including void years)
  const lastYear = contract.voidYearsEnd ?? contract.endYear;
  const remainingYears = contract.years.filter(
    (y) => y.year >= year && y.year <= lastYear,
  ).length;

  const prorationYears = Math.min(remainingYears, MAX_PRORATION_YEARS);
  const newProrationPerYear = Math.round(convertAmount / prorationYears);

  const newBaseSalary = contractYear.baseSalary - convertAmount;

  // Current year savings: the converted amount minus one year of new proration
  const currentYearSavings = convertAmount - newProrationPerYear;

  // Recalculate cap hits for all remaining years with the new proration
  const yearlyCapHits = contract.years
    .filter((y) => y.year >= year)
    .map((y) => {
      const hit = calculateCapHit(contract, y.year);
      if (!hit) {
        return {
          baseSalary: 0,
          signingBonusProration: 0,
          rosterBonus: 0,
          optionBonus: 0,
          workoutBonus: 0,
          otherBonus: 0,
          ltbeIncentives: 0,
          totalCapHit: 0,
        };
      }

      const isCurrentYear = y.year === year;
      const adjustedBase = isCurrentYear ? newBaseSalary : hit.baseSalary;

      // Add new proration to existing proration for years within the proration window
      const yearsFromRestructure = y.year - year;
      const additionalProration =
        yearsFromRestructure < prorationYears ? newProrationPerYear : 0;
      const adjustedProration = hit.signingBonusProration + additionalProration;

      const totalCapHit =
        adjustedBase +
        adjustedProration +
        hit.rosterBonus +
        hit.optionBonus +
        hit.workoutBonus +
        hit.otherBonus +
        hit.ltbeIncentives;

      return {
        baseSalary: adjustedBase,
        signingBonusProration: adjustedProration,
        rosterBonus: hit.rosterBonus,
        optionBonus: hit.optionBonus,
        workoutBonus: hit.workoutBonus,
        otherBonus: hit.otherBonus,
        ltbeIncentives: hit.ltbeIncentives,
        totalCapHit,
      };
    });

  return {
    newBaseSalary,
    convertedAmount: convertAmount,
    newProrationPerYear,
    yearlyCapHits,
    currentYearSavings,
  };
}
