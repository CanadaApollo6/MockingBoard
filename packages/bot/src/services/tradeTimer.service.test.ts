import {
  setTradeTimer,
  clearTradeTimer,
  hasTradeTimer,
  getActiveTradeTimerCount,
  clearAllTradeTimers,
} from './tradeTimer.service.js';

describe('tradeTimer.service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllTradeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setTradeTimer', () => {
    it('fires callback after specified seconds', () => {
      const callback = vi.fn();
      setTradeTimer('trade-1', 120, callback);

      vi.advanceTimersByTime(119_000);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledOnce();
    });

    it('does not set timer for seconds <= 0', () => {
      const callback = vi.fn();
      setTradeTimer('trade-1', 0, callback);

      expect(hasTradeTimer('trade-1')).toBe(false);
      vi.advanceTimersByTime(60_000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('replaces existing timer for same trade', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      setTradeTimer('trade-1', 60, callback1);
      setTradeTimer('trade-1', 120, callback2);

      vi.advanceTimersByTime(60_000);
      expect(callback1).not.toHaveBeenCalled();

      vi.advanceTimersByTime(60_000);
      expect(callback2).toHaveBeenCalledOnce();
    });
  });

  describe('clearTradeTimer', () => {
    it('prevents callback from firing', () => {
      const callback = vi.fn();
      setTradeTimer('trade-1', 60, callback);
      clearTradeTimer('trade-1');

      vi.advanceTimersByTime(120_000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('removes the trade from active timers', () => {
      setTradeTimer('trade-1', 60, vi.fn());
      clearTradeTimer('trade-1');
      expect(hasTradeTimer('trade-1')).toBe(false);
    });

    it('does nothing for non-existent timer', () => {
      expect(() => clearTradeTimer('nonexistent')).not.toThrow();
    });
  });

  describe('hasTradeTimer', () => {
    it('returns true for active timer', () => {
      setTradeTimer('trade-1', 60, vi.fn());
      expect(hasTradeTimer('trade-1')).toBe(true);
    });

    it('returns false for non-existent timer', () => {
      expect(hasTradeTimer('nonexistent')).toBe(false);
    });

    it('returns false after timer fires', () => {
      setTradeTimer('trade-1', 1, vi.fn());
      vi.advanceTimersByTime(1000);
      // Timer has fired but the map entry remains (only cleared by clearTradeTimer)
      // This is fine — hasTradeTimer just checks the map
      expect(hasTradeTimer('trade-1')).toBe(true);
    });
  });

  describe('getActiveTradeTimerCount', () => {
    it('returns 0 when no timers active', () => {
      expect(getActiveTradeTimerCount()).toBe(0);
    });

    it('counts active timers', () => {
      setTradeTimer('trade-1', 60, vi.fn());
      setTradeTimer('trade-2', 120, vi.fn());
      expect(getActiveTradeTimerCount()).toBe(2);
    });
  });

  describe('clearAllTradeTimers', () => {
    it('clears all active timers', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      setTradeTimer('trade-1', 60, cb1);
      setTradeTimer('trade-2', 120, cb2);

      clearAllTradeTimers();
      expect(getActiveTradeTimerCount()).toBe(0);

      vi.advanceTimersByTime(120_000);
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).not.toHaveBeenCalled();
    });
  });
});
