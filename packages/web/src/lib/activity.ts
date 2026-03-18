import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase/firebase-admin';
import type { ActivityEventType } from '@mockingboard/shared';

interface FanOutParams {
  actorId: string;
  type: ActivityEventType;
  targetId: string;
  targetName: string;
  targetLink: string;
}

/**
 * Fan out an activity event to all followers of the actor.
 * Writes one `activityEvents` document per follower.
 * Caller should invoke fire-and-forget: `fanOutActivity({...}).catch(() => {})`.
 */
export async function fanOutActivity(params: FanOutParams): Promise<void> {
  const { actorId, type, targetId, targetName, targetLink } = params;

  const followersSnap = await adminDb
    .collection('follows')
    .where('followeeId', '==', actorId)
    .limit(200)
    .get();

  if (followersSnap.empty) return;

  const userDoc = await adminDb.collection('users').doc(actorId).get();
  const actorName = userDoc.data()?.displayName ?? 'A scout';

  const batch = adminDb.batch();
  for (const doc of followersSnap.docs) {
    const ref = adminDb.collection('activityEvents').doc();
    batch.set(ref, {
      type,
      actorId,
      actorName,
      targetId,
      targetName,
      targetLink,
      feedUserId: doc.data().followerId,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}
