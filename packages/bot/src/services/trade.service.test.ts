const mockAdd = vi.fn();
const mockDocGet = vi.fn();
const mockDocUpdate = vi.fn();
const mockDoc = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();

vi.mock('../utils/firestore.js', () => ({
  db: {
    collection: () => ({
      add: mockAdd,
      doc: mockDoc,
      where: mockWhere,
    }),
  },
}));

import type {
  Trade,
  Draft,
  TradePiece,
  TeamAbbreviation,
  FutureDraftPick,
} from '@mockingboard/shared';
import {
  createTrade,
  getTrade,
  updateTrade,
  getPendingTradesForDraft,
  getPendingTradesForUser,
  acceptTrade,
  rejectTrade,
  cancelTrade,
  expireTrade,
  evaluateCpuTrade,
  executeTrade,
  validateTradePicksAvailable,
  validateUserOwnsPicks,
  getPicksOwnedByTeam,
  getAvailableCurrentPicks,
  getAvailableFuturePicks,
  getTeamFuturePicks,
} from './trade.service.js';

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
      NYG: null, // CPU team
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

describe('trade.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setup
    mockDoc.mockReturnValue({
      get: mockDocGet,
      update: mockDocUpdate,
    });

    mockWhere.mockReturnValue({
      where: mockWhere,
      get: mockGet,
    });
  });

  describe('createTrade', () => {
    it('creates a trade with pending status', async () => {
      const tradeData = makeTrade();
      mockAdd.mockResolvedValue({
        get: vi.fn().mockResolvedValue({
          id: 'trade-1',
          data: () => tradeData,
        }),
      });

      const trade = await createTrade({
        draftId: 'draft-1',
        proposerId: 'user-1',
        proposerTeam: 'TEN' as TeamAbbreviation,
        recipientId: 'user-2',
        recipientTeam: 'CLE' as TeamAbbreviation,
        proposerGives: [{ type: 'current-pick', overall: 1 }],
        proposerReceives: [{ type: 'current-pick', overall: 2 }],
      });

      expect(trade.id).toBe('trade-1');
      expect(trade.status).toBe('pending');
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          draftId: 'draft-1',
          status: 'pending',
          proposerId: 'user-1',
          recipientId: 'user-2',
        }),
      );
    });

    it('creates a force trade when isForceTrade is true', async () => {
      const tradeData = makeTrade({ isForceTrade: true });
      mockAdd.mockResolvedValue({
        get: vi.fn().mockResolvedValue({
          id: 'trade-1',
          data: () => tradeData,
        }),
      });

      const trade = await createTrade({
        draftId: 'draft-1',
        proposerId: 'user-1',
        proposerTeam: 'TEN' as TeamAbbreviation,
        recipientId: null,
        recipientTeam: 'NYG' as TeamAbbreviation,
        proposerGives: [{ type: 'current-pick', overall: 1 }],
        proposerReceives: [{ type: 'current-pick', overall: 3 }],
        isForceTrade: true,
      });

      expect(trade.isForceTrade).toBe(true);
    });
  });

  describe('getTrade', () => {
    it('returns the trade when it exists', async () => {
      const tradeData = makeTrade();
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => tradeData,
      });

      const trade = await getTrade('trade-1');

      expect(trade).not.toBeNull();
      expect(trade!.id).toBe('trade-1');
      expect(trade!.status).toBe('pending');
    });

    it('returns null when trade does not exist', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      const trade = await getTrade('nonexistent');

      expect(trade).toBeNull();
    });
  });

  describe('updateTrade', () => {
    it('calls update with the provided fields', async () => {
      mockDocUpdate.mockResolvedValue(undefined);

      await updateTrade('trade-1', { status: 'accepted' });

      expect(mockDoc).toHaveBeenCalledWith('trade-1');
      expect(mockDocUpdate).toHaveBeenCalledWith({ status: 'accepted' });
    });
  });

  describe('getPendingTradesForDraft', () => {
    it('returns all pending trades for a draft', async () => {
      const trades = [
        makeTrade({ id: 'trade-1' }),
        makeTrade({ id: 'trade-2' }),
      ];
      mockGet.mockResolvedValue({
        docs: trades.map((t) => ({ id: t.id, data: () => t })),
      });

      const result = await getPendingTradesForDraft('draft-1');

      expect(result).toHaveLength(2);
      expect(mockWhere).toHaveBeenCalledWith('draftId', '==', 'draft-1');
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending');
    });

    it('returns empty array when no pending trades', async () => {
      mockGet.mockResolvedValue({ docs: [] });

      const result = await getPendingTradesForDraft('draft-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getPendingTradesForUser', () => {
    it('returns trades where user is proposer or recipient', async () => {
      const asProposer = [makeTrade({ id: 'trade-1', proposerId: 'user-1' })];
      const asRecipient = [makeTrade({ id: 'trade-2', recipientId: 'user-1' })];

      // First call for proposer query, second for recipient query
      mockGet
        .mockResolvedValueOnce({
          docs: asProposer.map((t) => ({ id: t.id, data: () => t })),
        })
        .mockResolvedValueOnce({
          docs: asRecipient.map((t) => ({ id: t.id, data: () => t })),
        });

      const result = await getPendingTradesForUser('draft-1', 'user-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('acceptTrade', () => {
    it('accepts a pending trade from the recipient', async () => {
      const trade = makeTrade({ recipientId: 'user-2' });
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });
      mockDocUpdate.mockResolvedValue(undefined);

      const result = await acceptTrade('trade-1', 'user-2');

      expect(result.status).toBe('accepted');
      expect(mockDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'accepted' }),
      );
    });

    it('throws if trade is not found', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      await expect(acceptTrade('nonexistent', 'user-2')).rejects.toThrow(
        'Trade not found',
      );
    });

    it('throws if trade is not pending', async () => {
      const trade = makeTrade({ status: 'accepted' });
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });

      await expect(acceptTrade('trade-1', 'user-2')).rejects.toThrow(
        'Trade is not pending',
      );
    });

    it('throws if user is not the recipient', async () => {
      const trade = makeTrade({ recipientId: 'user-2' });
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });

      await expect(acceptTrade('trade-1', 'user-1')).rejects.toThrow(
        'Only the recipient can accept',
      );
    });

    it('accepts a CPU trade when called by the proposer', async () => {
      const trade = makeTrade({
        proposerId: 'user-1',
        recipientId: null,
        recipientTeam: 'NYG' as TeamAbbreviation,
      });
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });
      mockDocUpdate.mockResolvedValue(undefined);

      const result = await acceptTrade('trade-1', 'user-1');

      expect(result.status).toBe('accepted');
      expect(mockDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'accepted' }),
      );
    });

    it('throws if non-proposer tries to confirm a CPU trade', async () => {
      const trade = makeTrade({
        proposerId: 'user-1',
        recipientId: null,
        recipientTeam: 'NYG' as TeamAbbreviation,
      });
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });

      await expect(acceptTrade('trade-1', 'user-2')).rejects.toThrow(
        'Only the proposer can confirm a CPU trade',
      );
    });
  });

  describe('rejectTrade', () => {
    it('rejects a pending trade from the recipient', async () => {
      const trade = makeTrade({ recipientId: 'user-2' });
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });
      mockDocUpdate.mockResolvedValue(undefined);

      const result = await rejectTrade('trade-1', 'user-2');

      expect(result.status).toBe('rejected');
    });

    it('throws if user is not the recipient', async () => {
      const trade = makeTrade({ recipientId: 'user-2' });
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });

      await expect(rejectTrade('trade-1', 'user-1')).rejects.toThrow(
        'Only the recipient can reject',
      );
    });
  });

  describe('cancelTrade', () => {
    it('cancels a pending trade from the proposer', async () => {
      const trade = makeTrade({ proposerId: 'user-1' });
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });
      mockDocUpdate.mockResolvedValue(undefined);

      const result = await cancelTrade('trade-1', 'user-1');

      expect(result.status).toBe('cancelled');
    });

    it('throws if user is not the proposer', async () => {
      const trade = makeTrade({ proposerId: 'user-1' });
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });

      await expect(cancelTrade('trade-1', 'user-2')).rejects.toThrow(
        'Only the proposer can cancel',
      );
    });
  });

  describe('expireTrade', () => {
    it('expires a pending trade', async () => {
      const trade = makeTrade();
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });
      mockDocUpdate.mockResolvedValue(undefined);

      const result = await expireTrade('trade-1');

      expect(result.status).toBe('expired');
    });

    it('throws if trade is not pending', async () => {
      const trade = makeTrade({ status: 'accepted' });
      mockDocGet.mockResolvedValue({
        exists: true,
        id: 'trade-1',
        data: () => trade,
      });

      await expect(expireTrade('trade-1')).rejects.toThrow(
        'Trade is not pending',
      );
    });
  });

  describe('evaluateCpuTrade', () => {
    it('accepts a trade where CPU gets more value', () => {
      const trade = makeTrade({
        proposerGives: [{ type: 'current-pick', overall: 1 }], // ~3000 pts
        proposerReceives: [{ type: 'current-pick', overall: 10 }], // ~1300 pts
      });
      const draft = makeDraft();

      const result = evaluateCpuTrade(trade, draft);

      expect(result.accept).toBe(true);
      expect(result.cpuReceivingValue).toBeGreaterThan(result.cpuGivingValue);
    });

    it('accepts a trade within 5% tolerance', () => {
      // Equal value trade
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
        proposerGives: [{ type: 'current-pick', overall: 32 }], // Low value
        proposerReceives: [{ type: 'current-pick', overall: 1 }], // High value
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

      // Future picks should have calculated values
      expect(result.cpuGivingValue).toBeGreaterThan(0);
    });

    it('applies round 1 premium when user acquires first round pick', () => {
      const trade = makeTrade({
        proposerGives: [{ type: 'current-pick', overall: 33 }], // Round 2
        proposerReceives: [{ type: 'current-pick', overall: 32 }], // Round 1
      });
      const draft = makeDraft();

      const result = evaluateCpuTrade(trade, draft);

      // The 45-point premium should be added to CPU receiving value
      expect(result.cpuReceivingValue).toBeGreaterThan(0);
    });
  });

  describe('executeTrade', () => {
    it('updates pick ownership when trade is executed', async () => {
      const mockDraftsDocUpdate = vi.fn().mockResolvedValue(undefined);
      mockDoc.mockReturnValue({ update: mockDraftsDocUpdate });

      const trade = makeTrade({
        proposerGives: [{ type: 'current-pick', overall: 1 }],
        proposerReceives: [{ type: 'current-pick', overall: 2 }],
        proposerId: 'user-1',
        recipientId: 'user-2',
      });
      const draft = makeDraft();

      const result = await executeTrade(trade, draft);

      expect(mockDraftsDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          pickOrder: expect.arrayContaining([
            expect.objectContaining({ overall: 1, ownerOverride: 'user-2' }),
            expect.objectContaining({ overall: 2, ownerOverride: 'user-1' }),
          ]),
        }),
      );
      expect(result.pickOrder).toBeDefined();
    });

    it('sets ownerOverride to null for picks given to CPU', async () => {
      const mockDraftsDocUpdate = vi.fn().mockResolvedValue(undefined);
      mockDoc.mockReturnValue({ update: mockDraftsDocUpdate });

      const trade = makeTrade({
        proposerGives: [{ type: 'current-pick', overall: 1 }],
        proposerReceives: [{ type: 'current-pick', overall: 3 }],
        proposerId: 'user-1',
        recipientId: null,
        recipientTeam: 'NYG' as TeamAbbreviation,
      });
      const draft = makeDraft();

      await executeTrade(trade, draft);

      expect(mockDraftsDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          pickOrder: expect.arrayContaining([
            expect.objectContaining({ overall: 1, ownerOverride: null }),
            expect.objectContaining({ overall: 3, ownerOverride: 'user-1' }),
          ]),
        }),
      );
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
      const draft = makeDraft({ currentPick: 2 }); // Pick 1 is done

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
      // Pick 1 is TEN, teamAssignments[TEN] = 'user-1'
      const pieces: TradePiece[] = [{ type: 'current-pick', overall: 1 }];
      const draft = makeDraft();

      const result = validateUserOwnsPicks('user-1', pieces, draft);

      expect(result.valid).toBe(true);
    });

    it('returns invalid when user does not own a pick', () => {
      // Pick 2 is CLE, teamAssignments[CLE] = 'user-2'
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
  });

  describe('getPicksOwnedByTeam', () => {
    it('returns picks controlled by the team', () => {
      const draft = makeDraft();
      const result = getPicksOwnedByTeam('TEN' as TeamAbbreviation, draft);

      // TEN has picks 1 and 4 in our mock draft
      expect(result).toHaveLength(2);
    });
  });

  describe('getAvailableCurrentPicks', () => {
    it('returns only unmade picks for the user', () => {
      const draft = makeDraft({ currentPick: 1 });
      const result = getAvailableCurrentPicks(draft, 'user-1');

      // user-1 controls TEN: picks 1 and 4
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.overall >= 1)).toBe(true);
    });

    it('excludes picks that have already been made', () => {
      const draft = makeDraft({ currentPick: 3 }); // Picks 1, 2 are done
      const result = getAvailableCurrentPicks(draft, 'user-1');

      // Only pick 4 (TEN) remains for user-1
      expect(result).toHaveLength(1);
      expect(result.every((p) => p.overall >= 3)).toBe(true);
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

      // user-1 controls TEN, which owns 2 future picks
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

  describe('executeTrade with future picks', () => {
    it('updates future pick ownerTeam when traded', async () => {
      const mockDraftsDocUpdate = vi.fn().mockResolvedValue(undefined);
      mockDoc.mockReturnValue({ update: mockDraftsDocUpdate });

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

      const result = await executeTrade(trade, draft);

      // TEN's pick should now be owned by CLE
      const tenPick = result.futurePicks!.find(
        (fp) => fp.originalTeam === 'TEN' && fp.year === 2027 && fp.round === 1,
      );
      expect(tenPick!.ownerTeam).toBe('CLE');

      // CLE's pick should now be owned by TEN
      const clePick = result.futurePicks!.find(
        (fp) => fp.originalTeam === 'CLE' && fp.year === 2027 && fp.round === 1,
      );
      expect(clePick!.ownerTeam).toBe('TEN');
    });

    it('handles mixed current and future pick trades', async () => {
      const mockDraftsDocUpdate = vi.fn().mockResolvedValue(undefined);
      mockDoc.mockReturnValue({ update: mockDraftsDocUpdate });

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

      const result = await executeTrade(trade, draft);

      // Current pick #1 should have ownerOverride to recipient
      const pick1 = result.pickOrder.find((s) => s.overall === 1);
      expect(pick1!.ownerOverride).toBe('user-2');

      // CLE's future pick should now be owned by TEN
      const clePick = result.futurePicks!.find(
        (fp) => fp.originalTeam === 'CLE' && fp.year === 2027,
      );
      expect(clePick!.ownerTeam).toBe('TEN');

      // Firestore should have both updates in one call
      expect(mockDraftsDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          pickOrder: expect.any(Array),
          futurePicks: expect.any(Array),
        }),
      );
    });
  });
});
