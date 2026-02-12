import * as cheerio from 'cheerio';
import type {
  PlayerContract,
  FreeAgentEntry,
  DeadCapEntry,
  LeagueCapOverview,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { OTC_NAME_TO_ABBR } from './otc-slugs.js';

/** Strip $, commas, parentheses and parse to integer cents-free dollars. */
function parseDollar(text: string): number {
  const negative = text.includes('(') || text.startsWith('-');
  const cleaned = text.replace(/[$,()[\]\s]/g, '').replace(/^-/, '');
  if (!cleaned || cleaned === '-') return 0;
  const value = parseInt(cleaned, 10) || 0;
  return negative ? -value : value;
}

function parseIntSafe(text: string): number {
  return parseInt(text.replace(/[,\s]/g, '').trim(), 10) || 0;
}

/**
 * Fixed column indices for OTC's salary-cap table.
 *
 * The table renders 15 <td> elements per row. Three are empty spacer
 * cells (8, 10, 12). Cells 13 and 14 each contain 6 concatenated dollar
 * values (one per transaction scenario selected via a JS dropdown).
 * The scenarios, in order: Cut pre-June 1, Cut post-June 1,
 * Trade pre-June 1, Trade post-June 1, Restructure, Extension.
 */
const SALARY_COLS = {
  player: 0,
  baseSalary: 1,
  signingBonus: 2,
  optionBonus: 3,
  rosterBonusRegular: 4,
  rosterBonusPerGame: 5,
  workoutBonus: 6,
  otherBonus: 7,
  // 8: spacer
  guaranteedSalary: 9,
  // 10: spacer
  capNumber: 11,
  // 12: spacer
  deadMoneyAll: 13, // 6 concatenated dollar values
  capSavingsAll: 14, // 6 concatenated dollar values
} as const;

/** Split a cell that contains multiple concatenated dollar values (e.g. "$39,000,000$27,000,000$0"). */
function parseMultiDollar(text: string): number[] {
  const matches = text.match(/\(?\$[\d,]+\)?/g);
  return matches ? matches.map(parseDollar) : [];
}

/**
 * Parse OTC salary cap table (table 1 from /salary-cap/{team}).
 * Returns one PlayerContract per rostered player.
 */
export function parseRosterContracts(html: string): PlayerContract[] {
  const $ = cheerio.load(html);
  const contracts: PlayerContract[] = [];
  const table = $('table').first();
  if (!table.length) return contracts;

  table.find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 13) return;

    const cell = (idx: number) => $(cells[idx]).text().trim();
    const player = cell(SALARY_COLS.player);
    if (!player || player.toLowerCase().includes('total')) return;

    const signingBonus = parseDollar(cell(SALARY_COLS.signingBonus));
    const optionBonus = parseDollar(cell(SALARY_COLS.optionBonus));
    const rosterBonusRegular = parseDollar(
      cell(SALARY_COLS.rosterBonusRegular),
    );
    const rosterBonusPerGame = parseDollar(
      cell(SALARY_COLS.rosterBonusPerGame),
    );
    const capNumber = parseDollar(cell(SALARY_COLS.capNumber));

    // Cells 13/14 contain 6 concatenated dollar values — one per scenario
    const deadVals = parseMultiDollar(cell(SALARY_COLS.deadMoneyAll));
    const savingsVals = parseMultiDollar(cell(SALARY_COLS.capSavingsAll));

    contracts.push({
      player,
      baseSalary: parseDollar(cell(SALARY_COLS.baseSalary)),
      signingBonus,
      optionBonus,
      proratedBonus: signingBonus + optionBonus,
      rosterBonusRegular,
      rosterBonusPerGame,
      rosterBonus: rosterBonusRegular + rosterBonusPerGame,
      workoutBonus: parseDollar(cell(SALARY_COLS.workoutBonus)),
      otherBonus: parseDollar(cell(SALARY_COLS.otherBonus)),
      guaranteedSalary: parseDollar(cell(SALARY_COLS.guaranteedSalary)),
      capNumber,
      deadMoney: {
        cutPreJune1: deadVals[0] ?? 0,
        cutPostJune1: deadVals[1] ?? 0,
        tradePreJune1: deadVals[2] ?? 0,
        tradePostJune1: deadVals[3] ?? 0,
      },
      capSavings: {
        cutPreJune1: savingsVals[0] ?? 0,
        cutPostJune1: savingsVals[1] ?? 0,
        tradePreJune1: savingsVals[2] ?? 0,
        tradePostJune1: savingsVals[3] ?? 0,
      },
      restructureSavings: savingsVals[4] ?? 0,
      extensionSavings: savingsVals[5] ?? 0,
    });
  });

  return contracts;
}

