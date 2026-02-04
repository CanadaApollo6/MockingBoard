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

export type DraftStatus =
  | 'lobby'
  | 'active'
  | 'paused'
  | 'complete'
  | 'cancelled';
export type DraftFormat = 'full' | 'single-team';
export type DraftPlatform = 'discord' | 'web';
export type TeamAssignmentMode = 'random' | 'choice';
export type CpuSpeed = 'instant' | 'fast' | 'normal';
export type NotificationLevel = 'off' | 'link-only' | 'full';
export type DraftVisibility = 'public' | 'unlisted' | 'private';

// ---- Supporting Types ----

export interface DraftSlot {
  overall: number;
  round: number;
  pick: number;
  team: TeamAbbreviation;
  ownerOverride?: string | null; // User ID if traded to human; null if traded to CPU; undefined if not traded
  teamOverride?: TeamAbbreviation; // Set by trades: the team that now controls this pick
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
  displayName: string;
  email?: string;
  discordId?: string;
  firebaseUid?: string;
  discordUsername?: string;
  discordAvatar?: string;
  createdAt: FirestoreTimestamp;
  discordWebhookUrl?: string;
  updatedAt: FirestoreTimestamp;
  preferences?: {
    statedWeights?: PreferenceWeights;
    revealedWeights?: PreferenceWeights;
  };
  isGuest?: boolean;
  stats?: {
    totalDrafts: number;
    totalPicks: number;
    accuracyScore?: number;
  };
  // Public profile fields
  slug?: string;
  bio?: string;
  avatar?: string;
  links?: {
    youtube?: string;
    twitter?: string;
    bluesky?: string;
    website?: string;
  };
  isPublic?: boolean;
}

export interface Draft {
  id: string;
  name?: string;
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
  futurePicks?: FutureDraftPick[];
  pickedPlayerIds: string[];
  isLocked?: boolean;
  lockedAt?: FirestoreTimestamp;
  notificationLevel?: NotificationLevel;
  webhookThreadId?: string;
  visibility?: DraftVisibility;
  inviteCode?: string;
  participantNames?: Record<string, string>;
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
    wingSpan?: number;
    captain?: boolean;
    yearInSchool?:
      | 'FR'
      | 'SO'
      | 'JR'
      | 'SR'
      | 'RS-FR'
      | 'RS-SO'
      | 'RS-JR'
      | 'RS-SR';
    gamesStarted?: number;
    previousSchools?: string[];
  };
  stats?: Record<string, number | string | null>;
  scouting?: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    comparison?: string;
  };
  dataProviders?: Record<
    string,
    {
      name: string;
      slug: string;
      fields: string[];
    }
  >;
  updatedAt: FirestoreTimestamp;
}

export interface Team {
  id: TeamAbbreviation;
  name: string;
  city: string;
  mascot: string;
  conference: 'AFC' | 'NFC';
  division: 'North' | 'South' | 'East' | 'West';
  needs?: Position[];
  futurePicks?: FuturePickSeed[];
  personality?: {
    tendencies?: string;
    recentDraftHistory?: string;
    reportedInterests?: string[];
  };
}

// ---- Future Pick Types ----

export interface FuturePickSeed {
  year: number;
  round: number;
  originalTeam: TeamAbbreviation;
}

export interface FutureDraftPick {
  year: number;
  round: number;
  originalTeam: TeamAbbreviation;
  ownerTeam: TeamAbbreviation;
  /** Overall pick number — only present for current-year extra-round picks. */
  overall?: number;
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
  proposerTeam: TeamAbbreviation;
  recipientId: string | null; // null = CPU trade
  recipientTeam: TeamAbbreviation; // The CPU team or user's team being traded with
  proposerGives: TradePiece[];
  proposerReceives: TradePiece[];
  proposedAt: FirestoreTimestamp;
  resolvedAt?: FirestoreTimestamp;
  expiresAt?: FirestoreTimestamp;
  isForceTrade: boolean;
}

// ---- Scout & Big Board Types ----

export type ScoutTier = 'contributor' | 'scout' | 'elite';

export interface ScoutProfile {
  id: string;
  userId?: string;
  name: string;
  slug: string;
  bio?: string;
  avatar?: string;
  links?: {
    youtube?: string;
    twitter?: string;
    bluesky?: string;
    website?: string;
  };
  stats?: {
    playersContributed: number;
    positionsCovered: Position[];
  };
  tier?: ScoutTier;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type BoardVisibility = 'private' | 'public';

export interface BigBoard {
  id: string;
  userId: string;
  name: string;
  year: number;
  rankings: string[];
  customPlayers?: CustomPlayer[];
  basedOn?: 'consensus' | 'blank';
  visibility?: BoardVisibility;
  slug?: string;
  description?: string;
  authorName?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface CustomPlayer {
  id: string;
  name: string;
  position: Position;
  school: string;
  note?: string;
}

export interface BoardSnapshot {
  id: string;
  rankings: string[];
  label?: string;
  createdAt: FirestoreTimestamp;
}

// ---- Scouting Report Types ----

export interface ScoutingReport {
  id: string;
  playerId: string;
  authorId: string;
  authorName: string;
  year: number;
  grade?: number;
  comparison?: string;
  strengths?: string[];
  weaknesses?: string[];
  content?: Record<string, unknown>;
  contentText?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface Follow {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: FirestoreTimestamp;
}
