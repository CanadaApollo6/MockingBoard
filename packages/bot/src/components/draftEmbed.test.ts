import type {
  Draft,
  Player,
  DraftSlot,
  Pick,
  TeamAbbreviation,
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

      expect(result.components.length).toBeGreaterThan(0);

      const buttons = result.components.flatMap((row) =>
        row.components.map((c) => c.toJSON() as { custom_id?: string }),
      );
      expect(buttons[0].custom_id).toBe('pick:draft-1:p1');
      expect(buttons[1].custom_id).toBe('pick:draft-1:p2');
    });

    it('limits to 10 player buttons across 2 rows plus pause button row', () => {
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

      const totalButtons = result.components.reduce(
        (sum, row) => sum + row.components.length,
        0,
      );
      // 10 player buttons + 1 pause button = 11 total
      expect(totalButtons).toBe(11);
      // 2 rows of 5 player buttons + 1 pause button row
      expect(result.components).toHaveLength(3);
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
