import { GradientCard, GradientCardContent } from '../../ui/gradient-card';
import { CardTitle } from '../../ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../ui/table';
import type {
  FuturePickSeed,
  TeamAbbreviation,
  TeamSeed,
} from '@mockingboard/shared';

interface FuturePicksProps {
  futurePicks: FuturePickSeed[];
  colors: { primary: string; secondary: string };
  team: TeamSeed;
  getTeamName: (team: TeamAbbreviation) => string;
}

export const FuturePicks = ({
  futurePicks,
  colors,
  team,
  getTeamName,
}: FuturePicksProps) => {
  return (
    <GradientCard from={colors.primary} to={colors.secondary}>
      <GradientCardContent>
        <CardTitle className="text-lg font-medium pb-3 pl-2">
          Future Picks
        </CardTitle>
        <div className="overflow-x-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Year</TableHead>
                <TableHead className="w-1/3">Round</TableHead>
                <TableHead className="w-1/3 pl-6">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {futurePicks
                .sort((a, b) => a.year - b.year || a.round - b.round)
                .map((fp, i) => (
                  <TableRow
                    key={`${fp.year}-${fp.round}-${fp.originalTeam}-${i}`}
                  >
                    <TableCell className="font-mono">{fp.year}</TableCell>
                    <TableCell className="font-mono">Rd {fp.round}</TableCell>
                    <TableCell className="pl-6 text-sm text-muted-foreground">
                      {fp.originalTeam === team.id
                        ? 'Own pick'
                        : `via ${getTeamName(fp.originalTeam)}`}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </GradientCardContent>
    </GradientCard>
  );
};
