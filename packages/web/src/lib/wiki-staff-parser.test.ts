import { describe, it, expect } from 'vitest';
import { parseWikiStaff } from './wiki-staff-parser.js';

/**
 * Build a minimal Wikipedia staff template HTML structure.
 * Real structure: <dl><dt>Header</dt></dl><ul><li>entries...</li></ul>
 * The <ul> is a sibling of the <dl>, not nested inside it.
 */
function wikiStaffHtml(sections: { header: string; entries: string[] }[]) {
  const html = sections
    .map(
      (s) =>
        `<dl><dt>${s.header}</dt></dl><ul>${s.entries.map((e) => `<li>${e}</li>`).join('')}</ul>`,
    )
    .join('');
  return `<html><body>${html}</body></html>`;
}

describe('parseWikiStaff', () => {
  it('parses front office entries', () => {
    const html = wikiStaffHtml([
      {
        header: 'Front office',
        entries: [
          'Owner – <a>Terry Pegula</a>',
          'General Manager – <a>Brandon Beane</a>',
        ],
      },
    ]);
    const { frontOffice, coachingStaff } = parseWikiStaff(html);
    expect(frontOffice).toHaveLength(2);
    expect(frontOffice[0]).toEqual({ name: 'Terry Pegula', title: 'Owner' });
    expect(frontOffice[1]).toEqual({
      name: 'Brandon Beane',
      title: 'General Manager',
    });
    expect(coachingStaff).toHaveLength(0);
  });

  it('parses head coach and coordinators', () => {
    const html = wikiStaffHtml([
      {
        header: 'Head coach(es)',
        entries: ['Head Coach – <a>Joe Brady</a>'],
      },
      {
        header: 'Offensive coaches',
        entries: [
          'Offensive Coordinator – <a>Pete Carmichael Jr.</a>',
          'Quarterbacks Coach – <a>Joe Lombardi</a>',
        ],
      },
      {
        header: 'Defensive coaches',
        entries: ['Defensive Coordinator – <a>Jim Leonhard</a>'],
      },
    ]);
    const { coachingStaff, frontOffice } = parseWikiStaff(html);
    expect(frontOffice).toHaveLength(0);
    expect(coachingStaff).toHaveLength(4);
    expect(coachingStaff[0]).toEqual({ name: 'Joe Brady', role: 'Head Coach' });
    expect(coachingStaff[1]).toEqual({
      name: 'Pete Carmichael Jr.',
      role: 'Offensive Coordinator',
    });
    expect(coachingStaff[2]).toEqual({
      name: 'Joe Lombardi',
      role: 'Quarterbacks Coach',
    });
    expect(coachingStaff[3]).toEqual({
      name: 'Jim Leonhard',
      role: 'Defensive Coordinator',
    });
  });

  it('skips vacant entries', () => {
    const html = wikiStaffHtml([
      {
        header: 'Offensive coaches',
        entries: [
          'Offensive Coordinator – <a>John Smith</a>',
          'Quarterbacks Coach – <i>Vacant</i>',
        ],
      },
    ]);
    const { coachingStaff } = parseWikiStaff(html);
    expect(coachingStaff).toHaveLength(1);
    expect(coachingStaff[0].name).toBe('John Smith');
  });

  it('parses special teams coaches', () => {
    const html = wikiStaffHtml([
      {
        header: 'Special teams coaches',
        entries: ['Special Teams Coordinator – <a>Bobby April</a>'],
      },
    ]);
    const { coachingStaff } = parseWikiStaff(html);
    expect(coachingStaff).toHaveLength(1);
    expect(coachingStaff[0]).toEqual({
      name: 'Bobby April',
      role: 'Special Teams Coordinator',
    });
  });

  it('handles strength and conditioning section', () => {
    const html = wikiStaffHtml([
      {
        header: 'Strength and conditioning',
        entries: ['Head Strength Coach – <a>Eric Sugarman</a>'],
      },
    ]);
    const { coachingStaff } = parseWikiStaff(html);
    expect(coachingStaff).toHaveLength(1);
    expect(coachingStaff[0]).toEqual({
      name: 'Eric Sugarman',
      role: 'Head Strength Coach',
    });
  });

  it('handles entries with plain text names (no <a> tags)', () => {
    const html = wikiStaffHtml([
      {
        header: 'Offensive coaches',
        entries: ['Running Backs Coach – Mike Smith'],
      },
    ]);
    const { coachingStaff } = parseWikiStaff(html);
    expect(coachingStaff).toHaveLength(1);
    expect(coachingStaff[0]).toEqual({
      name: 'Mike Smith',
      role: 'Running Backs Coach',
    });
  });

  it('strips bracket annotations from names', () => {
    const html = wikiStaffHtml([
      {
        header: 'Offensive coaches',
        entries: ['Quarterbacks Coach – <a>John Doe</a>[1]'],
      },
    ]);
    const { coachingStaff } = parseWikiStaff(html);
    expect(coachingStaff[0].name).toBe('John Doe');
  });

  it('handles both front office and coaching in same HTML', () => {
    const html = wikiStaffHtml([
      {
        header: 'Front office',
        entries: ['General Manager – <a>Howie Roseman</a>'],
      },
      {
        header: 'Head coach(es)',
        entries: ['Head Coach – <a>Nick Sirianni</a>'],
      },
      {
        header: 'Offensive coaches',
        entries: ['Offensive Coordinator – <a>Kellen Moore</a>'],
      },
    ]);
    const { frontOffice, coachingStaff } = parseWikiStaff(html);
    expect(frontOffice).toHaveLength(1);
    expect(frontOffice[0].name).toBe('Howie Roseman');
    expect(coachingStaff).toHaveLength(2);
    expect(coachingStaff[0].name).toBe('Nick Sirianni');
    expect(coachingStaff[1].name).toBe('Kellen Moore');
  });

  it('returns empty arrays for empty HTML', () => {
    const { coachingStaff, frontOffice } = parseWikiStaff('<html></html>');
    expect(coachingStaff).toHaveLength(0);
    expect(frontOffice).toHaveLength(0);
  });

  it('title-cases roles and preserves acronyms', () => {
    const html = wikiStaffHtml([
      {
        header: 'Front office',
        entries: [
          'Owner/CEO/president – <a>John Smith</a>',
          'Senior advisor to the GM/football operations – <a>Jane Doe</a>',
          'Co-director of pro scouting – <a>Bob Jones</a>',
        ],
      },
    ]);
    const { frontOffice } = parseWikiStaff(html);
    expect(frontOffice).toHaveLength(3);
    expect(frontOffice[0].title).toBe('Owner/CEO/President');
    expect(frontOffice[1].title).toBe(
      'Senior Advisor to the GM/Football Operations',
    );
    expect(frontOffice[2].title).toBe('Co-Director of Pro Scouting');
  });

  it('handles entries with em-dash separator', () => {
    const html = wikiStaffHtml([
      {
        header: 'Offensive coaches',
        entries: ['Wide Receivers Coach — <a>Drew Terrell</a>'],
      },
    ]);
    const { coachingStaff } = parseWikiStaff(html);
    expect(coachingStaff).toHaveLength(1);
    expect(coachingStaff[0]).toEqual({
      name: 'Drew Terrell',
      role: 'Wide Receivers Coach',
    });
  });
});
