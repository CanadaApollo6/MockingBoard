// @vitest-environment jsdom
/// <reference types="vitest/globals" />
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type {
  Draft,
  Pick,
  Player,
  TeamAbbreviation,
  DraftSlot,
} from '@mockingboard/shared';

// Mock shared functions that have complex internals
const { mockGetPickController, mockPrepareCpuPick, mockComputeTradeExecution } =
  vi.hoisted(() => ({
    mockGetPickController: vi.fn(),
    mockPrepareCpuPick: vi.fn(),
    mockComputeTradeExecution: vi.fn(),
  }));

vi.mock('@mockingboard/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mockingboard/shared')>();
  return {
    ...actual,
    getPickController: (...args: unknown[]) => mockGetPickController(...args),
    prepareCpuPick: (...args: unknown[]) => mockPrepareCpuPick(...args),
    computeTradeExecution: (...args: unknown[]) =>
      mockComputeTradeExecution(...args),
  };
});

import { useLocalDraft } from './use-local-draft';

// ---- helpers ----

const mockFetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
);
vi.stubGlobal('fetch', mockFetch);

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    name: 'Test Player',
    position: 'QB',
    team: 'NE',
    school: 'MIT',
    consensusRank: 1,
    ...overrides,
  } as Player;
}

function makeSlot(overrides: Partial<DraftSlot> = {}): DraftSlot {
  return {
    overall: 1,
    round: 1,
    pick: 1,
    team: 'NE' as TeamAbbreviation,
    ...overrides,
  };
}

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    createdBy: 'user-1',
    config: {
      rounds: 1,
      format: 'full',
      year: 2026,
      cpuSpeed: 'instant',
      secondsPerPick: 0,
      tradesEnabled: false,
    },
    status: 'active',
    currentPick: 1,
    currentRound: 1,
    platform: 'web',
    teamAssignments: { NE: 'user-1', DAL: null } as Draft['teamAssignments'],
    participants: { 'user-1': 'user-1' },
    participantNames: { 'user-1': 'Player 1' },
    participantIds: ['user-1'],
    pickOrder: [
      makeSlot({ overall: 1, team: 'NE' as TeamAbbreviation }),
      makeSlot({
        overall: 2,
        round: 1,
        pick: 2,
        team: 'DAL' as TeamAbbreviation,
      }),
    ],
    pickedPlayerIds: [],
    createdAt: { seconds: 0, nanoseconds: 0 },
    updatedAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  } as Draft;
}

function makePlayers(): Record<string, Player> {
  return {
    p1: makePlayer({ id: 'p1', name: 'Player A', consensusRank: 1 }),
    p2: makePlayer({ id: 'p2', name: 'Player B', consensusRank: 2 }),
    p3: makePlayer({ id: 'p3', name: 'Player C', consensusRank: 3 }),
  };
}

