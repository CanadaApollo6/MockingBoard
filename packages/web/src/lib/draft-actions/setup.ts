import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase/firebase-admin';
import {
  getCachedDraftOrderSlots,
  getCachedTeamDocs,
  getCachedDraftNames,
} from '../cache';
import { hydrateDoc } from '../firebase/sanitize';
import type {
  Draft,
  DraftFormat,
  DraftVisibility,
  DraftSlot,
  FutureDraftPick,
  FuturePickSeed,
  NotificationLevel,
  TeamAssignmentMode,
  TeamAbbreviation,
  CpuSpeed,
} from '@mockingboard/shared';
import {
  teams,
  filterAndSortPickOrder,
  buildFuturePicksFromSeeds,
  generateDraftName as _generateDraftName,
} from '@mockingboard/shared';

/** Generate a draft name using Firestore overrides if available, else shared defaults. */
async function generateDraftNameFromCache(): Promise<string> {
  const override = await getCachedDraftNames();
  if (override) {
    const adj =
      override.adjectives[
        Math.floor(Math.random() * override.adjectives.length)
      ];
    const noun =
      override.nouns[Math.floor(Math.random() * override.nouns.length)];
    return `${adj} ${noun}`;
  }
  return _generateDraftName();
}

// ---- Draft Setup ----

export async function buildPickOrder(
  rounds: number,
  year: number,
): Promise<DraftSlot[]> {
  const slots = await getCachedDraftOrderSlots(year);
  return filterAndSortPickOrder(slots, rounds);
}

export async function buildFuturePicks(
  draftYear: number,
  draftRounds: number = 7,
): Promise<FutureDraftPick[]> {
  const allTeamIds = teams.map((t) => t.id);
  const cachedTeams = await getCachedTeamDocs();

  const seededPicksByTeam: Record<string, FuturePickSeed[] | undefined> = {};
  for (const doc of cachedTeams) {
    seededPicksByTeam[doc.id] = doc.futurePicks;
  }

  const future = buildFuturePicksFromSeeds(
    draftYear,
    allTeamIds,
    seededPicksByTeam,
  );

  // Add current-year rounds beyond the draft's configured rounds as tradeable assets
  if (draftRounds < 7) {
    const allSlots = await getCachedDraftOrderSlots(draftYear);
    const extraSlots = allSlots.filter((s) => s.round > draftRounds);
    const extraPicks: FutureDraftPick[] = extraSlots.map((s) => ({
      year: draftYear,
      round: s.round,
      originalTeam: s.team,
      ownerTeam: s.team,
      overall: s.overall,
    }));
    return [...extraPicks, ...future];
  }

  return future;
}

export interface CreateWebDraftInput {
  userId: string;
  discordId: string;
  displayName?: string;
  name?: string;
  config: {
    rounds: number;
    format: DraftFormat;
    year: number;
    cpuSpeed: CpuSpeed;
    secondsPerPick?: number;
    tradesEnabled: boolean;
    teamAssignmentMode?: TeamAssignmentMode;
    boardId?: string;
  };
  teamAssignments: Record<TeamAbbreviation, string | null>;
  pickOrder: DraftSlot[];
  futurePicks: FutureDraftPick[];
  notificationLevel?: NotificationLevel;
  multiplayer?: boolean;
  visibility?: DraftVisibility;
}

export async function createWebDraft(
  input: CreateWebDraftInput,
): Promise<Draft> {
  const now = FieldValue.serverTimestamp();
  const isMultiplayer = !!input.multiplayer;

  const draftData: Record<string, unknown> = {
    name: input.name || (await generateDraftNameFromCache()),
    createdBy: input.userId,
    config: {
      ...input.config,
      secondsPerPick: input.config.secondsPerPick ?? 0,
      teamAssignmentMode: input.config.teamAssignmentMode ?? 'choice',
    },
    platform: 'web' as const,
    status: isMultiplayer ? 'lobby' : 'active',
    currentPick: 1,
    currentRound: 1,
    teamAssignments: input.teamAssignments,
    participants: { [input.userId]: input.discordId },
    participantIds: [...new Set([input.userId, input.discordId])],
    participantNames: {
      [input.userId]: input.displayName ?? 'Player 1',
    },
    pickOrder: input.pickOrder,
    futurePicks: input.futurePicks,
    pickedPlayerIds: [] as string[],
    createdAt: now,
    updatedAt: now,
  };

  if (input.notificationLevel && input.notificationLevel !== 'off') {
    draftData.notificationLevel = input.notificationLevel;
  }

  if (isMultiplayer) {
    draftData.visibility = input.visibility ?? 'public';
    if (input.visibility === 'private') {
      draftData.inviteCode = crypto.randomUUID().slice(0, 8);
    }
  }

  const docRef = await adminDb.collection('drafts').add(draftData);
  const created = await docRef.get();
  return hydrateDoc<Draft>(created);
}
