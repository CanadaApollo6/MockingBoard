import type { Mock } from 'vitest';
import type { ButtonInteraction } from 'discord.js';
import type {
  Draft,
  Player,
  TeamAbbreviation,
  PositionFilterGroup,
} from '@mockingboard/shared';

// Mock modules with inline factory functions
vi.mock('../services/draft.service.js', () => ({
  getDraft: vi.fn(),
  updateDraft: vi.fn(),
  recordPickAndAdvance: vi.fn(),
  setPickTimer: vi.fn(),
  clearPickTimer: vi.fn(),
  getPickController: vi.fn(),
}));

vi.mock('../services/user.service.js', () => ({
  getOrCreateUser: vi.fn(),
}));

vi.mock('../commands/draft.js', () => ({
  getCachedPlayers: vi.fn(),
}));

vi.mock('../services/pick.service.js', () => ({
  getPicksByDraft: vi.fn(),
}));

vi.mock('../components/draftEmbed.js', () => ({
  buildOnTheClockEmbed: vi.fn(() => ({
    embed: { toJSON: () => ({}) },
    components: [],
  })),
  buildPickAnnouncementEmbed: vi.fn(() => ({
    embed: { toJSON: () => ({}) },
  })),
  buildDraftSummaryEmbed: vi.fn(() => ({
    embed: { toJSON: () => ({}) },
  })),
  buildPausedEmbed: vi.fn(() => ({
    embed: { toJSON: () => ({}) },
    components: [],
  })),
  buildCpuPicksBatchEmbed: vi.fn(() => ({
    embed: { toJSON: () => ({}) },
  })),
}));

// Import after mocks are defined
import {
  handlePause,
  handleResume,
  handlePickButton,
  handlePick,
  handlePositionFilter,
} from './draftPicking.js';
import { advanceDraft } from './draftAdvance.js';

// Import mocked modules to get references to the mock functions
import * as draftService from '../services/draft.service.js';
import * as userService from '../services/user.service.js';
import * as pickService from '../services/pick.service.js';
import * as draftCommand from '../commands/draft.js';

// Cast to mocks for type safety
const mockGetDraft = draftService.getDraft as Mock;
const mockUpdateDraft = draftService.updateDraft as Mock;
const mockRecordPickAndAdvance = draftService.recordPickAndAdvance as Mock;
const mockClearPickTimer = draftService.clearPickTimer as Mock;
const mockGetPickController = draftService.getPickController as Mock;
const mockGetOrCreateUser = userService.getOrCreateUser as Mock;
const mockGetPicksByDraft = pickService.getPicksByDraft as Mock;
const mockGetCachedPlayers = draftCommand.getCachedPlayers as Mock;

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
    teamAssignments: {
      TEN: 'user-1',
      CLE: 'user-2',
    } as Draft['teamAssignments'],
    participants: {
      'user-1': 'discord-1',
      'user-2': 'discord-2',
    },
    pickOrder: [
      { overall: 1, round: 1, pick: 1, team: 'TEN' as TeamAbbreviation },
      { overall: 2, round: 1, pick: 2, team: 'CLE' as TeamAbbreviation },
    ],
    pickedPlayerIds: [],
    ...overrides,
  };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    name: 'Test Player',
    position: 'QB',
    school: 'Test U',
    consensusRank: 1,
    year: 2025,
    updatedAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  };
}

function createMockInteraction(overrides = {}): ButtonInteraction {
  const mockChannelSend = vi.fn().mockResolvedValue(undefined);
  return {
    user: { id: 'discord-1', username: 'TestUser' },
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferred: true,
    replied: false,
    channel: { send: mockChannelSend },
    ...overrides,
  } as unknown as ButtonInteraction;
}

