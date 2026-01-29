const mockAdd = jest.fn();
const mockDocUpdate = jest.fn();
const mockDoc = jest.fn();

jest.mock('../utils/firestore.js', () => ({
  db: {
    collection: () => ({
      add: mockAdd,
      doc: mockDoc,
    }),
  },
}));

import {
  createDraft,
  getDraft,
  updateDraft,
  buildPickOrder,
} from './draft.service.js';
import type { CreateDraftInput } from './draft.service.js';

const baseInput: CreateDraftInput = {
  createdBy: 'user-1',
  config: {
    rounds: 1,
    secondsPerPick: 60,
    format: 'full',
    year: 2025,
    teamAssignmentMode: 'random',
    cpuSpeed: 'normal',
  },
  platform: 'discord',
  discord: { guildId: 'g1', channelId: 'c1', threadId: 't1' },
  teamAssignments: {} as CreateDraftInput['teamAssignments'],
  pickOrder: [],
};

describe('draft.service', () => {
  beforeEach(() => jest.clearAllMocks());

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
        get: jest.fn().mockResolvedValue({
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
        get: jest.fn().mockResolvedValue({
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
        get: jest.fn().mockResolvedValue({ exists: false }),
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
    it('returns 32 picks for a 1-round draft', () => {
      const order = buildPickOrder(1);
      expect(order).toHaveLength(32);
      expect(order[0].overall).toBe(1);
      expect(order[0].round).toBe(1);
      expect(order[31].overall).toBe(32);
    });

    it('returns all 257 picks for a 7-round draft', () => {
      const order = buildPickOrder(7);
      expect(order).toHaveLength(257);
    });

    it('returns picks sorted by overall ascending', () => {
      const order = buildPickOrder(3);
      for (let i = 1; i < order.length; i++) {
        expect(order[i].overall).toBeGreaterThan(order[i - 1].overall);
      }
    });

    it('only includes picks up to the specified round', () => {
      const order = buildPickOrder(2);
      for (const slot of order) {
        expect(slot.round).toBeLessThanOrEqual(2);
      }
    });
  });
});
