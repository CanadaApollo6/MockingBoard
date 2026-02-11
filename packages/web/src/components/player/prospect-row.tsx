'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/position-colors';
import { schoolColorStyle } from '@/lib/school-colors';
import { UNRANKED, YEAR_LABELS, formatHeight } from '@/lib/player-utils';
import { ProspectDetails } from '@/components/player/prospect-details';

interface ProspectRowProps {
  player: Player;
}

export function ProspectRow({ player }: ProspectRowProps) {
  const [expanded, setExpanded] = useState(false);
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
      className="overflow-hidden rounded-lg border border-mb-border-strong bg-card"
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

      {/* Compact row — clickable */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/30 sm:gap-6 sm:px-6"
      >
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
        <div className="hidden w-32 shrink-0 sm:w-40 text-sm text-muted-foreground sm:block">
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
        <div className="flex w-14 shrink-0">
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

        {/* Chevron */}
        <svg
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Expandable detail section */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-mb-border-strong px-5 pb-5 pt-4 sm:px-6">
              {/* Full subtitle when expanded */}
              <p className="mb-4 text-sm text-muted-foreground">
                {subtitle}
                {attributes?.previousSchools?.length ? (
                  <span className="ml-2 text-xs">
                    via {attributes.previousSchools.join(', ')}
                  </span>
                ) : null}
              </p>

              <ProspectDetails player={player} />

              <Link
                href={`/players/${player.id}`}
                className="mt-4 inline-block text-sm font-medium text-mb-accent hover:underline"
              >
                View Full Profile
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