/**
 * Parse dead cap / practice squad table (table 2 from /salary-cap/{team}).
 * Simple two-column: Name, Cap Number.
 */
export function parseDeadCap(html: string): DeadCapEntry[] {
  const $ = cheerio.load(html);
  const entries: DeadCapEntry[] = [];
  const tables = $('table');
  if (tables.length < 2) return entries;

  tables
    .eq(1)
    .find('tbody tr')
    .each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const name = $(cells[0]).text().trim();
      const capNumber = parseDollar($(cells[1]).text().trim());
      if (name && !name.toLowerCase().includes('total')) {
        entries.push({ name, capNumber });
      }
    });

  return entries;
}

/**
 * Parse the first free-agent table from /calculator/{team}.
 *
 * OTC's calculator page uses a 2-column layout per free agent row:
 *   Cell 0: "Kaden Elliss (UFA)Age: 31  (7)"
 *   Cell 1: "Select\nFranchise Tender: \n$28,197,000\nTransition Tender: \n$23,613,000..."
 *
 * We extract player name, FA type, age, years from cell 0 and tenders from cell 1.
 * Only the first matching table is used (current-year free agents).
 */
export function parseFreeAgents(html: string): FreeAgentEntry[] {
  const $ = cheerio.load(html);
  const entries: FreeAgentEntry[] = [];

  // Find the first free-agent table by header content
  const tables = $('table').toArray();
  const faTable = tables.find((table) => {
    const headerText = $(table).find('thead, th').text().toLowerCase();
    return headerText.includes('free agent');
  });
  if (!faTable) return entries;

  $(faTable)
    .find('tbody tr')
    .each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const infoText = $(cells[0]).text().trim();
      if (!infoText) return;

      // Cell 0 format: "Player Name (UFA)Age: 31  (7)"
      const faTypeMatch = infoText.match(/\((UFA|RFA|ERFA)\)/i);
      const faType = (faTypeMatch?.[1]?.toUpperCase() ?? 'UFA') as
        | 'UFA'
        | 'RFA'
        | 'ERFA';

      // Player name is everything before the FA type parenthetical
      const player = faTypeMatch
        ? infoText.slice(0, faTypeMatch.index).trim()
        : infoText.split('Age:')[0].trim();
      if (!player) return;

      // Age: look for "Age: NN"
      const ageMatch = infoText.match(/Age:\s*(\d+)/);
      const age = ageMatch ? parseInt(ageMatch[1], 10) : 0;

      // Years: the parenthesized number after age, e.g. "(7)"
      const yearsMatch = infoText.match(/Age:\s*\d+\s+\((\d+)\)/);
      const years = yearsMatch ? parseInt(yearsMatch[1], 10) : 0;

      // Cell 1: extract tender dollar amounts
      const transactionText = $(cells[1]).text();
      const franchiseMatch = transactionText.match(
        /Franchise\s*Tender:\s*\$?([\d,]+)/,
      );
      const transitionMatch = transactionText.match(
        /Transition\s*Tender:\s*\$?([\d,]+)/,
      );
      const franchiseTender = franchiseMatch
        ? parseIntSafe(franchiseMatch[1])
        : 0;
      const transitionTender = transitionMatch
        ? parseIntSafe(transitionMatch[1])
        : 0;

      entries.push({
        player,
        age,
        years,
        faType,
        franchiseTender,
        transitionTender,
      });
    });

  return entries;
}

/**
 * Parse league-wide cap space table from /salary-cap-space (table 1).
 * Columns: Team, Cap Space, Effective Cap Space, #, Active Cap Spending, Dead Money.
 */
export function parseLeagueCapSpace(html: string): LeagueCapOverview[] {
  const $ = cheerio.load(html);
  const entries: LeagueCapOverview[] = [];
  const table = $('table').first();
  if (!table.length) return entries;

  table.find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 6) return;

    const teamText = $(cells[0]).text().trim();
    const words = teamText.split(/\s+/);
    const mascot = words[words.length - 1];
    const abbr = OTC_NAME_TO_ABBR[mascot] as TeamAbbreviation | undefined;
    if (!abbr) return;

    entries.push({
      team: abbr,
      capSpace: parseDollar($(cells[1]).text()),
      effectiveCapSpace: parseDollar($(cells[2]).text()),
      playerCount: parseIntSafe($(cells[3]).text()),
      activeCapSpending: parseDollar($(cells[4]).text()),
      deadMoney: parseDollar($(cells[5]).text()),
    });
  });

  return entries;
}
