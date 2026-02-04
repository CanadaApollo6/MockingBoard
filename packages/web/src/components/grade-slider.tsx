'use client';

interface GradeSliderProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

function gradeColor(grade: number): string {
  if (grade >= 80) return 'text-mb-success';
  if (grade >= 60) return 'text-mb-accent';
  if (grade >= 40) return 'text-yellow-500';
  return 'text-mb-danger';
}

function gradeLabel(grade: number): string {
  if (grade >= 90) return 'Elite';
  if (grade >= 80) return 'Pro Bowl';
  if (grade >= 70) return 'Starter';
  if (grade >= 60) return 'Contributor';
  if (grade >= 50) return 'Backup';
  if (grade >= 40) return 'Roster';
  return 'Practice Squad';
}

export function GradeSlider({ value, onChange }: GradeSliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          Grade
        </label>
        {value != null && (
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-sm font-bold ${gradeColor(value)}`}
            >
              {value}
            </span>
            <span className="text-xs text-muted-foreground">
              {gradeLabel(value)}
            </span>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value ?? 50}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-mb-accent"
      />
      {value == null && (
        <p className="text-xs text-muted-foreground">
          Drag to set a grade (optional)
        </p>
      )}
    </div>
  );
}
