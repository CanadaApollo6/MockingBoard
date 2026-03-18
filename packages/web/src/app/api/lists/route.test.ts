/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGetSessionUser,
  mockCollection,
  mockDocGet,
  mockDocSet,
  mockGetUserLists,
} = vi.hoisted(() => {
  const mockDocGet = vi.fn();
  const mockDocSet = vi.fn().mockResolvedValue(undefined);
  const mockDoc = vi.fn(() => ({
    id: 'new-list-id',
    get: mockDocGet,
    set: mockDocSet,
  }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));

  return {
    mockGetSessionUser: vi.fn(),
    mockCollection,
    mockDoc,
    mockDocGet,
    mockDocSet,
    mockGetUserLists: vi.fn(),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/firebase/firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('@/lib/firebase/data', () => ({
  getUserLists: () => mockGetUserLists(),
}));

import { GET, POST } from './route.js';

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/lists', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns user lists', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockGetUserLists.mockResolvedValue([{ id: 'list-1', name: 'My List' }]);

    const res = await GET();
    const data = await res.json();
    expect(data.lists).toHaveLength(1);
    expect(data.lists[0].name).toBe('My List');
  });
});

describe('POST /api/lists', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await POST(makePostRequest({ name: 'Test' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it('creates list and returns id', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1', name: 'Bob' });
    mockDocGet.mockResolvedValue({ data: () => ({ displayName: 'Bob' }) });

    const res = await POST(
      makePostRequest({ name: 'My Draft Board Rankings' }),
    );
    const data = await res.json();
    expect(data.id).toBe('new-list-id');
    expect(data.name).toBe('My Draft Board Rankings');
    expect(mockDocSet).toHaveBeenCalled();
  });
});
