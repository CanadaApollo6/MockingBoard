import type { Player, Position } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { AttributionBadge } from '@/components/attribution-badge';
import {
  formatHeight,
  formatMeasurement,
  buildCombineMetrics,
  formatStatValue,
  KEY_STATS,
} from '@/lib/player-utils';

interface ProspectDetailsProps {
  player: Player;
  reportCount?: number;
}

export function ProspectDetails({ player, reportCount }: ProspectDetailsProps) {
  const { attributes, scouting } = player;
  const hasPhysical = attributes?.height || attributes?.weight;
  const combineMetrics = buildCombineMetrics(attributes);
  const hasMeasurements =
    attributes?.armLength || attributes?.handSize || attributes?.wingSpan;

  return (
    <div className="space-y-4">
      {/* NFL Comp callout */}
      {scouting?.comparison && (
        <div className="rounded-lg bg-muted/50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            NFL Comp
          </p>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-tight">
            {scouting.comparison}
          </p>
        </div>
      )}

      {/* Scouting summary */}
      {scouting?.summary && (
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {scouting.summary}
        </p>
      )}

      {/* Physical profile */}
      {hasPhysical && (
        <div className="flex items-center gap-3 text-sm">
          {attributes?.height && (
            <span className="font-medium">
              {formatHeight(attributes.height)}
            </span>
          )}
          {attributes?.height && attributes?.weight && (
            <span className="text-mb-border-strong">/</span>
          )}
          {attributes?.weight && (
            <span className="font-medium">{attributes.weight} lbs</span>
          )}
          {attributes?.captain && (
            <Badge variant="outline" className="text-xs">
              Captain
            </Badge>
          )}
        </div>
      )}

      {/* Arm / hand measurements */}
      {hasMeasurements && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {attributes?.armLength && (
            <span>
              <span className="font-medium text-foreground">
                {formatMeasurement(attributes.armLength)}
              </span>{' '}
              arm
            </span>
          )}
          {attributes?.handSize && (
            <span>
              <span className="font-medium text-foreground">
                {formatMeasurement(attributes.handSize)}
              </span>{' '}
              hand
            </span>
          )}
          {attributes?.wingSpan && (
            <span>
              <span className="font-medium text-foreground">
                {formatMeasurement(attributes.wingSpan)}
              </span>{' '}
              wing
            </span>
          )}
        </div>
      )}

      {/* Combine metrics */}
      {combineMetrics.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Combine
          </p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-6">
            {combineMetrics.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="font-mono text-sm font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Position stats */}
      {player.stats && KEY_STATS[player.position] && (
        <StatsSection stats={player.stats} position={player.position} />
      )}

      {/* Scouting tags */}
      {(scouting?.strengths?.length || scouting?.weaknesses?.length) && (
        <div className="flex flex-wrap gap-1.5">
          {scouting?.strengths?.map((s) => (
            <Badge
              key={s}
              className="border-mb-success/30 bg-mb-success/10 text-xs text-mb-success"
            >
              {s}
            </Badge>
          ))}
          {scouting?.weaknesses?.map((w) => (
            <Badge
              key={w}
              className="border-mb-danger/30 bg-mb-danger/10 text-xs text-mb-danger"
            >
              {w}
            </Badge>
          ))}
        </div>
      )}

      {/* Community reports count */}
      {reportCount != null && reportCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {reportCount} community {reportCount === 1 ? 'report' : 'reports'}
        </p>
      )}

      {/* Attribution */}
      {player.dataProviders && (
        <AttributionBadge dataProviders={player.dataProviders} />
      )}
    </div>
  );
}

function StatsSection({
  stats,
  position,
}: {
  stats: Record<string, number | string | null>;
  position: Position;
}) {
  const defs = KEY_STATS[position];
  if (!defs) return null;

  const items = defs
    .map((d) => ({ ...d, val: stats[d.key] }))
    .filter((d) => d.val != null);

  if (items.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Stats
      </p>
      <div className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-6">
        {items.map(({ key, label, val }) => (
          <div key={key} className="text-center">
            <p className="font-mono text-sm font-bold">
              {formatStatValue(val)}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
