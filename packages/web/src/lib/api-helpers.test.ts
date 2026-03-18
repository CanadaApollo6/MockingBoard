/// <reference types="vitest/globals" />
import { vi } from 'vitest';
import { NextResponse } from 'next/server';

const { mockGetSessionUser, mockIsAdmin } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockIsAdmin: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/firebase/admin', () => ({
  isAdmin: (uid: string) => mockIsAdmin(uid),
}));

import {
  requireSession,
  requireAdmin,
  isErrorResponse,
} from './api-helpers.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireSession', () => {
  it('returns session when authenticated', async () => {
    const session = { uid: 'user-1', email: 'test@test.com' };
    mockGetSessionUser.mockResolvedValue(session);

    const result = await requireSession();

    expect(result).toBe(session);
  });

  it('returns 401 NextResponse when not authenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const result = await requireSession();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
    const json = await (result as NextResponse).json();
    expect(json.error).toBe('Unauthorized');
  });
});

describe('requireAdmin', () => {
  it('returns session when user is admin', async () => {
    const session = { uid: 'admin-1', email: 'admin@test.com' };
    mockGetSessionUser.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);

    const result = await requireAdmin();

    expect(result).toBe(session);
    expect(mockIsAdmin).toHaveBeenCalledWith('admin-1');
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 403 when authenticated but not admin', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockIsAdmin.mockResolvedValue(false);

    const result = await requireAdmin();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
    const json = await (result as NextResponse).json();
    expect(json.error).toBe('Forbidden');
  });
});

describe('isErrorResponse', () => {
  it('returns true for NextResponse', () => {
    const response = NextResponse.json({ error: 'test' }, { status: 401 });
    expect(isErrorResponse(response)).toBe(true);
  });

  it('returns false for session object', () => {
    const session = {
      uid: 'user-1',
      email: 'test@test.com',
    } as unknown as NonNullable<
      Awaited<
        ReturnType<typeof import('@/lib/firebase/auth-session').getSessionUser>
      >
    >;
    expect(isErrorResponse(session)).toBe(false);
  });
});
