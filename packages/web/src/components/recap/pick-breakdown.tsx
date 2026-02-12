import type { DraftRecap, Player } from '@mockingboard/shared';
import { gradeColor } from '@/lib/colors/grade-color';
import { getTeamColor } from '@/lib/colors/team-colors';
import { getTeamName } from '@/lib/teams';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function labelBadgeVariant(
  label: string,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (label === 'great-value' || label === 'good-value') return 'default';
  if (label === 'big-reach' || label === 'reach') return 'destructive';
  if (label === 'slight-reach') return 'outline';
  return 'secondary';
}

function labelDisplay(label: string): string {
  switch (label) {
    case 'great-value':
      return 'Steal';
    case 'good-value':
      return 'Value';
    case 'fair':
      return 'Fair';
    case 'slight-reach':
      return 'Slight Reach';
    case 'reach':
      return 'Reach';
    case 'big-reach':
      return 'Big Reach';
    default:
      return label;
  }
}

export function PickBreakdown({
  recap,
  players,
  hasBoardDelta,
  cpuTeams,
}: {
  recap: DraftRecap;
  players: Record<string, Player>;
  hasBoardDelta: boolean;
  cpuTeams: Set<string>;
}) {
  // Flatten all picks from all teams, sorted by overall
  const allPicks = recap.teamGrades
    .flatMap((tg) => tg.picks.map((p) => ({ ...p, team: tg.team })))
    .sort((a, b) => a.overall - b.overall);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="w-12">Pos</TableHead>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead className="w-12">Grade</TableHead>
            <TableHead className="w-20">Label</TableHead>
            <TableHead className="w-12">+/-</TableHead>
            {hasBoardDelta && <TableHead className="w-14">Board</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {allPicks.map((pick) => {
            const player = players[pick.playerId];
            const teamColors = getTeamColor(pick.team);
            const isCpu = cpuTeams.has(pick.team);
            return (
              <TableRow
                key={pick.overall}
                className={isCpu ? 'opacity-60' : undefined}
              >
                <TableCell
                  className="font-medium"
                  style={{
                    borderLeft: `3px solid ${teamColors.primary}`,
                  }}
                >
                  {pick.overall}
                </TableCell>
                <TableCell className="text-xs">
                  {getTeamName(pick.team)}
                </TableCell>
                <TableCell>
                  {player?.name ?? pick.playerId}
                  {isCpu && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      CPU
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {pick.position}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {pick.consensusRank}
                </TableCell>
                <TableCell>
                  <span
                    className={`font-semibold ${gradeColor(pick.pickScore)}`}
                  >
                    {pick.pickScore}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={labelBadgeVariant(pick.label)}
                    className="text-[10px]"
                  >
                    {labelDisplay(pick.label)}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`text-xs font-medium ${
                    pick.valueDelta > 0
                      ? 'text-mb-success'
                      : pick.valueDelta < 0
                        ? 'text-mb-danger'
                        : 'text-muted-foreground'
                  }`}
                >
                  {pick.valueDelta > 0 ? '+' : ''}
                  {pick.valueDelta}
                </TableCell>
                {hasBoardDelta && (
                  <TableCell className="text-xs text-muted-foreground">
                    {pick.boardDelta != null
                      ? `${pick.boardDelta > 0 ? '+' : ''}${pick.boardDelta}`
                      : '—'}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