function makePick(overrides: Partial<Pick> = {}): Pick {
  return {
    id: 'pick-1',
    draftId: 'draft-1',
    overall: 1,
    round: 1,
    pick: 1,
    team: 'NE' as TeamAbbreviation,
    userId: 'user-1',
    playerId: 'p1',
    createdAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  } as Pick;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Default: pick 1 is human (user-1), pick 2 is CPU (null)
  mockGetPickController.mockReturnValue('user-1');
  mockPrepareCpuPick.mockReturnValue({ id: 'p2', name: 'Player B' });
  mockComputeTradeExecution.mockReturnValue({
    pickOrder: [],
    futurePicks: [],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useLocalDraft', () => {
  describe('guest mode (no draftId)', () => {
    it('records a pick and updates state', () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers()),
      );

      act(() => {
        result.current.recordPick('p1');
      });

      expect(result.current.picks).toHaveLength(1);
      expect(result.current.picks[0].playerId).toBe('p1');
      expect(result.current.draft.currentPick).toBe(2);
    });

    it('does not call fetch in guest mode', () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers()),
      );

      act(() => {
        result.current.recordPick('p1');
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not call fetch on pause in guest mode', () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers()),
      );

      act(() => {
        result.current.pause();
      });

      expect(result.current.draft.status).toBe('paused');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not call fetch on cancel in guest mode', async () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers()),
      );

      await act(async () => {
        await result.current.cancel();
      });

      expect(result.current.draft.status).toBe('cancelled');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('uses GUEST_ID for picks by default', () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers()),
      );

      act(() => {
        result.current.recordPick('p1');
      });

      expect(result.current.picks[0].userId).toBe('__guest__');
    });
  });

  describe('authed mode (with draftId)', () => {
    const options = { userId: 'user-1', draftId: 'draft-1' };

    it('uses real userId for picks', () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers(), options),
      );

      act(() => {
        result.current.recordPick('p1');
      });

      expect(result.current.picks[0].userId).toBe('user-1');
    });

    it('syncs on pause', () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers(), options),
      );

      act(() => {
        result.current.pause();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/drafts/draft-1/sync',
        expect.objectContaining({ method: 'POST' }),
      );

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.status).toBe('paused');
      expect(body.reason).toBe('pause');
    });

    it('syncs on cancel', async () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers(), options),
      );

      await act(async () => {
        await result.current.cancel();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/drafts/draft-1/sync',
        expect.objectContaining({ method: 'POST' }),
      );

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.status).toBe('cancelled');
      expect(body.reason).toBe('cancel');
    });

    it('syncs on complete (last pick)', () => {
      // 2-pick draft: pick 1 is human, pick 2 is human
      mockGetPickController.mockReturnValue('user-1');
      const draft = makeDraft({ currentPick: 2, pickedPlayerIds: ['p1'] });

      const { result } = renderHook(() =>
        useLocalDraft(draft, makePlayers(), options),
      );

      act(() => {
        result.current.recordPick('p2');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/drafts/draft-1/sync',
        expect.objectContaining({ method: 'POST' }),
      );

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.status).toBe('complete');
      expect(body.reason).toBe('complete');
    });

    it('syncs on trade execution', () => {
      const draft = makeDraft({
        config: { ...makeDraft().config, tradesEnabled: true },
      });
      const { result } = renderHook(() =>
        useLocalDraft(draft, makePlayers(), options),
      );

      const trade = {
        id: 'trade-1',
        draftId: 'draft-1',
        status: 'pending' as const,
        proposerId: 'user-1',
        proposerTeam: 'NE' as TeamAbbreviation,
        recipientId: null,
        recipientTeam: 'DAL' as TeamAbbreviation,
        proposerGives: [],
        proposerReceives: [],
        proposedAt: { seconds: 0, nanoseconds: 0 },
        isForceTrade: false,
      };

      act(() => {
        result.current.executeTrade(trade, false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/drafts/draft-1/sync',
        expect.objectContaining({ method: 'POST' }),
      );

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.reason).toBe('trade');
    });

    it('sends only new picks (not previously synced)', () => {
      const existingPicks = [makePick({ id: 'pick-1', playerId: 'p1' })];

      const draft = makeDraft({
        currentPick: 2,
        pickedPlayerIds: ['p1'],
      });
      mockGetPickController.mockReturnValue('user-1');

      const { result } = renderHook(() =>
        useLocalDraft(draft, makePlayers(), options, existingPicks),
      );

      // Record another pick, completing the draft
      act(() => {
        result.current.recordPick('p2');
      });

      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      // Should only contain the new pick, not the initial one
      expect(body.picks).toHaveLength(1);
      expect(body.picks[0].playerId).toBe('p2');
    });
  });

  describe('pause / resume / cancel', () => {
    it('pause sets status to paused', () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers()),
      );

      act(() => {
        result.current.pause();
      });

      expect(result.current.draft.status).toBe('paused');
      expect(result.current.isProcessing).toBe(false);
    });

    it('resume sets status back to active', () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft({ status: 'paused' }), makePlayers()),
      );

      act(() => {
        result.current.resume();
      });

      expect(result.current.draft.status).toBe('active');
    });

    it('cancel sets status to cancelled', async () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers()),
      );

      await act(async () => {
        await result.current.cancel();
      });

      expect(result.current.draft.status).toBe('cancelled');
    });
  });

  describe('initialPicks', () => {
    it('loads with provided initial picks', () => {
      const existingPicks = [makePick()];

      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers(), {}, existingPicks),
      );

      expect(result.current.picks).toHaveLength(1);
      expect(result.current.picks[0].playerId).toBe('p1');
    });
  });

  describe('isSyncing', () => {
    it('is false in guest mode', () => {
      const { result } = renderHook(() =>
        useLocalDraft(makeDraft(), makePlayers()),
      );

      expect(result.current.isSyncing).toBe(false);
    });
  });
});
