'use client';

import { motion } from 'framer-motion';
import type { Player } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPositionColor } from '@/lib/position-colors';
import { schoolColorStyle } from '@/lib/school-colors';

interface PlayerCardProps {
  player: Player;
  onDraft: () => void;
  disabled: boolean;
  onDeselect: () => void;
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

export function PlayerCard({
  player,
  onDraft,
  disabled,
  onDeselect,
}: PlayerCardProps) {
  const { attributes, scouting } = player;
  const hasPhysical = attributes?.height || attributes?.weight;
  const combineMetrics = buildCombineMetrics(attributes);
  const hasMeasurements = attributes?.armLength || attributes?.handSize;

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
        {/* Header: rank + position + close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold">
              #{player.consensusRank}
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
          <button
            onClick={onDeselect}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Deselect player"
          >
            &times;
          </button>
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
          </div>
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
