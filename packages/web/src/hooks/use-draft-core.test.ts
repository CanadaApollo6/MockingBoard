// @vitest-environment jsdom
/// <reference types="vitest/globals" />
import { renderHook } from '@testing-library/react';
import { useDraftCore } from './use-draft-core';
import type {
  Draft,
  Pick,
  Player,
  TeamAbbreviation,
  DraftSlot,
} from '@mockingboard/shared';

// ---- helpers ----

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

function makePick(overrides: Partial<Pick> = {}): Pick {
  return {
    id: 'pick-1',
    draftId: 'draft-1',
    overall: 1,
    round: 1,
    pick: 1,
    team: 'NE' as TeamAbbreviation,
    userId: 'user-1',
    playerId: 'player-1',
    createdAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  } as Pick;
}

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    createdBy: 'user-1',
    config: {
      rounds: 1,
      format: 'full',
      year: 2026,
      cpuSpeed: 'normal',
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
      makeSlot({ overall: 2, team: 'DAL' as TeamAbbreviation }),
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

describe('useDraftCore', () => {
  it('returns empty state when draft is null', () => {
    const { result } = renderHook(() => useDraftCore(null, [], {}, 'user-1'));

    expect(result.current.availablePlayers).toHaveLength(0);
    expect(result.current.currentSlot).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(result.current.totalPicks).toBe(0);
    expect(result.current.progress).toBe(0);
  });

  it('filters picked players from availablePlayers', () => {
    const draft = makeDraft();
    const picks = [makePick({ playerId: 'p1' })];

    const { result } = renderHook(() =>
      useDraftCore(draft, picks, makePlayers(), 'user-1'),
    );

    const ids = result.current.availablePlayers.map((p) => p.id);
    expect(ids).not.toContain('p1');
    expect(ids).toContain('p2');
    expect(ids).toContain('p3');
  });

  it('sorts available by consensusRank by default', () => {
    const draft = makeDraft();

    const { result } = renderHook(() =>
      useDraftCore(draft, [], makePlayers(), 'user-1'),
    );

    const ranks = result.current.availablePlayers.map((p) => p.consensusRank);
    expect(ranks).toEqual([1, 2, 3]);
  });

  it('sorts by board rank when sortByBoard and boardRankMap provided', () => {
    const draft = makeDraft();
    const boardRankMap = new Map([
      ['p3', 0],
      ['p1', 1],
    ]);

    const { result } = renderHook(() =>
      useDraftCore(draft, [], makePlayers(), 'user-1', {
        sortByBoard: true,
        boardRankMap,
      }),
    );

    // p3 (rank 0) first, p1 (rank 1) second, p2 (off-board, by consensusRank) last
    const ids = result.current.availablePlayers.map((p) => p.id);
    expect(ids).toEqual(['p3', 'p1', 'p2']);
  });

  it('derives currentSlot from draft.currentPick', () => {
    const draft = makeDraft({ currentPick: 2 });

    const { result } = renderHook(() =>
      useDraftCore(draft, [], makePlayers(), 'user-1'),
    );

    expect(result.current.currentSlot?.overall).toBe(2);
    expect(result.current.currentSlot?.team).toBe('DAL');
  });

  it('isUserTurn is true when controller matches userId', () => {
    // NE is assigned to user-1, pick 1 is NE
    const draft = makeDraft({ currentPick: 1 });

    const { result } = renderHook(() =>
      useDraftCore(draft, [], makePlayers(), 'user-1'),
    );

    expect(result.current.isUserTurn).toBe(true);
    expect(result.current.controller).toBe('user-1');
  });

  it('isUserTurn is false when controller does not match', () => {
    // DAL is null (CPU), pick 2 is DAL
    const draft = makeDraft({ currentPick: 2 });

    const { result } = renderHook(() =>
      useDraftCore(draft, [], makePlayers(), 'user-1'),
    );

    expect(result.current.isUserTurn).toBe(false);
  });

  it('derives isActive/isPaused/isComplete from draft.status', () => {
    const active = makeDraft({ status: 'active' });
    const paused = makeDraft({ status: 'paused' });
    const complete = makeDraft({ status: 'complete' });

    const { result: r1 } = renderHook(() =>
      useDraftCore(active, [], {}, 'user-1'),
    );
    expect(r1.current.isActive).toBe(true);
    expect(r1.current.isPaused).toBe(false);
    expect(r1.current.isComplete).toBe(false);

    const { result: r2 } = renderHook(() =>
      useDraftCore(paused, [], {}, 'user-1'),
    );
    expect(r2.current.isPaused).toBe(true);

    const { result: r3 } = renderHook(() =>
      useDraftCore(complete, [], {}, 'user-1'),
    );
    expect(r3.current.isComplete).toBe(true);
  });

  it('isMultiTeam is true when user controls 2-31 teams', () => {
    const draft = makeDraft({
      teamAssignments: {
        NE: 'user-1',
        DAL: 'user-1',
        NYG: null,
      } as Draft['teamAssignments'],
    });

    const { result } = renderHook(() => useDraftCore(draft, [], {}, 'user-1'));

    expect(result.current.isMultiTeam).toBe(true);
  });

  it('isMultiTeam is false for single team', () => {
    const draft = makeDraft();

    const { result } = renderHook(() => useDraftCore(draft, [], {}, 'user-1'));

    expect(result.current.isMultiTeam).toBe(false);
  });

  it('calculates progress as picks / totalPicks * 100', () => {
    const draft = makeDraft();
    const picks = [makePick()]; // 1 pick made, 2 total

    const { result } = renderHook(() =>
      useDraftCore(draft, picks, makePlayers(), 'user-1'),
    );

    expect(result.current.totalPicks).toBe(2);
    expect(result.current.displayedCount).toBe(1);
    expect(result.current.progress).toBe(50);
  });

  it("returns suggestion when it is user's turn and draft is active", () => {
    const draft = makeDraft({ currentPick: 1 });

    const { result } = renderHook(() =>
      useDraftCore(draft, [], makePlayers(), 'user-1'),
    );

    // suggestPick is called with real shared code — should return a suggestion
    expect(result.current.suggestion).not.toBeNull();
    expect(result.current.suggestion).toHaveProperty('playerId');
    expect(result.current.suggestion).toHaveProperty('reason');
  });

  it("returns null suggestion when it is not user's turn", () => {
    // Pick 2 = DAL = CPU (null assignment)
    const draft = makeDraft({ currentPick: 2 });

    const { result } = renderHook(() =>
      useDraftCore(draft, [], makePlayers(), 'user-1'),
    );

    expect(result.current.suggestion).toBeNull();
  });

  it('exposes clock info from current slot', () => {
    const draft = makeDraft({ currentPick: 1 });

    const { result } = renderHook(() =>
      useDraftCore(draft, [], makePlayers(), 'user-1'),
    );

    expect(result.current.clockTeam).toBe('NE');
    expect(result.current.clockRound).toBe(1);
    expect(result.current.clockPickNum).toBe(1);
    expect(result.current.clockOverall).toBe(1);
  });
});
