import type { ScoutingReport } from '@mockingboard/shared';
import { gradeColor } from '@/lib/colors/grade-color';

interface CommunityGradeSummaryProps {
  reports: ScoutingReport[];
}

export function CommunityGradeSummary({ reports }: CommunityGradeSummaryProps) {
  const graded = reports.filter((r) => r.grade != null);
  const avgGrade =
    graded.length > 0
      ? Math.round(graded.reduce((sum, r) => sum + r.grade!, 0) / graded.length)
      : null;

  // Top NFL comps — count occurrences, take top 3
  const compCounts = new Map<string, number>();
  for (const r of reports) {
    if (!r.comparison) continue;
    const comp = r.comparison.trim();
    compCounts.set(comp, (compCounts.get(comp) ?? 0) + 1);
  }
  const topComps = [...compCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([comp]) => comp);

  if (reports.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4 rounded-lg border bg-card p-4">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Reports
        </p>
        <p className="mt-1 font-mono text-2xl font-bold">{reports.length}</p>
      </div>

      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Avg Grade
        </p>
        <p
          className={`mt-1 font-mono text-2xl font-bold ${avgGrade != null ? gradeColor(avgGrade) : 'text-muted-foreground'}`}
        >
          {avgGrade != null ? avgGrade : '—'}
        </p>
      </div>

      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Top Comps
        </p>
        {topComps.length > 0 ? (
          <p className="mt-1 text-sm font-medium leading-snug">
            {topComps.join(', ')}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">—</p>
        )}
      </div>
    </div>
  );
}
