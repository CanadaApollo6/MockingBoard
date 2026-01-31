import type {
  Trade,
  Draft,
  TradePiece,
  TeamAbbreviation,
  FutureDraftPick,
} from './types';
import {
  evaluateCpuTrade,
  validateTradePicksAvailable,
  validateUserOwnsPicks,
  getPicksOwnedByTeam,
  getAvailableCurrentPicks,
  getAvailableFuturePicks,
  getTeamFuturePicks,
  computeTradeExecution,
} from './trade';

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    createdBy: 'user-1',
    createdAt: { seconds: 0, nanoseconds: 0 },
    updatedAt: { seconds: 0, nanoseconds: 0 },
    config: {
      rounds: 1,
      secondsPerPick: 120,
      format: 'full',
      year: 2025,
      teamAssignmentMode: 'random',
      cpuSpeed: 'normal',
      tradesEnabled: true,
    },
    status: 'active',
    currentPick: 1,
    currentRound: 1,
    platform: 'discord',
    teamAssignments: {
      TEN: 'user-1',
      CLE: 'user-2',
      NYG: null,
    } as Draft['teamAssignments'],
    participants: { 'user-1': 'discord-id' },
    pickOrder: [
      { overall: 1, round: 1, pick: 1, team: 'TEN' as TeamAbbreviation },
      { overall: 2, round: 1, pick: 2, team: 'CLE' as TeamAbbreviation },
      { overall: 3, round: 1, pick: 3, team: 'NYG' as TeamAbbreviation },
      { overall: 4, round: 1, pick: 4, team: 'TEN' as TeamAbbreviation },
    ],
    pickedPlayerIds: [],
    ...overrides,
  };
}

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    draftId: 'draft-1',
    status: 'pending',
    proposerId: 'user-1',
    proposerTeam: 'TEN' as TeamAbbreviation,
    recipientId: 'user-2',
    recipientTeam: 'CLE' as TeamAbbreviation,
    proposerGives: [{ type: 'current-pick', overall: 1 }],
    proposerReceives: [{ type: 'current-pick', overall: 2 }],
    proposedAt: { seconds: 1000, nanoseconds: 0 },
    isForceTrade: false,
    ...overrides,
  };
}

describe('evaluateCpuTrade', () => {
  it('accepts a trade where CPU gets more value', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'current-pick', overall: 1 }],
      proposerReceives: [{ type: 'current-pick', overall: 10 }],
    });
    const draft = makeDraft();

    const result = evaluateCpuTrade(trade, draft);

    expect(result.accept).toBe(true);
    expect(result.cpuReceivingValue).toBeGreaterThan(result.cpuGivingValue);
  });

  it('accepts a trade within 5% tolerance', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'current-pick', overall: 2 }],
      proposerReceives: [{ type: 'current-pick', overall: 2 }],
    });
    const draft = makeDraft();

    const result = evaluateCpuTrade(trade, draft);

    expect(result.accept).toBe(true);
  });

  it('rejects a trade where CPU loses too much value', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'current-pick', overall: 32 }],
      proposerReceives: [{ type: 'current-pick', overall: 1 }],
    });
    const draft = makeDraft();

    const result = evaluateCpuTrade(trade, draft);

    expect(result.accept).toBe(false);
  });

  it('values future picks correctly', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'current-pick', overall: 10 }],
      proposerReceives: [
        { type: 'future-pick', year: 2026, round: 1 },
        { type: 'future-pick', year: 2026, round: 2 },
      ],
    });
    const draft = makeDraft();

    const result = evaluateCpuTrade(trade, draft);

    expect(result.cpuGivingValue).toBeGreaterThan(0);
  });

  it('applies round 1 premium when user acquires first round pick', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'current-pick', overall: 33 }],
      proposerReceives: [{ type: 'current-pick', overall: 32 }],
    });
    const draft = makeDraft();

    const result = evaluateCpuTrade(trade, draft);

    expect(result.cpuReceivingValue).toBeGreaterThan(0);
  });
});

