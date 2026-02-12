import type { Player } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/colors/position-colors';
import { schoolColorStyle } from '@/lib/colors/school-colors';
import { UNRANKED, YEAR_LABELS } from '@/lib/player-utils';

interface PlayerHeroProps {
  player: Player;
}

export function PlayerHero({ player }: PlayerHeroProps) {
  const { attributes } = player;

  const subtitle = [
    player.school,
    attributes?.conference,
    attributes?.yearInSchool ? YEAR_LABELS[attributes.yearInSchool] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="overflow-hidden rounded-xl border border-mb-border-strong bg-card"
      style={schoolColorStyle(player.school)}
    >
      {/* School color gradient strip */}
      <div
        className="h-1.5"
        style={{
          background:
            'linear-gradient(to right, var(--school-primary), var(--school-secondary))',
        }}
      />

      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {/* Rank */}
            <span className="font-mono text-5xl font-bold text-muted-foreground sm:text-6xl">
              {player.consensusRank >= UNRANKED
                ? 'NR'
                : `#${player.consensusRank}`}
            </span>

            {/* Name */}
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase leading-tight tracking-tight sm:text-5xl">
              {player.name}
            </h1>

            {/* School + conference + year */}
            <p className="text-sm text-muted-foreground sm:text-base">
              {subtitle}
            </p>
            {attributes?.previousSchools?.length ? (
              <p className="text-xs text-muted-foreground">
                via {attributes.previousSchools.join(', ')}
              </p>
            ) : null}
          </div>

          {/* Position badge */}
          <Badge
            style={{
              backgroundColor: getPositionColor(player.position),
              color: '#0A0A0B',
            }}
            className="text-base px-3 py-1"
          >
            {player.position}
          </Badge>
        </div>
      </div>
    </div>
  );
}
