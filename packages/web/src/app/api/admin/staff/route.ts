import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';
import { isAdmin } from '@/lib/admin';
import { resetTeamsCache } from '@/lib/cache';
import type {
  TeamAbbreviation,
  Coach,
  FrontOfficeStaff,
} from '@mockingboard/shared';
import { WIKI_TEAM_NAMES } from '@/lib/wiki-slugs';
import { parseWikiStaff } from '@/lib/wiki-staff-parser';

const WIKI_USER_AGENT =
  'MockingBoard/1.0 (https://mockingboard.com; contact@mockingboard.com)';

async function fetchWikiHtml(teamName: string): Promise<string> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/html/Template%3A${teamName}_staff`;
  const res = await fetch(url, {
    headers: { 'User-Agent': WIKI_USER_AGENT, Accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`Wikipedia returned ${res.status} for ${url}`);
  return res.text();
}

interface PreviewBody {
  action: 'preview';
  team: TeamAbbreviation;
}

interface CommitBody {
  action: 'commit';
  team: TeamAbbreviation;
  coachingStaff: Coach[];
  frontOffice: FrontOfficeStaff[];
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.uid))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: PreviewBody | CommitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { action, team } = body;
  if (!action || !team) {
    return NextResponse.json(
      { error: 'Missing required fields: action, team' },
      { status: 400 },
    );
  }

  const wikiName = WIKI_TEAM_NAMES[team];
  if (!wikiName) {
    return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
  }

  if (action === 'preview') {
    try {
      const html = await fetchWikiHtml(wikiName);
      const { coachingStaff, frontOffice } = parseWikiStaff(html);

      if (coachingStaff.length === 0 && frontOffice.length === 0) {
        return NextResponse.json(
          {
            error:
              'No staff data parsed from Wikipedia. The template may have changed structure.',
          },
          { status: 422 },
        );
      }

      return NextResponse.json({ coachingStaff, frontOffice });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch Wikipedia data';
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (action === 'commit') {
    const { coachingStaff, frontOffice } = body as CommitBody;
    if (!coachingStaff || !frontOffice) {
      return NextResponse.json(
        { error: 'Missing staff data to commit' },
        { status: 400 },
      );
    }

    await adminDb.collection('teams').doc(team).set(
      {
        coachingStaff,
        frontOffice,
        staffUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    resetTeamsCache();
    revalidatePath('/', 'layout');

    return NextResponse.json({
      coaches: coachingStaff.length,
      frontOffice: frontOffice.length,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
