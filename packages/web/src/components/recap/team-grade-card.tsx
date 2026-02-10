import type { TeamDraftGrade, Player } from '@mockingboard/shared';
import { barColor, gradeColor, tierColor } from '@/lib/grade-color';
import { getTeamColor } from '@/lib/team-colors';
import { getTeamName } from '@/lib/teams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DIMENSION_LABELS: {
  key: keyof TeamDraftGrade['scores'];
  label: string;
}[] = [
  { key: 'positionalValue', label: 'Positional' },
  { key: 'surplusValue', label: 'Surplus' },
  { key: 'needs', label: 'Needs' },
  { key: 'bpaAdherence', label: 'BPA' },
];

export function TeamGradeCard({
  grade,
  players,
}: {
  grade: TeamDraftGrade;
  players: Record<string, Player>;
}) {
  const teamColors = getTeamColor(grade.team);
  const teamName = getTeamName(grade.team);

  return (
    <Card style={{ borderLeftColor: teamColors.primary, borderLeftWidth: 4 }}>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{teamName}</span>
          <span className={`text-2xl font-bold ${tierColor(grade.tier)}`}>
            {grade.overallGrade}
          </span>
        </CardTitle>
        <p className={`text-sm font-semibold ${tierColor(grade.tier)}`}>
          {grade.tier}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {DIMENSION_LABELS.map(({ key, label }) => (
            <DimensionBar key={key} label={label} value={grade.scores[key]} />
          ))}
        </div>

        {grade.tradeNetValue !== 0 && (
          <div className="text-xs text-muted-foreground">
            Trade value:{' '}
            <span
              className={
                grade.tradeNetValue > 0 ? 'text-mb-success' : 'text-mb-danger'
              }
            >
              {grade.tradeNetValue > 0 ? '+' : ''}
              {Math.round(grade.tradeNetValue)}
            </span>
          </div>
        )}

        <div className="space-y-0.5 pt-2 text-xs">
          {grade.picks.map((pick) => {
            const player = players[pick.playerId];
            const delta = pick.valueDelta;
            const nameColor =
              delta >= 5
                ? 'text-mb-success'
                : delta <= -5
                  ? 'text-mb-danger'
                  : '';
            const deltaColor =
              delta > 0
                ? 'text-mb-success'
                : delta < 0
                  ? 'text-mb-danger'
                  : 'text-muted-foreground';
            return (
              <div key={pick.overall} className="flex items-center gap-2">
                <span className="w-8 text-right text-muted-foreground">
                  #{pick.overall}
                </span>
                <span className={`flex-1 truncate ${nameColor}`}>
                  {player?.name ?? pick.playerId}
                  <span className={`ml-1 font-mono text-[10px] ${deltaColor}`}>
                    ({delta > 0 ? '+' : ''}
                    {delta})
                  </span>
                </span>
                <span className="w-10 text-muted-foreground">
                  {pick.position}
                </span>
                <span
                  className={`w-6 text-right font-medium ${gradeColor(pick.pickScore)}`}
                >
                  {pick.pickScore}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${barColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-6 text-right font-medium">{value}</span>
    </div>
  );
}
