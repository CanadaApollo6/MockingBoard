import type { TeamDraftGrade, Player } from '@mockingboard/shared';
import { gradeColor } from '@/components/grade-slider';
import { getTeamColor } from '@/lib/team-colors';
import { getTeamName } from '@/lib/teams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DIMENSION_LABELS: {
  key: keyof TeamDraftGrade['scores'];
  label: string;
}[] = [
  { key: 'value', label: 'Value' },
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
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{teamName}</span>
          <span
            className={`text-2xl font-bold ${gradeColor(grade.overallGrade)}`}
          >
            {grade.overallGrade}
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{grade.tier}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {DIMENSION_LABELS.map(({ key, label }) => (
            <DimensionBar key={key} label={label} value={grade.scores[key]} />
          ))}
        </div>

        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            Needs: {grade.needsFilled}/{grade.totalNeeds}
          </span>
          {grade.tradeNetValue !== 0 && (
            <span>
              Trade value:{' '}
              <span
                className={
                  grade.tradeNetValue > 0 ? 'text-mb-success' : 'text-mb-danger'
                }
              >
                {grade.tradeNetValue > 0 ? '+' : ''}
                {Math.round(grade.tradeNetValue)}
              </span>
            </span>
          )}
        </div>

        {grade.highlights.length > 0 && (
          <ul className="space-y-0.5 text-xs">
            {grade.highlights.map((h, i) => (
              <li key={i} className="text-muted-foreground">
                {h}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-0.5 text-xs">
          {grade.picks.map((pick) => {
            const player = players[pick.playerId];
            return (
              <div key={pick.overall} className="flex items-center gap-2">
                <span className="w-8 text-right text-muted-foreground">
                  #{pick.overall}
                </span>
                <span className="flex-1 truncate">
                  {player?.name ?? pick.playerId}
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
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${barColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-6 text-right font-medium">{value}</span>
    </div>
  );
}

function barColor(value: number): string {
  if (value >= 80) return 'bg-mb-success';
  if (value >= 60) return 'bg-mb-accent';
  if (value >= 40) return 'bg-yellow-500';
  return 'bg-mb-danger';
}
