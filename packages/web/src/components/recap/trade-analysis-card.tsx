import type { TradeAnalysis } from '@mockingboard/shared';
import { getTeamName } from '@/lib/teams';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TradeAnalysisCard({ trade }: { trade: TradeAnalysis }) {
  const proposer = getTeamName(trade.proposerTeam);
  const recipient = getTeamName(trade.recipientTeam);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span>
            {proposer} ↔ {recipient}
          </span>
          <Badge
            variant={trade.winner === 'even' ? 'secondary' : 'outline'}
            className="text-[10px]"
          >
            {trade.winner === 'even'
              ? 'Even'
              : `${getTeamName(trade.winner)} wins`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <TradeValue team={proposer} netValue={trade.proposerNetValue} />
          <TradeValue team={recipient} netValue={trade.recipientNetValue} />
        </div>
      </CardContent>
    </Card>
  );
}

function TradeValue({ team, netValue }: { team: string; netValue: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{team}</p>
      <p
        className={`font-medium ${
          netValue > 0
            ? 'text-mb-success'
            : netValue < 0
              ? 'text-mb-danger'
              : 'text-muted-foreground'
        }`}
      >
        {netValue > 0 ? '+' : ''}
        {netValue} pts
      </p>
    </div>
  );
}
