import { describe, it, expect } from 'vitest';
import {
  parseHeight,
  parseFraction,
  parseStatValue,
  normalizeSchool,
  toDisplaySchool,
  normalizePlayerName,
  matchKey,
  parseProspectCsv,
} from './prospect-import';

describe('parseHeight', () => {
  it('parses standard combine height', () => {
    expect(parseHeight('6020')).toBe(74); // 6'2"
  });

  it('parses height with fractional eighths', () => {
    expect(parseHeight('6024')).toBe(74.5); // 6'2" + 4/8
  });

  it('returns undefined for values below 4000', () => {
    expect(parseHeight('3999')).toBeUndefined();
  });

  it('returns undefined for NaN', () => {
    expect(parseHeight('')).toBeUndefined();
    expect(parseHeight('abc')).toBeUndefined();
  });

  it('handles 5-foot players', () => {
    expect(parseHeight('5100')).toBe(70); // 5'10"
  });
});

describe('parseFraction', () => {
  it('parses standard combine fraction', () => {
    expect(parseFraction('3038')).toBe(30.375); // 30 + 3/8
  });

  it('parses whole numbers with zero eighths', () => {
    expect(parseFraction('3200')).toBe(32);
  });

  it('returns undefined for values below 100', () => {
    expect(parseFraction('99')).toBeUndefined();
  });

  it('returns undefined for NaN', () => {
    expect(parseFraction('')).toBeUndefined();
  });
});

describe('parseStatValue', () => {
  it('parses integers', () => {
    expect(parseStatValue('42')).toBe(42);
  });

  it('parses decimals', () => {
    expect(parseStatValue('4.5')).toBe(4.5);
  });

  it('parses negative numbers', () => {
    expect(parseStatValue('-1.2')).toBe(-1.2);
  });

  it('keeps percentages as strings', () => {
    expect(parseStatValue('65.2%')).toBe('65.2%');
  });

  it('returns null for empty strings', () => {
    expect(parseStatValue('')).toBeNull();
    expect(parseStatValue('  ')).toBeNull();
  });

  it('returns text as-is when not a number or percentage', () => {
    expect(parseStatValue('N/A')).toBe('N/A');
  });
});

describe('normalizeSchool', () => {
  it('normalizes known aliases', () => {
    expect(normalizeSchool('Miss State')).toBe('MISSISSIPPI STATE');
    expect(normalizeSchool('PITT')).toBe('PITTSBURGH');
    expect(normalizeSchool('UNC')).toBe('NORTH CAROLINA');
  });

  it('passes through unknown schools in uppercase', () => {
    expect(normalizeSchool('Alabama')).toBe('ALABAMA');
  });

  it('is case insensitive', () => {
    expect(normalizeSchool('miss state')).toBe('MISSISSIPPI STATE');
  });

  it('trims whitespace', () => {
    expect(normalizeSchool('  Alabama  ')).toBe('ALABAMA');
  });
});

describe('toDisplaySchool', () => {
  it('keeps uppercase abbreviations', () => {
    expect(toDisplaySchool('LSU')).toBe('LSU');
    expect(toDisplaySchool('UCF')).toBe('UCF');
    expect(toDisplaySchool('USC')).toBe('USC');
  });

  it('title-cases multi-word names', () => {
    expect(toDisplaySchool('MISSISSIPPI STATE')).toBe('Mississippi State');
    expect(toDisplaySchool('NORTH CAROLINA')).toBe('North Carolina');
  });

  it('handles special cases', () => {
    expect(toDisplaySchool('OLE MISS')).toBe('Ole Miss');
    expect(toDisplaySchool('NC STATE')).toBe('NC State');
  });

  it('title-cases single-word names', () => {
    expect(toDisplaySchool('ALABAMA')).toBe('Alabama');
  });
});

describe('normalizePlayerName', () => {
  it('lowercases and trims', () => {
    expect(normalizePlayerName('  John Smith  ')).toBe('john smith');
  });

  it('strips Jr/Sr suffixes', () => {
    expect(normalizePlayerName('John Smith Jr')).toBe('john smith');
    expect(normalizePlayerName('John Smith Sr')).toBe('john smith');
  });

  it('strips roman numeral suffixes', () => {
    expect(normalizePlayerName('John Smith III')).toBe('john smith');
    expect(normalizePlayerName('John Smith II')).toBe('john smith');
  });

  it('strips punctuation', () => {
    expect(normalizePlayerName("O'Brien")).toBe('obrien');
    expect(normalizePlayerName('St. Brown')).toBe('st brown');
  });
});

describe('matchKey', () => {
  it('builds composite key from name and school', () => {
    expect(matchKey('John Smith Jr', 'Miss State')).toBe(
      'john smith|MISSISSIPPI STATE',
    );
  });

  it('produces same key regardless of formatting', () => {
    expect(matchKey("O'Brien", 'PITT')).toBe(matchKey('OBrien', 'Pittsburgh'));
  });
});

describe('parseProspectCsv', () => {
  it('parses a QB CSV', () => {
    const csv = [
      'Name,School,Height,Weight,40,Arm,Hand,Wing,epa_play,acomp_pct',
      'Shedeur Sanders,Colorado,6020,215,4.62,3238,938,7500,0.15,72.5%',
    ].join('\n');

    const result = parseProspectCsv(csv, 'QB');
    expect(result).toHaveLength(1);

    const player = result[0];
    expect(player.name).toBe('Shedeur Sanders');
    expect(player.school).toBe('Colorado');
    expect(player.position).toBe('QB');
    expect(player.height).toBe(74); // 6'2"
    expect(player.weight).toBe(215);
    expect(player.fortyYard).toBe(4.62);
    expect(player.armLength).toBe(32.375);
    expect(player.handSize).toBe(9.375);
    expect(player.wingSpan).toBe(75);
    expect(player.stats.epa_play).toBe(0.15);
    expect(player.stats.acomp_pct).toBe('72.5%');
  });

  it('skips blank lines', () => {
    const csv = 'Name,School,Height\n\nJohn,Alabama,6000\n\n';
    const result = parseProspectCsv(csv, 'CB');
    expect(result).toHaveLength(1);
  });

  it('returns empty array for unsupported positions', () => {
    expect(parseProspectCsv('Name\nFoo', 'K')).toEqual([]);
  });

  it('normalizes school names', () => {
    const csv = 'Name,School\nJohn,Miss State';
    const result = parseProspectCsv(csv, 'CB');
    expect(result[0].normalizedSchool).toBe('MISSISSIPPI STATE');
  });
});
