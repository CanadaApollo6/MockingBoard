import { db } from '../utils/firestore.js';
import type { Player } from '@mockingboard/shared';

const playersRef = db.collection('players');

const PLAYER_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const playersByYearCache = new Map<
  number,
  { data: Player[]; expiresAt: number }
>();

export async function getPlayersByYear(year: number): Promise<Player[]> {
  const cached = playersByYearCache.get(year);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const snapshot = await playersRef
    .where('year', '==', year)
    .orderBy('consensusRank')
    .get();

  const players = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Player[];

  playersByYearCache.set(year, {
    data: players,
    expiresAt: Date.now() + PLAYER_CACHE_TTL,
  });
  return players;
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const doc = await playersRef.doc(playerId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Player;
}
