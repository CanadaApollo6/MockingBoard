import { teams, type TeamSeed } from '@mockingboard/shared';
import type { TeamAbbreviation } from '@mockingboard/shared';

const teamMap = new Map<string, TeamSeed>(teams.map((t) => [t.id, t]));

export function getTeam(abbr: TeamAbbreviation): TeamSeed | undefined {
  return teamMap.get(abbr);
}

export function getTeamName(abbr: TeamAbbreviation): string {
  return teamMap.get(abbr)?.name ?? abbr;
}

export function getTeamCity(abbr: TeamAbbreviation): string {
  return teamMap.get(abbr)?.city ?? abbr;
}
