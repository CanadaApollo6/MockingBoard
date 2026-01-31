import type { Mock } from 'vitest';
import type { ButtonInteraction } from 'discord.js';
import type { Draft } from '@mockingboard/shared';

vi.mock('../services/user.service.js', () => ({
  getOrCreateUser: vi.fn(),
}));

import {
  assertDraftCreator,
  describeDraftStatus,
  buildTeamInfoMap,
  resolveDiscordId,
  getJoinedUsers,
} from './shared.js';
import * as userService from '../services/user.service.js';

const mockGetOrCreateUser = userService.getOrCreateUser as Mock;

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    createdBy: 'user-1',
    createdAt: { seconds: 0, nanoseconds: 0 },
    updatedAt: { seconds: 0, nanoseconds: 0 },
    config: {
      rounds: 1,
      secondsPerPick: 120,
      format: 'full',
      year: 2025,
      teamAssignmentMode: 'random',
      cpuSpeed: 'normal',
      tradesEnabled: true,
    },
    status: 'active',
    currentPick: 1,
    currentRound: 1,
    platform: 'discord',
    teamAssignments: {} as Draft['teamAssignments'],
    participants: {},
    pickOrder: [],
    pickedPlayerIds: [],
    ...overrides,
  };
}

function createMockInteraction(overrides = {}): ButtonInteraction {
  return {
    user: { id: 'discord-1', username: 'TestUser' },
    followUp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ButtonInteraction;
}

describe('shared helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('assertDraftCreator', () => {
    it('returns authorized for draft creator', async () => {
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
      const draft = makeDraft({ createdBy: 'user-1' });
      const interaction = createMockInteraction();

      const result = await assertDraftCreator(interaction, draft, 'pause');

      expect(result.authorized).toBe(true);
      expect(result.user.id).toBe('user-1');
      expect(interaction.followUp).not.toHaveBeenCalled();
    });

    it('returns unauthorized for non-creator and sends error', async () => {
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-2' });
      const draft = makeDraft({ createdBy: 'user-1' });
      const interaction = createMockInteraction();

      const result = await assertDraftCreator(interaction, draft, 'pause');

      expect(result.authorized).toBe(false);
      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Only the draft creator can pause the draft.',
          ephemeral: true,
        }),
      );
    });

    it('includes the action name in the error message', async () => {
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-2' });
      const draft = makeDraft({ createdBy: 'user-1' });
      const interaction = createMockInteraction();

      await assertDraftCreator(interaction, draft, 'resume');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('resume'),
        }),
      );
    });
  });

  describe('describeDraftStatus', () => {
    it.each([
      ['lobby', 'still in the lobby'],
      ['active', 'currently active'],
      ['paused', 'currently paused'],
      ['complete', 'already complete'],
    ] as const)('describes "%s" as "%s"', (status, expected) => {
      expect(describeDraftStatus(status)).toBe(expected);
    });
  });

  describe('buildTeamInfoMap', () => {
    it('returns a map with all 32 teams', () => {
      const map = buildTeamInfoMap();
      expect(map.size).toBe(32);
    });

    it('each entry has matching name and abbreviation', () => {
      const map = buildTeamInfoMap();
      for (const [key, value] of map) {
        expect(value.abbreviation).toBe(key);
        expect(typeof value.name).toBe('string');
        expect(value.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('resolveDiscordId', () => {
    it('returns Discord ID for known internal user', () => {
      const draft = makeDraft({
        participants: { 'user-1': 'discord-123' },
      });
      expect(resolveDiscordId(draft, 'user-1')).toBe('discord-123');
    });

    it('returns null for unknown internal user', () => {
      const draft = makeDraft({
        participants: { 'user-1': 'discord-123' },
      });
      expect(resolveDiscordId(draft, 'unknown')).toBeNull();
    });
  });

  describe('getJoinedUsers', () => {
    it('returns users with assigned teams', () => {
      const draft = makeDraft({
        teamAssignments: {
          TEN: 'user-1',
          CLE: 'user-2',
          NYJ: null,
        } as Draft['teamAssignments'],
        participants: {
          'user-1': 'discord-1',
          'user-2': 'discord-2',
        },
      });

      const joined = getJoinedUsers(draft);

      expect(joined).toHaveLength(2);
      expect(joined).toEqual(
        expect.arrayContaining([
          { discordId: 'discord-1', team: 'TEN' },
          { discordId: 'discord-2', team: 'CLE' },
        ]),
      );
    });

    it('returns empty array when no teams assigned', () => {
      const draft = makeDraft({
        teamAssignments: { TEN: null, CLE: null } as Draft['teamAssignments'],
      });

      expect(getJoinedUsers(draft)).toHaveLength(0);
    });

    it('uses internal ID as fallback when Discord ID not found', () => {
      const draft = makeDraft({
        teamAssignments: { TEN: 'user-1' } as Draft['teamAssignments'],
        participants: {},
      });

      const joined = getJoinedUsers(draft);

      expect(joined).toHaveLength(1);
      expect(joined[0].discordId).toBe('user-1');
    });
  });
});
