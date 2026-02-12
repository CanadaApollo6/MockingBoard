/// <reference types="vitest/globals" />
import { vi, type Mock } from 'vitest';

const { mockGet, mockDoc, mockCollection, mockFetch } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockDoc = vi.fn(() => ({ get: mockGet }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));
  const mockFetch = vi.fn();
  return { mockGet, mockDoc, mockCollection, mockFetch };
});

vi.mock('server-only', () => ({}));
vi.mock('./firebase/firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('./teams', () => ({
  getTeamName: (abbr: string) => `${abbr} Team`,
}));
vi.mock('./colors/team-colors', () => ({
  getTeamColor: () => ({ primary: '#003594', secondary: '#041E42' }),
}));
vi.stubGlobal('fetch', mockFetch);

import {
  resolveWebhookConfig,
  sendDraftStarted,
  sendPickAnnouncement,
  sendDraftComplete,
} from './discord-webhook.js';
import type { Draft, Pick, Player } from '@mockingboard/shared';

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    createdBy: 'user-1',
    config: {
      rounds: 3,
      format: 'single-team',
      year: 2026,
      cpuSpeed: 'normal',
      secondsPerPick: 0,
      tradesEnabled: false,
      teamAssignmentMode: 'choice',
    },
    status: 'active',
    currentPick: 1,
    currentRound: 1,
    platform: 'web',
    teamAssignments: { DAL: 'user-1' } as Draft['teamAssignments'],
    participants: { 'user-1': 'user-1' },
    pickOrder: [],
    pickedPlayerIds: [],
    createdAt: { seconds: 0, nanoseconds: 0 },
    updatedAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  } as Draft;
}

function makePick(overrides: Partial<Pick> = {}): Pick {
  return {
    id: 'pick-1',
    draftId: 'draft-1',
    overall: 1,
    round: 1,
    pick: 1,
    team: 'DAL',
    userId: 'user-1',
    playerId: 'player-1',
    createdAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  } as Pick;
}

function makePlayerMap(...players: Partial<Player>[]): Map<string, Player> {
  const map = new Map<string, Player>();
  for (const p of players) {
    const player = {
      id: p.id ?? 'player-1',
      name: p.name ?? 'Test Player',
      position: p.position ?? 'QB',
      school: p.school ?? 'State U',
      consensusRank: 1,
      year: 2026,
      updatedAt: { seconds: 0, nanoseconds: 0 },
      ...p,
    } as Player;
    map.set(player.id, player);
  }
  return map;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({}),
    text: async () => '',
  });
});

describe('resolveWebhookConfig', () => {
  it('returns null when draft has no notificationLevel', async () => {
    const draft = makeDraft({ notificationLevel: undefined });
    expect(await resolveWebhookConfig(draft)).toBeNull();
  });

  it('returns null when notificationLevel is off', async () => {
    const draft = makeDraft({ notificationLevel: 'off' });
    expect(await resolveWebhookConfig(draft)).toBeNull();
  });

  it('returns null when user doc not found', async () => {
    mockGet.mockResolvedValue({ exists: false });
    const draft = makeDraft({ notificationLevel: 'full' });
    expect(await resolveWebhookConfig(draft)).toBeNull();
  });

  it('returns null when user has no webhookUrl', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({}) });
    const draft = makeDraft({ notificationLevel: 'full' });
    expect(await resolveWebhookConfig(draft)).toBeNull();
  });

  it('returns config when everything is valid', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        discordWebhookUrl: 'https://discord.com/api/webhooks/123/abc',
      }),
    });
    const draft = makeDraft({
      notificationLevel: 'full',
      webhookThreadId: 'thread-1',
    });

    const config = await resolveWebhookConfig(draft);
    expect(config).toEqual({
      webhookUrl: 'https://discord.com/api/webhooks/123/abc',
      notificationLevel: 'full',
      threadId: 'thread-1',
    });
    expect(mockCollection).toHaveBeenCalledWith('users');
    expect(mockDoc).toHaveBeenCalledWith('user-1');
  });
});

