import { describe, it, expect } from 'vitest';
import { parseTankathonDraftOrder } from './tankathon-parser.js';

/** Build a single non-traded pick row. */
function pickRow(overall: number, svgSlug: string, cityName: string): string {
  return `<tr><td class="pick-number">${overall}</td> <td><div class="team-link"><a href="/nfl/team"><div class="team-link-section team-link-logo"><img class="logo-thumb" src="http://d2uki2uvp6v3wr.cloudfront.net/nfl/${svgSlug}.svg" /></div> <div class="team-link-section"><div class="mobile">${cityName}</div><div class="desktop">${cityName}</div></div></a></div></td></tr>`;
}

/** Build a traded pick row: acquiring team shown in team-link, original team in .trade div. */
function tradedPickRow(
  overall: number,
  acquirerSlug: string,
  acquirerName: string,
  originalSlug: string,
  originalAbbr: string,
): string {
  return `<tr><td class="pick-number">${overall}</td> <td><div class="team-link"><a href="/nfl/team"><div class="team-link-section team-link-logo"><img class="logo-thumb" src="http://d2uki2uvp6v3wr.cloudfront.net/nfl/${acquirerSlug}.svg" /></div> <div class="team-link-section"><div class="mobile">${acquirerName}</div><div class="desktop">${acquirerName}</div></div></a></div><div class="trade"> <i class="fa fa-arrow-circle-left"></i> <a class="disabled" href="/nfl/team"><span class="desktop">${originalAbbr}</span> <img class="logo-thumb" src="http://d2uki2uvp6v3wr.cloudfront.net/nfl/${originalSlug}.svg" /></a></div></td></tr>`;
}

/** Wrap rows in a full-draft-round structure. */
function roundBlock(roundNum: number, rows: string): string {
  const ordinal =
    roundNum === 1
      ? '1st'
      : roundNum === 2
        ? '2nd'
        : roundNum === 3
          ? '3rd'
          : `${roundNum}th`;
  return `<div class="full-draft-round full-draft-round-nfl"><div class="round-title">${ordinal} Round</div><table class="full-draft">${rows}</table></div>`;
}

function page(content: string): string {
  return `<html><body>${content}</body></html>`;
}

describe('parseTankathonDraftOrder', () => {
  it('returns empty array for empty HTML', () => {
    expect(parseTankathonDraftOrder('<html><body></body></html>')).toEqual([]);
  });

  it('returns empty array when no full-draft-round divs exist', () => {
    expect(
      parseTankathonDraftOrder('<html><body><div>No draft</div></body></html>'),
    ).toEqual([]);
  });

  it('parses a non-traded pick', () => {
    const html = page(roundBlock(1, pickRow(1, 'lv', 'Las Vegas')));
    const slots = parseTankathonDraftOrder(html);

    expect(slots).toHaveLength(1);
    expect(slots[0]).toEqual({
      overall: 1,
      round: 1,
      pick: 1,
      team: 'LV',
    });
    expect(slots[0].teamOverride).toBeUndefined();
  });

  it('parses a traded pick with teamOverride', () => {
    const html = page(
      roundBlock(1, tradedPickRow(13, 'lar', 'LA Rams', 'atl', 'ATL')),
    );
    const slots = parseTankathonDraftOrder(html);

    expect(slots).toHaveLength(1);
    expect(slots[0]).toEqual({
      overall: 13,
      round: 1,
      pick: 1,
      team: 'ATL',
      teamOverride: 'LAR',
    });
  });

  it('maps Washington SVG slug wsh to WAS', () => {
    const html = page(roundBlock(1, pickRow(7, 'wsh', 'Washington')));
    const slots = parseTankathonDraftOrder(html);

    expect(slots[0].team).toBe('WAS');
  });

  it('tracks pick-in-round correctly', () => {
    const rows = [
      pickRow(1, 'lv', 'Las Vegas'),
      pickRow(2, 'nyj', 'NY Jets'),
      pickRow(3, 'ari', 'Arizona'),
    ].join('');
    const html = page(roundBlock(1, rows));
    const slots = parseTankathonDraftOrder(html);

    expect(slots).toHaveLength(3);
    expect(slots[0].pick).toBe(1);
    expect(slots[1].pick).toBe(2);
    expect(slots[2].pick).toBe(3);
  });

  it('resets pick-in-round counter across rounds', () => {
    const round1 = roundBlock(
      1,
      [pickRow(1, 'lv', 'Las Vegas'), pickRow(2, 'nyj', 'NY Jets')].join(''),
    );
    const round2 = roundBlock(
      2,
      [pickRow(33, 'lv', 'Las Vegas'), pickRow(34, 'nyj', 'NY Jets')].join(''),
    );
    const html = page(round1 + round2);
    const slots = parseTankathonDraftOrder(html);

    expect(slots).toHaveLength(4);
    expect(slots[2]).toEqual({ overall: 33, round: 2, pick: 1, team: 'LV' });
    expect(slots[3]).toEqual({ overall: 34, round: 2, pick: 2, team: 'NYJ' });
  });

  it('skips rows with unrecognized SVG slugs', () => {
    const rows = [
      pickRow(1, 'lv', 'Las Vegas'),
      pickRow(2, 'unknown', 'Mystery Team'),
      pickRow(3, 'ari', 'Arizona'),
    ].join('');
    const html = page(roundBlock(1, rows));
    const slots = parseTankathonDraftOrder(html);

    expect(slots).toHaveLength(2);
    expect(slots[0].overall).toBe(1);
    expect(slots[1].overall).toBe(3);
  });

  it('handles mix of traded and non-traded picks', () => {
    const rows = [
      pickRow(1, 'lv', 'Las Vegas'),
      tradedPickRow(2, 'nyj', 'NY Jets', 'dal', 'DAL'),
      pickRow(3, 'ari', 'Arizona'),
    ].join('');
    const html = page(roundBlock(1, rows));
    const slots = parseTankathonDraftOrder(html);

    expect(slots).toHaveLength(3);
    expect(slots[0].teamOverride).toBeUndefined();
    expect(slots[1]).toEqual({
      overall: 2,
      round: 1,
      pick: 2,
      team: 'DAL',
      teamOverride: 'NYJ',
    });
    expect(slots[2].teamOverride).toBeUndefined();
  });
});
