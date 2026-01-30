const mockGet = vi.fn();
const mockAdd = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockDocGet = vi.fn();

vi.mock('../utils/firestore.js', () => ({
  db: {
    collection: () => ({
      where: mockWhere,
      add: mockAdd,
    }),
  },
}));

mockWhere.mockReturnValue({ limit: mockLimit });
mockLimit.mockReturnValue({ get: mockGet });

import { getOrCreateUser } from './user.service.js';

describe('getOrCreateUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns existing user when found by discordId', async () => {
    const userData = {
      discordId: '123',
      discordUsername: 'testuser',
      createdAt: { seconds: 0, nanoseconds: 0 },
      updatedAt: { seconds: 0, nanoseconds: 0 },
    };

    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'user-1', data: () => userData }],
    });

    const user = await getOrCreateUser('123', 'testuser');

    expect(user.id).toBe('user-1');
    expect(user.discordId).toBe('123');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('creates new user when not found', async () => {
    const createdData = {
      discordId: '456',
      discordUsername: 'newuser',
      createdAt: { seconds: 1, nanoseconds: 0 },
      updatedAt: { seconds: 1, nanoseconds: 0 },
    };

    mockGet.mockResolvedValue({ empty: true, docs: [] });
    mockDocGet.mockResolvedValue({
      id: 'user-2',
      data: () => createdData,
    });
    mockAdd.mockResolvedValue({ get: mockDocGet });

    const user = await getOrCreateUser('456', 'newuser');

    expect(user.id).toBe('user-2');
    expect(user.discordUsername).toBe('newuser');
    expect(mockAdd).toHaveBeenCalled();
  });
});
