import type { Draft, DraftSlot, TeamAbbreviation } from './types';
import {
  getPickController,
  filterAndSortPickOrder,
  buildFuturePicksFromSeeds,
  calculatePickAdvancement,
} from './draft';

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    createdBy: 'user-1',
    createdAt: { seconds: 0, nanoseconds: 0 },
    updatedAt: { seconds: 0, nanoseconds: 0 },
    config: {
      rounds: 1,
      secondsPerPick: 60,
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
      CLE: null,
    } as Draft['teamAssignments'],
    participants: { 'user-1': 'discord-1' },
    pickOrder: [],
    pickedPlayerIds: [],
    ...overrides,
  };
}

function makeSlot(overrides: Partial<DraftSlot> = {}): DraftSlot {
  return {
    overall: 1,
    round: 1,
    pick: 1,
    team: 'TEN' as TeamAbbreviation,
    ...overrides,
  };
}

describe('getPickController', () => {
  it('returns user ID from teamAssignments when no trade override', () => {
    const draft = makeDraft();
    const slot = makeSlot({ team: 'TEN' as TeamAbbreviation });
    expect(getPickController(draft, slot)).toBe('user-1');
  });

  it('returns null for CPU-controlled team', () => {
    const draft = makeDraft();
    const slot = makeSlot({ team: 'CLE' as TeamAbbreviation });
    expect(getPickController(draft, slot)).toBeNull();
  });

  it('returns ownerOverride when set by trade', () => {
    const draft = makeDraft();
    const slot = makeSlot({ ownerOverride: 'user-2' });
    expect(getPickController(draft, slot)).toBe('user-2');
  });

  it('returns null when ownerOverride is empty string (CPU via trade)', () => {
    const draft = makeDraft();
    const slot = makeSlot({ ownerOverride: '' });
    expect(getPickController(draft, slot)).toBeNull();
  });
});

describe('filterAndSortPickOrder', () => {
  const sampleSlots: DraftSlot[] = [
    { overall: 33, round: 2, pick: 1, team: 'LV' as TeamAbbreviation },
    { overall: 1, round: 1, pick: 1, team: 'LV' as TeamAbbreviation },
    { overall: 65, round: 3, pick: 1, team: 'LV' as TeamAbbreviation },
    { overall: 2, round: 1, pick: 2, team: 'NYJ' as TeamAbbreviation },
    { overall: 34, round: 2, pick: 2, team: 'NYJ' as TeamAbbreviation },
  ];

  it('filters to the requested number of rounds', () => {
    const result = filterAndSortPickOrder(sampleSlots, 1);
    expect(result).toHaveLength(2);
    for (const slot of result) {
      expect(slot.round).toBeLessThanOrEqual(1);
    }
  });

  it('returns picks sorted by overall ascending', () => {
    const result = filterAndSortPickOrder(sampleSlots, 3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].overall).toBeGreaterThan(result[i - 1].overall);
    }
  });

  it('returns all picks when rounds covers everything', () => {
    const result = filterAndSortPickOrder(sampleSlots, 3);
    expect(result).toHaveLength(5);
  });

  it('returns empty array for empty input', () => {
    expect(filterAndSortPickOrder([], 1)).toHaveLength(0);
  });
});

describe('buildFuturePicksFromSeeds', () => {
  const twoTeams: TeamAbbreviation[] = ['NYJ', 'DAL'] as TeamAbbreviation[];

  it('produces rounds 1-3 for year+1 and year+2 with defaults', () => {
    const result = buildFuturePicksFromSeeds(2026, twoTeams, {});

    // 2 teams * 3 rounds * 2 years = 12
    expect(result).toHaveLength(12);

    const year1 = result.filter((fp) => fp.year === 2027);
    expect(year1).toHaveLength(6);

    const year2 = result.filter((fp) => fp.year === 2028);
    expect(year2).toHaveLength(6);

    for (const fp of result) {
      expect(fp.ownerTeam).toBe(fp.originalTeam);
    }
  });

  it('respects seeded overrides', () => {
    const result = buildFuturePicksFromSeeds(2026, twoTeams, {
      NYJ: [{ year: 2027, round: 1, originalTeam: 'DAL' as TeamAbbreviation }],
    });

    const dalPick = result.find(
      (fp) => fp.year === 2027 && fp.round === 1 && fp.originalTeam === 'DAL',
    );
    expect(dalPick).toBeDefined();
    expect(dalPick!.ownerTeam).toBe('NYJ');
  });

  it('does not duplicate seeded picks with defaults', () => {
    const result = buildFuturePicksFromSeeds(2026, twoTeams, {
      NYJ: [{ year: 2027, round: 1, originalTeam: 'NYJ' as TeamAbbreviation }],
    });

    const nyjRound1 = result.filter(
      (fp) => fp.year === 2027 && fp.round === 1 && fp.originalTeam === 'NYJ',
    );
    expect(nyjRound1).toHaveLength(1);
  });
});

describe('calculatePickAdvancement', () => {
  it('advances to next pick mid-draft', () => {
    const draft = makeDraft({
      currentPick: 1,
      currentRound: 1,
      pickOrder: [
        makeSlot({ overall: 1, round: 1 }),
        makeSlot({ overall: 2, round: 1 }),
        makeSlot({ overall: 3, round: 1 }),
      ],
    });

    const result = calculatePickAdvancement(draft);
    expect(result.nextPick).toBe(2);
    expect(result.nextRound).toBe(1);
    expect(result.isComplete).toBe(false);
  });

  it('marks complete on last pick', () => {
    const draft = makeDraft({
      currentPick: 3,
      currentRound: 1,
      pickOrder: [
        makeSlot({ overall: 1, round: 1 }),
        makeSlot({ overall: 2, round: 1 }),
        makeSlot({ overall: 3, round: 1 }),
      ],
    });

    const result = calculatePickAdvancement(draft);
    expect(result.nextPick).toBe(4);
    expect(result.isComplete).toBe(true);
  });

  it('advances round at boundary', () => {
    const draft = makeDraft({
      currentPick: 2,
      currentRound: 1,
      pickOrder: [
        makeSlot({ overall: 1, round: 1 }),
        makeSlot({ overall: 2, round: 1 }),
        makeSlot({ overall: 33, round: 2 }),
      ],
    });

    const result = calculatePickAdvancement(draft);
    expect(result.nextPick).toBe(3);
    expect(result.nextRound).toBe(2);
    expect(result.isComplete).toBe(false);
  });

  it('keeps current round when completing', () => {
    const draft = makeDraft({
      currentPick: 1,
      currentRound: 3,
      pickOrder: [makeSlot({ overall: 65, round: 3 })],
    });

    const result = calculatePickAdvancement(draft);
    expect(result.nextRound).toBe(3);
    expect(result.isComplete).toBe(true);
  });
});
