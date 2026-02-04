import type { Player } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/position-colors';
import { schoolColorStyle } from '@/lib/school-colors';
import { UNRANKED, formatHeight } from '@/lib/player-utils';

interface ProspectRowProps {
  player: Player;
}

export function ProspectRow({ player }: ProspectRowProps) {
  const { attributes } = player;

  return (
    <div
      className="overflow-hidden rounded-lg border border-mb-border-strong bg-card transition-colors hover:bg-muted/30"
      style={schoolColorStyle(player.school)}
    >
      {/* School color gradient strip */}
      <div
        className="h-[2px]"
        style={{
          background:
            'linear-gradient(to right, var(--school-primary), var(--school-secondary))',
        }}
      />

      <div className="flex items-center gap-4 px-4 py-3 sm:gap-6 sm:px-6">
        {/* Rank */}
        <span className="w-12 shrink-0 font-mono text-xl font-bold text-muted-foreground sm:text-2xl">
          {player.consensusRank >= UNRANKED ? 'NR' : `#${player.consensusRank}`}
        </span>

        {/* Name + school */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-[family-name:var(--font-display)] text-base font-bold uppercase leading-tight tracking-tight sm:text-lg">
            {player.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">
            {player.school}
          </p>
        </div>

        {/* Height / Weight */}
        <div className="hidden shrink-0 text-right text-sm text-muted-foreground sm:block">
          {attributes?.height && (
            <span className="font-medium text-foreground">
              {formatHeight(attributes.height)}
            </span>
          )}
          {attributes?.height && attributes?.weight && (
            <span className="mx-1.5 text-mb-border-strong">/</span>
          )}
          {attributes?.weight && (
            <span className="font-medium text-foreground">
              {attributes.weight} lbs
            </span>
          )}
        </div>

        {/* Position badge */}
        <Badge
          style={{
            backgroundColor: getPositionColor(player.position),
            color: '#0A0A0B',
          }}
          className="shrink-0 text-xs"
        >
          {player.position}
        </Badge>
      </div>
    </div>
  );
}
