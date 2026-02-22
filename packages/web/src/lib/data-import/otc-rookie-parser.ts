import * as cheerio from 'cheerio';
import type { RookieSlotEntry } from '@mockingboard/shared';

/** Strip $, commas, parentheses and parse to integer. */
function parseDollar(text: string): number {
  const cleaned = text.replace(/[$,()[\]\s]/g, '');
  if (!cleaned || cleaned === '-') return 0;
  return parseInt(cleaned, 10) || 0;
}

/**
 * Parse rookie slot values from OTC's /draft page.
 *
 * Each cell in the main table contains a hidden `div.pick-full-contract`
 * with the full 4-year contract breakdown:
 *
 * ```html
 * <td data-team="HOU" data-round="4">
 *   <a>$1,201,819</a>
 *   <div class="pick-full-contract HOU-fg">
 *     <div><strong>#<span class="overall">106</span> - HOU</strong></div>
 *     <div>Total Value: $5,647,276</div>
 *     <div>Signing Bonus: $1,267,276</div>
 *     <table class="draft-pick-table">
 *       <tbody>
 *         <tr><td>2026</td><td>$885,000</td><td>$316,819</td><td>$1,201,819</td></tr>
 *         ...4 rows (one per contract year)
 *       </tbody>
 *     </table>
 *   </div>
 * </td>
 * ```
 *
 * Returns entries sorted by overall pick number.
 */
export function parseRookieSlotValues(html: string): RookieSlotEntry[] {
  const $ = cheerio.load(html);
  const entries: RookieSlotEntry[] = [];
  const seen = new Set<number>();

  // Each pick's full data lives in a div.pick-full-contract inside a <td>
  $('div.pick-full-contract').each((_, div) => {
    const $div = $(div);

    // Overall pick number from <span class="overall">
    const overallText = $div.find('span.overall').first().text().trim();
    const overall = parseInt(overallText, 10);
    if (!overall || overall < 1 || seen.has(overall)) return;
    seen.add(overall);

    // Team from the parent <td> data attribute or from the header text
    const $td = $div.closest('td');
    const team = $td.attr('data-team') ?? '';

    // Round from the parent <td> data attribute
    const roundAttr = $td.attr('data-round');
    const round = roundAttr ? parseInt(roundAttr, 10) : Math.ceil(overall / 32);

    // Pick within round: calculate from overall and round
    // Round 1 picks 1-32, round 2 picks 33-64, etc. (approximate for compensatory)
    const pick = overall - (round - 1) * 32;

    // Total value and signing bonus from sibling divs
    let totalValue = 0;
    let signingBonus = 0;
    $div.children('div').each((_, child) => {
      const text = $(child).text().trim();
      const tvMatch = text.match(/Total Value[:\s]*\$?([\d,]+)/i);
      if (tvMatch) totalValue = parseDollar(tvMatch[1]);
      const sbMatch = text.match(/Signing Bonus[:\s]*\$?([\d,]+)/i);
      if (sbMatch) signingBonus = parseDollar(sbMatch[1]);
    });

    // Year-by-year breakdown from the inner draft-pick-table
    const yearRows = $div.find('table.draft-pick-table tbody tr');
    const bases: number[] = [];
    const caps: number[] = [];

    yearRows.each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 4) {
        // Columns: Year, Base Salary, Prorated Bonus, Cap Number
        bases.push(parseDollar($(cells[1]).text()));
        caps.push(parseDollar($(cells[3]).text()));
      }
    });

    entries.push({
      overall,
      round,
      pick,
      team,
      totalValue,
      signingBonus,
      year1Cap: caps[0] ?? 0,
      year2Cap: caps[1] ?? 0,
      year3Cap: caps[2] ?? 0,
      year4Cap: caps[3] ?? 0,
      year1Base: bases[0] ?? 0,
      year2Base: bases[1] ?? 0,
      year3Base: bases[2] ?? 0,
      year4Base: bases[3] ?? 0,
    });
  });

  return entries.sort((a, b) => a.overall - b.overall);
}
