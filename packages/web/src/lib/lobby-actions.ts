import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase/firebase-admin';
import { runCpuCascade } from './draft-actions';
import { AppError } from './validate';
import { getPickController } from '@mockingboard/shared';
import { hydrateDoc } from './firebase/sanitize';
import type {
  Draft,
  TeamAbbreviation,
  TeamAssignmentMode,
} from '@mockingboard/shared';

/** Compute participantIds array from the participants map (source of truth). */
function buildParticipantIds(participants: Record<string, string>): string[] {
  return [
    ...new Set([...Object.keys(participants), ...Object.values(participants)]),
  ];
}

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
  if (!draftDoc.exists) throw new AppError('Draft not found', 404);
  const draft = hydrateDoc<Draft>(draftDoc);

  if (draft.status !== 'lobby') {
    throw new AppError('Draft is not in lobby state');
  }

  // Check not already a participant
  if (draft.participants[input.userId]) {
    throw new AppError('Already in this draft', 409);
  }

  // Validate invite code for private drafts
  if (draft.visibility === 'private') {
    if (!input.inviteCode || input.inviteCode !== draft.inviteCode) {
      throw new AppError('Invalid invite code', 403);
    }
  }

  // Assign team
  const assignedTeam = resolveTeamAssignment(
    draft,
    input.team,
    draft.config.teamAssignmentMode,
  );

  const discordId = input.discordId ?? input.userId;
  const updatedParticipants = {
    ...draft.participants,
    [input.userId]: discordId,
  };

  await adminDb
    .collection('drafts')
    .doc(input.draftId)
    .update({
      [`participants.${input.userId}`]: discordId,
      [`participantNames.${input.userId}`]: input.displayName,
      [`teamAssignments.${assignedTeam}`]: input.userId,
      participantIds: buildParticipantIds(updatedParticipants),
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
    throw new AppError('No teams available');
  }

  if (mode === 'choice') {
    if (!requestedTeam) {
      throw new AppError('Team selection required');
    }
    if (!availableTeams.includes(requestedTeam)) {
      throw new AppError('Team not available', 409);
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
  if (!draftDoc.exists) throw new AppError('Draft not found', 404);
  const draft = hydrateDoc<Draft>(draftDoc);

  if (draft.createdBy !== userId) {
    throw new AppError('Only the creator can start the draft', 403);
  }

  if (draft.status !== 'lobby') {
    throw new AppError('Draft is not in lobby state');
  }

  const participantCount = Object.keys(draft.participants).length;
  if (participantCount < 1) {
    throw new AppError('At least one participant required');
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
  if (!draftDoc.exists) throw new AppError('Draft not found', 404);
  const draft = hydrateDoc<Draft>(draftDoc);

  if (draft.status !== 'lobby') {
    throw new AppError('Draft is not in lobby state');
  }

  if (draft.createdBy === userId) {
    throw new AppError('Creator cannot leave the draft');
  }

  if (!draft.participants[userId]) {
    throw new AppError('Not a participant', 403);
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

  // Recompute participantIds from remaining participants
  const remaining = { ...draft.participants };
  delete remaining[userId];
  updates.participantIds = buildParticipantIds(remaining);

  await adminDb.collection('drafts').doc(draftId).update(updates);
}
