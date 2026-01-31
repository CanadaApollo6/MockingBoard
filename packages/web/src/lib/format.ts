import type { FirestoreTimestamp } from '@mockingboard/shared';

export function timestampToDate(ts: FirestoreTimestamp): Date {
  return new Date(ts.seconds * 1000 + ts.nanoseconds / 1_000_000);
}

export function formatDraftDate(ts: FirestoreTimestamp): string {
  return timestampToDate(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(ts: FirestoreTimestamp): string {
  const now = Date.now();
  const then = ts.seconds * 1000;
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
