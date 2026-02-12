/// <reference types="vitest/globals" />
import {
  timestampToDate,
  formatDraftDate,
  formatRelativeTime,
  fmtDollar,
  normalizePlayerName,
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

  describe('fmtDollar', () => {
    it('formats zero', () => expect(fmtDollar(0)).toBe('$0'));
    it('formats millions', () => expect(fmtDollar(46_300_000)).toBe('$46.3M'));
    it('formats thousands', () => expect(fmtDollar(478_000)).toBe('$478K'));
    it('formats small amounts', () => expect(fmtDollar(500)).toBe('$500'));
    it('formats negative', () =>
      expect(fmtDollar(-12_500_000)).toBe('-$12.5M'));
  });

  describe('normalizePlayerName', () => {
    it('strips suffix II', () =>
      expect(normalizePlayerName('Patrick Mahomes II')).toBe(
        'patrick mahomes',
      ));
    it('strips suffix Jr.', () =>
      expect(normalizePlayerName('Odell Beckham Jr.')).toBe('odell beckham'));
    it('strips suffix III', () =>
      expect(normalizePlayerName('Robert Griffin III')).toBe('robert griffin'));
    it('strips periods from initials', () =>
      expect(normalizePlayerName('T.J. Watt')).toBe('tj watt'));
    it('lowercases', () =>
      expect(normalizePlayerName('LAMAR JACKSON')).toBe('lamar jackson'));
    it('collapses whitespace', () =>
      expect(normalizePlayerName('  Josh   Allen  ')).toBe('joshua allen'));
    it('handles plain name unchanged', () =>
      expect(normalizePlayerName('Jalen Hurts')).toBe('jalen hurts'));

    // Nickname canonicalization
    it('canonicalizes Mike → Michael', () =>
      expect(normalizePlayerName('Mike Onwenu')).toBe('michael onwenu'));
    it('matches Michael directly', () =>
      expect(normalizePlayerName('Michael Onwenu')).toBe('michael onwenu'));
    it('canonicalizes Matt → Matthew', () =>
      expect(normalizePlayerName('Matt Stafford')).toBe('matthew stafford'));
    it('canonicalizes Chris → Christopher', () =>
      expect(normalizePlayerName('Chris Jones')).toBe('christopher jones'));
    it('canonicalizes Zach → Zachary', () =>
      expect(normalizePlayerName('Zach Wilson')).toBe('zachary wilson'));
    it('canonicalizes with suffix stripping', () =>
      expect(normalizePlayerName('Mike Evans Jr.')).toBe('michael evans'));
    it('leaves unknown first names alone', () =>
      expect(normalizePlayerName('Lamar Jackson')).toBe('lamar jackson'));
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
