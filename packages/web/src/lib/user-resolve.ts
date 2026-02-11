import 'server-only';

import { adminDb } from './firebase-admin';
import { hydrateDoc } from './sanitize';
import { AppError } from './validate';
import type { Draft, User } from '@mockingboard/shared';

/**
 * Resolve a Firebase Auth UID to the internal Firestore user doc.
 * Checks firebaseUid first, then falls back to discordId for legacy
 * sessions where Discord ID was used as the Firebase UID.
 */
export async function resolveUser(firebaseUid: string): Promise<User | null> {
  // Primary: look up by firebaseUid field
  const byFirebase = await adminDb
    .collection('users')
    .where('firebaseUid', '==', firebaseUid)
    .limit(1)
    .get();

  if (!byFirebase.empty) {
    const doc = byFirebase.docs[0];
    return hydrateDoc<User>(doc);
  }

  // Fallback: look up by discordId (legacy web sessions)
  const byDiscord = await adminDb
    .collection('users')
    .where('discordId', '==', firebaseUid)
    .limit(1)
    .get();

  if (!byDiscord.empty) {
    const doc = byDiscord.docs[0];
    return hydrateDoc<User>(doc);
  }

  return null;
}

/**
 * Check if a user is a participant in a draft.
 * Handles three patterns:
 * - Bot drafts: participants = { firestoreDocId: discordId }
 * - Old web drafts: participants = { discordId: discordId }
 * - New web drafts: participants = { firestoreDocId: discordId }
 */
export function isUserInDraft(
  draft: Draft,
  sessionUid: string,
  discordId?: string,
): boolean {
  const participants = draft.participants ?? {};
  const keys = Object.keys(participants);
  const values = Object.values(participants);

  if (keys.includes(sessionUid) || values.includes(sessionUid)) return true;
  if (discordId && (keys.includes(discordId) || values.includes(discordId)))
    return true;

  return false;
}

/**
 * Throw 403 if the session user is not the draft creator.
 */
export async function assertDraftCreator(
  sessionUid: string,
  draft: Draft,
): Promise<void> {
  const user = await resolveUser(sessionUid);
  const isCreator =
    draft.createdBy === sessionUid ||
    (user?.discordId != null && draft.createdBy === user.discordId);
  if (!isCreator) throw new AppError('Only the draft creator can do this', 403);
}
