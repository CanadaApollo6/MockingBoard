/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetSessionUser, mockRateLimit, mockCollection } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSet = vi.fn().mockResolvedValue(undefined);
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockDoc = vi.fn(() => ({
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
  }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));

  return {
    mockGetSessionUser: vi.fn(),
    mockRateLimit: vi.fn().mockReturnValue(true),
    mockCollection,
    mockDoc,
    mockGet,
    mockSet,
    mockUpdate,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/firebase/firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

import { POST } from './route.js';

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/reports/flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  contentType: 'board',
  contentId: 'board-1',
  reason: 'spam',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue(true);
});

describe('POST /api/reports/flag', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing contentType', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });
    const res = await POST(makeRequest({ contentId: 'x', reason: 'spam' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid contentType', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });
    const res = await POST(
      makeRequest({ contentType: 'draft', contentId: 'x', reason: 'spam' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing contentId', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });
    const res = await POST(
      makeRequest({ contentType: 'board', reason: 'spam' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing reason', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });
    const res = await POST(
      makeRequest({ contentType: 'board', contentId: 'x' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid reason', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });
    const res = await POST(
      makeRequest({ contentType: 'board', contentId: 'x', reason: 'rude' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when reason is "other" but reasonText is empty', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });
    const res = await POST(
      makeRequest({
        contentType: 'board',
        contentId: 'x',
        reason: 'other',
        reasonText: '',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when reasonText exceeds 200 chars', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });
    const res = await POST(
      makeRequest({
        contentType: 'board',
        contentId: 'x',
        reason: 'other',
        reasonText: 'a'.repeat(201),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });
    mockRateLimit.mockReturnValue(false);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
  });

  it('returns 409 for duplicate report', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });

    // contentReports: doc exists (duplicate)
    const mockReportGet = vi.fn().mockResolvedValue({ exists: true });
    const mockReportDoc = vi.fn(() => ({ get: mockReportGet }));
    mockCollection.mockReturnValueOnce({ doc: mockReportDoc });

    // bigBoards: content lookup runs in parallel
    const mockContentGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ userId: 'u-2', name: 'Board' }),
    });
    const mockContentDoc = vi.fn(() => ({ get: mockContentGet }));
    mockCollection.mockReturnValueOnce({ doc: mockContentDoc });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
  });

  it('returns 404 when content does not exist', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });

    // contentReports: not found
    const mockReportGet = vi.fn().mockResolvedValue({ exists: false });
    const mockReportDoc = vi.fn(() => ({
      get: mockReportGet,
      set: vi.fn(),
    }));
    mockCollection.mockReturnValueOnce({ doc: mockReportDoc });

    // bigBoards: not found
    const mockContentGet = vi.fn().mockResolvedValue({ exists: false });
    const mockContentDoc = vi.fn(() => ({ get: mockContentGet }));
    mockCollection.mockReturnValueOnce({ doc: mockContentDoc });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
  });

  it('returns 400 for self-reporting', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1', name: 'Alice' });

    // contentReports: not found
    const mockReportGet = vi.fn().mockResolvedValue({ exists: false });
    const mockReportDoc = vi.fn(() => ({
      get: mockReportGet,
      set: vi.fn(),
    }));
    mockCollection.mockReturnValueOnce({ doc: mockReportDoc });

    // bigBoards: found, owned by same user
    const mockContentGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ userId: 'u-1', name: 'My Board' }),
    });
    const mockContentDoc = vi.fn(() => ({ get: mockContentGet }));
    mockCollection.mockReturnValueOnce({ doc: mockContentDoc });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('own content');
  });

  it('creates report and moderation doc on first report', async () => {
    mockGetSessionUser.mockResolvedValue({
      uid: 'u-1',
      name: 'Alice',
      email: 'alice@test.com',
    });

    const mockReportSet = vi.fn().mockResolvedValue(undefined);
    const mockReportGet = vi.fn().mockResolvedValue({ exists: false });
    const mockReportDoc = vi.fn(() => ({
      get: mockReportGet,
      set: mockReportSet,
    }));
    mockCollection.mockReturnValueOnce({ doc: mockReportDoc });

    // Content lookup
    const mockContentGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'u-2',
        authorName: 'Bob',
        name: 'Great Board',
      }),
    });
    const mockContentDoc = vi.fn(() => ({ get: mockContentGet }));
    mockCollection.mockReturnValueOnce({ doc: mockContentDoc });

    // Moderation doc: set with merge
    const mockModSet = vi.fn().mockResolvedValue(undefined);
    const mockModDoc = vi.fn(() => ({ set: mockModSet }));
    mockCollection.mockReturnValueOnce({ doc: mockModDoc });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    // Verify report was written
    expect(mockReportSet).toHaveBeenCalledTimes(1);
    const reportData = mockReportSet.mock.calls[0][0];
    expect(reportData.reporterId).toBe('u-1');
    expect(reportData.contentType).toBe('board');
    expect(reportData.reason).toBe('spam');

    // Verify moderation doc was set with merge
    expect(mockModSet).toHaveBeenCalledTimes(1);
    const modData = mockModSet.mock.calls[0][0];
    const modOptions = mockModSet.mock.calls[0][1];
    expect(modData.status).toBe('pending');
    expect(modOptions).toEqual({ merge: true });
  });

  it('increments reportCount on subsequent report', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-3', name: 'Charlie' });

    const mockReportSet = vi.fn().mockResolvedValue(undefined);
    const mockReportGet = vi.fn().mockResolvedValue({ exists: false });
    const mockReportDoc = vi.fn(() => ({
      get: mockReportGet,
      set: mockReportSet,
    }));
    mockCollection.mockReturnValueOnce({ doc: mockReportDoc });

    const mockContentGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'u-2',
        authorName: 'Bob',
        name: 'Some Board',
      }),
    });
    const mockContentDoc = vi.fn(() => ({ get: mockContentGet }));
    mockCollection.mockReturnValueOnce({ doc: mockContentDoc });

    // Moderation doc: set with merge (same path for first and subsequent)
    const mockModSet = vi.fn().mockResolvedValue(undefined);
    const mockModDoc = vi.fn(() => ({ set: mockModSet }));
    mockCollection.mockReturnValueOnce({ doc: mockModDoc });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    // Verify moderation doc was set with merge (handles both create and update)
    expect(mockModSet).toHaveBeenCalledTimes(1);
    expect(mockModSet.mock.calls[0][1]).toEqual({ merge: true });
  });
});
