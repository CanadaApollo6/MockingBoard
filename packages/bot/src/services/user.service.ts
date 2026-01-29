import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../utils/firestore.js';
import type { User } from '@mockingboard/shared';

export async function getOrCreateUser(
  discordId: string,
  discordUsername: string,
  discordAvatar?: string,
): Promise<User> {
  const usersRef = db.collection('users');
  const snapshot = await usersRef
    .where('discordId', '==', discordId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  const now = FieldValue.serverTimestamp();
  const userData = {
    discordId,
    discordUsername,
    ...(discordAvatar && { discordAvatar }),
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await usersRef.add(userData);
  const created = await docRef.get();
  return { id: created.id, ...created.data() } as User;
}
