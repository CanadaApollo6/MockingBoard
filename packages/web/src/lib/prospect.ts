import type { Player } from '@mockingboard/shared';

/** Deterministic daily rotation from top 100 ranked prospects. */
export function getProspectOfTheDay(
  players: Map<string, Player>,
): Player | null {
  const ranked = [...players.values()]
    .filter((p) => p.consensusRank > 0)
    .sort((a, b) => a.consensusRank - b.consensusRank)
    .slice(0, 100);

  if (ranked.length === 0) return null;

  const dateStr = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return ranked[Math.abs(hash) % ranked.length];
}
