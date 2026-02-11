import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { GradientCard } from '@/components/ui/gradient-card';

export interface KeyPlayerStat {
  label: string;
  value: string;
}

export interface KeyPlayerCardProps {
  espnId?: string;
  name: string;
  position: string;
  jersey: string;
  experience: number;
  college: string;
  teamColors: { primary: string; secondary: string };
  stats: KeyPlayerStat[];
}

export function KeyPlayerCard({
  espnId,
  name,
  position,
  jersey,
  experience,
  college,
  teamColors,
  stats,
}: KeyPlayerCardProps) {
  const expLabel = experience === 0 ? 'Rookie' : `${experience}yr`;

  const card = (
    <GradientCard from={teamColors.primary} to={teamColors.secondary}>
      <div className="flex items-center gap-4 p-4">
        {/* Jersey number */}
        <div className="flex size-16 shrink-0 items-center justify-center text-3xl font-bold">
          {jersey}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
              {name}
            </p>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-white/30 px-1.5 py-0 text-xs text-white"
            >
              {position}
            </Badge>
            <span className="text-xs text-white/70">{expLabel}</span>
            <span className="hidden text-xs text-white/70 sm:inline">
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
                  <span className="text-xs text-white/70">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GradientCard>
  );

  if (espnId) {
    return <Link href={`/players/${espnId}`}>{card}</Link>;
  }

  return card;
}
