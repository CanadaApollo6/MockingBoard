// @vitest-environment jsdom
/// <reference types="vitest/globals" />
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePickTimer } from './use-pick-timer';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePickTimer', () => {
  it('returns null remaining when secondsPerPick <= 0', () => {
    const { result } = renderHook(() =>
      usePickTimer({ secondsPerPick: 0, isActive: true, onExpire: vi.fn() }),
    );

    expect(result.current.remaining).toBeNull();
  });

  it('starts countdown at secondsPerPick value', () => {
    const { result } = renderHook(() =>
      usePickTimer({ secondsPerPick: 60, isActive: true, onExpire: vi.fn() }),
    );

    expect(result.current.remaining).toBe(60);
  });

  it('decrements every second while active', () => {
    const { result } = renderHook(() =>
      usePickTimer({ secondsPerPick: 60, isActive: true, onExpire: vi.fn() }),
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.remaining).toBe(57);
  });

  it('does not tick when not active', () => {
    const { result } = renderHook(() =>
      usePickTimer({ secondsPerPick: 60, isActive: false, onExpire: vi.fn() }),
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.remaining).toBe(60);
  });

  it('fires onExpire exactly once when reaching 0', () => {
    const onExpire = vi.fn();
    renderHook(() =>
      usePickTimer({ secondsPerPick: 3, isActive: true, onExpire }),
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);

    // Extra ticks should not fire again
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('reset() restores remaining to secondsPerPick', () => {
    const { result } = renderHook(() =>
      usePickTimer({ secondsPerPick: 60, isActive: true, onExpire: vi.fn() }),
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.remaining).toBe(50);

    act(() => {
      result.current.reset();
    });

    expect(result.current.remaining).toBe(60);
  });

  it('onExpire fires again after reset and re-expire', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      usePickTimer({ secondsPerPick: 2, isActive: true, onExpire }),
    );

    // First expiry
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);

    // Reset
    act(() => {
      result.current.reset();
    });

    // Second expiry
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onExpire).toHaveBeenCalledTimes(2);
  });

  it('isWarning is true when remaining <= 30 and > 0', () => {
    const { result } = renderHook(() =>
      usePickTimer({ secondsPerPick: 60, isActive: true, onExpire: vi.fn() }),
    );

    // At 60s: not warning
    expect(result.current.isWarning).toBe(false);

    // Advance to 30s remaining
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(result.current.remaining).toBe(30);
    expect(result.current.isWarning).toBe(true);
  });

  it('isCritical is true when remaining <= 10 and > 0', () => {
    const { result } = renderHook(() =>
      usePickTimer({ secondsPerPick: 60, isActive: true, onExpire: vi.fn() }),
    );

    // Advance to 10s remaining
    act(() => {
      vi.advanceTimersByTime(50000);
    });

    expect(result.current.remaining).toBe(10);
    expect(result.current.isCritical).toBe(true);
  });

  it('isWarning and isCritical are false at 0', () => {
    const { result } = renderHook(() =>
      usePickTimer({ secondsPerPick: 3, isActive: true, onExpire: vi.fn() }),
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.remaining).toBe(0);
    expect(result.current.isWarning).toBe(false);
    expect(result.current.isCritical).toBe(false);
  });
});