describe('sendDraftStarted', () => {
  const webhookUrl = 'https://discord.com/api/webhooks/123/abc';
  const draftUrl = 'https://example.com/drafts/draft-1/live';

  it('returns undefined for off level', async () => {
    const result = await sendDraftStarted(
      webhookUrl,
      makeDraft(),
      draftUrl,
      'off',
    );
    expect(result).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends single embed for link-only', async () => {
    const draft = makeDraft();
    const result = await sendDraftStarted(
      webhookUrl,
      draft,
      draftUrl,
      'link-only',
    );

    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = (mockFetch as Mock).mock.calls[0];
    expect(url).toContain(webhookUrl);
    expect(url).toContain('wait=true');

    const body = JSON.parse(options.body);
    expect(body.embeds[0].title).toBe('Mock Draft Started');
    expect(body.embeds[0].fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'View Draft' })]),
    );
    // No thread_name for link-only
    expect(body.thread_name).toBeUndefined();
  });

  it('creates thread for full mode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ channel_id: 'thread-123' }),
      text: async () => '',
    });

    const draft = makeDraft();
    const result = await sendDraftStarted(webhookUrl, draft, draftUrl, 'full');

    expect(result).toBe('thread-123');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const body = JSON.parse((mockFetch as Mock).mock.calls[0][1].body);
    expect(body.thread_name).toMatch(/^Mock Draft - /);
  });

  it('includes team names in embed', async () => {
    const draft = makeDraft();
    await sendDraftStarted(webhookUrl, draft, draftUrl, 'link-only');

    const body = JSON.parse((mockFetch as Mock).mock.calls[0][1].body);
    const teamsField = body.embeds[0].fields.find(
      (f: { name: string }) => f.name === 'Teams',
    );
    expect(teamsField.value).toContain('DAL Team');
  });
});

describe('sendPickAnnouncement', () => {
  const webhookUrl = 'https://discord.com/api/webhooks/123/abc';
  const threadId = 'thread-1';

  it('returns immediately for empty picks', async () => {
    await sendPickAnnouncement(webhookUrl, threadId, [], new Map());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends individual embed for single pick', async () => {
    const pick = makePick({ playerId: 'p1', team: 'DAL', overall: 5 });
    const playerMap = makePlayerMap({
      id: 'p1',
      name: 'John Smith',
      position: 'QB',
      school: 'Alabama',
    });

    await sendPickAnnouncement(webhookUrl, threadId, [pick], playerMap);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = (mockFetch as Mock).mock.calls[0];
    expect(url).toContain('thread_id=thread-1');

    const body = JSON.parse(options.body);
    expect(body.embeds[0].title).toContain('Pick 5');
    expect(body.embeds[0].title).toContain('DAL Team');
    expect(body.embeds[0].description).toContain('John Smith');
  });

  it('marks CPU picks with footer', async () => {
    const pick = makePick({ userId: null, playerId: 'p1' });
    const playerMap = makePlayerMap({ id: 'p1' });

    await sendPickAnnouncement(webhookUrl, threadId, [pick], playerMap);

    const body = JSON.parse((mockFetch as Mock).mock.calls[0][1].body);
    expect(body.embeds[0].footer).toEqual({ text: 'CPU Pick' });
  });

  it('omits footer for user picks', async () => {
    const pick = makePick({ userId: 'user-1', playerId: 'p1' });
    const playerMap = makePlayerMap({ id: 'p1' });

    await sendPickAnnouncement(webhookUrl, threadId, [pick], playerMap);

    const body = JSON.parse((mockFetch as Mock).mock.calls[0][1].body);
    expect(body.embeds[0].footer).toBeUndefined();
  });

  it('batches multiple picks into one embed', async () => {
    const picks = [
      makePick({ overall: 2, team: 'NYG', playerId: 'p1' }),
      makePick({ overall: 3, team: 'NE', playerId: 'p2' }),
      makePick({ overall: 4, team: 'ARI', playerId: 'p3' }),
    ];
    const playerMap = makePlayerMap(
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
      { id: 'p3', name: 'C' },
    );

    await sendPickAnnouncement(webhookUrl, threadId, picks, playerMap);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((mockFetch as Mock).mock.calls[0][1].body);
    expect(body.embeds[0].title).toBe('CPU Picks 2–4');
    expect(body.embeds[0].description).toContain('A');
    expect(body.embeds[0].description).toContain('B');
    expect(body.embeds[0].description).toContain('C');
  });
});

describe('sendDraftComplete', () => {
  const webhookUrl = 'https://discord.com/api/webhooks/123/abc';
  const draftUrl = 'https://example.com/drafts/draft-1/live';

  it('sends completion embed with link', async () => {
    const draft = makeDraft();
    await sendDraftComplete(webhookUrl, 'thread-1', draft, draftUrl);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((mockFetch as Mock).mock.calls[0][1].body);
    expect(body.embeds[0].title).toBe('Draft Complete');
    expect(body.embeds[0].description).toContain('View Results');
    expect(body.embeds[0].description).toContain(draftUrl);
  });

  it('passes threadId to fetch URL', async () => {
    await sendDraftComplete(webhookUrl, 'thread-1', makeDraft(), draftUrl);

    const url = (mockFetch as Mock).mock.calls[0][0] as string;
    expect(url).toContain('thread_id=thread-1');
  });

  it('works without threadId', async () => {
    await sendDraftComplete(webhookUrl, undefined, makeDraft(), draftUrl);

    const url = (mockFetch as Mock).mock.calls[0][0] as string;
    expect(url).not.toContain('thread_id');
  });
});
