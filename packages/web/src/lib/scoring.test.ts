/// <reference types="vitest/globals" />
import { scoreMockPick, aggregateDraftScore } from './scoring.js';
import type { DraftResultPick } from '@mockingboard/shared';
import type { PickScore } from './scoring.js';

function pick(
  overall: number,
  team: string,
  playerName: string,
  position: string,
  round?: number,
): DraftResultPick {
  const r = round ?? Math.ceil(overall / 32);
  return {
    overall,
    round: r,
    pick: overall - (r - 1) * 32,
    team: team as DraftResultPick['team'],
    playerName,
    position,
    school: 'Test U',
  };
}

const ACTUAL_RESULTS: DraftResultPick[] = [
  pick(1, 'CHI', 'Cam Ward', 'QB'),
  pick(2, 'CLE', 'Shedeur Sanders', 'QB'),
  pick(3, 'NYG', 'Travis Hunter', 'CB'),
  pick(4, 'NE', 'Abdul Carter', 'EDGE'),
  pick(5, 'JAX', 'Mason Graham', 'DL'),
  pick(33, 'CHI', 'Colston Loveland', 'TE'),
  pick(64, 'CLE', 'Some Guy', 'WR'),
  pick(65, 'NYG', 'Another Player', 'OT'),
];

describe('scoring', () => {
  describe('scoreMockPick', () => {
    it('returns perfect score for exact match (team + player + position)', () => {
      const result = scoreMockPick('Cam Ward', 'CHI', 'QB', 1, ACTUAL_RESULTS);
      expect(result.teamMatch).toBe(true);
      expect(result.playerMatch).toBe(true);
      expect(result.positionMatch).toBe(true);
      expect(result.roundAccuracy).toBe(15);
      expect(result.score).toBe(100);
    });

    it('scores team match only', () => {
      const result = scoreMockPick(
        'Wrong Player',
        'CHI',
        'WR',
        1,
        ACTUAL_RESULTS,
      );
      expect(result.teamMatch).toBe(true);
      expect(result.playerMatch).toBe(false);
      expect(result.positionMatch).toBe(false);
      expect(result.roundAccuracy).toBe(0);
      expect(result.score).toBe(30);
    });

    it('scores player match at different slot', () => {
      // Mock: Cam Ward goes #2 to CLE instead of #1 to CHI
      const result = scoreMockPick('Cam Ward', 'CLE', 'QB', 2, ACTUAL_RESULTS);
      expect(result.teamMatch).toBe(true); // CLE is the actual team at pick 2
      expect(result.playerMatch).toBe(false); // Shedeur Sanders is at #2, not Cam Ward
      expect(result.positionMatch).toBe(true); // both QB
      expect(result.roundAccuracy).toBe(15); // Cam Ward actually went in round 1, mock says round 1
      expect(result.score).toBe(60); // 30 + 0 + 15 + 15
    });

    it('scores position match without team or player match', () => {
      const result = scoreMockPick(
        'Wrong Player',
        'NYJ',
        'QB',
        1,
        ACTUAL_RESULTS,
      );
      expect(result.teamMatch).toBe(false);
      expect(result.playerMatch).toBe(false);
      expect(result.positionMatch).toBe(true); // QB matches at #1
      expect(result.roundAccuracy).toBe(0); // Wrong Player not found in results
      expect(result.score).toBe(15);
    });

    it('returns zero score when nothing matches', () => {
      const result = scoreMockPick(
        'Nobody Real',
        'NYJ',
        'K',
        1,
        ACTUAL_RESULTS,
      );
      expect(result.teamMatch).toBe(false);
      expect(result.playerMatch).toBe(false);
      expect(result.positionMatch).toBe(false);
      expect(result.roundAccuracy).toBe(0);
      expect(result.score).toBe(0);
    });

    it('returns zero score when pick slot has no actual result', () => {
      const result = scoreMockPick(
        'Cam Ward',
        'CHI',
        'QB',
        200,
        ACTUAL_RESULTS,
      );
      expect(result.score).toBe(0);
      expect(result.actualPlayer).toBe('—');
    });

    it('handles case-insensitive player name comparison', () => {
      const result = scoreMockPick('cam ward', 'CHI', 'QB', 1, ACTUAL_RESULTS);
      expect(result.playerMatch).toBe(true);
      expect(result.score).toBe(100);
    });

    it('trims whitespace in player name comparison', () => {
      const result = scoreMockPick(
        '  Cam Ward  ',
        'CHI',
        'QB',
        1,
        ACTUAL_RESULTS,
      );
      expect(result.playerMatch).toBe(true);
    });

    it('calculates round accuracy — exact round match', () => {
      // Mock Cam Ward at pick 5 (still round 1), actual is pick 1 (round 1)
      const result = scoreMockPick('Cam Ward', 'JAX', 'QB', 5, ACTUAL_RESULTS);
      expect(result.roundAccuracy).toBe(15);
    });

    it('calculates round accuracy — 1 round off', () => {
      // Mock Cam Ward at pick 33 (round 2), actual is pick 1 (round 1)
      const result = scoreMockPick('Cam Ward', 'CHI', 'QB', 33, ACTUAL_RESULTS);
      expect(result.roundAccuracy).toBe(10);
    });

    it('calculates round accuracy — 2 rounds off', () => {
      // Mock Cam Ward at pick 65 (round 3), actual is pick 1 (round 1)
      const result = scoreMockPick('Cam Ward', 'NYG', 'QB', 65, ACTUAL_RESULTS);
      expect(result.roundAccuracy).toBe(5);
    });

    it('calculates round accuracy — 3+ rounds off is 0', () => {
      // Create a results set where Cam Ward is in round 1 but we mock him at round 4+
      const extended = [
        ...ACTUAL_RESULTS,
        pick(97, 'LAR', 'Filler A', 'RB'),
        pick(128, 'LAR', 'Filler B', 'WR'),
      ];
      // Mock at pick 128 = round 4, actual round 1 = diff 3
      const result = scoreMockPick('Cam Ward', 'LAR', 'QB', 128, extended);
      expect(result.roundAccuracy).toBe(0);
    });

    it('populates actualPlayer from results', () => {
      const result = scoreMockPick(
        'Wrong Pick',
        'CLE',
        'QB',
        2,
        ACTUAL_RESULTS,
      );
      expect(result.actualPlayer).toBe('Shedeur Sanders');
      expect(result.overall).toBe(2);
    });

    it('populates playerPicked from mock input', () => {
      const result = scoreMockPick(
        'My Favorite Player',
        'CHI',
        'QB',
        1,
        ACTUAL_RESULTS,
      );
      expect(result.playerPicked).toBe('My Favorite Player');
    });

    it('scores team + position match without player match', () => {
      // Right team, right position, wrong player
      const result = scoreMockPick('Other QB', 'CHI', 'QB', 1, ACTUAL_RESULTS);
      expect(result.teamMatch).toBe(true);
      expect(result.playerMatch).toBe(false);
      expect(result.positionMatch).toBe(true);
      expect(result.score).toBe(45); // 30 + 0 + 15
    });
  });

  describe('aggregateDraftScore', () => {
    it('aggregates scores from multiple picks', () => {
      const picks: PickScore[] = [
        {
          overall: 1,
          playerPicked: 'A',
          actualPlayer: 'A',
          teamMatch: true,
          playerMatch: true,
          positionMatch: true,
          roundAccuracy: 15,
          score: 100,
        },
        {
          overall: 2,
          playerPicked: 'B',
          actualPlayer: 'C',
          teamMatch: false,
          playerMatch: false,
          positionMatch: false,
          roundAccuracy: 0,
          score: 0,
        },
      ];
      const result = aggregateDraftScore(picks);
      expect(result.totalScore).toBe(100);
      expect(result.maxScore).toBe(200);
      expect(result.percentage).toBe(50);
      expect(result.pickScores).toBe(picks);
    });

    it('handles perfect draft', () => {
      const picks: PickScore[] = Array.from({ length: 32 }, (_, i) => ({
        overall: i + 1,
        playerPicked: `Player ${i}`,
        actualPlayer: `Player ${i}`,
        teamMatch: true,
        playerMatch: true,
        positionMatch: true,
        roundAccuracy: 15,
        score: 100,
      }));
      const result = aggregateDraftScore(picks);
      expect(result.totalScore).toBe(3200);
      expect(result.maxScore).toBe(3200);
      expect(result.percentage).toBe(100);
    });

    it('handles empty picks array', () => {
      const result = aggregateDraftScore([]);
      expect(result.totalScore).toBe(0);
      expect(result.maxScore).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('handles single pick', () => {
      const picks: PickScore[] = [
        {
          overall: 1,
          playerPicked: 'A',
          actualPlayer: 'B',
          teamMatch: true,
          playerMatch: false,
          positionMatch: true,
          roundAccuracy: 10,
          score: 55,
        },
      ];
      const result = aggregateDraftScore(picks);
      expect(result.totalScore).toBe(55);
      expect(result.maxScore).toBe(100);
      expect(result.percentage).toBe(55);
    });

    it('rounds percentage to nearest integer', () => {
      const picks: PickScore[] = [
        {
          overall: 1,
          playerPicked: 'A',
          actualPlayer: 'B',
          teamMatch: true,
          playerMatch: false,
          positionMatch: false,
          roundAccuracy: 0,
          score: 30,
        },
        {
          overall: 2,
          playerPicked: 'B',
          actualPlayer: 'C',
          teamMatch: false,
          playerMatch: false,
          positionMatch: true,
          roundAccuracy: 10,
          score: 25,
        },
        {
          overall: 3,
          playerPicked: 'C',
          actualPlayer: 'D',
          teamMatch: false,
          playerMatch: false,
          positionMatch: false,
          roundAccuracy: 0,
          score: 0,
        },
      ];
      const result = aggregateDraftScore(picks);
      expect(result.totalScore).toBe(55);
      expect(result.maxScore).toBe(300);
      // 55/300 = 18.333... → rounds to 18
      expect(result.percentage).toBe(18);
    });
  });
});
