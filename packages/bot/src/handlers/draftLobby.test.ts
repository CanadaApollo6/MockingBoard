import type { Mock } from 'vitest';
import type {
  ButtonInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import type { Draft, TeamAbbreviation } from '@mockingboard/shared';

// Mock modules with inline factory functions
vi.mock('../services/draft.service.js', () => ({
  getDraft: vi.fn(),
  updateDraft: vi.fn(),
}));

vi.mock('../services/user.service.js', () => ({
  getOrCreateUser: vi.fn(),
}));

vi.mock('./draftPicking.js', () => ({
  advanceDraft: vi.fn(),
}));

vi.mock('../components/draftEmbed.js', () => ({
  buildLobbyEmbed: vi.fn(() => ({
    embed: { toJSON: () => ({}) },
    components: [],
  })),
  buildTeamSelectMenu: vi.fn(() => ({
    components: [],
  })),
}));

// Import after mocks are defined
import {
  handleJoin,
  handleStart,
  handleAllTeams,
  handleTeamSelect,
} from './draftLobby.js';

// Import mocked modules
import * as draftService from '../services/draft.service.js';
import * as userService from '../services/user.service.js';
import * as draftPicking from './draftPicking.js';

const mockGetDraft = draftService.getDraft as Mock;
const mockUpdateDraft = draftService.updateDraft as Mock;
const mockGetOrCreateUser = userService.getOrCreateUser as Mock;
const mockAdvanceDraft = draftPicking.advanceDraft as Mock;

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
    status: 'lobby',
    currentPick: 1,
    currentRound: 1,
    platform: 'discord',
    teamAssignments: {
      TEN: null,
      CLE: null,
      NYG: null,
    } as unknown as Draft['teamAssignments'],
    participants: {},
    pickOrder: [
      { overall: 1, round: 1, pick: 1, team: 'TEN' as TeamAbbreviation },
    ],
    pickedPlayerIds: [],
    ...overrides,
  };
}

