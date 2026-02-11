import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  TableHeader,
} from '@/components/ui/table';
import Link from 'next/link';
import { getTeamName } from '@/lib/teams';
import type { TradedAwayPick } from '../team-breakdown';

interface TradedAwayPicksProps {
  tradedAway: TradedAwayPick[];
}

export const TradedAwayPicks: React.FC<TradedAwayPicksProps> = ({
  tradedAway,
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Picks Traded Away ({tradedAway.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Pick</TableHead>
                <TableHead className="w-1/4">Overall</TableHead>
                <TableHead className="w-1/4">Value</TableHead>
                <TableHead className="w-1/4">Traded To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tradedAway.map((p) => (
                <TableRow
                  key={p.overall}
                  className="text-muted-foreground line-through"
                >
                  <TableCell className="font-mono">
                    {p.round}.{String(p.pick).padStart(2, '0')}
                  </TableCell>
                  <TableCell className="font-mono">{p.overall}</TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {p.value.toFixed(1)}
                  </TableCell>
                  <TableCell className="no-underline">
                    <Link
                      href={`/teams/${p.tradedTo}`}
                      className="text-sm text-foreground no-underline hover:underline"
                    >
                      {getTeamName(p.tradedTo)}
                    </Link>
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
