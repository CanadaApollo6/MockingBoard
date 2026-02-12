import { describe, it, expect } from 'vitest';
import {
  parseRosterContracts,
  parseDeadCap,
  parseFreeAgents,
  parseLeagueCapSpace,
} from './otc-parser.js';

function salaryTable(rows: string): string {
  return `<table><thead><tr><th>Player</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/**
 * Build a 15-cell OTC salary row. Indices 8, 10, 12 are empty spacers.
 * Cell 13 = concatenated dead money values, cell 14 = concatenated cap savings values.
 */
function otcRow(fields: {
  player: string;
  baseSalary: string;
  signing: string;
  option: string;
  rosterReg: string;
  rosterPG: string;
  workout: string;
  other: string;
  guaranteed: string;
  capNumber: string;
  deadMoney: string; // 6 concatenated values
  capSavings: string; // 6 concatenated values
}): string {
  const cells = [
    fields.player, // 0
    fields.baseSalary, // 1
    fields.signing, // 2
    fields.option, // 3
    fields.rosterReg, // 4
    fields.rosterPG, // 5
    fields.workout, // 6
    fields.other, // 7
    '', // 8: spacer
    fields.guaranteed, // 9
    '', // 10: spacer
    fields.capNumber, // 11
    '', // 12: spacer
    fields.deadMoney, // 13
    fields.capSavings, // 14
  ];
  return `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
}

describe('parseRosterContracts', () => {
  it('parses a standard salary table row', () => {
    const html = salaryTable(
      otcRow({
        player: 'Justin Herbert',
        baseSalary: '$24,000,000',
        signing: '$3,224,375',
        option: '$19,121,300',
        rosterReg: '$0',
        rosterPG: '$0',
        workout: '$0',
        other: '$0',
        guaranteed: '$24,000,000',
        capNumber: '$46,345,675',
        deadMoney: '$96,812,650$50,466,975$72,812,650$26,466,975$0$0',
        capSavings:
          '($50,466,975)($3,878,700)($26,466,975)$19,878,700$17,088,750$18,228,000',
      }),
    );
    const result = parseRosterContracts(html);
    expect(result).toHaveLength(1);
    expect(result[0].player).toBe('Justin Herbert');
    expect(result[0].baseSalary).toBe(24_000_000);
    expect(result[0].capNumber).toBe(46_345_675);
    expect(result[0].proratedBonus).toBe(3_224_375 + 19_121_300);
    expect(result[0].rosterBonus).toBe(0);
    expect(result[0].deadMoney.cutPreJune1).toBe(96_812_650);
    expect(result[0].deadMoney.cutPostJune1).toBe(50_466_975);
    expect(result[0].deadMoney.tradePreJune1).toBe(72_812_650);
    expect(result[0].deadMoney.tradePostJune1).toBe(26_466_975);
    expect(result[0].restructureSavings).toBe(17_088_750);
    expect(result[0].extensionSavings).toBe(18_228_000);
  });

  it('parses cap savings from concatenated values', () => {
    const html = salaryTable(
      otcRow({
        player: 'Test Player',
        baseSalary: '$1,000,000',
        signing: '$0',
        option: '$0',
        rosterReg: '$0',
        rosterPG: '$0',
        workout: '$0',
        other: '$0',
        guaranteed: '$0',
        capNumber: '$10,000,000',
        deadMoney: '$3,000,000$2,000,000$4,000,000$1,000,000$0$0',
        capSavings: '$7,000,000$8,000,000$6,000,000$9,000,000$0$0',
      }),
    );
    const result = parseRosterContracts(html);
    expect(result[0].capSavings.cutPreJune1).toBe(7_000_000);
    expect(result[0].capSavings.cutPostJune1).toBe(8_000_000);
    expect(result[0].capSavings.tradePreJune1).toBe(6_000_000);
    expect(result[0].capSavings.tradePostJune1).toBe(9_000_000);
  });

  it('skips Total row', () => {
    const html = salaryTable(
      otcRow({
        player: '*TOTAL*',
        baseSalary: '$200,000,000',
        signing: '$0',
        option: '$0',
        rosterReg: '$0',
        rosterPG: '$0',
        workout: '$0',
        other: '$0',
        guaranteed: '$0',
        capNumber: '$200,000,000',
        deadMoney: '$0$0$0$0$0$0',
        capSavings: '$0$0$0$0$0$0',
      }),
    );
    expect(parseRosterContracts(html)).toHaveLength(0);
  });

  it('skips rows with fewer than 13 cells', () => {
    const html =
      '<table><tbody><tr><td>Name</td><td>$100</td></tr></tbody></table>';
    expect(parseRosterContracts(html)).toHaveLength(0);
  });

  it('handles empty table', () => {
    expect(parseRosterContracts('<html></html>')).toHaveLength(0);
  });

  it('handles negative dollar values in parentheses', () => {
    const html = salaryTable(
      otcRow({
        player: 'Overpaid Player',
        baseSalary: '$5,000,000',
        signing: '$0',
        option: '$0',
        rosterReg: '$0',
        rosterPG: '$0',
        workout: '$0',
        other: '$0',
        guaranteed: '$0',
        capNumber: '$10,000,000',
        deadMoney: '$15,000,000$12,000,000$0$0$0$0',
        capSavings: '($5,000,000)($2,000,000)$10,000,000$10,000,000$0$0',
      }),
    );
    const result = parseRosterContracts(html);
    expect(result[0].capSavings.cutPreJune1).toBe(-5_000_000);
    expect(result[0].capSavings.cutPostJune1).toBe(-2_000_000);
  });

  it('handles missing dead money / savings cells gracefully', () => {
    // Row with 13 cells (no dead money or savings columns)
    const cells = [
      'Short Row Player',
      '$1,000,000',
      '$0',
      '$0',
      '$0',
      '$0',
      '$0',
      '$0',
      '',
      '$0',
      '',
      '$1,000,000',
      '',
    ];
    const html = `<table><tbody><tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr></tbody></table>`;
    const result = parseRosterContracts(html);
    expect(result).toHaveLength(1);
    expect(result[0].deadMoney.cutPreJune1).toBe(0);
    expect(result[0].capSavings.cutPreJune1).toBe(0);
    expect(result[0].restructureSavings).toBe(0);
  });
});

