const mockAdd = jest.fn();
const mockOrderBy = jest.fn();
const mockSubGet = jest.fn();

jest.mock('../utils/firestore.js', () => ({
  db: {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          add: mockAdd,
          orderBy: mockOrderBy,
        }),
      }),
    }),
  },
}));

mockOrderBy.mockReturnValue({ get: mockSubGet });

import { createPick, getPicksByDraft } from './pick.service.js';

describe('pick.service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createPick', () => {
    it('writes a pick and returns it', async () => {
      const pickData = {
        draftId: 'draft-1',
        overall: 1,
        round: 1,
        pick: 1,
        team: 'TEN' as const,
        userId: 'user-1',
        playerId: 'player-1',
        createdAt: { seconds: 0, nanoseconds: 0 },
      };

      mockAdd.mockResolvedValue({
        get: jest.fn().mockResolvedValue({
          id: 'pick-1',
          data: () => pickData,
        }),
      });

      const pick = await createPick({
        draftId: 'draft-1',
        overall: 1,
        round: 1,
        pick: 1,
        team: 'TEN',
        userId: 'user-1',
        playerId: 'player-1',
      });

      expect(pick.id).toBe('pick-1');
      expect(pick.team).toBe('TEN');
      expect(pick.playerId).toBe('player-1');
    });
  });

  describe('getPicksByDraft', () => {
    it('returns picks ordered by overall', async () => {
      mockSubGet.mockResolvedValue({
        docs: [
          { id: 'p1', data: () => ({ overall: 1, team: 'TEN' }) },
          { id: 'p2', data: () => ({ overall: 2, team: 'JAX' }) },
        ],
      });

      const picks = await getPicksByDraft('draft-1');

      expect(picks).toHaveLength(2);
      expect(picks[0].id).toBe('p1');
      expect(picks[1].id).toBe('p2');
      expect(mockOrderBy).toHaveBeenCalledWith('overall');
    });
  });
});
