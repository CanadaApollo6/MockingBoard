/// <reference types="vitest/globals" />
import { vi } from 'vitest';

// ---- hoisted mocks ----

const {
  mockAdd,
  mockCollection,
  mockGetCachedDraftOrderSlots,
  mockGetCachedTeamDocs,
  mockGetCachedDraftNames,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockAdd = vi.fn();
  const mockDoc = vi.fn(() => ({ get: mockGet }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc, add: mockAdd }));
  return {
    mockAdd,
    mockGet,
    mockDoc,
    mockCollection,
    mockGetCachedDraftOrderSlots: vi.fn(),
    mockGetCachedTeamDocs: vi.fn(),
    mockGetCachedDraftNames: vi.fn(),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    arrayUnion: (...args: unknown[]) => ({ _arrayUnion: args }),
  },
}));
vi.mock('../firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('../cache', () => ({
  getCachedDraftOrderSlots: (...args: unknown[]) =>
    mockGetCachedDraftOrderSlots(...args),
  getCachedTeamDocs: (...args: unknown[]) => mockGetCachedTeamDocs(...args),
  getCachedDraftNames: (...args: unknown[]) => mockGetCachedDraftNames(...args),
}));
vi.mock('../sanitize', () => ({
  hydrateDoc: (doc: { id: string; data: () => Record<string, unknown> }) => ({
    id: doc.id,
    ...doc.data(),
  }),
}));

// @mockingboard/shared is NOT mocked — real pure functions run.
// Only I/O boundaries (Firestore, cache) are mocked.

import { buildPickOrder, buildFuturePicks, createWebDraft } from './setup.js';
import type { DraftSlot, TeamAbbreviation } from '@mockingboard/shared';

// ---- helpers ----

function makeSlot(overrides: Partial<DraftSlot> = {}): DraftSlot {
  return {
    overall: 1,
    round: 1,
    pick: 1,
    team: 'NE' as TeamAbbreviation,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCachedDraftNames.mockResolvedValue(null);
});

// ============ buildPickOrder ============

describe('buildPickOrder', () => {
  it('fetches slots for the given year and filters to requested rounds', async () => {
    const slots = [
      makeSlot({
        overall: 1,
        round: 1,
        pick: 1,
        team: 'NE' as TeamAbbreviation,
      }),
      makeSlot({
        overall: 33,
        round: 2,
        pick: 1,
        team: 'NE' as TeamAbbreviation,
      }),
    ];
    mockGetCachedDraftOrderSlots.mockResolvedValue(slots);

    const result = await buildPickOrder(1, 2026);

    expect(mockGetCachedDraftOrderSlots).toHaveBeenCalledWith(2026);
    // Real filterAndSortPickOrder keeps only round <= 1
    expect(result.every((s) => s.round <= 1)).toBe(true);
  });

  it('returns all slots when rounds covers everything', async () => {
    const slots = [
      makeSlot({ overall: 1, round: 1 }),
      makeSlot({ overall: 33, round: 2 }),
    ];
    mockGetCachedDraftOrderSlots.mockResolvedValue(slots);

    const result = await buildPickOrder(7, 2026);

    expect(result).toHaveLength(2);
  });
});

// ============ buildFuturePicks ============

