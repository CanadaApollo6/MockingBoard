import * as cheerio from 'cheerio';
import type { DraftSlot, TeamAbbreviation } from '@mockingboard/shared';

/**
 * Maps Tankathon's CloudFront SVG filename stem to our TeamAbbreviation.
 * Source: https://www.tankathon.com/nfl/full_draft (img src patterns).
 */
const SVG_TO_TEAM: Record<string, TeamAbbreviation> = {
  ari: 'ARI',
  atl: 'ATL',
  bal: 'BAL',
  buf: 'BUF',
  car: 'CAR',
  chi: 'CHI',
  cin: 'CIN',
  cle: 'CLE',
  dal: 'DAL',
  den: 'DEN',
  det: 'DET',
  gb: 'GB',
  hou: 'HOU',
  ind: 'IND',
  jax: 'JAX',
  kc: 'KC',
  lac: 'LAC',
  lar: 'LAR',
  lv: 'LV',
  mia: 'MIA',
  min: 'MIN',
  ne: 'NE',
  no: 'NO',
  nyg: 'NYG',
  nyj: 'NYJ',
  phi: 'PHI',
  pit: 'PIT',
  sea: 'SEA',
  sf: 'SF',
  tb: 'TB',
  ten: 'TEN',
  wsh: 'WAS',
};

/** Extract TeamAbbreviation from a Tankathon CloudFront SVG src URL. */
function teamFromSvg(src: string): TeamAbbreviation | undefined {
  const match = src.match(/\/nfl\/([a-z]+)\.svg/i);
  return match ? SVG_TO_TEAM[match[1].toLowerCase()] : undefined;
}

/**
 * Parse Tankathon's /nfl/full_draft page into DraftSlot[].
 *
 * Page structure:
 * - div.full-draft-round per round, containing div.round-title ("1st Round", etc.)
 * - table.full-draft with <tr> rows per pick
 * - Each row: td.pick-number (overall), td with div.team-link (acquiring team)
 * - Traded picks also have a div.trade containing an <a> with the original team's logo
 */
export function parseTankathonDraftOrder(html: string): DraftSlot[] {
  const $ = cheerio.load(html);
  const slots: DraftSlot[] = [];

  $('.full-draft-round').each((_, roundEl) => {
    const roundTitle = $(roundEl).find('.round-title').text().trim();
    const roundMatch = roundTitle.match(/^(\d+)/);
    if (!roundMatch) return;

    const round = parseInt(roundMatch[1], 10);
    let pickInRound = 0;

    $(roundEl)
      .find('table.full-draft tr')
      .each((__, row) => {
        const overallText = $(row).find('td.pick-number').text().trim();
        const overall = parseInt(overallText, 10);
        if (!overall) return;

        // Primary team: the team-link anchor's logo
        const primaryImg = $(row)
          .find('.team-link img.logo-thumb')
          .first()
          .attr('src');
        if (!primaryImg) return;

        const primaryTeam = teamFromSvg(primaryImg);
        if (!primaryTeam) return;

        pickInRound++;

        // Check for trade indicator
        const tradeImg = $(row)
          .find('.trade img.logo-thumb')
          .first()
          .attr('src');
        const originalTeam = tradeImg ? teamFromSvg(tradeImg) : undefined;

        if (originalTeam && originalTeam !== primaryTeam) {
          // Traded pick: primary = acquiring team (teamOverride), trade div = original owner (team)
          slots.push({
            overall,
            round,
            pick: pickInRound,
            team: originalTeam,
            teamOverride: primaryTeam,
          });
        } else {
          slots.push({ overall, round, pick: pickInRound, team: primaryTeam });
        }
      });
  });

  return slots;
}
