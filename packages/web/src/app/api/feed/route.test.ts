/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetSessionUser, mockWhere, mockCollection } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockStartAfter = vi.fn(() => ({ limit: mockLimit }));
  const mockOrderBy = vi.fn(() => ({
    startAfter: mockStartAfter,
    limit: mockLimit,
  }));
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockCollection = vi.fn(() => ({ where: mockWhere }));

  return {
    mockGetSessionUser: vi.fn(),
    mockWhere,
    mockCollection,
    mockOrderBy,
    mockStartAfter,
    mockLimit,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/firebase/firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('firebase-admin/firestore', () => ({
  Timestamp: class {
    constructor(
      public seconds: number,
      public nanoseconds: number,
    ) {}
  },
}));

import { GET } from './route.js';

function makeRequest(query = '') {
  return new Request(`http://localhost/api/feed${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

function mockSnapshot(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
) {
  // We need to set up the chain so limit().get() works
  const snapshot = {
    docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  };
  // Rebuild the chain for each test
  const mockOrderBy = vi.fn();
  const mockStartAfter = vi.fn();
  const limitFn = vi
    .fn()
    .mockReturnValue({ get: vi.fn().mockResolvedValue(snapshot) });

  mockOrderBy.mockReturnValue({ startAfter: mockStartAfter, limit: limitFn });
  mockStartAfter.mockReturnValue({ limit: limitFn });
  mockWhere.mockReturnValue({ orderBy: mockOrderBy });
}

describe('GET /api/feed', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it('returns events for authenticated user', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockSnapshot([
      {
        id: 'evt-1',
        data: {
          type: 'board-published',
          actorId: 'actor-1',
          actorName: 'Alice',
          targetId: 'board-1',
          targetName: 'Top 50',
          targetLink: '/boards/top-50',
          feedUserId: 'user-1',
          createdAt: { seconds: 1000, nanoseconds: 0 },
        },
      },
    ]);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.events).toHaveLength(1);
    expect(json.events[0].type).toBe('board-published');
    expect(json.hasMore).toBe(false);
  });

  it('returns empty array when no events', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockSnapshot([]);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.events).toHaveLength(0);
    expect(json.hasMore).toBe(false);
  });

  it('detects hasMore when over limit', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    // limit defaults to 20, so 21 results means hasMore = true
    const docs = Array.from({ length: 21 }, (_, i) => ({
      id: `evt-${i}`,
      data: {
        type: 'report-created' as const,
        actorId: 'actor-1',
        actorName: 'Bob',
        targetId: `rpt-${i}`,
        targetName: 'Player',
        targetLink: `/reports/rpt-${i}`,
        feedUserId: 'user-1',
        createdAt: { seconds: 1000 - i, nanoseconds: 0 },
      },
    }));
    mockSnapshot(docs);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.events).toHaveLength(20);
    expect(json.hasMore).toBe(true);
  });
});
