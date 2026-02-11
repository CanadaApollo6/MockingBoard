import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import Link from 'next/link';
import { TeamSeed } from '../../../../../shared/src/data';
import { TeamCapitalRank } from '../team-breakdown';
import { TEAM_COLORS } from '@/lib/team-colors';

interface CapitalRankingProps {
  capitalRanking: TeamCapitalRank[];
  team: TeamSeed;
  maxValue: number;
}

export const CapitalRanking: React.FC<CapitalRankingProps> = ({
  capitalRanking,
  team,
  maxValue,
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Draft Capital Ranking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {capitalRanking.map((entry, i) => {
            const isCurrentTeam = entry.team === team.id;
            const entryColors = TEAM_COLORS[entry.team];
            const barWidth = (entry.totalValue / maxValue) * 100;

            return (
              <Link
                key={entry.team}
                href={`/teams/${entry.team}`}
                className="group flex items-center gap-2 text-sm"
              >
                <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <span
                  className={`w-24 shrink-0 truncate text-xs ${isCurrentTeam ? 'font-bold text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}
                >
                  {entry.team}
                </span>
                <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: entryColors.primary,
                      opacity: isCurrentTeam ? 1 : 0.5,
                    }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {entry.totalValue.toFixed(0)}
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
