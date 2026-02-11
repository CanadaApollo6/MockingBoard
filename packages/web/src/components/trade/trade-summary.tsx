import type { Trade, TradePiece, TeamAbbreviation } from '@mockingboard/shared';
import { getTeamName } from '@/lib/teams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatPiece(piece: TradePiece): string {
  if (piece.type === 'current-pick') {
    return `Pick #${piece.overall}`;
  }
  return `${piece.year} Round ${piece.round} (${getTeamName(piece.originalTeam as TeamAbbreviation)})`;
}

export function TradeSummary({ trade }: { trade: Trade }) {
  const proposerTeam = getTeamName(trade.proposerTeam);
  const recipientTeam = getTeamName(trade.recipientTeam);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {proposerTeam} ↔ {recipientTeam}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="mb-1 font-medium text-muted-foreground">
              {proposerTeam} sends
            </p>
            <ul className="space-y-0.5">
              {trade.proposerGives.map((p, i) => (
                <li key={i}>{formatPiece(p)}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-medium text-muted-foreground">
              {recipientTeam} sends
            </p>
            <ul className="space-y-0.5">
              {trade.proposerReceives.map((p, i) => (
                <li key={i}>{formatPiece(p)}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
