import 'server-only';

import type { TeamAbbreviation, TeamContractData } from '@mockingboard/shared';
import { type CacheEntry, getOrExpire, adminDb } from './common';

export const CONTRACTS_TTL = 6 * 60 * 60 * 1000; // 6 hours

const contractsCache = new Map<string, CacheEntry<TeamContractData>>();

/** Contract data for a team from Firestore, cached for 6 hours. */
export async function getCachedTeamContracts(
  team: TeamAbbreviation,
): Promise<TeamContractData | null> {
  const cached = getOrExpire(contractsCache, team);
  if (cached) return cached;

  const doc = await adminDb.collection('teamContracts').doc(team).get();
  if (!doc.exists) return null;

  const data = doc.data() as TeamContractData;
  contractsCache.set(team, { data, expiresAt: Date.now() + CONTRACTS_TTL });
  return data;
}

/** Invalidate all contract caches (call after admin import). */
export function resetContractsCache(): void {
  contractsCache.clear();
}
