import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  TableHeader,
} from '../../ui/table';
import { Badge } from '../../ui/badge';
import { getPositionColor } from '@/lib/position-colors';
import type { TeamRoster, RosterPlayer } from '@/lib/cache';

const COL_COUNT = 9;

const GROUPS: { label: string; key: keyof TeamRoster }[] = [
  { label: 'Offense', key: 'offense' },
  { label: 'Defense', key: 'defense' },
  { label: 'Special Teams', key: 'specialTeams' },
];

interface TeamRosterProps {
  roster: TeamRoster;
}

export const TeamRosterTable = ({ roster }: TeamRosterProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Full Roster</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-16">Pos</TableHead>
                <TableHead className="w-16">Status</TableHead>
                <TableHead className="w-16">Ht</TableHead>
                <TableHead className="w-16">Wt</TableHead>
                <TableHead className="w-12">Age</TableHead>
                <TableHead className="w-12">Exp</TableHead>
                <TableHead>College</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {GROUPS.map(({ label, key }) => {
                const players = roster[key];
                if (players.length === 0) return null;
                return [
                  <TableRow
                    key={`group-${key}`}
                    className="hover:bg-transparent"
                  >
                    <TableCell
                      colSpan={COL_COUNT}
                      className="pt-6 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {label}
                    </TableCell>
                  </TableRow>,
                  ...players.map((p: RosterPlayer) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {p.jersey}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/players/${p.id}`}
                          className="text-mb-accent hover:underline"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            backgroundColor: getPositionColor(p.position),
                            color: '#0A0A0B',
                          }}
                          className="px-1.5 py-0 text-xs"
                        >
                          {p.position}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`whitespace-nowrap px-1.5 py-0 text-xs ${
                            p.status === 'Active'
                              ? 'text-mb-accent'
                              : 'text-red-400'
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.height}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.weight}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {p.age}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {p.experience === 0 ? 'R' : p.experience}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.college}
                      </TableCell>
                    </TableRow>
                  )),
                ];
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
