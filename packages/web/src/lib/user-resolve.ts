import 'server-only';

import { adminDb } from './firebase-admin';
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
    return { id: doc.id, ...doc.data() } as User;
  }

  // Fallback: look up by discordId (legacy web sessions)
  const byDiscord = await adminDb
    .collection('users')
    .where('discordId', '==', firebaseUid)
    .limit(1)
    .get();

  if (!byDiscord.empty) {
    const doc = byDiscord.docs[0];
    return { id: doc.id, ...doc.data() } as User;
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
  const keys = Object.keys(draft.participants);
  const values = Object.values(draft.participants);

  if (keys.includes(sessionUid) || values.includes(sessionUid)) return true;
  if (discordId && (keys.includes(discordId) || values.includes(discordId)))
    return true;

  return false;
}
