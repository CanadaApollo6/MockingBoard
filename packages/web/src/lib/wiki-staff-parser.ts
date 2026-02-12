import * as cheerio from 'cheerio';
import type { Coach, FrontOfficeStaff } from '@mockingboard/shared';

const FRONT_OFFICE_HEADERS = ['front office'];
const SKIP_SECTIONS = ['notes', 'references', 'external links'];
const LOWERCASE_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'so',
  'the',
  'to',
  'up',
  'yet',
]);

const ACRONYMS = new Set([
  'ceo',
  'cfo',
  'coo',
  'gm',
  'vp',
  'nfl',
  'ii',
  'iii',
  'iv',
]);

/** Title-case a single word, preserving acronyms. */
function capWord(word: string): string {
  if (word.length === 0) return word;
  if (ACRONYMS.has(word.toLowerCase())) return word.toUpperCase();
  // Handle hyphenated words like "Co-director" → "Co-Director"
  if (word.includes('-')) {
    return word
      .split('-')
      .map((p) => capWord(p))
      .join('-');
  }
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

/** Title-case a role/title string, keeping articles and prepositions lowercase. */
function titleCase(str: string): string {
  return str
    .split(/\s+/)
    .map((word, i) => {
      if (word.length === 0) return word;
      if (word === '&') return '&';
      // Always capitalize first word; keep lowercase words lowercase otherwise
      if (i > 0 && LOWERCASE_WORDS.has(word.toLowerCase())) {
        return word.toLowerCase();
      }
      // Handle slash-separated roles like "Owner/CEO/president"
      if (word.includes('/')) {
        return word
          .split('/')
          .map((p) => capWord(p))
          .join('/');
      }
      return capWord(word);
    })
    .join(' ');
}

/**
 * Parse a Wikipedia team staff template HTML into coaching staff and front office arrays.
 *
 * Wikipedia staff templates use this structure:
 * - `<dl><dt>Section header</dt></dl>` followed by `<ul><li>` entries as siblings
 * - Each `<li>`: "Role – Name" (en-dash separator)
 *
 * The `<ul>` is a sibling of the parent `<dl>`, not of the `<dt>` itself.
 */
export function parseWikiStaff(html: string): {
  coachingStaff: Coach[];
  frontOffice: FrontOfficeStaff[];
} {
  const $ = cheerio.load(html);
  const coachingStaff: Coach[] = [];
  const frontOffice: FrontOfficeStaff[] = [];

  $('dt').each((_, dt) => {
    const header = $(dt).text().trim().toLowerCase();
    if (SKIP_SECTIONS.some((s) => header.includes(s))) return;

    const isFrontOffice = FRONT_OFFICE_HEADERS.some((fo) =>
      header.includes(fo),
    );

    // The <dt> is inside a <dl>. The <ul> with entries is a sibling of that <dl>.
    const parentDl = $(dt).closest('dl');
    const target = parentDl.length ? parentDl : $(dt);

    // Walk siblings after the <dl> until the next <dl> (next section header)
    let sibling = target.next();
    while (sibling.length) {
      const tag = sibling.prop('tagName')?.toLowerCase();
      if (tag === 'dl') break; // next section
      if (tag === 'ul') {
        sibling.children('li').each((_, li) => {
          parseLiEntry($, li, isFrontOffice, coachingStaff, frontOffice);
        });
      }
      sibling = sibling.next();
    }
  });

  return {
    coachingStaff: dedup(coachingStaff, (c) => `${c.role}|${c.name}`),
    frontOffice: dedup(frontOffice, (f) => `${f.title}|${f.name}`),
  };
}

function parseLiEntry(
  $: ReturnType<typeof cheerio.load>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  li: any,
  isFrontOffice: boolean,
  coachingStaff: Coach[],
  frontOffice: FrontOfficeStaff[],
) {
  const text = $(li).text().trim();
  if (!text) return;

  // Skip vacant entries
  if (/vacant/i.test(text)) return;

  // Split on en-dash (–), em-dash (—), or hyphen surrounded by spaces ( - )
  const parts = text.split(/\s*[–—]\s*|\s+-\s+/);
  if (parts.length < 2) return;

  const role = parts[0].trim();
  // Name may have extra annotations in parentheses — strip them
  const name = parts
    .slice(1)
    .join(' – ')
    .replace(/\[.*?\]/g, '')
    .trim();
  if (!role || !name) return;

  if (isFrontOffice) {
    frontOffice.push({ name, title: titleCase(role) });
  } else {
    coachingStaff.push({ name, role: titleCase(role) });
  }
}

function dedup<T>(arr: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
