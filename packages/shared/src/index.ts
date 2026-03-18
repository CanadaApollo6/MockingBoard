// Types
export type {
  FirestoreTimestamp,
  Position,
  PositionFilterGroup,
  TeamAbbreviation,
  DraftStatus,
  DraftFormat,
  DraftPlatform,
  TeamAssignmentMode,
  CpuSpeed,
  NotificationLevel,
  DraftVisibility,
  TradeStatus,
  ScoutTier,
  DraftSlot,
  PreferenceWeights,
  FuturePickSeed,
  FutureDraftPick,
  User,
  Draft,
  Pick,
  Player,
  Team,
  TradePiece,
  Trade,
  ScoutProfile,
  BigBoard,
  CustomPlayer,
  BoardSnapshot,
  BoardVisibility,
  GradeSystem,
  ScoutingReport,
  ReportLike,
  PlayerPickStats,
  Follow,
  Coach,
  KeyPlayerOverride,
  FrontOfficeStaff,
  Accolade,
  SeasonOverview,
  TeamSeason,
  DraftResultPick,
  DraftDayTrade,
  VideoPlatform,
  VideoBreakdown,
  PickLabel,
  PickGrade,
  TeamDraftGrade,
  DraftRecap,
  TradeAnalysis,
  OptimalPick,
  SuggestedPick,
  BoardGenerationConfig,
  NotificationType,
  AppNotification,
  ActivityEventType,
  ActivityEvent,
  Comment,
  Bookmark,
  WatchlistItem,
  ListItem,
  UserList,
  PlayerContract,
  FreeAgentEntry,
  DeadCapEntry,
  TeamContractData,
  LeagueCapOverview,
  RookieSlotEntry,
  RookieSlotData,
} from './types';

// Constants & Guards
export { POSITION_GROUPS, isTeamAbbreviation } from './types';

// Seed data
export { teams, teamSeeds, type TeamSeed } from './data/index';
export { coachingStaffs } from './data/coaching-staffs';

// Trade values
export {
  getPickValue,
  getFuturePickValue,
  getPickRound,
  evaluateTradeValue,
  type TradeEvaluation,
} from './tradeValues';

// CPU logic
export {
  selectCpuPick,
  prepareCpuPick,
  CPU_PICK_WEIGHTS,
  NEED_MULTIPLIERS,
  getEffectiveNeeds,
  getTeamDraftedPositions,
  type CpuPickOptions,
  type CpuPickContext,
} from './cpu';

// Draft logic
export {
  CPU_SPEED_DELAY,
  getPickController,
  filterAndSortPickOrder,
  buildFuturePicksFromSeeds,
  calculatePickAdvancement,
  preparePickRecord,
  type PreparedPick,
} from './draft';

// Draft names
export { generateDraftName } from './draft-names';

// Trade logic
export {
  evaluateCpuTrade,
  validateTradePicksAvailable,
  validateUserOwnsPicks,
  getPicksOwnedByTeam,
  getAvailableCurrentPicks,
  getAvailableFuturePicks,
  getTeamFuturePicks,
  computeTradeExecution,
  type CpuTradeEvaluation,
} from './trade';

// Draft analytics
export {
  POSITIONAL_VALUE,
  baseSurplusValue,
  positionAdjustedSurplus,
  classifyPick,
  getGradeTier,
  gradePick,
  gradeTeamDraft,
  generateDraftRecap,
  computeOptimalBaseline,
  analyzeAllTrades,
  suggestPick,
} from './draft-analytics';

// Board generation
export { generateBoardRankings, getHeadlineStats } from './board-generator';

// Grades
export {
  GRADE_SYSTEMS,
  getGradeDisplay,
  getGradeOptions,
  nflGradeToInternal,
  internalToNflGrade,
  type GradeDisplay,
} from './grades';

// Prospect import
export {
  parseProspectCsv,
  parseHeight,
  parseFraction,
  parseStatValue,
  normalizeSchool,
  toDisplaySchool,
  normalizePlayerName,
  matchKey,
  SCHOOL_NORMALIZE,
  UPPERCASE_SCHOOLS,
  POSITION_STAT_SECTIONS,
  PASS_KEYS,
  RUSH_KEYS,
  REC_KEYS,
  PBLK_KEYS,
  PRSH_KEYS,
  RUND_KEYS,
  COV_KEYS,
  type ParsedProspect,
} from './prospect-import';

// Salary cap types
export type {
  IncentiveClassification,
  Incentive,
  ContractYear,
  CapContract,
  CapHitBreakdown,
  CutTiming,
  DeadMoneyResult,
  RestructureResult,
  TagType,
  TagResult,
  PositionSalaryData,
  IncentiveNettingResult,
  TeamCapSummary,
  SpendingFloorResult,
  RookieSlotValue,
  FifthYearOptionTier,
  FifthYearOptionResult,
  ProvenPerformanceEscalatorResult,
  VeteranBenefitResult,
} from './salary-cap-types';

// Salary cap constants
export {
  SALARY_CAP_BY_YEAR,
  VETERAN_MINIMUM_BY_YEARS,
  VETERAN_MINIMUM_7_PLUS,
  VETERAN_BENEFIT_CREDITED_SEASONS,
  MAX_PRORATION_YEARS,
  MAX_POST_JUNE_1_DESIGNATIONS,
  CASH_SPENDING_FLOOR_PCT,
  CASH_SPENDING_FLOOR_WINDOW_YEARS,
  FRANCHISE_TAG_ESCALATOR_YEAR_2,
  FRANCHISE_TAG_ESCALATOR_YEAR_3_PLUS,
  TOP_51_COUNT,
  FIFTH_YEAR_OPTION_AMOUNTS,
  PPE_SNAP_THRESHOLD,
  PPE_QUALIFYING_SEASONS,
  PPE_MIN_ROUND,
  PPE_MAX_ROUND,
  getVeteranMinimum,
} from './salary-cap-constants';

// Salary cap core
export {
  calculateProration,
  calculateCapHit,
  applyVeteranBenefit,
} from './salary-cap-core';

// Salary cap dead money
export {
  calculateDeadMoney,
  calculateTradeDeadMoney,
} from './salary-cap-dead-money';

// Salary cap restructures
export {
  calculateRestructure,
  maxRestructureAmount,
} from './salary-cap-restructure';

// Salary cap tags
export { calculateTag } from './salary-cap-tags';

// Salary cap incentives
export {
  classifyIncentive,
  calculateIncentiveNetting,
} from './salary-cap-incentives';

// Salary cap team accounting
export {
  applyTop51Rule,
  calculateCapRollover,
  calculateTeamCap,
  checkSpendingFloor,
} from './salary-cap-team';

// Salary cap rookie wage scale
export {
  getRookieSlotValue,
  buildRookieContract,
  calculateFifthYearOption,
  calculateProvenPerformanceEscalator,
} from './salary-cap-rookie';

// Salary cap bridge
export { fromDisplayContract } from './salary-cap-bridge';
