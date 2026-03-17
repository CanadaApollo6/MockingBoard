import type { PlayerPickStats, TeamAbbreviation } from '@mockingboard/shared';
import { TEAM_COLORS } from '@/lib/colors/team-colors';

interface MockDraftStatsProps {
  stats: PlayerPickStats | null;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `#${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function getTopTeam(
  teamCounts: Record<string, number>,
): { team: TeamAbbreviation; count: number } | null {
  let topTeam: string | null = null;
  let topCount = 0;
  for (const [team, count] of Object.entries(teamCounts)) {
    if (count > topCount) {
      topTeam = team;
      topCount = count;
    }
  }
  if (!topTeam) return null;
  return { team: topTeam as TeamAbbreviation, count: topCount };
}

export function MockDraftStats({ stats }: MockDraftStatsProps) {
  if (!stats || stats.pickCount === 0) return null;

  const avgPick = Math.round(stats.sumOverall / stats.pickCount);
  const topTeam = getTopTeam(stats.teamCounts);
  const teamColor = topTeam ? TEAM_COLORS[topTeam.team]?.primary : undefined;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4 rounded-lg border bg-card p-4">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Mock Drafts
        </p>
        <p className="mt-1 font-mono text-2xl font-bold">
          {stats.pickCount.toLocaleString()}
        </p>
      </div>

      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Avg Pick
        </p>
        <p className="mt-1 font-mono text-2xl font-bold">{ordinal(avgPick)}</p>
      </div>

      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Range
        </p>
        <p className="mt-1 font-mono text-2xl font-bold">
          {stats.minOverall === stats.maxOverall
            ? ordinal(stats.minOverall)
            : `${ordinal(stats.minOverall)}–${ordinal(stats.maxOverall)}`}
        </p>
      </div>

      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Top Team
        </p>
        {topTeam ? (
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: teamColor }}
            />
            <span className="font-mono text-2xl font-bold">{topTeam.team}</span>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">—</p>
        )}
      </div>
    </div>
  );
}
