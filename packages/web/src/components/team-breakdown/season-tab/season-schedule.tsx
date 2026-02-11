import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { TeamSchedule } from '@/lib/cache/external';

interface SeasonScheduleProps {
  schedule: TeamSchedule;
}

export const SeasonSchedule: React.FC<SeasonScheduleProps> = ({ schedule }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Game Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Wk</TableHead>
                <TableHead>Opponent</TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-20">Score</TableHead>
                <TableHead className="w-16">Record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.games.map((g) => (
                <TableRow key={`${g.weekLabel}-${g.opponent}`}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {g.weekLabel}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/teams/${g.opponent}`}
                      className="text-sm hover:underline"
                    >
                      {g.isHome ? 'vs' : '@'} {g.opponent}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block w-5 text-center text-xs font-bold ${
                        g.isTie
                          ? 'text-yellow-500'
                          : g.isWin
                            ? 'text-emerald-400'
                            : 'text-red-400'
                      }`}
                    >
                      {g.isTie ? 'T' : g.isWin ? 'W' : 'L'}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {g.teamScore}-{g.opponentScore}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {g.record}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
