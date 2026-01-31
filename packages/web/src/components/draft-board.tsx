import type { Pick, Player, TeamAbbreviation } from '@mockingboard/shared';
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

interface DraftBoardProps {
  picks: Pick[];
  playerMap: Map<string, Player>;
  groupByRound?: boolean;
}

export function DraftBoard({
  picks,
  playerMap,
  groupByRound = true,
}: DraftBoardProps) {
  if (picks.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">No picks yet.</p>
    );
  }

  // Group picks by round
  const rounds = new Map<number, Pick[]>();
  for (const pick of picks) {
    const roundPicks = rounds.get(pick.round) ?? [];
    roundPicks.push(pick);
    rounds.set(pick.round, roundPicks);
  }

  return (
    <div className="space-y-6">
      {Array.from(rounds.entries()).map(([round, roundPicks]) => (
        <div key={round}>
          {groupByRound && rounds.size > 1 && (
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Round {round}
            </h3>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="w-16">Pos</TableHead>
                  <TableHead className="hidden sm:table-cell">School</TableHead>
                  <TableHead className="w-16 text-right">Rank</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roundPicks.map((pick) => (
                  <PickRow
                    key={pick.overall}
                    pick={pick}
                    player={playerMap.get(pick.playerId)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

function PickRow({ pick, player }: { pick: Pick; player: Player | undefined }) {
  const isCpu = pick.userId === null;

  return (
    <TableRow>
      <TableCell className="font-mono text-muted-foreground">
        {pick.overall}
      </TableCell>
      <TableCell className="font-medium">
        {getTeamName(pick.team as TeamAbbreviation)}
      </TableCell>
      <TableCell>
        <span className="font-medium">{player?.name ?? pick.playerId}</span>
        {isCpu && (
          <Badge variant="outline" className="ml-2 text-xs">
            CPU
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{player?.position ?? '—'}</Badge>
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {player?.school ?? '—'}
      </TableCell>
      <TableCell className="text-right font-mono text-muted-foreground">
        {player?.consensusRank ?? '—'}
      </TableCell>
    </TableRow>
  );
}
