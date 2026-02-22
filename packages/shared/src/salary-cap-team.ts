/**
 * Salary Cap Rules Engine — Team-Level Accounting
 *
 * Team cap summary, top-51 rule, cap rollover, and cash spending floor.
 * CBA Article 13 Section 6(a) and Article 12.
 */

import type {
  CapContract,
  TeamCapSummary,
  SpendingFloorResult,
} from './salary-cap-types';
import type { DeadCapEntry } from './types';
import {
  SALARY_CAP_BY_YEAR,
  TOP_51_COUNT,
  CASH_SPENDING_FLOOR_PCT,
  CASH_SPENDING_FLOOR_WINDOW_YEARS,
  getVeteranMinimum,
} from './salary-cap-constants';
import { calculateCapHit, applyVeteranBenefit } from './salary-cap-core';

/**
 * Apply the top-51 rule for offseason cap counting.
 * Only the 51 highest cap hits count fully. Non-top-51 players are charged
 * only the excess over the minimum salary threshold.
 *
 * CBA Article 13 Section 6(a)(i).
 */
export function applyTop51Rule(
  capHits: Array<{ capHit: number; accruedSeasons: number }>,
): { top51Total: number; excludedPlayers: number } {
  const sorted = [...capHits].sort((a, b) => b.capHit - a.capHit);

  const top51 = sorted.slice(0, TOP_51_COUNT);
  const excluded = sorted.slice(TOP_51_COUNT);

  const top51Total = top51.reduce((sum, p) => sum + p.capHit, 0);

  // Non-top-51 players: charged only excess over minimum
  const excludedCharges = excluded.reduce((sum, p) => {
    const minimum = getVeteranMinimum(p.accruedSeasons);
    return sum + Math.max(0, p.capHit - minimum);
  }, 0);

  return {
    top51Total: top51Total + excludedCharges,
    excludedPlayers: excluded.length,
  };
}

/**
 * Calculate unused cap space that rolls over to the next year.
 * CBA Article 12 Section 5.
 */
export function calculateCapRollover(
  salaryCap: number,
  totalCapCharges: number,
): number {
  return Math.max(0, salaryCap - totalCapCharges);
}

/**
 * Calculate a team's complete cap situation for a given year.
 *
 * In offseason (pre-Week 1), applies the top-51 rule.
 * In-season, all contracts count against the cap.
 */
export function calculateTeamCap(
  contracts: CapContract[],
  year: number,
  isOffseason: boolean,
  deadCapEntries: DeadCapEntry[],
  rolledOverCapSpace: number,
): TeamCapSummary {
  const salaryCap = (SALARY_CAP_BY_YEAR[year] ?? 0) + rolledOverCapSpace;

  // Calculate each player's cap hit and vet benefit
  const playerHits: Array<{
    capHit: number;
    accruedSeasons: number;
    vetSavings: number;
  }> = [];
  let totalVetSavings = 0;

  for (const contract of contracts) {
    const hit = calculateCapHit(contract, year);
    if (!hit) continue;

    // Check veteran benefit eligibility (approximation: use years in league)
    const accruedSeasons = year - contract.startYear;
    const vetResult = applyVeteranBenefit(hit.baseSalary, accruedSeasons);
    const effectiveCapHit = vetResult.isEligible
      ? hit.totalCapHit - hit.baseSalary + vetResult.capCharge
      : hit.totalCapHit;

    playerHits.push({
      capHit: effectiveCapHit,
      accruedSeasons,
      vetSavings: vetResult.benefitCredit,
    });
    totalVetSavings += vetResult.benefitCredit;
  }

  const deadMoney = deadCapEntries.reduce((sum, e) => sum + e.capNumber, 0);

  let totalCapCharges: number;
  let top51Total: number | undefined;

  if (isOffseason) {
    const top51Result = applyTop51Rule(playerHits);
    totalCapCharges = top51Result.top51Total + deadMoney;
    top51Total = top51Result.top51Total;
  } else {
    totalCapCharges =
      playerHits.reduce((sum, p) => sum + p.capHit, 0) + deadMoney;
  }

  return {
    year,
    salaryCap,
    totalCapCharges,
    deadMoney,
    capSpaceRemaining: salaryCap - totalCapCharges,
    playerCount: playerHits.length,
    isOffseason,
    top51Total,
    veteranBenefitSavings: totalVetSavings,
    rolledOverFromPriorYear: rolledOverCapSpace,
  };
}

/**
 * Check cash spending floor compliance over a rolling multi-year window.
 * Teams must spend at least 89% of aggregate salary cap over 4-year periods.
 * CBA Article 12 Section 9.
 */
export function checkSpendingFloor(
  yearlyData: Array<{
    year: number;
    salaryCap: number;
    totalCashSpent: number;
  }>,
): SpendingFloorResult {
  if (yearlyData.length === 0) {
    return {
      periodStart: 0,
      periodEnd: 0,
      totalCashSpent: 0,
      requiredMinimum: 0,
      isCompliant: true,
      shortfall: 0,
    };
  }

  const sorted = [...yearlyData].sort((a, b) => a.year - b.year);

  // Use the most recent window of CASH_SPENDING_FLOOR_WINDOW_YEARS
  const window = sorted.slice(-CASH_SPENDING_FLOOR_WINDOW_YEARS);
  const totalCashSpent = window.reduce((sum, y) => sum + y.totalCashSpent, 0);
  const aggregateCap = window.reduce((sum, y) => sum + y.salaryCap, 0);
  const requiredMinimum = Math.round(aggregateCap * CASH_SPENDING_FLOOR_PCT);

  const isCompliant = totalCashSpent >= requiredMinimum;
  const shortfall = isCompliant ? 0 : requiredMinimum - totalCashSpent;

  return {
    periodStart: window[0].year,
    periodEnd: window[window.length - 1].year,
    totalCashSpent,
    requiredMinimum,
    isCompliant,
    shortfall,
  };
}
