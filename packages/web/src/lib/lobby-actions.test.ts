/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGet,
  mockUpdate,
  mockCollection,
  mockRunCpuCascade,
  mockGetPickController,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockUpdate = vi.fn();
  const mockDoc = vi.fn(() => ({ get: mockGet, update: mockUpdate }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));
  const mockRunCpuCascade = vi.fn();
  const mockGetPickController = vi.fn();
  return {
    mockGet,
    mockUpdate,
    mockDoc,
    mockCollection,
    mockRunCpuCascade,
    mockGetPickController,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    delete: () => 'FIELD_DELETE',
  },
}));
vi.mock('./firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('./draft-actions', () => ({
  runCpuCascade: (...args: unknown[]) => mockRunCpuCascade(...args),
}));
vi.mock('@mockingboard/shared', () => ({
  getPickController: (...args: unknown[]) => mockGetPickController(...args),
}));

import { joinLobby, startDraft, leaveLobby } from './lobby-actions.js';
import type { Draft, TeamAbbreviation } from '@mockingboard/shared';

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    createdBy: 'creator-1',
    config: {
      rounds: 3,
      format: 'full',
      year: 2026,
      cpuSpeed: 'normal',
      secondsPerPick: 0,
      tradesEnabled: false,
      teamAssignmentMode: 'choice' as const,
    },
    status: 'lobby',
    currentPick: 1,
    currentRound: 1,
    platform: 'web',
    teamAssignments: {
      DAL: 'creator-1',
      NYG: null,
      NE: null,
      ARI: null,
    } as Draft['teamAssignments'],
    participants: { 'creator-1': 'creator-1' },
    participantNames: { 'creator-1': 'Creator' },
    participantIds: ['creator-1'],
    pickOrder: [
      { overall: 1, round: 1, pick: 1, team: 'NE' as TeamAbbreviation },
    ],
    pickedPlayerIds: [],
    createdAt: { seconds: 0, nanoseconds: 0 },
    updatedAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  } as Draft;
}

