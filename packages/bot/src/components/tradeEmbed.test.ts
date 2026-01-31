import type { Trade, TeamAbbreviation, DraftSlot } from '@mockingboard/shared';
import {
  parseTradePieceValue,
  computeGivingValue,
  buildTradeProposalEmbed,
  buildTradeGiveSelect,
  buildTradeReceiveSelect,
  buildTradeAcceptedEmbed,
  buildTradeRejectedEmbed,
  buildTradeCancelledEmbed,
} from './tradeEmbed.js';

type TeamInfo = { name: string; abbreviation: TeamAbbreviation };

function makeTeamMap(
  ...entries: [TeamAbbreviation, string][]
): Map<TeamAbbreviation, TeamInfo> {
  return new Map(
    entries.map(([abbr, name]) => [abbr, { name, abbreviation: abbr }]),
  );
}

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    draftId: 'draft-1',
    proposerId: 'user-1',
    proposerTeam: 'TEN' as TeamAbbreviation,
    recipientId: 'user-2',
    recipientTeam: 'CLE' as TeamAbbreviation,
    proposerGives: [{ type: 'current-pick', overall: 1 }],
    proposerReceives: [{ type: 'current-pick', overall: 5 }],
    status: 'pending',
    proposedAt: { seconds: 0, nanoseconds: 0 },
    isForceTrade: false,
    ...overrides,
  };
}

describe('tradeEmbed', () => {
  describe('parseTradePieceValue', () => {
    it('parses current pick values', () => {
      const piece = parseTradePieceValue('42');

      expect(piece.type).toBe('current-pick');
      expect(piece.overall).toBe(42);
    });

    it('parses future pick values', () => {
      const piece = parseTradePieceValue('f:2027:1:GB');

      expect(piece.type).toBe('future-pick');
      expect(piece.year).toBe(2027);
      expect(piece.round).toBe(1);
      expect(piece.originalTeam).toBe('GB');
    });

    it('handles single-digit pick numbers', () => {
      const piece = parseTradePieceValue('1');
      expect(piece.overall).toBe(1);
    });

    it('handles three-digit pick numbers', () => {
      const piece = parseTradePieceValue('224');
      expect(piece.overall).toBe(224);
    });
  });

  describe('computeGivingValue', () => {
    it('computes value for a current pick', () => {
      const value = computeGivingValue(['1'], 2026);
      expect(value).toBeGreaterThan(0);
    });

    it('computes value for a future pick', () => {
      const value = computeGivingValue(['f:2027:1:GB'], 2026);
      expect(value).toBeGreaterThan(0);
    });

    it('sums multiple picks correctly', () => {
      const single = computeGivingValue(['1'], 2026);
      const combined = computeGivingValue(['1', '2'], 2026);
      expect(combined).toBeGreaterThan(single);
    });

    it('returns 0 for empty values', () => {
      expect(computeGivingValue([], 2026)).toBe(0);
    });
  });

  describe('buildTradeProposalEmbed', () => {
    it('renders embed with correct title and buttons', () => {
      const trade = makeTrade();
      const teams = makeTeamMap(
        ['TEN' as TeamAbbreviation, 'Tennessee Titans'],
        ['CLE' as TeamAbbreviation, 'Cleveland Browns'],
      );

      const { embed, components } = buildTradeProposalEmbed(
        trade,
        'Proposer',
        'Recipient',
        teams,
      );

      expect(embed.data.title).toBe('Trade Proposal');
      expect(embed.data.fields).toHaveLength(2);
      expect(components).toHaveLength(1); // One button row
    });

    it('includes expiry footer when expiresInSeconds is provided', () => {
      const trade = makeTrade();
      const teams = makeTeamMap();

      const { embed } = buildTradeProposalEmbed(
        trade,
        'Proposer',
        'Recipient',
        teams,
        120,
      );

      expect(embed.data.footer?.text).toContain('2:00');
    });
  });

  describe('buildTradeGiveSelect', () => {
    it('renders current pick options', () => {
      const picks: DraftSlot[] = [
        { overall: 1, round: 1, pick: 1, team: 'TEN' as TeamAbbreviation },
        { overall: 33, round: 2, pick: 1, team: 'TEN' as TeamAbbreviation },
      ];

      const { embed, components } = buildTradeGiveSelect(
        'draft-1',
        'Titans',
        picks,
        [],
        2026,
      );

      expect(embed.data.title).toContain('Trade with Titans');
      expect(components.length).toBeGreaterThanOrEqual(1);
    });

    it('renders future pick options', () => {
      const { components } = buildTradeGiveSelect(
        'draft-1',
        'Titans',
        [],
        [
          {
            year: 2027,
            round: 1,
            originalTeam: 'TEN' as TeamAbbreviation,
            ownerTeam: 'TEN' as TeamAbbreviation,
          },
        ],
        2026,
      );

      expect(components.length).toBeGreaterThanOrEqual(1);
    });

    it('shows cancel-only when no picks available', () => {
      const { embed, components } = buildTradeGiveSelect(
        'draft-1',
        'Titans',
        [],
        [],
        2026,
      );

      expect(embed.data.description).toContain('no picks available');
      // Only cancel button row, no select menu
      expect(components).toHaveLength(1);
    });
  });

  describe('buildTradeReceiveSelect', () => {
    it('renders target team picks', () => {
      const targetPicks: DraftSlot[] = [
        { overall: 5, round: 1, pick: 5, team: 'CLE' as TeamAbbreviation },
      ];

      const { embed, components } = buildTradeReceiveSelect(
        'draft-1',
        'Browns',
        targetPicks,
        [],
        ['1'],
        2026,
      );

      expect(embed.data.title).toContain('Trade with Browns');
      expect(embed.data.description).toContain('giving');
      expect(components.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('buildTradeAcceptedEmbed', () => {
    it('renders accepted trade info', () => {
      const trade = makeTrade();
      const teams = makeTeamMap(
        ['TEN' as TeamAbbreviation, 'Tennessee Titans'],
        ['CLE' as TeamAbbreviation, 'Cleveland Browns'],
      );

      const { embed } = buildTradeAcceptedEmbed(
        trade,
        'ProposerUser',
        'RecipientUser',
        teams,
      );

      expect(embed.data.title).toBe('Trade Accepted!');
      expect(embed.data.description).toContain('ProposerUser');
      expect(embed.data.description).toContain('RecipientUser');
    });
  });

  describe('buildTradeRejectedEmbed', () => {
    it('renders rejected trade info', () => {
      const trade = makeTrade();

      const { embed } = buildTradeRejectedEmbed(
        trade,
        'ProposerUser',
        'RecipientUser',
      );

      expect(embed.data.title).toBe('Trade Rejected');
      expect(embed.data.description).toContain('rejected');
    });
  });

  describe('buildTradeCancelledEmbed', () => {
    it('renders cancelled trade info', () => {
      const { embed } = buildTradeCancelledEmbed('ProposerUser');

      expect(embed.data.title).toBe('Trade Cancelled');
      expect(embed.data.description).toContain('ProposerUser');
    });
  });
});
