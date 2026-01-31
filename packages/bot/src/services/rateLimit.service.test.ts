import {
  checkRateLimit,
  getRemainingCooldown,
  clearRateLimit,
  clearAllRateLimits,
} from './rateLimit.service.js';

describe('rateLimit.service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('allows first action', () => {
      expect(checkRateLimit('user-1', 'pick', 1000)).toBe(true);
    });

    it('blocks action within cooldown', () => {
      checkRateLimit('user-1', 'pick', 1000);
      expect(checkRateLimit('user-1', 'pick', 1000)).toBe(false);
    });

    it('allows action after cooldown expires', () => {
      checkRateLimit('user-1', 'pick', 1000);
      vi.advanceTimersByTime(1001);
      expect(checkRateLimit('user-1', 'pick', 1000)).toBe(true);
    });

    it('tracks different actions independently', () => {
      checkRateLimit('user-1', 'pick', 1000);
      expect(checkRateLimit('user-1', 'trade', 1000)).toBe(true);
    });

    it('tracks different users independently', () => {
      checkRateLimit('user-1', 'pick', 1000);
      expect(checkRateLimit('user-2', 'pick', 1000)).toBe(true);
    });
  });

  describe('getRemainingCooldown', () => {
    it('returns 0 when not rate limited', () => {
      expect(getRemainingCooldown('user-1', 'pick', 1000)).toBe(0);
    });

    it('returns remaining time within cooldown', () => {
      checkRateLimit('user-1', 'pick', 1000);
      vi.advanceTimersByTime(300);
      expect(getRemainingCooldown('user-1', 'pick', 1000)).toBe(700);
    });

    it('returns 0 after cooldown expires', () => {
      checkRateLimit('user-1', 'pick', 1000);
      vi.advanceTimersByTime(1001);
      expect(getRemainingCooldown('user-1', 'pick', 1000)).toBe(0);
    });
  });

  describe('clearRateLimit', () => {
    it('clears a specific rate limit entry', () => {
      checkRateLimit('user-1', 'pick', 1000);
      clearRateLimit('user-1', 'pick');
      expect(checkRateLimit('user-1', 'pick', 1000)).toBe(true);
    });

    it('does not affect other entries', () => {
      checkRateLimit('user-1', 'pick', 1000);
      checkRateLimit('user-1', 'trade', 1000);
      clearRateLimit('user-1', 'pick');
      expect(checkRateLimit('user-1', 'trade', 1000)).toBe(false);
    });
  });

  describe('clearAllRateLimits', () => {
    it('clears all entries', () => {
      checkRateLimit('user-1', 'pick', 1000);
      checkRateLimit('user-2', 'trade', 1000);
      clearAllRateLimits();
      expect(checkRateLimit('user-1', 'pick', 1000)).toBe(true);
      expect(checkRateLimit('user-2', 'trade', 1000)).toBe(true);
    });
  });
});
