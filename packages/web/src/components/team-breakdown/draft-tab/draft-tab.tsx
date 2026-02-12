import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { getPositionColor } from '@/lib/colors/position-colors';
import { OwnedDraftPicks } from './owned-draft-picks';
import { FuturePicks } from './future-picks';
import { getTeamName } from '@/lib/teams';
import type { TeamSeed, Position, FuturePickSeed } from '@mockingboard/shared';
import { OwnedPick, TeamCapitalRank, TradedAwayPick } from '../team-breakdown';
import { CapitalRanking } from './capital-ranking';
import { TradedAwayPicks } from './traded-away-picks';

interface DraftTabProps {
  team: TeamSeed;
  year: number;
  totalValue: number;
  maxValue: number;
  ownedPicks: OwnedPick[];
  tradedAway: TradedAwayPick[];
  futurePicks: FuturePickSeed[];
  capitalRanking: TeamCapitalRank[];
  colors: {
    primary: string;
    secondary: string;
  };
}

export const DraftTab = ({
  team,
  year,
  ownedPicks,
  futurePicks,
  totalValue,
  maxValue,
  tradedAway,
  capitalRanking,
  colors,
}: DraftTabProps) => {
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Positional Needs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {team.needs.map((pos: Position) => (
                <Badge
                  key={pos}
                  style={{
                    backgroundColor: getPositionColor(pos),
                    color: '#0A0A0B',
                  }}
                  className="px-2 py-0.5 text-xs"
                >
                  {pos}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {year} Draft Capital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <p className="font-mono text-2xl font-bold">
                  {ownedPicks.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pick{ownedPicks.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold">
                  {totalValue.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
              {tradedAway.length > 0 && (
                <div>
                  <p className="font-mono text-2xl font-bold text-destructive">
                    {tradedAway.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Traded Away</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <OwnedDraftPicks
        ownedPicks={ownedPicks}
        colors={colors}
        getTeamName={getTeamName}
      />

      {tradedAway.length > 0 && <TradedAwayPicks tradedAway={tradedAway} />}

      <CapitalRanking
        capitalRanking={capitalRanking}
        team={team}
        maxValue={maxValue}
      />

      {futurePicks.length > 0 && (
        <FuturePicks
          futurePicks={futurePicks}
          colors={colors}
          team={team}
          getTeamName={getTeamName}
        />
      )}
    </>
  );
};
