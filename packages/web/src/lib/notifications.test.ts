/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockAdd, mockGet, mockDoc, mockCollection, mockFetch } = vi.hoisted(
  () => {
    const mockAdd = vi.fn().mockResolvedValue({ id: 'notif-1' });
    const mockGet = vi.fn();
    const mockDoc = vi.fn(() => ({ get: mockGet }));
    const mockCollection = vi.fn(() => ({ doc: mockDoc, add: mockAdd }));
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    return { mockAdd, mockGet, mockDoc, mockCollection, mockFetch };
  },
);

vi.mock('server-only', () => ({}));
vi.mock('./firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TS' },
}));
vi.stubGlobal('fetch', mockFetch);

import {
  createNotification,
  notifyNewFollower,
  notifyYourTurn,
  notifyTradeAccepted,
  notifyNewBoard,
} from './notifications.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockCollection.mockReturnValue({ doc: mockDoc, add: mockAdd });
  mockDoc.mockReturnValue({ get: mockGet });
});

describe('createNotification', () => {
  it('writes a notification to Firestore', async () => {
    mockGet.mockResolvedValue({ data: () => ({}) });

    await createNotification({
      userId: 'user-1',
      type: 'new-follower',
      title: 'New Follower',
      body: 'Alice started following you.',
    });

    expect(mockCollection).toHaveBeenCalledWith('notifications');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'new-follower',
        title: 'New Follower',
        body: 'Alice started following you.',
        read: false,
        createdAt: 'SERVER_TS',
      }),
    );
  });

  it('sends Discord webhook when user has webhookUrl', async () => {
    mockGet.mockResolvedValue({
      data: () => ({ discordWebhookUrl: 'https://discord.com/hook/123' }),
    });

    await createNotification({
      userId: 'user-1',
      type: 'new-follower',
      title: 'New Follower',
      body: 'Alice started following you.',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://discord.com/hook/123?wait=true',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('skips Discord when user opted out', async () => {
    mockGet.mockResolvedValue({
      data: () => ({
        discordWebhookUrl: 'https://discord.com/hook/123',
        notificationPreferences: { discord: false },
      }),
    });

    await createNotification({
      userId: 'user-1',
      type: 'new-follower',
      title: 'New Follower',
      body: 'Test',
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('skips Discord when user has no webhookUrl', async () => {
    mockGet.mockResolvedValue({ data: () => ({}) });

    await createNotification({
      userId: 'user-1',
      type: 'new-follower',
      title: 'New Follower',
      body: 'Test',
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('includes link in Discord embed when provided', async () => {
    mockGet.mockResolvedValue({
      data: () => ({ discordWebhookUrl: 'https://discord.com/hook/123' }),
    });

    await createNotification({
      userId: 'user-1',
      type: 'your-turn',
      title: "You're On the Clock",
      body: "It's your turn.",
      link: '/drafts/d1/live',
    });

    const fetchBody = JSON.parse(
      (mockFetch.mock.calls[0][1] as { body: string }).body,
    );
    expect(fetchBody.embeds[0].description).toContain('/drafts/d1/live');
  });
});

describe('convenience functions', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ data: () => ({}) });
  });

  it('notifyNewFollower creates correct notification', async () => {
    await notifyNewFollower('user-2', 'Alice', 'alice');

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        type: 'new-follower',
        title: 'New Follower',
        body: 'Alice started following you.',
        link: '/profile/alice',
        actorName: 'Alice',
      }),
    );
  });

  it('notifyYourTurn creates correct notification', async () => {
    await notifyYourTurn('user-1', 'draft-1', 'My Mock');

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'your-turn',
        title: "You're On the Clock",
        body: "It's your turn to pick in My Mock.",
        link: '/drafts/draft-1/live',
      }),
    );
  });

  it('notifyTradeAccepted creates correct notification', async () => {
    await notifyTradeAccepted('user-1', 'draft-1', 'My Mock', 'Bob');

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'trade-accepted',
        title: 'Trade Accepted',
        body: 'Your trade with Bob in My Mock was accepted.',
        link: '/drafts/draft-1/live',
      }),
    );
  });

  it('notifyNewBoard creates correct notification', async () => {
    await notifyNewBoard('user-3', 'Alice', 'Big Board 2026', 'board-1');

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-3',
        type: 'new-board',
        title: 'New Board Published',
        body: 'Alice published "Big Board 2026".',
        link: '/boards/board-1',
        actorName: 'Alice',
      }),
    );
  });
});