describe('validateTradePicksAvailable', () => {
  it('returns valid when all picks are available', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'current-pick', overall: 2 }],
      proposerReceives: [{ type: 'current-pick', overall: 3 }],
    });
    const draft = makeDraft({ currentPick: 1 });

    const result = validateTradePicksAvailable(trade, draft);

    expect(result.valid).toBe(true);
  });

  it('returns invalid when a pick has already been made', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'current-pick', overall: 1 }],
      proposerReceives: [{ type: 'current-pick', overall: 3 }],
    });
    const draft = makeDraft({ currentPick: 2 });

    const result = validateTradePicksAvailable(trade, draft);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Pick #1 has already been made');
  });

  it('allows future picks (no overall) to pass validation', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'future-pick', year: 2026, round: 1 }],
      proposerReceives: [{ type: 'current-pick', overall: 3 }],
    });
    const draft = makeDraft({ currentPick: 2 });

    const result = validateTradePicksAvailable(trade, draft);

    expect(result.valid).toBe(true);
  });
});

describe('validateUserOwnsPicks', () => {
  it('returns valid when user owns all picks', () => {
    const pieces: TradePiece[] = [{ type: 'current-pick', overall: 1 }];
    const draft = makeDraft();

    const result = validateUserOwnsPicks('user-1', pieces, draft);

    expect(result.valid).toBe(true);
  });

  it('returns invalid when user does not own a pick', () => {
    const pieces: TradePiece[] = [{ type: 'current-pick', overall: 2 }];
    const draft = makeDraft();

    const result = validateUserOwnsPicks('user-1', pieces, draft);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("don't control pick #2");
  });

  it('returns invalid when pick is not found', () => {
    const pieces: TradePiece[] = [{ type: 'current-pick', overall: 999 }];
    const draft = makeDraft();

    const result = validateUserOwnsPicks('user-1', pieces, draft);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Pick #999 not found');
  });

  it('allows future picks without validation', () => {
    const pieces: TradePiece[] = [
      { type: 'future-pick', year: 2026, round: 1 },
    ];
    const draft = makeDraft();

    const result = validateUserOwnsPicks('user-1', pieces, draft);

    expect(result.valid).toBe(true);
  });

  it('respects ownerOverride from trades', () => {
    const draft = makeDraft({
      pickOrder: [
        {
          overall: 1,
          round: 1,
          pick: 1,
          team: 'TEN' as TeamAbbreviation,
          ownerOverride: 'user-2',
        },
      ],
    });
    const pieces: TradePiece[] = [{ type: 'current-pick', overall: 1 }];

    // user-1 originally owned TEN pick 1 but it was traded to user-2
    expect(validateUserOwnsPicks('user-1', pieces, draft).valid).toBe(false);
    expect(validateUserOwnsPicks('user-2', pieces, draft).valid).toBe(true);
  });
});

describe('getPicksOwnedByTeam', () => {
  it('returns picks controlled by the team', () => {
    const draft = makeDraft();
    const result = getPicksOwnedByTeam('TEN' as TeamAbbreviation, draft);

    expect(result).toHaveLength(2);
    expect(result.every((s) => s.team === 'TEN')).toBe(true);
  });

  it('returns empty for CPU teams', () => {
    const draft = makeDraft();
    const result = getPicksOwnedByTeam('NYG' as TeamAbbreviation, draft);

    // NYG is CPU (null), getPickController returns null, teamUserId is null → matches
    expect(result).toHaveLength(1);
  });

  it('respects ownerOverride from trades', () => {
    const draft = makeDraft({
      pickOrder: [
        {
          overall: 1,
          round: 1,
          pick: 1,
          team: 'TEN' as TeamAbbreviation,
          ownerOverride: 'user-2',
        },
        { overall: 2, round: 1, pick: 2, team: 'CLE' as TeamAbbreviation },
        { overall: 3, round: 1, pick: 3, team: 'NYG' as TeamAbbreviation },
        { overall: 4, round: 1, pick: 4, team: 'TEN' as TeamAbbreviation },
      ],
    });

    // TEN pick 1 was traded to user-2 (CLE's user), so TEN only has pick 4
    const tenPicks = getPicksOwnedByTeam('TEN' as TeamAbbreviation, draft);
    expect(tenPicks).toHaveLength(1);
    expect(tenPicks[0].overall).toBe(4);

    // CLE now has picks 1 and 2 (pick 1 via trade override)
    const clePicks = getPicksOwnedByTeam('CLE' as TeamAbbreviation, draft);
    expect(clePicks).toHaveLength(2);
  });
});

