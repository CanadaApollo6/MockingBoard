import { GradientCard, GradientCardContent } from '../../ui/gradient-card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  TableHeader,
} from '../../ui/table';
import { CardTitle } from '../../ui/card';
import Link from 'next/link';
import type { OwnedPick } from '../team-breakdown';
import type { TeamAbbreviation } from '@mockingboard/shared';

interface OwnedDraftPicksProps {
  ownedPicks: OwnedPick[];
  colors: { primary: string; secondary: string };
  getTeamName: (abbr: TeamAbbreviation) => string;
}

export const OwnedDraftPicks = ({
  ownedPicks,
  colors,
  getTeamName,
}: OwnedDraftPicksProps) => {
  const totalValue = ownedPicks.reduce((sum, p) => sum + p.value, 0);
  return (
    <GradientCard from={colors.primary} to={colors.secondary}>
      <GradientCardContent>
        <CardTitle className="text-lg font-medium pb-3 pl-2">
          Picks Owned
        </CardTitle>
        <div className="overflow-x-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Pick</TableHead>
                <TableHead className="w-1/4">Overall</TableHead>
                <TableHead className="w-1/4">Value</TableHead>
                <TableHead className="w-1/4">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownedPicks.map((p) => (
                <TableRow key={p.overall}>
                  <TableCell className="font-mono text-muted-foreground">
                    {p.round}.{String(p.pick).padStart(2, '0')}
                  </TableCell>
                  <TableCell className="font-mono">{p.overall}</TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {p.value.toFixed(1)}
                  </TableCell>
                  <TableCell>
                    {p.isAcquired ? (
                      <span className="text-sm text-muted-foreground">
                        via{' '}
                        <Link
                          href={`/teams/${p.originalTeam}`}
                          className="hover:text-foreground hover:underline"
                        >
                          {getTeamName(p.originalTeam)}
                        </Link>
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Own pick
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {/* Subtotal */}
              <TableRow className="border-t-2 font-medium">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {totalValue.toFixed(1)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </GradientCardContent>
    </GradientCard>
  );
};
