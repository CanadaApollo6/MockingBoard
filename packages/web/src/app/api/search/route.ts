import { NextResponse } from 'next/server';
import { teams } from '@mockingboard/shared';
import {
  getCachedPlayers,
  getCachedScoutProfiles,
  getCachedSeasonConfig,
  getCachedPublicUsers,
  getCachedPublicBoards,
} from '@/lib/cache';

export interface SearchResult {
  id: string;
  type: 'player' | 'team' | 'user' | 'board' | 'scout';
  name: string;
  description: string;
  href: string;
}

function matches(text: string | undefined | null, query: string): boolean {
  return !!text && text.toLowerCase().includes(query);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('q')?.trim() ?? '';
  if (raw.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const q = raw.toLowerCase();
  const { draftYear } = await getCachedSeasonConfig();

  const [players, users, boards, scouts] = await Promise.all([
    getCachedPlayers(draftYear),
    getCachedPublicUsers(),
    getCachedPublicBoards(),
    getCachedScoutProfiles(),
  ]);

  const results: SearchResult[] = [];

  // Players — match name, school, scouting comparison
  let playerCount = 0;
  for (const p of players) {
    if (playerCount >= 5) break;
    if (
      matches(p.name, q) ||
      matches(p.school, q) ||
      matches(p.scouting?.comparison, q)
    ) {
      results.push({
        id: p.id,
        type: 'player',
        name: p.name,
        description: `${p.position} — ${p.school}`,
        href: `/players/${p.id}`,
      });
      playerCount++;
    }
  }

  // Teams — match name, city, mascot
  let teamCount = 0;
  for (const t of teams) {
    if (teamCount >= 3) break;
    if (matches(t.name, q) || matches(t.city, q) || matches(t.mascot, q)) {
      results.push({
        id: t.id,
        type: 'team',
        name: t.name,
        description: `${t.conference} ${t.division}`,
        href: `/teams/${t.id}`,
      });
      teamCount++;
    }
  }

  // Users — match displayName
  let userCount = 0;
  for (const u of users) {
    if (userCount >= 5) break;
    if (matches(u.displayName, q)) {
      const href = u.slug ? `/profile/${u.slug}` : `/profile/${u.id}`;
      results.push({
        id: u.id,
        type: 'user',
        name: u.displayName,
        description: u.bio ? u.bio.slice(0, 60) : 'User',
        href,
      });
      userCount++;
    }
  }

  // Boards — match name, authorName
  let boardCount = 0;
  for (const b of boards) {
    if (boardCount >= 5) break;
    if (matches(b.name, q) || matches(b.authorName, q)) {
      const href = b.slug ? `/boards/${b.slug}` : `/boards/${b.id}`;
      results.push({
        id: b.id,
        type: 'board',
        name: b.name,
        description: b.authorName ? `by ${b.authorName}` : 'Big Board',
        href,
      });
      boardCount++;
    }
  }

  // Scouts — match name
  let scoutCount = 0;
  for (const s of scouts) {
    if (scoutCount >= 3) break;
    if (matches(s.name, q)) {
      results.push({
        id: s.id,
        type: 'scout',
        name: s.name,
        description: s.bio ? s.bio.slice(0, 60) : 'Scout',
        href: `/scouts/${s.slug}`,
      });
      scoutCount++;
    }
  }

  return NextResponse.json({ results });
}
