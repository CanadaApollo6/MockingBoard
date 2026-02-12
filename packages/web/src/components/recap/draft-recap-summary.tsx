import type { DraftRecap, PickLabel } from '@mockingboard/shared';
import { getGradeTier } from '@mockingboard/shared';
import { gradeColor } from '@/lib/colors/grade-color';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function countLabels(recap: DraftRecap): Record<PickLabel, number> {
  const counts: Record<string, number> = {};
  for (const team of recap.teamGrades) {
    for (const pick of team.picks) {
      counts[pick.label] = (counts[pick.label] ?? 0) + 1;
    }
  }
  return counts as Record<PickLabel, number>;
}

export function DraftRecapSummary({ recap }: { recap: DraftRecap }) {
  const tier = getGradeTier(recap.overallClassGrade);
  const labels = countLabels(recap);
  const steals = (labels['great-value'] ?? 0) + (labels['good-value'] ?? 0);
  const reaches = (labels['big-reach'] ?? 0) + (labels['reach'] ?? 0);
  const totalPicks = recap.teamGrades.reduce(
    (sum, t) => sum + t.picks.length,
    0,
  );

  const best = recap.teamGrades[0];
  const worst = recap.teamGrades[recap.teamGrades.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Draft Recap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="text-center">
            <p
              className={`text-4xl font-bold ${gradeColor(recap.overallClassGrade)}`}
            >
              {recap.overallClassGrade}
            </p>
            <p className="text-sm text-muted-foreground">{tier}</p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Stat label="Teams" value={recap.teamGrades.length} />
            <Stat label="Picks" value={totalPicks} />
            <Stat label="Steals" value={steals} className="text-mb-success" />
            <Stat label="Reaches" value={reaches} className="text-mb-danger" />
            {recap.tradeAnalysis.length > 0 && (
              <Stat label="Trades" value={recap.tradeAnalysis.length} />
            )}
          </div>

          {best && worst && best.team !== worst.team && (
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Best Draft</p>
                <p className={`font-medium ${gradeColor(best.overallGrade)}`}>
                  {best.team} ({best.overallGrade})
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Worst Draft</p>
                <p className={`font-medium ${gradeColor(worst.overallGrade)}`}>
                  {worst.team} ({worst.overallGrade})
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  className = '',
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div>
      <p className={`text-lg font-semibold ${className}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