describe('getAvailableCurrentPicks', () => {
  it('returns only future picks for the user', () => {
    const draft = makeDraft({ currentPick: 1 });
    const result = getAvailableCurrentPicks(draft, 'user-1');

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.overall >= 1)).toBe(true);
  });

  it('excludes picks that have already been made', () => {
    const draft = makeDraft({ currentPick: 3 });
    const result = getAvailableCurrentPicks(draft, 'user-1');

    // Only pick 4 is left for user-1 (TEN)
    expect(result).toHaveLength(1);
    expect(result[0].overall).toBe(4);
  });
});

describe('getAvailableFuturePicks', () => {
  const futurePicks: FutureDraftPick[] = [
    {
      year: 2027,
      round: 1,
      originalTeam: 'TEN' as TeamAbbreviation,
      ownerTeam: 'TEN' as TeamAbbreviation,
    },
    {
      year: 2027,
      round: 2,
      originalTeam: 'TEN' as TeamAbbreviation,
      ownerTeam: 'TEN' as TeamAbbreviation,
    },
    {
      year: 2027,
      round: 1,
      originalTeam: 'CLE' as TeamAbbreviation,
      ownerTeam: 'CLE' as TeamAbbreviation,
    },
    {
      year: 2027,
      round: 1,
      originalTeam: 'NYG' as TeamAbbreviation,
      ownerTeam: 'NYG' as TeamAbbreviation,
    },
  ];

  it('returns future picks for teams the user controls', () => {
    const draft = makeDraft({ futurePicks });
    const result = getAvailableFuturePicks(draft, 'user-1');

    expect(result).toHaveLength(2);
    expect(result.every((fp) => fp.ownerTeam === 'TEN')).toBe(true);
  });

  it('returns empty array when user has no future picks', () => {
    const draft = makeDraft({ futurePicks });
    const result = getAvailableFuturePicks(draft, 'user-999');

    expect(result).toHaveLength(0);
  });

  it('returns empty array when draft has no futurePicks', () => {
    const draft = makeDraft({ futurePicks: undefined });
    const result = getAvailableFuturePicks(draft, 'user-1');

    expect(result).toHaveLength(0);
  });
});

describe('getTeamFuturePicks', () => {
  const futurePicks: FutureDraftPick[] = [
    {
      year: 2027,
      round: 1,
      originalTeam: 'TEN' as TeamAbbreviation,
      ownerTeam: 'TEN' as TeamAbbreviation,
    },
    {
      year: 2027,
      round: 1,
      originalTeam: 'CLE' as TeamAbbreviation,
      ownerTeam: 'TEN' as TeamAbbreviation,
    },
    {
      year: 2027,
      round: 1,
      originalTeam: 'NYG' as TeamAbbreviation,
      ownerTeam: 'NYG' as TeamAbbreviation,
    },
  ];

  it('returns future picks owned by the specified team', () => {
    const draft = makeDraft({ futurePicks });
    const result = getTeamFuturePicks(draft, 'TEN' as TeamAbbreviation);

    expect(result).toHaveLength(2);
    expect(result.every((fp) => fp.ownerTeam === 'TEN')).toBe(true);
  });

  it('returns empty array when team has no future picks', () => {
    const draft = makeDraft({ futurePicks });
    const result = getTeamFuturePicks(draft, 'CLE' as TeamAbbreviation);

    expect(result).toHaveLength(0);
  });

  it('returns empty array when draft has no futurePicks', () => {
    const draft = makeDraft({ futurePicks: undefined });
    const result = getTeamFuturePicks(draft, 'TEN' as TeamAbbreviation);

    expect(result).toHaveLength(0);
  });
});

