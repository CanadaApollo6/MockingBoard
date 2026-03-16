/**
 * Salary Cap Rules Engine — Bridge from Display Types
 *
 * Converts the OTC-scraped PlayerContract (single-year snapshot)
 * into a CapContract for calculation purposes.
 */

import type { PlayerContract, Position, TeamAbbreviation } from './types';
import type { CapContract } from './salary-cap-types';

/**
 * Convert an OTC-scraped PlayerContract into a CapContract.
 *
 * This is a best-effort conversion since the scraped data is a single-year
 * snapshot without full multi-year structure. The resulting CapContract will
 * have only one year of data and limited fidelity for multi-year calculations.
 *
 * Use this for display-to-calculation bridging, not for full contract modeling.
 */
export function fromDisplayContract(
  displayContract: PlayerContract,
  team: TeamAbbreviation,
  position: Position,
  year: number,
): CapContract {
  const contractYear = {
    year,
    baseSalary: displayContract.baseSalary,
    signingBonusProration: displayContract.proratedBonus,
    rosterBonus: displayContract.rosterBonus,
    optionBonus: displayContract.optionBonus,
    workoutBonus: displayContract.workoutBonus,
    otherBonus: displayContract.otherBonus,
    incentives: [],
    isVoidYear: false,
    isGuaranteed: displayContract.guaranteedSalary > 0,
    guaranteedSalary: displayContract.guaranteedSalary,
  };

  return {
    playerId: displayContract.player,
    playerName: displayContract.player,
    team,
    position,
    totalSigningBonus: displayContract.signingBonus,
    signingBonusYearsRemaining: 1,
    years: [contractYear],
    startYear: year,
    endYear: year,
    isRookieContract: false,
  };
}
