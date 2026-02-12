const POSITION_VAR_MAP: Record<string, string> = {
  QB: '--pos-qb',
  WR: '--pos-wr',
  TE: '--pos-te',
  RB: '--pos-rb',
  OL: '--pos-ol',
  OT: '--pos-ol',
  OG: '--pos-ol',
  C: '--pos-ol',
  DL: '--pos-dl',
  DT: '--pos-dl',
  DE: '--pos-dl',
  EDGE: '--pos-edge',
  LB: '--pos-lb',
  ILB: '--pos-lb',
  OLB: '--pos-lb',
  CB: '--pos-cb',
  S: '--pos-s',
  FS: '--pos-s',
  SS: '--pos-s',
};

/** Returns the CSS variable reference for a position, e.g. `var(--pos-qb)`. */
export function getPositionColor(position: string): string {
  const cssVar = POSITION_VAR_MAP[position.toUpperCase()];
  return cssVar ? `var(${cssVar})` : 'var(--muted-foreground)';
}

/** Returns the CSS variable name (without `var()`) for a position. */
export function getPositionVar(position: string): string {
  return POSITION_VAR_MAP[position.toUpperCase()] ?? '--muted-foreground';
}