function createMockButtonInteraction(overrides = {}): ButtonInteraction {
  return {
    user: {
      id: 'discord-1',
      username: 'TestUser',
      displayAvatarURL: () => 'url',
    },
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    channel: { send: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  } as unknown as ButtonInteraction;
}

function createMockSelectInteraction(
  values: string[],
  overrides = {},
): StringSelectMenuInteraction {
  // Mock a Collection-like object with find method
  const mockMessages = {
    find: vi.fn().mockReturnValue(undefined),
  };
  return {
    user: {
      id: 'discord-1',
      username: 'TestUser',
      displayAvatarURL: () => 'url',
    },
    values,
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    channel: {
      send: vi.fn().mockResolvedValue(undefined),
      messages: {
        fetch: vi.fn().mockResolvedValue(mockMessages),
      },
    },
    client: { user: { id: 'bot-id' } },
    ...overrides,
  } as unknown as StringSelectMenuInteraction;
}

describe('draftLobby handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDraft.mockReset();
    mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
    mockUpdateDraft.mockResolvedValue(undefined);
    mockAdvanceDraft.mockResolvedValue(undefined);
  });

  describe('handleJoin', () => {
    it('assigns a random team in random mode', async () => {
      const draft = makeDraft({
        config: { ...makeDraft().config, teamAssignmentMode: 'random' },
      });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockButtonInteraction();
      await handleJoin(interaction, 'draft-1');

      expect(mockUpdateDraft).toHaveBeenCalledWith(
        'draft-1',
        expect.objectContaining({
          teamAssignments: expect.any(Object),
          participants: expect.any(Object),
        }),
      );
      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("You've been assigned"),
        }),
      );
    });

    it('shows team select menu in choice mode', async () => {
      const draft = makeDraft({
        config: { ...makeDraft().config, teamAssignmentMode: 'choice' },
      });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockButtonInteraction();
      await handleJoin(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Choose your team:',
          components: expect.any(Array),
          ephemeral: true,
        }),
      );
      expect(mockUpdateDraft).not.toHaveBeenCalled();
    });

    it('rejects join when already in draft', async () => {
      const draft = makeDraft({
        teamAssignments: {
          TEN: 'user-1',
          CLE: null,
        } as unknown as Draft['teamAssignments'],
      });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockButtonInteraction();
      await handleJoin(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("You're already in the draft"),
        }),
      );
    });

    it('rejects join when draft is not in lobby', async () => {
      const draft = makeDraft({ status: 'active' });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockButtonInteraction();
      await handleJoin(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('no longer accepting players'),
        }),
      );
    });

    it('rejects join when all teams are taken', async () => {
      const draft = makeDraft({
        config: { ...makeDraft().config, teamAssignmentMode: 'random' },
        teamAssignments: {
          TEN: 'user-2',
          CLE: 'user-3',
          NYG: 'user-4',
        } as unknown as Draft['teamAssignments'],
      });
      mockGetDraft.mockResolvedValue(draft);
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-new' });

      const interaction = createMockButtonInteraction();
      await handleJoin(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'All teams have been claimed.',
        }),
      );
    });

    it('handles draft not found', async () => {
      mockGetDraft.mockResolvedValue(null);

      const interaction = createMockButtonInteraction();
      await handleJoin(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('no longer accepting players'),
        }),
      );
    });
  });

  describe('handleStart', () => {
    it('starts the draft when creator requests', async () => {
      const draft = makeDraft({
        teamAssignments: {
          TEN: 'user-1',
        } as unknown as Draft['teamAssignments'],
        participants: { 'user-1': 'discord-1' },
      });
      mockGetDraft.mockResolvedValue(draft);
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });

      const interaction = createMockButtonInteraction();
      await handleStart(interaction, 'draft-1');

      expect(mockUpdateDraft).toHaveBeenCalledWith('draft-1', {
        status: 'active',
      });
      expect(interaction.followUp).toHaveBeenCalledWith(
        'The draft has started!',
      );
      expect(mockAdvanceDraft).toHaveBeenCalled();
    });

    it('rejects start from non-creator', async () => {
      const draft = makeDraft({
        createdBy: 'other-user',
        teamAssignments: {
          TEN: 'user-1',
        } as unknown as Draft['teamAssignments'],
      });
      mockGetDraft.mockResolvedValue(draft);
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });

      const interaction = createMockButtonInteraction();
      await handleStart(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Only the draft creator can start the draft.',
        }),
      );
      expect(mockUpdateDraft).not.toHaveBeenCalled();
    });

    it('rejects start with no participants', async () => {
      const draft = makeDraft(); // All teams null
      mockGetDraft.mockResolvedValue(draft);
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });

      const interaction = createMockButtonInteraction();
      await handleStart(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'At least one person must join before starting.',
        }),
      );
    });

    it('rejects start when draft is not in lobby', async () => {
      const draft = makeDraft({ status: 'active' });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockButtonInteraction();
      await handleStart(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('cannot be started'),
        }),
      );
    });
  });

  describe('handleAllTeams', () => {
    it('assigns all teams to the user and starts the draft', async () => {
      const draft = makeDraft({
        config: { ...makeDraft().config, format: 'single-team' },
      });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockButtonInteraction();
      await handleAllTeams(interaction, 'draft-1');

      expect(mockUpdateDraft).toHaveBeenCalledWith(
        'draft-1',
        expect.objectContaining({
          teamAssignments: expect.objectContaining({
            TEN: 'user-1',
            CLE: 'user-1',
            NYG: 'user-1',
          }),
          participants: expect.objectContaining({ 'user-1': 'discord-1' }),
          status: 'active',
        }),
      );
      expect(mockAdvanceDraft).toHaveBeenCalled();
    });

    it('rejects when draft is not in lobby', async () => {
      const draft = makeDraft({ status: 'active' });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockButtonInteraction();
      await handleAllTeams(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('no longer accepting players'),
        }),
      );
      expect(mockUpdateDraft).not.toHaveBeenCalled();
    });
  });

  describe('handleTeamSelect', () => {
    it('assigns selected team to user', async () => {
      const draft = makeDraft();
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockSelectInteraction(['TEN']);
      await handleTeamSelect(interaction, 'draft-1');

      expect(mockUpdateDraft).toHaveBeenCalledWith(
        'draft-1',
        expect.objectContaining({
          teamAssignments: expect.objectContaining({ TEN: 'user-1' }),
        }),
      );
      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("You've selected"),
        }),
      );
    });

    it('starts draft immediately in single-team mode', async () => {
      const draft = makeDraft({
        config: { ...makeDraft().config, format: 'single-team' },
      });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockSelectInteraction(['TEN']);
      await handleTeamSelect(interaction, 'draft-1');

      expect(mockUpdateDraft).toHaveBeenCalledWith('draft-1', {
        status: 'active',
      });
      expect(mockAdvanceDraft).toHaveBeenCalled();
    });

    it('rejects selection when team is already claimed', async () => {
      const draft = makeDraft({
        teamAssignments: {
          TEN: 'user-2',
          CLE: null,
        } as unknown as Draft['teamAssignments'],
      });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockSelectInteraction(['TEN']);
      await handleTeamSelect(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'That team has already been claimed.',
        }),
      );
    });

    it('rejects selection when draft is not in lobby', async () => {
      const draft = makeDraft({ status: 'active' });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockSelectInteraction(['TEN']);
      await handleTeamSelect(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('no longer accepting players'),
        }),
      );
    });
  });
});