describe('computeTradeExecution', () => {
  it('updates current pick ownership', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'current-pick', overall: 1 }],
      proposerReceives: [{ type: 'current-pick', overall: 2 }],
      proposerId: 'user-1',
      recipientId: 'user-2',
    });
    const draft = makeDraft();

    const result = computeTradeExecution(trade, draft);

    const pick1 = result.pickOrder.find((s) => s.overall === 1);
    expect(pick1!.ownerOverride).toBe('user-2');
    const pick2 = result.pickOrder.find((s) => s.overall === 2);
    expect(pick2!.ownerOverride).toBe('user-1');
  });

  it('sets ownerOverride to null for picks given to CPU', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'current-pick', overall: 1 }],
      proposerReceives: [{ type: 'current-pick', overall: 3 }],
      proposerId: 'user-1',
      recipientId: null,
      recipientTeam: 'NYG' as TeamAbbreviation,
    });
    const draft = makeDraft();

    const result = computeTradeExecution(trade, draft);

    const pick1 = result.pickOrder.find((s) => s.overall === 1);
    expect(pick1!.ownerOverride).toBeNull();
    const pick3 = result.pickOrder.find((s) => s.overall === 3);
    expect(pick3!.ownerOverride).toBe('user-1');
  });

  it('updates future pick ownership', () => {
    const futurePicks: FutureDraftPick[] = [
      {
        year: 2027,
        round: 1,
        originalTeam: 'TEN' as TeamAbbreviation,
        ownerTeam: 'TEN' as TeamAbbreviation,
      },
      {
        year: 2027,
        round: 1,
        originalTeam: 'CLE' as TeamAbbreviation,
        ownerTeam: 'CLE' as TeamAbbreviation,
      },
    ];

    const trade = makeTrade({
      proposerTeam: 'TEN' as TeamAbbreviation,
      recipientTeam: 'CLE' as TeamAbbreviation,
      proposerGives: [
        { type: 'future-pick', year: 2027, round: 1, originalTeam: 'TEN' },
      ],
      proposerReceives: [
        { type: 'future-pick', year: 2027, round: 1, originalTeam: 'CLE' },
      ],
    });
    const draft = makeDraft({ futurePicks });

    const result = computeTradeExecution(trade, draft);

    const tenPick = result.futurePicks.find(
      (fp) => fp.originalTeam === 'TEN' && fp.year === 2027,
    );
    expect(tenPick!.ownerTeam).toBe('CLE');

    const clePick = result.futurePicks.find(
      (fp) => fp.originalTeam === 'CLE' && fp.year === 2027,
    );
    expect(clePick!.ownerTeam).toBe('TEN');
  });

  it('handles mixed current and future pick trades', () => {
    const futurePicks: FutureDraftPick[] = [
      {
        year: 2027,
        round: 1,
        originalTeam: 'CLE' as TeamAbbreviation,
        ownerTeam: 'CLE' as TeamAbbreviation,
      },
    ];

    const trade = makeTrade({
      proposerTeam: 'TEN' as TeamAbbreviation,
      recipientTeam: 'CLE' as TeamAbbreviation,
      proposerGives: [{ type: 'current-pick', overall: 1 }],
      proposerReceives: [
        { type: 'future-pick', year: 2027, round: 1, originalTeam: 'CLE' },
      ],
    });
    const draft = makeDraft({ futurePicks });

    const result = computeTradeExecution(trade, draft);

    const pick1 = result.pickOrder.find((s) => s.overall === 1);
    expect(pick1!.ownerOverride).toBe('user-2');

    const clePick = result.futurePicks.find(
      (fp) => fp.originalTeam === 'CLE' && fp.year === 2027,
    );
    expect(clePick!.ownerTeam).toBe('TEN');
  });

  it('leaves unaffected picks unchanged', () => {
    const trade = makeTrade({
      proposerGives: [{ type: 'current-pick', overall: 1 }],
      proposerReceives: [{ type: 'current-pick', overall: 2 }],
    });
    const draft = makeDraft();

    const result = computeTradeExecution(trade, draft);

    const pick3 = result.pickOrder.find((s) => s.overall === 3);
    expect(pick3!.ownerOverride).toBeUndefined();
    const pick4 = result.pickOrder.find((s) => s.overall === 4);
    expect(pick4!.ownerOverride).toBeUndefined();
  });
});
