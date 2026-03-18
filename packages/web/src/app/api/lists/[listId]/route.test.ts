/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGetSessionUser,
  mockCollection,
  mockGetList,
  mockUpdate,
  mockDelete,
} = vi.hoisted(() => {
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn().mockResolvedValue(undefined);
  const mockDoc = vi.fn(() => ({ update: mockUpdate, delete: mockDelete }));
  const mockWhere = vi.fn(() => ({
    limit: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ docs: [] }),
    })),
  }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc, where: mockWhere }));

  return {
    mockGetSessionUser: vi.fn(),
    mockCollection,
    mockGetList: vi.fn(),
    mockUpdate,
    mockDelete,
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
  getList: () => mockGetList(),
}));

import { GET, PUT, DELETE } from './route.js';

const params = Promise.resolve({ listId: 'list-1' });

function makePutRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/lists/list-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/lists/[listId]', () => {
  it('returns 404 when list not found', async () => {
    mockGetList.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost'), { params });
    expect(res.status).toBe(404);
  });

  it('returns public list', async () => {
    mockGetList.mockResolvedValue({
      id: 'list-1',
      name: 'Test',
      visibility: 'public',
    });

    const res = await GET(new Request('http://localhost'), { params });
    const data = await res.json();
    expect(data.list.name).toBe('Test');
  });

  it('returns 403 for private list from non-owner', async () => {
    mockGetList.mockResolvedValue({
      id: 'list-1',
      visibility: 'private',
      userId: 'owner-1',
    });
    mockGetSessionUser.mockResolvedValue({ uid: 'other-user' });

    const res = await GET(new Request('http://localhost'), { params });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/lists/[listId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await PUT(makePutRequest({ name: 'New Name' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'other-user' });
    mockGetList.mockResolvedValue({ id: 'list-1', userId: 'owner-1' });

    const res = await PUT(makePutRequest({ name: 'New Name' }), { params });
    expect(res.status).toBe(403);
  });

  it('updates list successfully', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'owner-1' });
    mockGetList.mockResolvedValue({ id: 'list-1', userId: 'owner-1' });

    const res = await PUT(makePutRequest({ name: 'Updated Name' }), {
      params,
    });
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe('DELETE /api/lists/[listId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await DELETE(new Request('http://localhost'), { params });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'other-user' });
    mockGetList.mockResolvedValue({ id: 'list-1', userId: 'owner-1' });

    const res = await DELETE(new Request('http://localhost'), { params });
    expect(res.status).toBe(403);
  });

  it('deletes list successfully', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'owner-1' });
    mockGetList.mockResolvedValue({ id: 'list-1', userId: 'owner-1' });

    const res = await DELETE(new Request('http://localhost'), { params });
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });
});