describe('draftPicking handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to default values
    mockGetDraft.mockReset();
    mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
    mockGetCachedPlayers.mockResolvedValue([
      makePlayer({ id: 'p1', consensusRank: 1 }),
      makePlayer({ id: 'p2', consensusRank: 2 }),
    ]);
  });

  describe('handlePause', () => {
    it('pauses an active draft when creator requests', async () => {
      const draft = makeDraft({ status: 'active' });
      mockGetDraft.mockResolvedValue(draft);
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
      mockUpdateDraft.mockResolvedValue(undefined);

      const interaction = createMockInteraction();
      await handlePause(interaction, 'draft-1');

      expect(mockClearPickTimer).toHaveBeenCalledWith('draft-1');
      expect(mockUpdateDraft).toHaveBeenCalledWith('draft-1', {
        status: 'paused',
      });
    });

    it('rejects pause from non-creator', async () => {
      const draft = makeDraft({ status: 'active', createdBy: 'other-user' });
      mockGetDraft.mockResolvedValue(draft);
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });

      const interaction = createMockInteraction();
      await handlePause(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Only the draft creator'),
        }),
      );
      expect(mockUpdateDraft).not.toHaveBeenCalled();
    });

    it('rejects pause for non-active draft', async () => {
      const draft = makeDraft({ status: 'paused' });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockInteraction();
      await handlePause(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('cannot be paused'),
        }),
      );
    });

    it('handles draft not found', async () => {
      mockGetDraft.mockResolvedValue(null);

      const interaction = createMockInteraction();
      await handlePause(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('cannot be paused'),
        }),
      );
    });
  });

  describe('handleResume', () => {
    it('resumes a paused draft when creator requests', async () => {
      const draft = makeDraft({ status: 'paused' });
      mockGetDraft
        .mockResolvedValueOnce(draft)
        .mockResolvedValueOnce({ ...draft, status: 'active' });
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
      mockUpdateDraft.mockResolvedValue(undefined);
      mockGetPickController.mockReturnValue('user-1');

      const interaction = createMockInteraction();
      await handleResume(interaction, 'draft-1');

      expect(mockUpdateDraft).toHaveBeenCalledWith('draft-1', {
        status: 'active',
      });
      expect(interaction.followUp).toHaveBeenCalledWith(
        'The draft has resumed!',
      );
    });

    it('rejects resume from non-creator', async () => {
      const draft = makeDraft({ status: 'paused', createdBy: 'other-user' });
      mockGetDraft.mockResolvedValue(draft);
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });

      const interaction = createMockInteraction();
      await handleResume(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Only the draft creator'),
        }),
      );
    });

    it('rejects resume for non-paused draft', async () => {
      const draft = makeDraft({ status: 'active' });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockInteraction();
      await handleResume(interaction, 'draft-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not paused'),
        }),
      );
    });
  });

  describe('handlePickButton', () => {
    it('calls handlePick with correct parameters', async () => {
      const draft = makeDraft();
      mockGetDraft.mockResolvedValue(draft);
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
      mockGetPickController.mockReturnValue('user-1');
      mockRecordPickAndAdvance.mockResolvedValue({ isComplete: true });
      mockGetPicksByDraft.mockResolvedValue([]);

      const interaction = createMockInteraction();
      await handlePickButton(interaction, 'draft-1', 'player-1');

      expect(mockGetDraft).toHaveBeenCalledWith('draft-1');
    });

    it('returns error when draft not found', async () => {
      mockGetDraft.mockResolvedValue(null);

      const interaction = createMockInteraction();
      await handlePickButton(interaction, 'nonexistent', 'player-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Draft not found.',
          ephemeral: true,
        }),
      );
      expect(mockRecordPickAndAdvance).not.toHaveBeenCalled();
    });
  });

  describe('handlePositionFilter', () => {
    it('re-renders embed with filtered players', async () => {
      const draft = makeDraft();
      mockGetDraft.mockResolvedValue(draft);
      mockGetPickController.mockReturnValue('user-1');

      const interaction = createMockInteraction();
      await handlePositionFilter(
        interaction,
        'draft-1',
        'QB' as PositionFilterGroup,
      );

      expect(interaction.update).toHaveBeenCalled();
    });

    it('rejects filter from non-active user', async () => {
      const draft = makeDraft();
      mockGetDraft.mockResolvedValue(draft);
      mockGetPickController.mockReturnValue('user-2'); // Different user

      const interaction = createMockInteraction();
      await handlePositionFilter(
        interaction,
        'draft-1',
        'QB' as PositionFilterGroup,
      );

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Only the player on the clock'),
        }),
      );
    });

    it('rejects filter for inactive draft', async () => {
      const draft = makeDraft({ status: 'paused' });
      mockGetDraft.mockResolvedValue(draft);

      const interaction = createMockInteraction();
      await handlePositionFilter(
        interaction,
        'draft-1',
        'QB' as PositionFilterGroup,
      );

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not active'),
        }),
      );
    });
  });

  describe('handlePick', () => {
    it('records pick and announces for correct user', async () => {
      const draft = makeDraft();
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
      mockGetPickController.mockReturnValue('user-1');
      mockRecordPickAndAdvance.mockResolvedValue({ isComplete: true });
      mockGetPicksByDraft.mockResolvedValue([]);

      const interaction = createMockInteraction();
      await handlePick(interaction, draft, 'player-1');

      expect(mockClearPickTimer).toHaveBeenCalledWith('draft-1');
      expect(mockRecordPickAndAdvance).toHaveBeenCalledWith(
        'draft-1',
        'player-1',
        'user-1',
      );
    });

    it('rejects pick from wrong user', async () => {
      const draft = makeDraft();
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
      mockGetPickController.mockReturnValue('user-2'); // Different user

      const interaction = createMockInteraction();
      await handlePick(interaction, draft, 'player-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not your turn'),
        }),
      );
      expect(mockRecordPickAndAdvance).not.toHaveBeenCalled();
    });

    it('rejects pick for inactive draft', async () => {
      const draft = makeDraft({ status: 'paused' });

      const interaction = createMockInteraction();
      await handlePick(interaction, draft, 'player-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('currently paused'),
        }),
      );
    });

    it('rejects pick for already drafted player', async () => {
      const draft = makeDraft({ pickedPlayerIds: ['player-1'] });
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
      mockGetPickController.mockReturnValue('user-1');

      const interaction = createMockInteraction();
      await handlePick(interaction, draft, 'player-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('already been drafted'),
        }),
      );
    });

    it('continues draft if not complete', async () => {
      const draft = makeDraft();
      const updatedDraft = { ...draft, currentPick: 2 };
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
      mockGetPickController.mockReturnValue('user-1');
      mockRecordPickAndAdvance.mockResolvedValue({ isComplete: false });
      mockGetDraft.mockResolvedValue(updatedDraft);

      const interaction = createMockInteraction();
      await handlePick(interaction, draft, 'player-1');

      expect(mockGetDraft).toHaveBeenCalledWith('draft-1');
    });

    it('posts summary when draft is complete', async () => {
      const draft = makeDraft();
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });
      mockGetPickController.mockReturnValue('user-1');
      mockRecordPickAndAdvance.mockResolvedValue({ isComplete: true });
      mockGetPicksByDraft.mockResolvedValue([]);

      const interaction = createMockInteraction();
      await handlePick(interaction, draft, 'player-1');

      expect(mockGetPicksByDraft).toHaveBeenCalledWith('draft-1');
    });

    it('handles missing current slot gracefully', async () => {
      const draft = makeDraft({
        currentPick: 100, // Beyond pick order
        pickOrder: [
          { overall: 1, round: 1, pick: 1, team: 'TEN' as TeamAbbreviation },
        ],
      });
      mockGetOrCreateUser.mockResolvedValue({ id: 'user-1' });

      const interaction = createMockInteraction();
      await handlePick(interaction, draft, 'player-1');

      // Should notify user and not attempt pick
      expect(mockRecordPickAndAdvance).not.toHaveBeenCalled();
      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'No active pick found.',
        }),
      );
    });

    it('uses describeDraftStatus for inactive draft messages', async () => {
      const draft = makeDraft({ status: 'paused' });

      const interaction = createMockInteraction();
      await handlePick(interaction, draft, 'player-1');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('currently paused'),
        }),
      );
    });
  });

  describe('advanceDraft', () => {
    it('posts on-the-clock embed for human pick', async () => {
      const draft = makeDraft();
      mockGetPickController.mockReturnValue('user-1');

      const interaction = createMockInteraction();
      await advanceDraft(interaction, draft);

      const channelSend = (interaction.channel as unknown as { send: Mock })
        .send;
      expect(channelSend).toHaveBeenCalled();
    });

    it('makes CPU pick when pickController returns null', async () => {
      const draft = makeDraft({
        config: { ...makeDraft().config, cpuSpeed: 'instant' },
      });
      // getPickController called in advanceDraft and again in doCpuPicksBatch loop
      mockGetPickController.mockReturnValue(null);
      mockRecordPickAndAdvance.mockResolvedValue({ isComplete: true });
      mockGetPicksByDraft.mockResolvedValue([]);

      const interaction = createMockInteraction();
      await advanceDraft(interaction, draft);

      // prepareCpuPick runs with real logic and picks from available players
      expect(mockRecordPickAndAdvance).toHaveBeenCalledWith(
        'draft-1',
        expect.any(String),
        null,
      );
    });

    it('returns early when no current slot', async () => {
      const draft = makeDraft({
        currentPick: 100,
        pickOrder: [],
      });

      const interaction = createMockInteraction();
      await advanceDraft(interaction, draft);

      expect(mockGetPickController).not.toHaveBeenCalled();
    });
  });
});
