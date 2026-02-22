/**
 * Salary Cap Rules Engine — Dead Money Calculations
 *
 * Pre-June 1 vs. post-June 1 dead money for cuts and trades.
 * CBA Article 13 Section 6(b)(ii) and 6(f).
 */

import type {
  CapContract,
  CutTiming,
  DeadMoneyResult,
} from './salary-cap-types';
import { calculateCapHit } from './salary-cap-core';

/**
 * Sum remaining unamortized signing bonus proration from a given year onward.
 * This is the "accelerated" amount that becomes dead money on a cut/trade.
 */
function remainingProration(contract: CapContract, fromYear: number): number {
  return contract.years
    .filter((y) => y.year >= fromYear)
    .reduce((sum, y) => sum + y.signingBonusProration, 0);
}

/**
 * Calculate dead money from releasing (cutting) a player.
 *
 * Pre-June 1: All remaining prorated signing bonus accelerates into the current year.
 *   Dead money = current year's cap hit (guaranteed portion) + all future proration.
 *
 * Post-June 1: Current year's proration stays in current year.
 *   Remaining future proration charges to the following league year.
 *
 * Cap savings = what the team would have paid minus dead money.
 */
export function calculateDeadMoney(
  contract: CapContract,
  year: number,
  timing: CutTiming,
): DeadMoneyResult {
  const currentYearHit = calculateCapHit(contract, year);
  if (!currentYearHit) {
    return {
      currentYearDeadMoney: 0,
      nextYearDeadMoney: 0,
      currentYearCapSavings: 0,
      nextYearCapSavings: 0,
    };
  }

  const futureProration = remainingProration(contract, year + 1);

  // Remaining guaranteed money in the current year that must still be paid
  const currentYearProration = currentYearHit.signingBonusProration;

  if (timing === 'pre-june-1') {
    // All future proration accelerates into current year
    const currentYearDeadMoney = currentYearProration + futureProration;

    // Savings = what would have been the cap hit minus the dead money
    const currentYearCapSavings =
      currentYearHit.totalCapHit - currentYearDeadMoney;

    // Also account for future year cap savings (those cap hits no longer exist)
    const futureCapHitsTotal = contract.years
      .filter((y) => y.year > year)
      .reduce((sum, y) => {
        const hit = calculateCapHit(contract, y.year);
        return sum + (hit?.totalCapHit ?? 0);
      }, 0);

    return {
      currentYearDeadMoney,
      nextYearDeadMoney: 0,
      currentYearCapSavings,
      nextYearCapSavings: futureCapHitsTotal,
    };
  }

  // Post-June 1: current year proration stays, future proration hits next year
  const currentYearDeadMoney = currentYearProration;
  const nextYearDeadMoney = futureProration;

  const currentYearCapSavings =
    currentYearHit.totalCapHit - currentYearDeadMoney;

  const futureCapHitsTotal = contract.years
    .filter((y) => y.year > year)
    .reduce((sum, y) => {
      const hit = calculateCapHit(contract, y.year);
      return sum + (hit?.totalCapHit ?? 0);
    }, 0);
  const nextYearCapSavings = futureCapHitsTotal - nextYearDeadMoney;

  return {
    currentYearDeadMoney,
    nextYearDeadMoney,
    currentYearCapSavings,
    nextYearCapSavings,
  };
}

/**
 * Calculate dead money for the ORIGINAL team in a trade.
 * CBA Article 13 Section 6(f): new team receives no signing bonus charge.
 * Original team retains all unamortized signing bonus proration.
 * Identical to cut dead money for the remaining proration, but the new team
 * picks up the base salary and other bonuses going forward.
 */
export function calculateTradeDeadMoney(
  contract: CapContract,
  year: number,
  timing: CutTiming,
): DeadMoneyResult {
  // For trades, dead money is purely the signing bonus acceleration.
  // The base salary and other bonuses transfer to the new team.
  const currentYearProration =
    contract.years.find((y) => y.year === year)?.signingBonusProration ?? 0;
  const futureProration = remainingProration(contract, year + 1);

  const currentYearHit = calculateCapHit(contract, year);
  if (!currentYearHit) {
    return {
      currentYearDeadMoney: 0,
      nextYearDeadMoney: 0,
      currentYearCapSavings: 0,
      nextYearCapSavings: 0,
    };
  }

  if (timing === 'pre-june-1') {
    const currentYearDeadMoney = currentYearProration + futureProration;
    const currentYearCapSavings =
      currentYearHit.totalCapHit - currentYearDeadMoney;

    return {
      currentYearDeadMoney,
      nextYearDeadMoney: 0,
      currentYearCapSavings,
      nextYearCapSavings: 0,
    };
  }

  // Post-June 1 trade
  return {
    currentYearDeadMoney: currentYearProration,
    nextYearDeadMoney: futureProration,
    currentYearCapSavings: currentYearHit.totalCapHit - currentYearProration,
    nextYearCapSavings: 0,
  };
}
