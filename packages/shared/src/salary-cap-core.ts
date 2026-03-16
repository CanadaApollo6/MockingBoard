/**
 * Salary Cap Rules Engine — Core Calculations
 *
 * Fundamental cap hit primitives: signing bonus proration,
 * single-year cap hit breakdown, and veteran salary benefit.
 */

import type {
  CapContract,
  CapHitBreakdown,
  VeteranBenefitResult,
} from './salary-cap-types';
import {
  MAX_PRORATION_YEARS,
  VETERAN_BENEFIT_CREDITED_SEASONS,
  getVeteranMinimum,
} from './salary-cap-constants';

/**
 * Calculate annual signing bonus proration.
 * Straight-line over min(contractYears, 5). CBA Article 13 Section 6(b).
 */
export function calculateProration(
  totalBonus: number,
  contractYears: number,
): number {
  if (totalBonus <= 0 || contractYears <= 0) return 0;
  const prorationYears = Math.min(contractYears, MAX_PRORATION_YEARS);
  return Math.round(totalBonus / prorationYears);
}

/**
 * Calculate a single player's cap hit for a specific year.
 * Cap hit = base salary + prorated signing bonus + all bonuses + LTBE incentives.
 * Returns null if the contract doesn't cover the requested year.
 */
export function calculateCapHit(
  contract: CapContract,
  year: number,
): CapHitBreakdown | null {
  const contractYear = contract.years.find((y) => y.year === year);
  if (!contractYear) return null;

  const ltbeIncentives = contractYear.incentives
    .filter((i) => i.classification === 'LTBE')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalCapHit =
    contractYear.baseSalary +
    contractYear.signingBonusProration +
    contractYear.rosterBonus +
    contractYear.optionBonus +
    contractYear.workoutBonus +
    contractYear.otherBonus +
    ltbeIncentives;

  return {
    baseSalary: contractYear.baseSalary,
    signingBonusProration: contractYear.signingBonusProration,
    rosterBonus: contractYear.rosterBonus,
    optionBonus: contractYear.optionBonus,
    workoutBonus: contractYear.workoutBonus,
    otherBonus: contractYear.otherBonus,
    ltbeIncentives,
    totalCapHit,
  };
}

/**
 * Apply the Veteran Salary Benefit (CBA Article 26).
 * Players on minimum-salary contracts are cap-charged at the 2-year veteran rate
 * regardless of actual accrued seasons. The league absorbs the difference.
 *
 * Eligibility: base salary must equal the veteran minimum for the player's accrued seasons.
 */
export function applyVeteranBenefit(
  baseSalary: number,
  accruedSeasons: number,
): VeteranBenefitResult {
  const playerMinimum = getVeteranMinimum(accruedSeasons);
  const creditedMinimum = getVeteranMinimum(VETERAN_BENEFIT_CREDITED_SEASONS);

  const isEligible =
    baseSalary <= playerMinimum &&
    accruedSeasons > VETERAN_BENEFIT_CREDITED_SEASONS;

  if (!isEligible) {
    return { capCharge: baseSalary, benefitCredit: 0, isEligible: false };
  }

  return {
    capCharge: creditedMinimum,
    benefitCredit: baseSalary - creditedMinimum,
    isEligible: true,
  };
}
