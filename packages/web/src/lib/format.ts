import type { FirestoreTimestamp } from '@mockingboard/shared';

/** Extract seconds from a timestamp that may use `_seconds` (Firestore Admin SDK
 *  internal format) or `seconds` (our canonical serialized format). */
function extractSeconds(ts: FirestoreTimestamp): number {
  return ts.seconds ?? (ts as unknown as { _seconds: number })._seconds ?? 0;
}

function extractNanoseconds(ts: FirestoreTimestamp): number {
  return (
    ts.nanoseconds ??
    (ts as unknown as { _nanoseconds: number })._nanoseconds ??
    0
  );
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
