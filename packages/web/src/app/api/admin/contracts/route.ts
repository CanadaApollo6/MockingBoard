import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';
import { isAdmin } from '@/lib/admin';
import { resetContractsCache } from '@/lib/cache';
import type { TeamAbbreviation, TeamContractData } from '@mockingboard/shared';
import { OTC_TEAM_SLUGS } from '@/lib/otc-slugs';
import {
  parseRosterContracts,
  parseDeadCap,
  parseFreeAgents,
  parseLeagueCapSpace,
} from '@/lib/otc-parser';

/** Official NFLPA unadjusted salary cap — same for all 32 teams. */
const SALARY_CAP_2025 = 279_200_000;

async function fetchOtcHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`OTC returned ${res.status} for ${url}`);
  return res.text();
}

interface PreviewBody {
  action: 'preview';
  team: TeamAbbreviation;
  year: number;
}

interface CommitBody {
  action: 'commit';
  team: TeamAbbreviation;
  year: number;
  data: TeamContractData;
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

  const { action, team, year } = body;
  if (!action || !team || !year) {
    return NextResponse.json(
      { error: 'Missing required fields: action, team, year' },
      { status: 400 },
    );
  }

  const slug = OTC_TEAM_SLUGS[team];
  if (!slug) {
    return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
  }

  if (action === 'preview') {
    try {
      const [salaryHtml, calculatorHtml, capSpaceHtml] = await Promise.all([
        fetchOtcHtml(`https://overthecap.com/salary-cap/${slug}`),
        fetchOtcHtml(`https://overthecap.com/calculator/${slug}`),
        fetchOtcHtml('https://overthecap.com/salary-cap-space'),
      ]);

      const roster = parseRosterContracts(salaryHtml);
      const deadCap = parseDeadCap(salaryHtml);
      const freeAgents = parseFreeAgents(calculatorHtml);
      const leagueData = parseLeagueCapSpace(capSpaceHtml);

      if (roster.length === 0 && freeAgents.length === 0) {
        return NextResponse.json(
          {
            error:
              'No data parsed from OTC. The page may have changed structure or blocked the request.',
          },
          { status: 422 },
        );
      }

      const teamOverview = leagueData.find((t) => t.team === team);
      const capSpace = teamOverview?.capSpace ?? 0;
      const activeCapSpending = teamOverview?.activeCapSpending ?? 0;
      const deadMoneyTotal = teamOverview?.deadMoney ?? 0;

      const data: TeamContractData = {
        year,
        capSpace,
        effectiveCapSpace: teamOverview?.effectiveCapSpace ?? 0,
        playerCount: teamOverview?.playerCount ?? roster.length,
        activeCapSpending,
        deadMoneyTotal,
        salaryCap: SALARY_CAP_2025,
        roster,
        freeAgents,
        deadCap,
      };

      return NextResponse.json({ data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch OTC data';
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (action === 'commit') {
    const { data } = body as CommitBody;
    if (!data) {
      return NextResponse.json(
        { error: 'Missing data to commit' },
        { status: 400 },
      );
    }

    await adminDb
      .collection('teamContracts')
      .doc(team)
      .set(
        { ...data, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );

    resetContractsCache();
    revalidatePath('/', 'layout');

    return NextResponse.json({
      roster: data.roster.length,
      freeAgents: data.freeAgents.length,
      deadCap: data.deadCap.length,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
