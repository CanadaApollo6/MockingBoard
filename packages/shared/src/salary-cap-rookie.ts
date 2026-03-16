/**
 * Salary Cap Rules Engine — Rookie Wage Scale
 *
 * Slot values by draft position, 4-year contract structure,
 * 5th-year option tiers, and Proven Performance Escalator.
 * CBA Article 7.
 */

import type { Position, TeamAbbreviation } from './types';
import type {
  CapContract,
  RookieSlotValue,
  FifthYearOptionTier,
  FifthYearOptionResult,
  ProvenPerformanceEscalatorResult,
} from './salary-cap-types';
import {
  FIFTH_YEAR_OPTION_AMOUNTS,
  PPE_SNAP_THRESHOLD,
  PPE_QUALIFYING_SEASONS,
  PPE_MIN_ROUND,
  PPE_MAX_ROUND,
} from './salary-cap-constants';
import { calculateProration } from './salary-cap-core';

/**
 * Look up a rookie slot value from an imported slot table.
 * The slot table comes from Firestore (imported via admin tool from OTC).
 *
 * @param overall - Overall pick number (1-based)
 * @param slotTable - Imported slot values keyed by overall pick
 */
export function getRookieSlotValue(
  overall: number,
  slotTable: Record<number, RookieSlotValue>,
): RookieSlotValue | null {
  return slotTable[overall] ?? null;
}

/**
 * Build a full CapContract from a rookie draft slot.
 * Rookie contracts are 4 years with a prorated signing bonus.
 *
 * @param playerId - Player identifier
 * @param playerName - Player name
 * @param team - Drafting team
 * @param position - Player position
 * @param overall - Overall draft position
 * @param year - Draft year
 * @param slotTable - Imported slot values
 */
export function buildRookieContract(
  playerId: string,
  playerName: string,
  team: TeamAbbreviation,
  position: Position,
  overall: number,
  year: number,
  slotTable: Record<number, RookieSlotValue>,
): CapContract {
  const slot = slotTable[overall];
  if (!slot) {
    throw new Error(`No rookie slot value found for pick #${overall}`);
  }

  const annualProration = calculateProration(slot.signingBonus, 4);
  const yearSalaries = [slot.year1, slot.year2, slot.year3, slot.year4];

  const years = yearSalaries.map((baseSalary, i) => ({
    year: year + i,
    baseSalary,
    signingBonusProration: annualProration,
    rosterBonus: 0,
    optionBonus: 0,
    workoutBonus: 0,
    otherBonus: 0,
    incentives: [],
    isVoidYear: false,
    isGuaranteed: i === 0, // First year fully guaranteed for all rookies
    guaranteedSalary: i === 0 ? baseSalary : 0,
  }));

  return {
    playerId,
    playerName,
    team,
    position,
    totalSigningBonus: slot.signingBonus,
    signingBonusYearsRemaining: 4,
    years,
    startYear: year,
    endYear: year + 3,
    isRookieContract: true,
    draftPick: overall,
    hasFifthYearOption: overall <= 32,
    fifthYearOptionExercised: false,
  };
}

/**
 * Calculate the 5th-year option amount for a first-round pick.
 *
 * Post-2022 CBA tiers:
 * - Top 10 picks: highest tier amount
 * - Pro Bowl selections (1+ in first 3 seasons): middle tier
 * - All other first-rounders: participatory tier (based on snap count)
 *
 * The 5th-year option is fully guaranteed for injury at exercise,
 * and becomes fully guaranteed at the start of the option year.
 */
export function calculateFifthYearOption(
  overall: number,
  position: Position,
  proBowlSelections: number,
): FifthYearOptionResult {
  if (overall > 32) {
    throw new Error('Fifth-year option only available for first-round picks');
  }

  let tier: FifthYearOptionTier;
  if (overall <= 10) {
    tier = 'top-10';
  } else if (proBowlSelections >= 1) {
    tier = 'pro-bowl';
  } else {
    tier = 'participatory';
  }

  const isQb = position === 'QB';
  const tierAmounts = FIFTH_YEAR_OPTION_AMOUNTS[tier];
  const amount = isQb ? tierAmounts.qb : tierAmounts.nonQb;

  return {
    tier,
    amount,
    isFullyGuaranteed: true,
  };
}

/**
 * Determine if a player qualifies for the Proven Performance Escalator.
 *
 * Eligibility: Rounds 2-7 picks who played 35%+ of offensive/defensive snaps
 * in at least 2 of their first 3 seasons.
 *
 * If eligible, the year-4 salary escalates to the higher of the original
 * year-4 salary or the right-of-first-refusal tender amount.
 */
export function calculateProvenPerformanceEscalator(
  draftRound: number,
  snapPercentages: [number, number, number],
  originalYear4Salary: number,
  rightOfFirstRefusalTender: number,
): ProvenPerformanceEscalatorResult {
  if (draftRound < PPE_MIN_ROUND || draftRound > PPE_MAX_ROUND) {
    return {
      eligible: false,
      escalatedSalary: originalYear4Salary,
      originalSalary: originalYear4Salary,
    };
  }

  const qualifyingSeasons = snapPercentages.filter(
    (pct) => pct >= PPE_SNAP_THRESHOLD,
  ).length;
  const eligible = qualifyingSeasons >= PPE_QUALIFYING_SEASONS;

  const escalatedSalary = eligible
    ? Math.max(originalYear4Salary, rightOfFirstRefusalTender)
    : originalYear4Salary;

  return {
    eligible,
    escalatedSalary,
    originalSalary: originalYear4Salary,
  };
}
