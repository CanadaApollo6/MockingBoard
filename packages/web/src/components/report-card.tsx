import type { ScoutingReport } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { TipTapContent } from '@/components/tiptap-content';

interface ReportCardProps {
  report: ScoutingReport;
}

function gradeColor(grade: number): string {
  if (grade >= 80) return 'text-mb-success';
  if (grade >= 60) return 'text-mb-accent';
  if (grade >= 40) return 'text-yellow-500';
  return 'text-mb-danger';
}

export function ReportCard({ report }: ReportCardProps) {
  const hasStructured =
    report.grade != null ||
    report.comparison ||
    report.strengths?.length ||
    report.weaknesses?.length;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{report.authorName}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(report.createdAt.seconds * 1000).toLocaleDateString()}
        </span>
      </div>

      {/* Grade + comp */}
      {(report.grade != null || report.comparison) && (
        <div className="flex items-center gap-3">
          {report.grade != null && (
            <span
              className={`font-mono text-lg font-bold ${gradeColor(report.grade)}`}
            >
              {report.grade}
            </span>
          )}
          {report.comparison && (
            <span className="text-sm text-muted-foreground">
              Comp:{' '}
              <span className="font-medium text-foreground">
                {report.comparison}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {(report.strengths?.length || report.weaknesses?.length) && (
        <div className="flex flex-wrap gap-1.5">
          {report.strengths?.map((s) => (
            <Badge
              key={s}
              className="border-mb-success/30 bg-mb-success/10 text-xs text-mb-success"
            >
              {s}
            </Badge>
          ))}
          {report.weaknesses?.map((w) => (
            <Badge
              key={w}
              className="border-mb-danger/30 bg-mb-danger/10 text-xs text-mb-danger"
            >
              {w}
            </Badge>
          ))}
        </div>
      )}

      {/* Long-form content */}
      {report.content && Object.keys(report.content).length > 0 && (
        <div className="border-t pt-3">
          <TipTapContent content={report.content} />
        </div>
      )}

      {/* Empty state for structured-only reports */}
      {!hasStructured && !report.content && (
        <p className="text-sm text-muted-foreground italic">
          No details provided.
        </p>
      )}
    </div>
  );
}
