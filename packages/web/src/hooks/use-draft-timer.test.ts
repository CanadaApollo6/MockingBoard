// @vitest-environment jsdom
/// <reference types="vitest/globals" />
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraftTimer } from './use-draft-timer';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDraftTimer', () => {
  const defaults = {
    secondsPerPick: 60,
    isActive: true,
    onExpire: vi.fn(),
    currentPick: 1,
    status: 'active' as string,
  };

  it('returns clockUrgency normal initially', () => {
    const { result } = renderHook(() => useDraftTimer(defaults));

    expect(result.current.clockUrgency).toBe('normal');
    expect(result.current.remaining).toBe(60);
  });

  it('returns clockUrgency warning when timer in warning range', () => {
    const { result } = renderHook(() => useDraftTimer(defaults));

    act(() => {
      vi.advanceTimersByTime(35000); // 25s remaining
    });

    expect(result.current.clockUrgency).toBe('warning');
  });

  it('returns clockUrgency critical when timer in critical range', () => {
    const { result } = renderHook(() => useDraftTimer(defaults));

    act(() => {
      vi.advanceTimersByTime(55000); // 5s remaining
    });

    expect(result.current.clockUrgency).toBe('critical');
  });

  it('resets timer when currentPick changes', () => {
    const { result, rerender } = renderHook((props) => useDraftTimer(props), {
      initialProps: defaults,
    });

    // Advance timer partially
    act(() => {
      vi.advanceTimersByTime(20000); // 40s remaining
    });
    expect(result.current.remaining).toBe(40);

    // Change pick
    rerender({ ...defaults, currentPick: 2 });

    expect(result.current.remaining).toBe(60);
  });

  it('resets timer when status transitions from paused to active', () => {
    const { result, rerender } = renderHook((props) => useDraftTimer(props), {
      initialProps: { ...defaults, status: 'paused', isActive: false },
    });

    // Simulate pause → active
    rerender({ ...defaults, status: 'active', isActive: true });

    expect(result.current.remaining).toBe(60);
  });

  it('does not reset on other status transitions', () => {
    const { result, rerender } = renderHook((props) => useDraftTimer(props), {
      initialProps: defaults,
    });

    act(() => {
      vi.advanceTimersByTime(20000); // 40s remaining
    });

    // active → active (no change)
    rerender({ ...defaults, status: 'active' });

    expect(result.current.remaining).toBe(40);
  });
});
