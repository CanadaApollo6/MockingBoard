import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  GradientCard,
  GradientCardContent,
} from '@/components/ui/gradient-card';
import { isTeamAbbreviation } from '@mockingboard/shared';
import type { PlayerContract } from '@mockingboard/shared';
import { TEAM_COLORS } from '@/lib/colors/team-colors';
import { fmtDollar } from '@/lib/firebase/format';
import type { EspnPlayerBio } from '@/lib/cache';

interface NflPlayerHeroProps {
  bio: EspnPlayerBio;
  contract?: PlayerContract;
}

export function NflPlayerHero({ bio, contract }: NflPlayerHeroProps) {
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
          <div className="flex h-22 w-22 shrink-0 self-center items-center justify-center rounded-full bg-white/15 font-mono text-5xl font-bold">
            {bio.jersey}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
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

          {/* Contract info — right side, spread horizontally */}
          {contract && (
            <div className="flex shrink-0 self-center flex-wrap gap-x-5 gap-y-1 text-sm">
              <span>
                <span className="text-white/50">Cap Hit</span>{' '}
                <span className="font-medium">
                  {fmtDollar(contract.capNumber)}
                </span>
              </span>
              <span>
                <span className="text-white/50">Base Salary</span>{' '}
                {fmtDollar(contract.baseSalary)}
              </span>
              <span>
                <span className="text-white/50">Dead Cap</span>{' '}
                {fmtDollar(contract.deadMoney.cutPreJune1)}
              </span>
            </div>
          )}
        </div>
      </GradientCardContent>
    </GradientCard>
  );
}
