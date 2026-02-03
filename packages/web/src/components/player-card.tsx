'use client';

import { motion } from 'framer-motion';
import type { Player, Position } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPositionColor } from '@/lib/position-colors';
import { schoolColorStyle } from '@/lib/school-colors';
import { AttributionBadge } from '@/components/attribution-badge';

const UNRANKED = 9999;

interface PlayerCardProps {
  player: Player;
  onDraft: () => void;
  disabled: boolean;
}

const YEAR_LABELS: Record<string, string> = {
  FR: 'Freshman',
  SO: 'Sophomore',
  JR: 'Junior',
  SR: 'Senior',
  'RS-FR': 'RS-Freshman',
  'RS-SO': 'RS-Sophomore',
  'RS-JR': 'RS-Junior',
  'RS-SR': 'RS-Senior',
};

function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  return `${feet}'${remaining}"`;
}

function formatMeasurement(value: number): string {
  const whole = Math.floor(value);
  const frac = value - whole;
  if (frac < 0.0625) return `${whole}"`;
  if (frac < 0.1875) return `${whole}\u215B"`; // ⅛
  if (frac < 0.3125) return `${whole}\u00BC"`; // ¼
  if (frac < 0.4375) return `${whole}\u215C"`; // ⅜
  if (frac < 0.5625) return `${whole}\u00BD"`; // ½
  if (frac < 0.6875) return `${whole}\u215D"`; // ⅝
  if (frac < 0.8125) return `${whole}\u00BE"`; // ¾
  if (frac < 0.9375) return `${whole}\u215E"`; // ⅞
  return `${whole + 1}"`;
}

