import type { FirestoreTimestamp } from '@mockingboard/shared';

/** Extract seconds from a timestamp that may use `_seconds` (Firestore Admin SDK
 *  internal format) or `seconds` (our canonical serialized format). */
function extractSeconds(ts: FirestoreTimestamp): number {
  return ts.seconds ?? ts._seconds ?? 0;
}

function extractNanoseconds(ts: FirestoreTimestamp): number {
  return ts.nanoseconds ?? ts._nanoseconds ?? 0;
}

/** Convert a FirestoreTimestamp to milliseconds since epoch. */
export function extractTimestampMs(ts: FirestoreTimestamp): number {
  return extractSeconds(ts) * 1000 + extractNanoseconds(ts) / 1_000_000;
}

export function timestampToDate(ts: FirestoreTimestamp): Date {
  return new Date(
    extractSeconds(ts) * 1000 + extractNanoseconds(ts) / 1_000_000,
  );
}

export function formatDraftDate(ts: FirestoreTimestamp): string {
  return timestampToDate(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getDraftDisplayName(draft: {
  name?: string;
  config: { year: number };
}): string {
  return draft.name ?? `${draft.config.year} Mock Draft`;
}

export function formatRelativeTime(ts: FirestoreTimestamp): string {
  const now = Date.now();
  const then = extractSeconds(ts) * 1000;
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDraftDate(ts);
}

/** Format a dollar amount as a compact string (e.g., $46.3M, $478K, $0). */
export function fmtDollar(n: number): string {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

const NAME_SUFFIXES = /\b(jr\.?|sr\.?|ii|iii|iv|v)$/i;

/** Map common first-name nicknames to a canonical full form so that
 *  "Mike Onwenu" (ESPN) and "Michael Onwenu" (OTC) resolve to the same key. */
const NICKNAME_TO_CANONICAL: Record<string, string> = {
  mike: 'michael',
  matt: 'matthew',
  chris: 'christopher',
  dan: 'daniel',
  danny: 'daniel',
  pat: 'patrick',
  ben: 'benjamin',
  benny: 'benjamin',
  bill: 'william',
  billy: 'william',
  will: 'william',
  willie: 'william',
  bob: 'robert',
  bobby: 'robert',
  rob: 'robert',
  robbie: 'robert',
  jim: 'james',
  jimmy: 'james',
  joe: 'joseph',
  tom: 'thomas',
  tommy: 'thomas',
  nick: 'nicholas',
  ed: 'edward',
  eddie: 'edward',
  dave: 'david',
  steve: 'steven',
  tony: 'anthony',
  rick: 'richard',
  ricky: 'richard',
  dick: 'richard',
  ken: 'kenneth',
  kenny: 'kenneth',
  sam: 'samuel',
  sammy: 'samuel',
  tim: 'timothy',
  timmy: 'timothy',
  jeff: 'jeffrey',
  greg: 'gregory',
  gabe: 'gabriel',
  alex: 'alexander',
  zach: 'zachary',
  zack: 'zachary',
  josh: 'joshua',
  jon: 'jonathan',
  jake: 'jacob',
  nate: 'nathan',
  drew: 'andrew',
  cam: 'cameron',
  chuck: 'charles',
  charlie: 'charles',
};

/** Normalize a player name for fuzzy matching across data sources (OTC, ESPN).
 *  Lowercases, strips suffixes/periods, and canonicalizes common nicknames. */
export function normalizePlayerName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(NAME_SUFFIXES, '')
    .replace(/\s+/g, ' ')
    .trim();

  const spaceIdx = normalized.indexOf(' ');
  if (spaceIdx === -1) return normalized;

  const first = normalized.slice(0, spaceIdx);
  const rest = normalized.slice(spaceIdx);
  return (NICKNAME_TO_CANONICAL[first] ?? first) + rest;
}
