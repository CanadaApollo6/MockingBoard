/**
 * Salary Cap Rules Engine — Type Definitions
 *
 * CBA Article 13 compliant cap accounting types.
 * These model multi-year contracts for calculation purposes,
 * distinct from the OTC-scraped display types in types.ts.
 */

import type { Position, TeamAbbreviation } from './types';

// --- Core Contract Model ---

export type IncentiveClassification = 'LTBE' | 'NLTBE';

export interface Incentive {
  description: string;
  amount: number;
  classification: IncentiveClassification;
  earned?: boolean;
}

export interface ContractYear {
  year: number;
  baseSalary: number;
  signingBonusProration: number;
  rosterBonus: number;
  optionBonus: number;
  workoutBonus: number;
  otherBonus: number;
  incentives: Incentive[];
  isVoidYear: boolean;
  isGuaranteed: boolean;
  guaranteedSalary: number;
}

export interface CapContract {
  playerId: string;
  playerName: string;
  team: TeamAbbreviation;
  position: Position;
  totalSigningBonus: number;
  signingBonusYearsRemaining: number;
  years: ContractYear[];
  startYear: number;
  endYear: number;
  voidYearsEnd?: number;
  isRookieContract: boolean;
  draftPick?: number;
  hasFifthYearOption?: boolean;
  fifthYearOptionExercised?: boolean;
}

// --- Result Types ---

export interface CapHitBreakdown {
  baseSalary: number;
  signingBonusProration: number;
  rosterBonus: number;
  optionBonus: number;
  workoutBonus: number;
  otherBonus: number;
  ltbeIncentives: number;
  totalCapHit: number;
}

export type CutTiming = 'pre-june-1' | 'post-june-1';

export interface DeadMoneyResult {
  currentYearDeadMoney: number;
  nextYearDeadMoney: number;
  currentYearCapSavings: number;
  nextYearCapSavings: number;
}

export interface RestructureResult {
  newBaseSalary: number;
  convertedAmount: number;
  newProrationPerYear: number;
  yearlyCapHits: CapHitBreakdown[];
  currentYearSavings: number;
}

export type TagType =
  | 'franchise-nonexclusive'
  | 'franchise-exclusive'
  | 'transition';

export interface TagResult {
  tagType: TagType;
  amount: number;
  isConsecutiveTag: boolean;
  consecutiveYears: number;
}

export interface PositionSalaryData {
  position: Position;
  topSalaries: number[];
}

export interface IncentiveNettingResult {
  earnedLtbe: number;
  unearnedLtbe: number;
  earnedNltbe: number;
  unearnedNltbe: number;
  nextYearAdjustment: number;
}

export interface TeamCapSummary {
  year: number;
  salaryCap: number;
  totalCapCharges: number;
  deadMoney: number;
  capSpaceRemaining: number;
  playerCount: number;
  isOffseason: boolean;
  top51Total?: number;
  veteranBenefitSavings: number;
  rolledOverFromPriorYear: number;
}

export interface SpendingFloorResult {
  periodStart: number;
  periodEnd: number;
  totalCashSpent: number;
  requiredMinimum: number;
  isCompliant: boolean;
  shortfall: number;
}

export interface RookieSlotValue {
  overall: number;
  year1: number;
  year2: number;
  year3: number;
  year4: number;
  totalValue: number;
  signingBonus: number;
}

export type FifthYearOptionTier = 'top-10' | 'pro-bowl' | 'participatory';

export interface FifthYearOptionResult {
  tier: FifthYearOptionTier;
  amount: number;
  isFullyGuaranteed: boolean;
}

export interface ProvenPerformanceEscalatorResult {
  eligible: boolean;
  escalatedSalary: number;
  originalSalary: number;
}

export interface VeteranBenefitResult {
  capCharge: number;
  benefitCredit: number;
  isEligible: boolean;
}
