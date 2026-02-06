import { getPositionColor } from '@/lib/position-colors';
import { Badge } from '@/components/ui/badge';

export interface KeyPlayerStat {
  label: string;
  value: string;
}

export interface KeyPlayerCardProps {
  name: string;
  position: string;
  jersey: string;
  experience: number;
  college: string;
  teamColors: { primary: string; secondary: string };
  stats: KeyPlayerStat[];
}

export function KeyPlayerCard({
  name,
  position,
  jersey,
  experience,
  college,
  teamColors,
  stats,
}: KeyPlayerCardProps) {
  const expLabel = experience === 0 ? 'Rookie' : `${experience}yr`;

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card">
      {/* Team color gradient bar */}
      <div
        className="h-1.5"
        style={{
          background: `linear-gradient(to right, ${teamColors.primary}, ${teamColors.secondary})`,
        }}
      />

      <div className="flex gap-4 p-4">
        {/* Jersey number */}
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${teamColors.primary}, ${teamColors.secondary})`,
          }}
        >
          #{jersey}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-tight">
              {name}
            </p>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <Badge
              style={{
                backgroundColor: getPositionColor(position),
                color: '#0A0A0B',
              }}
              className="px-1.5 py-0 text-xs"
            >
              {position}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              #{jersey}
            </span>
            <span className="text-xs text-muted-foreground">{expLabel}</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {college}
            </span>
          </div>

          {/* Stats */}
          {stats.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
              {stats.map((s) => (
                <div key={s.label} className="flex items-baseline gap-1">
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {s.value}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
