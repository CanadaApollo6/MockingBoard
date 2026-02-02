import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { runCpuCascade } from './draft-actions';
import { getPickController } from '@mockingboard/shared';
import type {
  Draft,
  TeamAbbreviation,
  TeamAssignmentMode,
} from '@mockingboard/shared';

// ---- Join Logic ----

export interface JoinLobbyInput {
  draftId: string;
  userId: string;
  displayName: string;
  discordId?: string;
  team?: TeamAbbreviation;
  inviteCode?: string;
}

export interface JoinLobbyResult {
  team: TeamAbbreviation;
  displayName: string;
}

export async function joinLobby(
  input: JoinLobbyInput,
): Promise<JoinLobbyResult> {
  const draftDoc = await adminDb.collection('drafts').doc(input.draftId).get();
  if (!draftDoc.exists) throw new Error('Draft not found');
  const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

  if (draft.status !== 'lobby') {
    throw new Error('Draft is not in lobby state');
  }

  // Check not already a participant
  if (draft.participants[input.userId]) {
    throw new Error('Already in this draft');
  }

  // Validate invite code for private drafts
  if (draft.visibility === 'private') {
    if (!input.inviteCode || input.inviteCode !== draft.inviteCode) {
      throw new Error('Invalid invite code');
    }
  }

  // Assign team
  const assignedTeam = resolveTeamAssignment(
    draft,
    input.team,
    draft.config.teamAssignmentMode,
  );

  const discordId = input.discordId ?? input.userId;
  const participantIds = [
    ...new Set([
      ...((draftDoc.data()?.participantIds as string[]) ?? []),
      input.userId,
      discordId,
    ]),
  ];

  await adminDb
    .collection('drafts')
    .doc(input.draftId)
    .update({
      [`participants.${input.userId}`]: discordId,
      [`participantNames.${input.userId}`]: input.displayName,
      [`teamAssignments.${assignedTeam}`]: input.userId,
      participantIds,
      updatedAt: FieldValue.serverTimestamp(),
    });

  return { team: assignedTeam, displayName: input.displayName };
}

function resolveTeamAssignment(
  draft: Draft,
  requestedTeam: TeamAbbreviation | undefined,
  mode: TeamAssignmentMode,
): TeamAbbreviation {
  const availableTeams = Object.entries(draft.teamAssignments)
    .filter(([, userId]) => userId === null)
    .map(([team]) => team as TeamAbbreviation);

  if (availableTeams.length === 0) {
    throw new Error('No teams available');
  }

  if (mode === 'choice') {
    if (!requestedTeam) {
      throw new Error('Team selection required');
    }
    if (!availableTeams.includes(requestedTeam)) {
      throw new Error('Team not available');
    }
    return requestedTeam;
  }

  // Random assignment
  const idx = Math.floor(Math.random() * availableTeams.length);
  return availableTeams[idx];
}

// ---- Start Logic ----

export async function startDraft(
  draftId: string,
  userId: string,
): Promise<{ started: boolean }> {
  const draftDoc = await adminDb.collection('drafts').doc(draftId).get();
  if (!draftDoc.exists) throw new Error('Draft not found');
  const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

  if (draft.createdBy !== userId) {
    throw new Error('Only the creator can start the draft');
  }

  if (draft.status !== 'lobby') {
    throw new Error('Draft is not in lobby state');
  }

  const participantCount = Object.keys(draft.participants).length;
  if (participantCount < 1) {
    throw new Error('At least one participant required');
  }

  await adminDb.collection('drafts').doc(draftId).update({
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // If the first pick is a CPU team, run the cascade
  const firstSlot = draft.pickOrder[0];
  if (firstSlot) {
    const controller = getPickController(draft, firstSlot);
    if (controller === null) {
      await runCpuCascade(draftId);
    }
  }

  return { started: true };
}

// ---- Leave Logic ----

export async function leaveLobby(
  draftId: string,
  userId: string,
): Promise<void> {
  const draftDoc = await adminDb.collection('drafts').doc(draftId).get();
  if (!draftDoc.exists) throw new Error('Draft not found');
  const draft = { id: draftDoc.id, ...draftDoc.data() } as Draft;

  if (draft.status !== 'lobby') {
    throw new Error('Draft is not in lobby state');
  }

  if (draft.createdBy === userId) {
    throw new Error('Creator cannot leave the draft');
  }

  if (!draft.participants[userId]) {
    throw new Error('Not a participant');
  }

  // Find and unassign their team
  const userTeam = Object.entries(draft.teamAssignments).find(
    ([, uid]) => uid === userId,
  );

  const updates: Record<string, unknown> = {
    [`participants.${userId}`]: FieldValue.delete(),
    [`participantNames.${userId}`]: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (userTeam) {
    updates[`teamAssignments.${userTeam[0]}`] = null;
  }

  // Remove from participantIds array
  const currentIds = (draftDoc.data()?.participantIds as string[]) ?? [];
  const discordId = draft.participants[userId];
  updates.participantIds = currentIds.filter(
    (id) => id !== userId && id !== discordId,
  );

  await adminDb.collection('drafts').doc(draftId).update(updates);
}
