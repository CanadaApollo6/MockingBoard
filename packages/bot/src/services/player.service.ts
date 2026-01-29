import { db } from '../utils/firestore.js';
import type { Player } from '@mockingboard/shared';

const playersRef = db.collection('players');

export async function getPlayersByYear(year: number): Promise<Player[]> {
  const snapshot = await playersRef
    .where('year', '==', year)
    .orderBy('consensusRank')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Player[];
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const doc = await playersRef.doc(playerId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Player;
}
