import type { Player, Position } from '@mockingboard/shared';

export function selectCpuPick(
  availablePlayers: Player[],
  teamNeeds: Position[],
): Player {
  if (availablePlayers.length === 0) {
    throw new Error('No available players');
  }

  const sorted = [...availablePlayers].sort(
    (a, b) => a.consensusRank - b.consensusRank,
  );
  const topFive = sorted.slice(0, 5);

  if (teamNeeds.length > 0) {
    const needInTopFive = topFive.find((p) => teamNeeds.includes(p.position));
    if (needInTopFive) return needInTopFive;
  }

  // BPA with weighted randomization
  const roll = Math.random();
  if (roll < 0.7 || sorted.length === 1) return sorted[0];
  if (roll < 0.9 || sorted.length === 2) return sorted[1];
  return sorted[2];
}
