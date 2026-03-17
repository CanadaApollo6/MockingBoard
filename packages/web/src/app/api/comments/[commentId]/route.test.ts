/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetSessionUser, mockRunTransaction, mockCollection } = vi.hoisted(
  () => {
    const mockGet = vi.fn();
    const mockDoc = vi.fn(() => ({ get: mockGet }));
    const mockCollection = vi.fn(() => ({ doc: mockDoc }));

    return {
      mockGetSessionUser: vi.fn(),
      mockRunTransaction: vi.fn(),
      mockCollection,
    };
  },
);

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/firebase/firebase-admin', () => ({
  adminDb: {
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  },
}));

import { DELETE } from './route.js';

function makeRequest() {
  return new Request('http://localhost/api/comments/c-1', { method: 'DELETE' });
}

const params = Promise.resolve({ commentId: 'c-1' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DELETE /api/comments/[commentId]', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await DELETE(makeRequest(), { params });

    expect(res.status).toBe(401);
  });

  it('deletes comment via transaction', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });
    mockRunTransaction.mockResolvedValue(undefined);

    const res = await DELETE(makeRequest(), { params });
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when comment not found', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });
    mockRunTransaction.mockRejectedValue(new Error('Comment not found'));

    const res = await DELETE(makeRequest(), { params });

    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not author or owner', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });
    mockRunTransaction.mockRejectedValue(new Error('Forbidden'));

    const res = await DELETE(makeRequest(), { params });

    expect(res.status).toBe(403);
  });
});