export function PlayerCard({ player, onDraft, disabled }: PlayerCardProps) {
  const { attributes, scouting } = player;
  const hasPhysical = attributes?.height || attributes?.weight;
  const combineMetrics = buildCombineMetrics(attributes);
  const hasMeasurements =
    attributes?.armLength || attributes?.handSize || attributes?.wingSpan;

  const subtitle = [
    player.school,
    attributes?.conference,
    attributes?.yearInSchool ? YEAR_LABELS[attributes.yearInSchool] : null,
  ]
    .filter(Boolean)
    .join(' \u00B7 ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.25, ease: 'easeOut' },
      }}
      exit={{
        opacity: 0,
        y: -6,
        transition: { duration: 0.15, ease: 'easeIn' },
      }}
      className="overflow-hidden rounded-lg border border-mb-border-strong bg-card"
      style={schoolColorStyle(player.school)}
    >
      {/* School color gradient strip */}
      <div
        className="h-1"
        style={{
          background:
            'linear-gradient(to right, var(--school-primary), var(--school-secondary))',
        }}
      />

      <div className="space-y-3 p-4">
        {/* Header: rank + position */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xl font-bold">
            {player.consensusRank >= UNRANKED
              ? 'NR'
              : `#${player.consensusRank}`}
          </span>
          <Badge
            style={{
              backgroundColor: getPositionColor(player.position),
              color: '#0A0A0B',
            }}
            className="text-xs"
          >
            {player.position}
          </Badge>
        </div>

        {/* Player name */}
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase leading-tight tracking-tight">
            {player.name}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          {attributes?.previousSchools?.length ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              via {attributes.previousSchools.join(', ')}
            </p>
          ) : null}
        </div>

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

        {/* Combine metrics */}
        {combineMetrics.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Combine
            </p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              {combineMetrics.map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="font-mono text-sm font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
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

        {/* Position stats */}
        {player.stats && KEY_STATS[player.position] && (
          <StatsSection stats={player.stats} position={player.position} />
        )}

        {/* Scouting summary */}
        {scouting?.summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {scouting.summary}
          </p>
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

        {/* Attribution */}
        {player.dataProviders && (
          <AttributionBadge dataProviders={player.dataProviders} />
        )}

        {/* Draft button */}
        <Button
          className="w-full"
          size="lg"
          onClick={onDraft}
          disabled={disabled}
        >
          {disabled ? 'Drafting...' : `Draft ${player.name}`}
        </Button>
      </div>
    </motion.div>
  );
}

interface CombineMetric {
  label: string;
  value: string;
}

function buildCombineMetrics(
  attributes: Player['attributes'],
): CombineMetric[] {
  if (!attributes) return [];
  const metrics: CombineMetric[] = [];
  if (attributes.fortyYard)
    metrics.push({ label: '40-Yard', value: attributes.fortyYard.toFixed(2) });
  if (attributes.vertical)
    metrics.push({ label: 'Vertical', value: `${attributes.vertical}"` });
  if (attributes.bench)
    metrics.push({ label: 'Bench', value: String(attributes.bench) });
  if (attributes.broad)
    metrics.push({ label: 'Broad', value: `${attributes.broad}"` });
  if (attributes.cone)
    metrics.push({ label: '3-Cone', value: attributes.cone.toFixed(2) });
  if (attributes.shuttle)
    metrics.push({ label: 'Shuttle', value: attributes.shuttle.toFixed(2) });
  return metrics;
}

// ---- Position Stats ----

interface StatDef {
  key: string;
  label: string;
}

const KEY_STATS: Partial<Record<Position, StatDef[]>> = {
  QB: [
    { key: 'pass_grd', label: 'PFF Grade' },
    { key: 'epa_play', label: 'EPA/Play' },
    { key: 'acomp_pct', label: 'Adj Comp%' },
    { key: 'pass_rtg', label: 'Rating' },
    { key: 'btt_pct', label: 'BTT%' },
    { key: 'twp_pct', label: 'TWP%' },
  ],
  WR: [
    { key: 'rec_grd', label: 'PFF Grade' },
    { key: 'yprr', label: 'YPRR' },
    { key: 'yac_rec', label: 'YAC/REC' },
    { key: 'deep_tgt_pct', label: 'Deep TGT%' },
    { key: 'rec_td', label: 'Rec TD' },
    { key: 'mtf_rec', label: 'MTF' },
  ],
  TE: [
    { key: 'rec_grd', label: 'Rec Grade' },
    { key: 'pblk_grd', label: 'Block Grade' },
    { key: 'yprr', label: 'YPRR' },
    { key: 'yac_rec', label: 'YAC/REC' },
    { key: 'rec_td', label: 'Rec TD' },
    { key: 'rec_comp_pct', label: 'Comp%' },
  ],
  RB: [
    { key: 'rush_grd', label: 'Rush Grade' },
    { key: 'rush_ypc', label: 'YPC' },
    { key: 'mtf_att', label: 'MTF/ATT' },
    { key: 'rec_grd', label: 'Rec Grade' },
    { key: 'stuff_rate', label: 'Stuff Rate' },
    { key: 'rush_td', label: 'Rush TD' },
  ],
  OT: [
    { key: 'pblk_grd', label: 'PFF Grade' },
    { key: 'pblk_pbe', label: 'PBE' },
    { key: 'pblk_kd_pct', label: 'KD%' },
    { key: 'pblk_hu', label: 'Hurries' },
    { key: 'pblk_sk', label: 'Sacks' },
    { key: 'pblk_pr_pct', label: 'Pressure%' },
  ],
  OG: [
    { key: 'pblk_grd', label: 'PFF Grade' },
    { key: 'pblk_pbe', label: 'PBE' },
    { key: 'pblk_kd_pct', label: 'KD%' },
    { key: 'pblk_hu', label: 'Hurries' },
    { key: 'pblk_sk', label: 'Sacks' },
    { key: 'pblk_pr_pct', label: 'Pressure%' },
  ],
  EDGE: [
    { key: 'prsh_grd', label: 'Rush Grade' },
    { key: 'prsh_win_pct', label: 'Win%' },
    { key: 'prsh_sk', label: 'Sacks' },
    { key: 'rund_tfl', label: 'TFL' },
    { key: 'rund_grd', label: 'Run Def' },
    { key: 'prsh_tpr', label: 'Pressures' },
  ],
  DL: [
    { key: 'prsh_grd', label: 'Rush Grade' },
    { key: 'prsh_win_pct', label: 'Win%' },
    { key: 'prsh_sk', label: 'Sacks' },
    { key: 'rund_tfl', label: 'TFL' },
    { key: 'rund_grd', label: 'Run Def' },
    { key: 'prsh_tpr', label: 'Pressures' },
  ],
  LB: [
    { key: 'rund_grd', label: 'Run Def' },
    { key: 'cov_grd', label: 'Coverage' },
    { key: 'prsh_grd', label: 'Rush Grade' },
    { key: 'rund_tkl', label: 'Tackles' },
    { key: 'cov_rtg', label: 'COV RTG' },
    { key: 'cov_int', label: 'INT' },
  ],
  CB: [
    { key: 'cov_grd', label: 'COV Grade' },
    { key: 'cov_rtg', label: 'COV RTG' },
    { key: 'cov_int', label: 'INT' },
    { key: 'cov_pbu', label: 'PBU' },
    { key: 'cov_finc_pct', label: 'Forced Inc%' },
    { key: 'cov_yds_cov', label: 'YDS/COV' },
  ],
  S: [
    { key: 'cov_grd', label: 'COV Grade' },
    { key: 'rund_grd', label: 'Run Def' },
    { key: 'cov_rtg', label: 'COV RTG' },
    { key: 'cov_int', label: 'INT' },
    { key: 'rund_tkl', label: 'Tackles' },
    { key: 'cov_pbu', label: 'PBU' },
  ],
};

function formatStatValue(val: number | string | null): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
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
      <div className="grid grid-cols-3 gap-x-4 gap-y-3">
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
