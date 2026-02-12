import { parseFreeAgents } from './otc-parser';

const url = 'https://overthecap.com/calculator/atlanta-falcons';
const res = await fetch(url, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml',
  },
});
const html = await res.text();
const entries = parseFreeAgents(html);

console.log(`Parsed ${entries.length} free agents:\n`);
for (const fa of entries.slice(0, 5)) {
  console.log(
    `  ${fa.player} (${fa.faType}) — Age: ${fa.age}, Yrs: ${fa.years}, Franchise: $${fa.franchiseTender.toLocaleString()}, Transition: $${fa.transitionTender.toLocaleString()}`,
  );
}
if (entries.length > 5) console.log(`  ... and ${entries.length - 5} more`);
