import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  GradientCard,
  GradientCardContent,
} from '@/components/ui/gradient-card';
import { isTeamAbbreviation } from '@mockingboard/shared';
import { TEAM_COLORS } from '@/lib/team-colors';
import type { EspnPlayerBio } from '@/lib/cache';

interface NflPlayerHeroProps {
  bio: EspnPlayerBio;
}

export function NflPlayerHero({ bio }: NflPlayerHeroProps) {
  const teamAbbr = bio.teamAbbreviation;
  const teamColors = isTeamAbbreviation(teamAbbr)
    ? TEAM_COLORS[teamAbbr]
    : { primary: '#3b82f6', secondary: '#8b5cf6' };

  const details = [
    bio.age ? `${bio.age} yrs` : null,
    bio.displayHeight,
    bio.displayWeight,
    bio.displayExperience,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <GradientCard from={teamColors.primary} to={teamColors.secondary}>
      <GradientCardContent>
        <div className="flex flex-wrap items-start gap-6">
          {/* Jersey number */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 font-mono text-4xl font-bold">
            {bio.jersey}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              {/* Name */}
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase leading-tight tracking-tight sm:text-5xl">
                {bio.displayName}
              </h1>

              {/* Position badge */}
              <Badge
                variant="outline"
                className="border-white/30 px-3 py-1 text-base text-white"
              >
                {bio.position}
              </Badge>
            </div>

            {/* Team + status */}
            <div className="flex items-center gap-3 text-sm sm:text-base">
              {bio.teamDisplayName && (
                <Link
                  href={`/teams/${teamAbbr}`}
                  className="text-white/90 underline-offset-2 hover:underline"
                >
                  {bio.teamDisplayName}
                </Link>
              )}
              {bio.status !== 'Active' && bio.status !== 'Unknown' && (
                <Badge
                  variant="outline"
                  className="border-red-400/50 text-xs text-red-300"
                >
                  {bio.status}
                </Badge>
              )}
            </div>

            {/* Physical + experience */}
            <p className="text-sm text-white/70">{details}</p>

            {/* College + draft info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
              {bio.college && <span>{bio.college}</span>}
              {bio.displayDraft ? (
                <span>{bio.displayDraft}</span>
              ) : (
                <span>Undrafted</span>
              )}
              {bio.displayBirthPlace && <span>{bio.displayBirthPlace}</span>}
            </div>
          </div>
        </div>
      </GradientCardContent>
    </GradientCard>
  );
}
