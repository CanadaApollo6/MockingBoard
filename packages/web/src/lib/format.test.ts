/// <reference types="vitest/globals" />
import {
  timestampToDate,
  formatDraftDate,
  formatRelativeTime,
} from './format.js';
import type { FirestoreTimestamp } from '@mockingboard/shared';

function ts(seconds: number, nanoseconds = 0): FirestoreTimestamp {
  return { seconds, nanoseconds };
}

/** Simulates Firestore Admin SDK internal format with underscored keys. */
function underscoreTs(seconds: number, nanoseconds = 0): FirestoreTimestamp {
  return {
    _seconds: seconds,
    _nanoseconds: nanoseconds,
  } as unknown as FirestoreTimestamp;
}

describe('format', () => {
  describe('timestampToDate', () => {
    it('converts seconds to Date', () => {
      const date = timestampToDate(ts(1704067200)); // 2024-01-01T00:00:00Z
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCDate()).toBe(1);
    });

    it('includes nanoseconds', () => {
      const date = timestampToDate(ts(1704067200, 500_000_000));
      expect(date.getMilliseconds()).toBe(500);
    });

    it('handles _seconds/_nanoseconds format', () => {
      const date = timestampToDate(underscoreTs(1704067200));
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCDate()).toBe(1);
    });

    it('handles _seconds/_nanoseconds with nanoseconds', () => {
      const date = timestampToDate(underscoreTs(1704067200, 500_000_000));
      expect(date.getMilliseconds()).toBe(500);
    });
  });

  describe('formatDraftDate', () => {
    it('formats as readable date string', () => {
      const result = formatDraftDate(ts(1704110400)); // 2024-01-01T12:00:00Z (midday, safe across timezones)
      expect(result).toContain('2024');
      expect(result).toContain('Jan');
    });

    it('works with underscore format', () => {
      const result = formatDraftDate(underscoreTs(1704110400));
      expect(result).toContain('2024');
      expect(result).toContain('Jan');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('returns "just now" for < 1 minute', () => {
      const now = Date.now() / 1000;
      vi.setSystemTime(now * 1000);
      expect(formatRelativeTime(ts(now - 30))).toBe('just now');
    });

    it('works with underscore format', () => {
      const now = Date.now() / 1000;
      vi.setSystemTime(now * 1000);
      expect(formatRelativeTime(underscoreTs(now - 30))).toBe('just now');
    });

    it('returns minutes for < 1 hour', () => {
      const now = Date.now() / 1000;
      vi.setSystemTime(now * 1000);
      expect(formatRelativeTime(ts(now - 300))).toBe('5m ago');
    });

    it('returns hours for < 1 day', () => {
      const now = Date.now() / 1000;
      vi.setSystemTime(now * 1000);
      expect(formatRelativeTime(ts(now - 7200))).toBe('2h ago');
    });

    it('returns days for < 1 week', () => {
      const now = Date.now() / 1000;
      vi.setSystemTime(now * 1000);
      expect(formatRelativeTime(ts(now - 86400 * 3))).toBe('3d ago');
    });

    it('returns formatted date for >= 1 week', () => {
      const now = Date.now() / 1000;
      vi.setSystemTime(now * 1000);
      const result = formatRelativeTime(ts(now - 86400 * 10));
      // Should be a formatted date, not relative
      expect(result).not.toContain('ago');
    });
  });
});
