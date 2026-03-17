/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockCollection, mockBatch, mockGet, mockWhere } = vi.hoisted(() => {
  const mockSet = vi.fn();
  const mockCommit = vi.fn().mockResolvedValue(undefined);
  const mockBatch = vi.fn(() => ({ set: mockSet, commit: mockCommit }));
  const mockGet = vi.fn();
  const mockDoc = vi.fn(() => ({ get: mockGet }));
  const mockWhere = vi.fn();
  const mockCollection = vi.fn((name: string) => {
    if (name === 'activityEvents')
      return { doc: vi.fn(() => ({ id: 'evt-1' })) };
    return { doc: mockDoc, where: mockWhere };
  });

  return { mockCollection, mockBatch, mockGet, mockWhere, mockSet, mockCommit };
});

vi.mock('server-only', () => ({}));
vi.mock('./firebase/firebase-admin', () => ({
  adminDb: {
    collection: mockCollection,
    batch: mockBatch,
  },
}));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TS' },
}));

import { fanOutActivity } from './activity.js';

beforeEach(() => {
  vi.clearAllMocks();
  // Reset collection mock to default behavior
  mockCollection.mockImplementation((name: string) => {
    if (name === 'activityEvents')
      return { doc: vi.fn(() => ({ id: 'evt-1' })) };
    return { doc: vi.fn(() => ({ get: mockGet })), where: mockWhere };
  });
});

describe('fanOutActivity', () => {
  it('writes one event per follower', async () => {
    mockWhere.mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: [
            { data: () => ({ followerId: 'follower-1' }) },
            { data: () => ({ followerId: 'follower-2' }) },
          ],
        }),
      }),
    });
    mockGet.mockResolvedValue({
      data: () => ({ displayName: 'Alice' }),
    });

    const mockSet = vi.fn();
    const mockCommit = vi.fn().mockResolvedValue(undefined);
    mockBatch.mockReturnValue({ set: mockSet, commit: mockCommit });

    await fanOutActivity({
      actorId: 'actor-1',
      type: 'board-published',
      targetId: 'board-1',
      targetName: 'My Board',
      targetLink: '/boards/my-board',
    });

    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'board-published',
        actorId: 'actor-1',
        actorName: 'Alice',
        targetId: 'board-1',
        targetName: 'My Board',
        targetLink: '/boards/my-board',
        feedUserId: 'follower-1',
        createdAt: 'SERVER_TS',
      }),
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ feedUserId: 'follower-2' }),
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it('skips when no followers', async () => {
    mockWhere.mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
      }),
    });

    const mockSet = vi.fn();
    mockBatch.mockReturnValue({ set: mockSet, commit: vi.fn() });

    await fanOutActivity({
      actorId: 'actor-1',
      type: 'report-created',
      targetId: 'rpt-1',
      targetName: 'Travis Hunter',
      targetLink: '/reports/rpt-1',
    });

    expect(mockSet).not.toHaveBeenCalled();
  });

  it('fetches actor display name from users collection', async () => {
    mockWhere.mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: [{ data: () => ({ followerId: 'f-1' }) }],
        }),
      }),
    });
    mockGet.mockResolvedValue({
      data: () => ({ displayName: 'Bob the Scout' }),
    });

    const mockSet = vi.fn();
    mockBatch.mockReturnValue({
      set: mockSet,
      commit: vi.fn().mockResolvedValue(undefined),
    });

    await fanOutActivity({
      actorId: 'actor-2',
      type: 'board-liked',
      targetId: 'board-2',
      targetName: 'Top 50',
      targetLink: '/boards/top-50',
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actorName: 'Bob the Scout' }),
    );
  });

  it('falls back to "A scout" when no display name', async () => {
    mockWhere.mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: [{ data: () => ({ followerId: 'f-1' }) }],
        }),
      }),
    });
    mockGet.mockResolvedValue({ data: () => ({}) });

    const mockSet = vi.fn();
    mockBatch.mockReturnValue({
      set: mockSet,
      commit: vi.fn().mockResolvedValue(undefined),
    });

    await fanOutActivity({
      actorId: 'actor-3',
      type: 'report-liked',
      targetId: 'rpt-2',
      targetName: 'Shedeur Sanders',
      targetLink: '/reports/rpt-2',
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actorName: 'A scout' }),
    );
  });
});
