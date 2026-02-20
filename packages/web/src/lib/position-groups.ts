const POSITION_GROUP_MAP: Record<string, Set<string>> = {
  QB: new Set(['QB']),
  RB: new Set(['RB', 'FB']),
  WR: new Set(['WR']),
  TE: new Set(['TE']),
  OL: new Set(['OT', 'OG', 'C', 'G', 'T']),
  DL: new Set(['DE', 'DT', 'NT']),
  LB: new Set(['LB', 'OLB', 'ILB', 'MLB']),
  DB: new Set(['CB', 'S', 'FS', 'SS']),
  'K/P': new Set(['K', 'P', 'LS']),
};

/** Returns the canonical position group name for a given position, or null if unknown. */
export function getPositionGroup(position: string): string | null {
  for (const [group, positions] of Object.entries(POSITION_GROUP_MAP)) {
    if (positions.has(position)) return group;
  }
  return null;
}

/** Returns true if two positions belong to the same group. */
export function isSamePositionGroup(pos1: string, pos2: string): boolean {
  const group1 = getPositionGroup(pos1);
  const group2 = getPositionGroup(pos2);
  return group1 !== null && group1 === group2;
}

/** Returns the Set of positions for a given group name. */
export function getPositionsInGroup(group: string): Set<string> {
  return POSITION_GROUP_MAP[group] ?? new Set();
}
