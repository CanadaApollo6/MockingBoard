import type {
  Draft,
  Player,
  DraftSlot,
  Pick,
  TeamAbbreviation,
  PositionFilterGroup,
} from '@mockingboard/shared';
import {
  buildOnTheClockEmbed,
  buildPickAnnouncementEmbed,
  buildDraftSummaryEmbed,
} from './draftEmbed.js';

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

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    name: 'Cam Ward',
    position: 'QB',
    school: 'Miami',
    consensusRank: 1,
    year: 2025,
    updatedAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  };
}

const slot: DraftSlot = { overall: 1, round: 1, pick: 1, team: 'TEN' };

describe('draftEmbed', () => {
  describe('buildOnTheClockEmbed', () => {
    it('creates player buttons with correct custom IDs', () => {
      const players = [
        makePlayer({ id: 'p1', name: 'Player One', position: 'QB' }),
        makePlayer({ id: 'p2', name: 'Player Two', position: 'WR' }),
      ];

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        'discord-user-1',
        players,
      );

      // Row 0 is filter buttons, Row 1 is quick-pick buttons
      const quickPickRow = result.components[1];
      const buttons = quickPickRow.components.map(
        (c) => c.toJSON() as { custom_id?: string },
      );
      expect(buttons[0].custom_id).toBe('pick:draft-1:p1');
      expect(buttons[1].custom_id).toBe('pick:draft-1:p2');
    });

    it('shows 5 filter buttons in first row', () => {
      const players = [makePlayer()];

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        'discord-user-1',
        players,
      );

      const filterRow = result.components[0];
      const filterButtons = filterRow.components.map(
        (c) => c.toJSON() as { custom_id?: string; label?: string },
      );

      expect(filterButtons).toHaveLength(5);
      expect(filterButtons[0].label).toBe('QB');
      expect(filterButtons[1].label).toBe('WR/TE');
      expect(filterButtons[2].label).toBe('RB');
      expect(filterButtons[3].label).toBe('OL');
      expect(filterButtons[4].label).toBe('DEF');
    });

    it('limits quick-pick buttons to 5', () => {
      const players = Array.from({ length: 15 }, (_, i) =>
        makePlayer({ id: `p${i}`, name: `Player ${i}`, consensusRank: i + 1 }),
      );

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        'discord-user-1',
        players,
      );

      // Row 1 is quick-pick buttons (after filter row)
      const quickPickRow = result.components[1];
      expect(quickPickRow.components).toHaveLength(5);
    });

    it('shows browse select menu when more than 5 players available', () => {
      const players = Array.from({ length: 15 }, (_, i) =>
        makePlayer({ id: `p${i}`, name: `Player ${i}`, consensusRank: i + 1 }),
      );

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        'discord-user-1',
        players,
      );

      // Row 2 should be browse select menu
      const browseRow = result.components[2];
      const menu = browseRow.components[0].toJSON() as { custom_id?: string };
      expect(menu.custom_id).toBe('browse:draft-1');
    });

    it('has 4 rows for full layout', () => {
      const players = Array.from({ length: 15 }, (_, i) =>
        makePlayer({ id: `p${i}`, name: `Player ${i}`, consensusRank: i + 1 }),
      );

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        'discord-user-1',
        players,
      );

      // Row 0: Filter buttons
      // Row 1: Quick-pick buttons (5)
      // Row 2: Browse select menu
      // Row 3: Control buttons
      expect(result.components).toHaveLength(4);
    });

    it('filters players by position group', () => {
      const players = [
        makePlayer({ id: 'qb1', position: 'QB', consensusRank: 1 }),
        makePlayer({ id: 'wr1', position: 'WR', consensusRank: 2 }),
        makePlayer({ id: 'wr2', position: 'WR', consensusRank: 3 }),
        makePlayer({ id: 'rb1', position: 'RB', consensusRank: 4 }),
        makePlayer({ id: 'wr3', position: 'WR', consensusRank: 5 }),
        makePlayer({ id: 'te1', position: 'TE', consensusRank: 6 }),
      ];

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        'discord-user-1',
        players,
        true,
        'WR_TE' as PositionFilterGroup,
      );

      // Quick-pick row should only have WR/TE players
      const quickPickRow = result.components[1];
      const buttonIds = quickPickRow.components
        .map((c) => c.toJSON() as { custom_id: string })
        .map((b) => b.custom_id);

      expect(buttonIds).toContain('pick:draft-1:wr1');
      expect(buttonIds).toContain('pick:draft-1:wr2');
      expect(buttonIds).toContain('pick:draft-1:wr3');
      expect(buttonIds).toContain('pick:draft-1:te1');
      expect(buttonIds).not.toContain('pick:draft-1:qb1');
      expect(buttonIds).not.toContain('pick:draft-1:rb1');
    });

    it('shows Clear Filter button when filter is active', () => {
      const players = [makePlayer()];

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        'discord-user-1',
        players,
        true,
        'QB' as PositionFilterGroup,
      );

      // Control row is the last row
      const controlRow = result.components[result.components.length - 1];
      const buttonLabels = controlRow.components
        .map((c) => c.toJSON() as { label: string })
        .map((b) => b.label);

      expect(buttonLabels).toContain('Clear Filter');
    });

    it('hides Clear Filter button when no filter is active', () => {
      const players = [makePlayer()];

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        'discord-user-1',
        players,
        true,
        null,
      );

      const controlRow = result.components[result.components.length - 1];
      const buttonLabels = controlRow.components
        .map((c) => c.toJSON() as { label: string })
        .map((b) => b.label);

      expect(buttonLabels).not.toContain('Clear Filter');
    });

    it('highlights active position filter button', () => {
      const players = [makePlayer()];

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        'discord-user-1',
        players,
        true,
        'RB' as PositionFilterGroup,
      );

      const filterRow = result.components[0];
      const buttons = filterRow.components.map(
        (c) => c.toJSON() as { custom_id: string; style: number },
      );

      const rbButton = buttons.find((b) => b.custom_id.includes(':RB'));
      const qbButton = buttons.find((b) => b.custom_id.includes(':QB'));

      // ButtonStyle.Primary = 1, ButtonStyle.Secondary = 2
      expect(rbButton?.style).toBe(1); // Primary (active)
      expect(qbButton?.style).toBe(2); // Secondary (inactive)
    });

    it('returns empty components for CPU picks', () => {
      const players = [makePlayer()];

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        null, // CPU pick
        players,
      );

      expect(result.components).toHaveLength(0);
    });

    it('includes /draft tip in footer', () => {
      const players = [makePlayer()];

      const result = buildOnTheClockEmbed(
        makeDraft(),
        slot,
        'Tennessee Titans',
        'discord-user-1',
        players,
      );

      const json = result.embed.toJSON();
      expect(json.footer?.text).toContain('/draft');
    });
  });

  describe('buildPickAnnouncementEmbed', () => {
    it('includes player name, position, and school', () => {
      const player = makePlayer();
      const result = buildPickAnnouncementEmbed(
        slot,
        player,
        'Tennessee Titans',
        false,
      );

      const json = result.embed.toJSON();
      expect(json.description).toContain('Cam Ward');
      expect(json.description).toContain('QB');
      expect(json.description).toContain('Miami');
      expect(json.description).toContain('Tennessee Titans');
    });

    it('labels auto-picks', () => {
      const result = buildPickAnnouncementEmbed(
        slot,
        makePlayer(),
        'Tennessee Titans',
        true,
      );

      const json = result.embed.toJSON();
      expect(json.title).toContain('Auto-Pick');
    });
  });

  describe('buildDraftSummaryEmbed', () => {
    it('groups picks by round', () => {
      const picks: Pick[] = [
        {
          id: 'pk1',
          draftId: 'draft-1',
          overall: 1,
          round: 1,
          pick: 1,
          team: 'TEN',
          userId: 'u1',
          playerId: 'p1',
          createdAt: { seconds: 0, nanoseconds: 0 },
        },
        {
          id: 'pk2',
          draftId: 'draft-1',
          overall: 33,
          round: 2,
          pick: 1,
          team: 'TEN',
          userId: 'u1',
          playerId: 'p2',
          createdAt: { seconds: 0, nanoseconds: 0 },
        },
      ];

      const playerMap = new Map([
        ['p1', makePlayer({ id: 'p1', name: 'Player A' })],
        ['p2', makePlayer({ id: 'p2', name: 'Player B' })],
      ]);

      const teamMap = new Map<TeamAbbreviation, string>([
        ['TEN', 'Tennessee Titans'],
      ]);

      const result = buildDraftSummaryEmbed(picks, playerMap, teamMap);
      const json = result.embed.toJSON();

      const fieldNames = json.fields?.map((f) => f.name) ?? [];
      expect(fieldNames).toContain('Round 1');
      expect(fieldNames).toContain('Round 2');
    });
  });
});