function mockDraftDoc(draft: Draft | null) {
  if (!draft) {
    mockGet.mockResolvedValue({ exists: false });
    return;
  }
  const { id, ...data } = draft;
  mockGet.mockResolvedValue({
    exists: true,
    id,
    data: () => ({ ...data, participantIds: data.participantIds ?? [] }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockResolvedValue(undefined);
  mockRunCpuCascade.mockResolvedValue(undefined);
});

// ============ joinLobby ============

describe('joinLobby', () => {
  const baseInput = {
    draftId: 'draft-1',
    userId: 'user-2',
    displayName: 'Player Two',
    team: 'NYG' as TeamAbbreviation,
  };

  it('throws when draft not found', async () => {
    mockDraftDoc(null);
    await expect(joinLobby(baseInput)).rejects.toThrow('Draft not found');
  });

  it('throws when draft is not in lobby state', async () => {
    mockDraftDoc(makeDraft({ status: 'active' }));
    await expect(joinLobby(baseInput)).rejects.toThrow(
      'Draft is not in lobby state',
    );
  });

  it('throws when user is already a participant', async () => {
    mockDraftDoc(
      makeDraft({
        participants: { 'creator-1': 'creator-1', 'user-2': 'user-2' },
      }),
    );
    await expect(joinLobby(baseInput)).rejects.toThrow('Already in this draft');
  });

  it('throws for private draft without invite code', async () => {
    mockDraftDoc(makeDraft({ visibility: 'private', inviteCode: 'abc123' }));
    await expect(joinLobby(baseInput)).rejects.toThrow('Invalid invite code');
  });

  it('throws for private draft with wrong invite code', async () => {
    mockDraftDoc(makeDraft({ visibility: 'private', inviteCode: 'abc123' }));
    await expect(
      joinLobby({ ...baseInput, inviteCode: 'wrong' }),
    ).rejects.toThrow('Invalid invite code');
  });

  it('accepts correct invite code for private draft', async () => {
    mockDraftDoc(makeDraft({ visibility: 'private', inviteCode: 'abc123' }));
    const result = await joinLobby({ ...baseInput, inviteCode: 'abc123' });
    expect(result.team).toBe('NYG');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('does not require invite code for public drafts', async () => {
    mockDraftDoc(makeDraft({ visibility: 'public' }));
    const result = await joinLobby(baseInput);
    expect(result.team).toBe('NYG');
  });

  it('does not require invite code for unlisted drafts', async () => {
    mockDraftDoc(makeDraft({ visibility: 'unlisted' }));
    const result = await joinLobby(baseInput);
    expect(result.team).toBe('NYG');
  });

  it('assigns requested team in choice mode', async () => {
    mockDraftDoc(makeDraft());
    const result = await joinLobby(baseInput);

    expect(result).toEqual({ team: 'NYG', displayName: 'Player Two' });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        'participants.user-2': 'user-2',
        'participantNames.user-2': 'Player Two',
        'teamAssignments.NYG': 'user-2',
      }),
    );
  });

  it('throws in choice mode when no team requested', async () => {
    mockDraftDoc(makeDraft());
    await expect(joinLobby({ ...baseInput, team: undefined })).rejects.toThrow(
      'Team selection required',
    );
  });

  it('throws in choice mode when team not available', async () => {
    mockDraftDoc(makeDraft());
    await expect(
      joinLobby({ ...baseInput, team: 'DAL' as TeamAbbreviation }),
    ).rejects.toThrow('Team not available');
  });

  it('assigns random team in random mode', async () => {
    mockDraftDoc(
      makeDraft({
        config: {
          rounds: 3,
          format: 'full',
          year: 2026,
          cpuSpeed: 'normal',
          secondsPerPick: 0,
          tradesEnabled: false,
          teamAssignmentMode: 'random' as const,
        },
      }),
    );
    const result = await joinLobby({ ...baseInput, team: undefined });
    expect(['NYG', 'NE', 'ARI']).toContain(result.team);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('throws when no teams available', async () => {
    mockDraftDoc(
      makeDraft({
        teamAssignments: {
          DAL: 'creator-1',
          NYG: 'user-x',
          NE: 'user-y',
          ARI: 'user-z',
        } as Draft['teamAssignments'],
      }),
    );
    await expect(joinLobby(baseInput)).rejects.toThrow('No teams available');
  });

  it('includes discordId in participantIds', async () => {
    mockDraftDoc(makeDraft());
    await joinLobby({ ...baseInput, discordId: 'discord-2' });

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.participantIds).toContain('user-2');
    expect(updateArg.participantIds).toContain('discord-2');
  });

  it('uses userId as discordId fallback', async () => {
    mockDraftDoc(makeDraft());
    await joinLobby(baseInput);

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg['participants.user-2']).toBe('user-2');
  });
});

// ============ startDraft ============

describe('startDraft', () => {
  it('throws when draft not found', async () => {
    mockDraftDoc(null);
    await expect(startDraft('draft-1', 'creator-1')).rejects.toThrow(
      'Draft not found',
    );
  });

  it('throws when user is not the creator', async () => {
    mockDraftDoc(makeDraft());
    await expect(startDraft('draft-1', 'user-2')).rejects.toThrow(
      'Only the creator can start the draft',
    );
  });

  it('throws when draft is not in lobby state', async () => {
    mockDraftDoc(makeDraft({ status: 'active' }));
    await expect(startDraft('draft-1', 'creator-1')).rejects.toThrow(
      'Draft is not in lobby state',
    );
  });

  it('throws when no participants', async () => {
    mockDraftDoc(makeDraft({ participants: {} }));
    await expect(startDraft('draft-1', 'creator-1')).rejects.toThrow(
      'At least one participant required',
    );
  });

  it('sets draft status to active', async () => {
    mockGetPickController.mockReturnValue('creator-1');
    mockDraftDoc(makeDraft());

    const result = await startDraft('draft-1', 'creator-1');
    expect(result).toEqual({ started: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
  });

  it('runs CPU cascade when first pick is CPU team', async () => {
    mockGetPickController.mockReturnValue(null);
    mockDraftDoc(makeDraft());

    await startDraft('draft-1', 'creator-1');
    expect(mockRunCpuCascade).toHaveBeenCalledWith('draft-1');
  });

  it('does not run CPU cascade when first pick is human', async () => {
    // First slot team (DAL) is assigned to creator-1, so getPickController returns a user
    mockDraftDoc(
      makeDraft({
        pickOrder: [
          { overall: 1, round: 1, pick: 1, team: 'DAL' as TeamAbbreviation },
        ],
      }),
    );

    await startDraft('draft-1', 'creator-1');
    expect(mockRunCpuCascade).not.toHaveBeenCalled();
  });
});

// ============ leaveLobby ============

describe('leaveLobby', () => {
  it('throws when draft not found', async () => {
    mockDraftDoc(null);
    await expect(leaveLobby('draft-1', 'user-2')).rejects.toThrow(
      'Draft not found',
    );
  });

  it('throws when draft is not in lobby state', async () => {
    mockDraftDoc(makeDraft({ status: 'active' }));
    await expect(leaveLobby('draft-1', 'user-2')).rejects.toThrow(
      'Draft is not in lobby state',
    );
  });

  it('throws when creator tries to leave', async () => {
    mockDraftDoc(makeDraft());
    await expect(leaveLobby('draft-1', 'creator-1')).rejects.toThrow(
      'Creator cannot leave the draft',
    );
  });

  it('throws when user is not a participant', async () => {
    mockDraftDoc(makeDraft());
    await expect(leaveLobby('draft-1', 'user-2')).rejects.toThrow(
      'Not a participant',
    );
  });

  it('removes participant and unassigns their team', async () => {
    mockDraftDoc(
      makeDraft({
        participants: {
          'creator-1': 'creator-1',
          'user-2': 'discord-2',
        },
        teamAssignments: {
          DAL: 'creator-1',
          NYG: 'user-2',
          NE: null,
          ARI: null,
        } as Draft['teamAssignments'],
        participantIds: ['creator-1', 'user-2', 'discord-2'],
      }),
    );

    await leaveLobby('draft-1', 'user-2');

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg['teamAssignments.NYG']).toBeNull();
    expect(updateArg.participantIds).toEqual(['creator-1']);
    expect(updateArg.participantIds).not.toContain('user-2');
    expect(updateArg.participantIds).not.toContain('discord-2');
  });

  it('handles participant with no team assigned', async () => {
    mockDraftDoc(
      makeDraft({
        participants: {
          'creator-1': 'creator-1',
          'user-2': 'user-2',
        },
        teamAssignments: {
          DAL: 'creator-1',
          NYG: null,
          NE: null,
          ARI: null,
        } as Draft['teamAssignments'],
        participantIds: ['creator-1', 'user-2'],
      }),
    );

    await leaveLobby('draft-1', 'user-2');

    const updateArg = mockUpdate.mock.calls[0][0];
    // Should not have any teamAssignments key set to null
    const teamKeys = Object.keys(updateArg).filter((k) =>
      k.startsWith('teamAssignments.'),
    );
    expect(teamKeys).toHaveLength(0);
  });
});
