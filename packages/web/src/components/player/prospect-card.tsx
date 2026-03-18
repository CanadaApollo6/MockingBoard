import Link from 'next/link';
import type { Player } from '@mockingboard/shared';
import { Routes } from '@/routes';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/colors/position-colors';
import { schoolColorStyle } from '@/lib/colors/school-colors';
import { UNRANKED, YEAR_LABELS } from '@/lib/player-utils';
import { ProspectDetails } from '@/components/player/prospect-details';
import { WatchButton } from '@/components/prospect/watch-button';

interface ProspectCardProps {
  player: Player;
  year?: number;
}

export function ProspectCard({ player, year }: ProspectCardProps) {
  const { attributes } = player;

  const subtitle = [
    player.school,
    attributes?.conference,
    attributes?.yearInSchool ? YEAR_LABELS[attributes.yearInSchool] : null,
  ]
    .filter(Boolean)
    .join(' \u00B7 ');

  return (
    <div
      className="overflow-hidden rounded-xl border border-mb-border-strong bg-card"
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

      <div className="space-y-4 p-5 sm:p-8">
        {/* Header: rank + position */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-4xl font-bold text-muted-foreground">
            {player.consensusRank >= UNRANKED
              ? 'NR'
              : `#${player.consensusRank}`}
          </span>
          <Badge
            style={{
              backgroundColor: getPositionColor(player.position),
              color: '#0A0A0B',
            }}
            className="text-sm"
          >
            {player.position}
          </Badge>
        </div>

        {/* Player name + school */}
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase leading-tight tracking-tight sm:text-3xl">
            <Link
              href={Routes.prospect(player.id)}
              className="hover:text-mb-accent transition-colors"
            >
              {player.name}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {attributes?.previousSchools?.length ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              via {attributes.previousSchools.join(', ')}
            </p>
          ) : null}
        </div>

        <ProspectDetails player={player} />
        {year && (
          <div className="flex items-center pt-2">
            <WatchButton playerId={player.id} year={year} showLabel />
          </div>
        )}
      </div>
    </div>
  );
}