describe('parseDeadCap', () => {
  it('parses dead cap entries from second table', () => {
    const html = `
      <table><tbody><tr><td>Active Player</td><td>$10,000,000</td></tr></tbody></table>
      <table><tbody>
        <tr><td>Branson Taylor</td><td>$168,903</td></tr>
        <tr><td>Kimani Vidal</td><td>$103,718</td></tr>
      </tbody></table>
    `;
    const result = parseDeadCap(html);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Branson Taylor');
    expect(result[0].capNumber).toBe(168_903);
    expect(result[1].name).toBe('Kimani Vidal');
    expect(result[1].capNumber).toBe(103_718);
  });

  it('skips Total row', () => {
    const html = `
      <table><tbody><tr><td>X</td></tr></tbody></table>
      <table><tbody>
        <tr><td>Player A</td><td>$100,000</td></tr>
        <tr><td>*TOTAL*</td><td>$100,000</td></tr>
      </tbody></table>
    `;
    expect(parseDeadCap(html)).toHaveLength(1);
  });

  it('returns empty if fewer than 2 tables', () => {
    expect(parseDeadCap('<table></table>')).toHaveLength(0);
  });
});

describe('parseFreeAgents', () => {
  /** Build a 2-column OTC free agent row matching the current calculator layout. */
  function faRow(opts: {
    player: string;
    faType: string;
    age: number;
    years: number;
    franchise?: number;
    transition?: number;
  }): string {
    const franchise = opts.franchise
      ? `$${opts.franchise.toLocaleString()}`
      : '$0';
    const transition = opts.transition
      ? `$${opts.transition.toLocaleString()}`
      : '$0';
    return `<tr>
      <td>${opts.player} (${opts.faType})Age: ${opts.age}  (${opts.years})</td>
      <td>Select\nFranchise Tender: \n${franchise}\nTransition Tender: \n${transition}\nExtendCancel</td>
    </tr>`;
  }

  it('parses free agent entries from 2-column layout', () => {
    const html = `
      <table><thead><tr><th>Free Agent</th><th>Transaction</th></tr></thead><tbody>
        ${faRow({ player: 'Zion Johnson', faType: 'UFA', age: 27, years: 4, franchise: 27_924_000, transition: 25_305_000 })}
        ${faRow({ player: 'Khalil Mack', faType: 'UFA', age: 35, years: 12, franchise: 28_197_000, transition: 23_613_000 })}
      </tbody></table>
    `;
    const result = parseFreeAgents(html);
    expect(result).toHaveLength(2);
    expect(result[0].player).toBe('Zion Johnson');
    expect(result[0].age).toBe(27);
    expect(result[0].years).toBe(4);
    expect(result[0].faType).toBe('UFA');
    expect(result[0].franchiseTender).toBe(27_924_000);
    expect(result[0].transitionTender).toBe(25_305_000);
    expect(result[1].player).toBe('Khalil Mack');
    expect(result[1].age).toBe(35);
    expect(result[1].years).toBe(12);
  });

  it('handles RFA and ERFA types', () => {
    const html = `<table><thead><tr><th>Free Agent</th><th>Transaction</th></tr></thead><tbody>
      ${faRow({ player: 'Young Player', faType: 'RFA', age: 23, years: 2, franchise: 5_000_000, transition: 4_000_000 })}
      ${faRow({ player: 'Rookie FA', faType: 'ERFA', age: 24, years: 3, franchise: 2_000_000, transition: 1_500_000 })}
    </tbody></table>`;
    const result = parseFreeAgents(html);
    expect(result[0].faType).toBe('RFA');
    expect(result[1].faType).toBe('ERFA');
  });

  it('defaults to UFA when FA type is missing', () => {
    const html = `<table><thead><tr><th>Free Agent</th><th>Transaction</th></tr></thead><tbody>
      <tr>
        <td>Unknown Type Age: 30  (8)</td>
        <td>Select\nFranchise Tender: \n$10,000,000\nTransition Tender: \n$8,000,000\nExtendCancel</td>
      </tr>
    </tbody></table>`;
    const result = parseFreeAgents(html);
    expect(result[0].player).toBe('Unknown Type');
    expect(result[0].faType).toBe('UFA');
    expect(result[0].age).toBe(30);
  });

  it('only parses the first free agent table (current year)', () => {
    const html = `
      <table><thead><tr><th>Free Agent</th><th>Transaction</th></tr></thead><tbody>
        ${faRow({ player: 'Current Year FA', faType: 'UFA', age: 28, years: 5, franchise: 15_000_000, transition: 12_000_000 })}
      </tbody></table>
      <table><thead><tr><th>Free Agent</th><th>Transaction</th></tr></thead><tbody>
        ${faRow({ player: 'Future Year FA', faType: 'UFA', age: 29, years: 6, franchise: 0, transition: 0 })}
      </tbody></table>
    `;
    const result = parseFreeAgents(html);
    expect(result).toHaveLength(1);
    expect(result[0].player).toBe('Current Year FA');
  });

  it('returns empty for no matching table', () => {
    expect(parseFreeAgents('<html></html>')).toHaveLength(0);
  });
});

