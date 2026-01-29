// Plain object representation of Firestore Timestamp.
// Keeps shared package free of firebase-admin dependency.
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

// ---- Enums & Unions ----

export type Position =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'OT'
  | 'OG'
  | 'C'
  | 'EDGE'
  | 'DL'
  | 'LB'
  | 'CB'
  | 'S'
  | 'K'
  | 'P'
  | 'LS';

export type PositionFilterGroup = 'QB' | 'WR_TE' | 'RB' | 'OL' | 'DEF' | null;

export const POSITION_GROUPS: Record<
  Exclude<PositionFilterGroup, null>,
  Position[]
> = {
  QB: ['QB'],
  WR_TE: ['WR', 'TE'],
  RB: ['RB'],
  OL: ['OT', 'OG', 'C'],
  DEF: ['EDGE', 'DL', 'LB', 'CB', 'S'],
};

export type TeamAbbreviation =
  | 'ARI'
  | 'ATL'
  | 'BAL'
  | 'BUF'
  | 'CAR'
  | 'CHI'
  | 'CIN'
  | 'CLE'
  | 'DAL'
  | 'DEN'
  | 'DET'
  | 'GB'
  | 'HOU'
  | 'IND'
  | 'JAX'
  | 'KC'
  | 'LAC'
  | 'LAR'
  | 'LV'
  | 'MIA'
  | 'MIN'
  | 'NE'
  | 'NO'
  | 'NYG'
  | 'NYJ'
  | 'PHI'
  | 'PIT'
  | 'SEA'
  | 'SF'
  | 'TB'
  | 'TEN'
  | 'WAS';

export type DraftStatus = 'lobby' | 'active' | 'paused' | 'complete';
export type DraftFormat = 'full' | 'single-team';
export type DraftPlatform = 'discord' | 'web';
export type TeamAssignmentMode = 'random' | 'choice';
export type CpuSpeed = 'instant' | 'fast' | 'normal';

// ---- Supporting Types ----

export interface DraftSlot {
  overall: number;
  round: number;
  pick: number;
  team: TeamAbbreviation;
  ownerOverride?: string; // User ID if pick was traded away from original team
}

export interface PreferenceWeights {
  athleticism: number;
  production: number;
  conference: Record<string, number>;
  positionalValue: Partial<Record<Position, number>>;
}

// ---- Core Domain Types ----

export interface User {
  id: string;
  discordId: string;
  firebaseUid?: string;
  discordUsername: string;
  discordAvatar?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  preferences?: {
    statedWeights?: PreferenceWeights;
    revealedWeights?: PreferenceWeights;
  };
  stats?: {
    totalDrafts: number;
    totalPicks: number;
    accuracyScore?: number;
  };
}

export interface Draft {
  id: string;
  createdBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  config: {
    rounds: number;
    secondsPerPick: number;
    format: DraftFormat;
    year: number;
    teamAssignmentMode: TeamAssignmentMode;
    cpuSpeed: CpuSpeed;
    tradesEnabled: boolean;
  };
  status: DraftStatus;
  currentPick: number;
  currentRound: number;
  clockExpiresAt?: FirestoreTimestamp;
  platform: DraftPlatform;
  discord?: {
    guildId: string;
    channelId: string;
    threadId: string;
  };
  teamAssignments: Record<TeamAbbreviation, string | null>;
  participants: Record<string, string>; // internal userId → discordId
  pickOrder: DraftSlot[];
  pickedPlayerIds: string[];
  isLocked?: boolean;
  lockedAt?: FirestoreTimestamp;
}

export interface Pick {
  id: string;
  draftId: string;
  overall: number;
  round: number;
  pick: number;
  team: TeamAbbreviation;
  userId: string | null;
  playerId: string;
  context?: {
    availablePlayerIds: string[];
    pickTimestamp: FirestoreTimestamp;
    secondsUsed?: number;
  };
  createdAt: FirestoreTimestamp;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  school: string;
  consensusRank: number;
  year: number;
  attributes?: {
    conference: string;
    height?: number;
    weight?: number;
    fortyYard?: number;
    vertical?: number;
    bench?: number;
    broad?: number;
    cone?: number;
    shuttle?: number;
    armLength?: number;
    handSize?: number;
    captain?: boolean;
    yearInSchool?: 'FR' | 'SO' | 'JR' | 'SR';
    gamesStarted?: number;
  };
  scouting?: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    comparison?: string;
  };
  updatedAt: FirestoreTimestamp;
}

export interface Team {
  id: TeamAbbreviation;
  name: string;
  city: string;
  mascot: string;
  conference: 'AFC' | 'NFC';
  division: 'North' | 'South' | 'East' | 'West';
  picks: {
    year: number;
    slots: DraftSlot[];
  };
  needs?: Position[];
  personality?: {
    tendencies?: string;
    recentDraftHistory?: string;
    reportedInterests?: string[];
  };
}

// ---- Trade Types ----

export type TradeStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export interface TradePiece {
  type: 'current-pick' | 'future-pick';
  // For current-pick:
  overall?: number;
  // For future-pick:
  year?: number;
  round?: number;
  originalTeam?: TeamAbbreviation;
}

export interface Trade {
  id: string;
  draftId: string;
  status: TradeStatus;
  proposerId: string;
  recipientId: string | null; // null = CPU trade
  recipientTeam: TeamAbbreviation; // The CPU team or user's team being traded with
  proposerGives: TradePiece[];
  proposerReceives: TradePiece[];
  proposedAt: FirestoreTimestamp;
  resolvedAt?: FirestoreTimestamp;
  isForceTrade: boolean;
}