describe('buildFuturePicks', () => {
  it('generates future picks from cached team docs', async () => {
    mockGetCachedTeamDocs.mockResolvedValue([]);

    const result = await buildFuturePicks(2026, 7);

    expect(mockGetCachedTeamDocs).toHaveBeenCalled();
    // Real buildFuturePicksFromSeeds generates 2027+2028 picks for all 32 teams
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('year');
    expect(result[0]).toHaveProperty('originalTeam');
    expect(result[0]).toHaveProperty('ownerTeam');
  });

  it('prepends extra-round slots when draftRounds < 7', async () => {
    mockGetCachedTeamDocs.mockResolvedValue([]);

    const r1Slot = makeSlot({ overall: 1, round: 1 });
    const r4Slot = makeSlot({
      overall: 100,
      round: 4,
      team: 'DAL' as TeamAbbreviation,
    });
    mockGetCachedDraftOrderSlots.mockResolvedValue([r1Slot, r4Slot]);

    const result = await buildFuturePicks(2026, 3);

    // Extra slots (round > draftRounds) appear first
    const extraSlots = result.filter((p) => p.year === 2026);
    expect(extraSlots).toHaveLength(1);
    expect(extraSlots[0]).toEqual(
      expect.objectContaining({
        round: 4,
        originalTeam: 'DAL',
        ownerTeam: 'DAL',
      }),
    );
    expect(mockGetCachedDraftOrderSlots).toHaveBeenCalledWith(2026);
  });

  it('does not fetch extra slots when draftRounds >= 7', async () => {
    mockGetCachedTeamDocs.mockResolvedValue([]);

    await buildFuturePicks(2026, 7);

    expect(mockGetCachedDraftOrderSlots).not.toHaveBeenCalled();
  });
});

// ============ createWebDraft ============

describe('createWebDraft', () => {
  const baseInput = {
    userId: 'user-1',
    discordId: 'discord-1',
    displayName: 'Player 1',
    config: {
      rounds: 3,
      format: 'full' as const,
      year: 2026,
      cpuSpeed: 'normal' as const,
      tradesEnabled: false,
    },
    teamAssignments: { NE: 'user-1' } as Record<
      TeamAbbreviation,
      string | null
    >,
    pickOrder: [makeSlot()],
    futurePicks: [],
  };

  function mockCreatedDoc(id: string, data: Record<string, unknown>) {
    const docRef = { get: vi.fn().mockResolvedValue({ id, data: () => data }) };
    mockAdd.mockResolvedValue(docRef);
  }

  it('creates a solo draft with status active', async () => {
    mockCreatedDoc('draft-1', { name: 'Mock Draft', status: 'active' });

    const result = await createWebDraft(baseInput);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        createdBy: 'user-1',
      }),
    );
    expect(result.id).toBe('draft-1');
  });

  it('creates a multiplayer draft with status lobby', async () => {
    mockCreatedDoc('draft-2', { name: 'Lobby Draft', status: 'lobby' });

    await createWebDraft({ ...baseInput, multiplayer: true });

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'lobby',
        visibility: 'public',
      }),
    );
  });

  it('generates invite code for private multiplayer draft', async () => {
    mockCreatedDoc('draft-3', { name: 'Private', status: 'lobby' });

    await createWebDraft({
      ...baseInput,
      multiplayer: true,
      visibility: 'private',
    });

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: 'private',
        inviteCode: expect.any(String),
      }),
    );
  });

  it('uses cached draft name when no name provided', async () => {
    mockGetCachedDraftNames.mockResolvedValue({
      adjectives: ['Electric'],
      nouns: ['Mango'],
    });
    mockCreatedDoc('draft-4', { name: 'Electric Mango', status: 'active' });

    await createWebDraft(baseInput);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Electric Mango' }),
    );
  });

  it('uses provided name over generated name', async () => {
    mockCreatedDoc('draft-5', { name: 'My Draft', status: 'active' });

    await createWebDraft({ ...baseInput, name: 'My Draft' });

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My Draft' }),
    );
  });

  it('sets notificationLevel when provided and not off', async () => {
    mockCreatedDoc('draft-6', { name: 'Draft', status: 'active' });

    await createWebDraft({ ...baseInput, notificationLevel: 'full' });

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ notificationLevel: 'full' }),
    );
  });

  it('omits notificationLevel when off', async () => {
    mockCreatedDoc('draft-7', { name: 'Draft', status: 'active' });

    await createWebDraft({ ...baseInput, notificationLevel: 'off' });

    const addArg = mockAdd.mock.calls[0][0];
    expect(addArg.notificationLevel).toBeUndefined();
  });

  it('defaults secondsPerPick to 0 and teamAssignmentMode to choice', async () => {
    mockCreatedDoc('draft-8', { name: 'Draft', status: 'active' });

    await createWebDraft(baseInput);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          secondsPerPick: 0,
          teamAssignmentMode: 'choice',
        }),
      }),
    );
  });
});