describe('parseLeagueCapSpace', () => {
  it('parses teams from cap space table', () => {
    const html = `<table><thead><tr><th>Team</th></tr></thead><tbody>
      <tr>
        <td>Titans</td>
        <td>$104,769,062</td>
        <td>$93,334,968</td>
        <td>51</td>
        <td>$220,791,308</td>
        <td>$535,658</td>
      </tr>
      <tr>
        <td>Chargers</td>
        <td>$88,677,941</td>
        <td>$84,372,966</td>
        <td>51</td>
        <td>$217,963,367</td>
        <td>$478,177</td>
      </tr>
    </tbody></table>`;
    const result = parseLeagueCapSpace(html);
    expect(result).toHaveLength(2);
    expect(result[0].team).toBe('TEN');
    expect(result[0].capSpace).toBe(104_769_062);
    expect(result[1].team).toBe('LAC');
    expect(result[1].effectiveCapSpace).toBe(84_372_966);
    expect(result[1].deadMoney).toBe(478_177);
  });

  it('handles multi-word team names by taking last word', () => {
    const html = `<table><tbody>
      <tr><td>San Francisco 49ers</td><td>$10,000</td><td>$10,000</td><td>51</td><td>$10,000</td><td>$10,000</td></tr>
      <tr><td>Green Bay Packers</td><td>$20,000</td><td>$20,000</td><td>52</td><td>$20,000</td><td>$20,000</td></tr>
    </tbody></table>`;
    const result = parseLeagueCapSpace(html);
    expect(result).toHaveLength(2);
    expect(result[0].team).toBe('SF');
    expect(result[1].team).toBe('GB');
  });

  it('skips unrecognized team names', () => {
    const html = `<table><tbody>
      <tr><td>Unknown Team</td><td>$0</td><td>$0</td><td>0</td><td>$0</td><td>$0</td></tr>
    </tbody></table>`;
    expect(parseLeagueCapSpace(html)).toHaveLength(0);
  });
});
