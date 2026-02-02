/// <reference types="vitest/globals" />
import { vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { sanitize } from './sanitize.js';

describe('sanitize', () => {
  it('normalizes _seconds/_nanoseconds to seconds/nanoseconds', () => {
    const input = { _seconds: 1704067200, _nanoseconds: 0 };
    const result = sanitize(input);
    expect(result).toEqual({ seconds: 1704067200, nanoseconds: 0 });
  });

  it('passes through already-normalized timestamps unchanged', () => {
    const input = { seconds: 1704067200, nanoseconds: 500000000 };
    const result = sanitize(input);
    expect(result).toEqual({ seconds: 1704067200, nanoseconds: 500000000 });
  });

  it('handles nested timestamps in objects', () => {
    const input = {
      name: 'Test Draft',
      createdAt: { _seconds: 1704067200, _nanoseconds: 0 },
      status: 'active',
    };
    const result = sanitize(input);
    expect(result).toEqual({
      name: 'Test Draft',
      createdAt: { seconds: 1704067200, nanoseconds: 0 },
      status: 'active',
    });
  });

  it('handles arrays containing objects with timestamps', () => {
    const input = [
      {
        id: 'p1',
        name: 'Player 1',
        updatedAt: { _seconds: 100, _nanoseconds: 0 },
      },
      {
        id: 'p2',
        name: 'Player 2',
        updatedAt: { _seconds: 200, _nanoseconds: 0 },
      },
    ];
    const result = sanitize(input);
    expect(result).toEqual([
      {
        id: 'p1',
        name: 'Player 1',
        updatedAt: { seconds: 100, nanoseconds: 0 },
      },
      {
        id: 'p2',
        name: 'Player 2',
        updatedAt: { seconds: 200, nanoseconds: 0 },
      },
    ]);
  });

  it('passes through primitives and null', () => {
    expect(sanitize('hello')).toBe('hello');
    expect(sanitize(42)).toBe(42);
    expect(sanitize(null)).toBe(null);
    expect(sanitize(true)).toBe(true);
  });

  it('handles deeply nested structures', () => {
    const input = {
      pick: {
        context: {
          pickTimestamp: { _seconds: 1704067200, _nanoseconds: 500000000 },
        },
      },
    };
    const result = sanitize(input);
    expect(result.pick.context.pickTimestamp).toEqual({
      seconds: 1704067200,
      nanoseconds: 500000000,
    });
  });
});
