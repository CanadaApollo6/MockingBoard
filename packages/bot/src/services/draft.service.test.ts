const mockAdd = vi.fn();
const mockDocUpdate = vi.fn();
const mockDoc = vi.fn();
const mockCollectionGet = vi.fn();

vi.mock('../utils/firestore.js', () => ({
  db: {
    collection: () => ({
      add: mockAdd,
      doc: mockDoc,
      get: mockCollectionGet,
    }),
  },
}));

import {
  createDraft,
  getDraft,
  updateDraft,
  buildPickOrder,
  buildFuturePicks,
} from './draft.service.js';
import type { CreateDraftInput } from './draft.service.js';
import type { DraftSlot, TeamAbbreviation } from '@mockingboard/shared';

const baseInput: CreateDraftInput = {
  createdBy: 'user-1',
  config: {
    rounds: 1,
    secondsPerPick: 60,
    format: 'full',
    year: 2025,
    teamAssignmentMode: 'random',
    cpuSpeed: 'normal',
    tradesEnabled: true,
  },
  platform: 'discord',
  discord: { guildId: 'g1', channelId: 'c1', threadId: 't1' },
  teamAssignments: {} as CreateDraftInput['teamAssignments'],
  pickOrder: [],
  futurePicks: [],
};

describe('draft.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createDraft', () => {
    it('creates a draft with lobby status and currentPick 1', async () => {
      const draftData = {
        ...baseInput,
        status: 'lobby',
        currentPick: 1,
        currentRound: 1,
        createdAt: { seconds: 0, nanoseconds: 0 },
        updatedAt: { seconds: 0, nanoseconds: 0 },
      };

      mockAdd.mockResolvedValue({
        get: vi.fn().mockResolvedValue({
          id: 'draft-1',
          data: () => draftData,
        }),
      });

      const draft = await createDraft(baseInput);

      expect(draft.id).toBe('draft-1');
      expect(draft.status).toBe('lobby');
      expect(draft.currentPick).toBe(1);
      expect(draft.currentRound).toBe(1);
    });
  });

  describe('getDraft', () => {
    it('returns the draft when it exists', async () => {
      const draftData = { status: 'active', currentPick: 5 };
      mockDoc.mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          id: 'draft-1',
          data: () => draftData,
        }),
      });

      const draft = await getDraft('draft-1');

      expect(draft).not.toBeNull();
      expect(draft!.id).toBe('draft-1');
      expect(draft!.status).toBe('active');
    });

    it('returns null when draft does not exist', async () => {
      mockDoc.mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
      });

      const draft = await getDraft('nonexistent');

      expect(draft).toBeNull();
    });
  });

  describe('updateDraft', () => {
    it('calls update with the provided fields', async () => {
      mockDoc.mockReturnValue({ update: mockDocUpdate });
      mockDocUpdate.mockResolvedValue(undefined);

      await updateDraft('draft-1', { status: 'active', currentPick: 2 });

      expect(mockDoc).toHaveBeenCalledWith('draft-1');
      expect(mockDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          currentPick: 2,
        }),
      );
    });
  });

  describe('buildPickOrder', () => {
    const sampleSlots: DraftSlot[] = [
      { overall: 1, round: 1, pick: 1, team: 'LV' as TeamAbbreviation },
      { overall: 2, round: 1, pick: 2, team: 'NYJ' as TeamAbbreviation },
      { overall: 33, round: 2, pick: 1, team: 'LV' as TeamAbbreviation },
      { overall: 34, round: 2, pick: 2, team: 'NYJ' as TeamAbbreviation },
      { overall: 65, round: 3, pick: 1, team: 'LV' as TeamAbbreviation },
    ];

    it('reads from Firestore and returns picks for the requested rounds', async () => {
      mockDoc.mockReturnValue({
        get: vi.fn().mockResolvedValue({
          data: () => ({ slots: sampleSlots }),
        }),
      });

      const order = await buildPickOrder(1, 2026);

      expect(order).toHaveLength(2);
      expect(order[0].overall).toBe(1);
      expect(order[0].round).toBe(1);
      expect(order[1].overall).toBe(2);
    });

    it('filters to the requested number of rounds', async () => {
      mockDoc.mockReturnValue({
        get: vi.fn().mockResolvedValue({
          data: () => ({ slots: sampleSlots }),
        }),
      });

      const order = await buildPickOrder(2, 2026);

      expect(order).toHaveLength(4);
      for (const slot of order) {
        expect(slot.round).toBeLessThanOrEqual(2);
      }
    });

    it('returns picks sorted by overall ascending', async () => {
      mockDoc.mockReturnValue({
        get: vi.fn().mockResolvedValue({
          data: () => ({ slots: sampleSlots }),
        }),
      });

      const order = await buildPickOrder(3, 2026);

      for (let i = 1; i < order.length; i++) {
        expect(order[i].overall).toBeGreaterThan(order[i - 1].overall);
      }
    });

    it('throws if no draft order found for year', async () => {
      mockDoc.mockReturnValue({
        get: vi.fn().mockResolvedValue({
          data: () => null,
        }),
      });

      await expect(buildPickOrder(1, 9999)).rejects.toThrow(
        'No draft order found for year 9999',
      );
    });
  });

  describe('buildFuturePicks', () => {
    it('produces rounds 1-3 for year+1 and year+2 for all 32 teams', async () => {
      // No team docs have futurePicks seeded
      mockCollectionGet.mockResolvedValue({
        docs: [],
      });

      const futurePicks = await buildFuturePicks(2026);

      // 32 teams * 3 rounds * 2 years = 192
      expect(futurePicks).toHaveLength(192);

      // Check year+1 defaults
      const year1Picks = futurePicks.filter((fp) => fp.year === 2027);
      expect(year1Picks).toHaveLength(96); // 32 * 3

      // Check year+2 defaults
      const year2Picks = futurePicks.filter((fp) => fp.year === 2028);
      expect(year2Picks).toHaveLength(96);

      // Each pick should have ownerTeam === originalTeam (default)
      for (const fp of futurePicks) {
        expect(fp.ownerTeam).toBe(fp.originalTeam);
      }
    });

    it('respects seeded overrides from team docs', async () => {
      // NYJ has acquired DAL's 2027 round 1 pick
      mockCollectionGet.mockResolvedValue({
        docs: [
          {
            id: 'NYJ',
            data: () => ({
              futurePicks: [{ year: 2027, round: 1, originalTeam: 'DAL' }],
            }),
          },
        ],
      });

      const futurePicks = await buildFuturePicks(2026);

      // Find DAL's 2027 round 1 pick — should be owned by NYJ
      const dalPick = futurePicks.find(
        (fp) => fp.year === 2027 && fp.round === 1 && fp.originalTeam === 'DAL',
      );
      expect(dalPick).toBeDefined();
      expect(dalPick!.ownerTeam).toBe('NYJ');
    });

    it('does not duplicate seeded picks with defaults', async () => {
      // NYJ owns its own 2027 round 1 (explicitly seeded)
      mockCollectionGet.mockResolvedValue({
        docs: [
          {
            id: 'NYJ',
            data: () => ({
              futurePicks: [{ year: 2027, round: 1, originalTeam: 'NYJ' }],
            }),
          },
        ],
      });

      const futurePicks = await buildFuturePicks(2026);

      // Should still be 192 total — seeded entry replaces default
      const nyjRound1 = futurePicks.filter(
        (fp) => fp.year === 2027 && fp.round === 1 && fp.originalTeam === 'NYJ',
      );
      expect(nyjRound1).toHaveLength(1);
    });
  });
});
