import type {
  Trade,
  Draft,
  DraftSlot,
  FutureDraftPick,
  TradePiece,
  TeamAbbreviation,
} from './types';
import { getPickValue, getFuturePickValue, getPickRound } from './tradeValues';
import { getPickController } from './draft';

export interface CpuTradeEvaluation {
  accept: boolean;
  reason: string;
  cpuGivingValue: number;
  cpuReceivingValue: number;
  netValue: number;
}

/**
 * Evaluate a trade from the CPU's perspective.
 * CPU accepts if they're getting at least 95% of what they're giving up.
 */
export function evaluateCpuTrade(
  trade: Trade,
  draft: Draft,
): CpuTradeEvaluation {
  // From CPU's perspective:
  // - CPU is "giving" what the proposer receives
  // - CPU is "receiving" what the proposer gives

  const cpuGivingPicks: number[] = [];
  const cpuReceivingPicks: number[] = [];

  // What CPU gives (proposer receives)
  for (const piece of trade.proposerReceives) {
    if (piece.type === 'current-pick' && piece.overall) {
      cpuGivingPicks.push(piece.overall);
    }
  }

  // What CPU receives (proposer gives)
  for (const piece of trade.proposerGives) {
    if (piece.type === 'current-pick' && piece.overall) {
      cpuReceivingPicks.push(piece.overall);
    }
  }

  // Check if user is acquiring a Round 1 pick they didn't originally own
  const acquiringRound1 = trade.proposerReceives.some(
    (p) =>
      p.type === 'current-pick' && p.overall && getPickRound(p.overall) === 1,
  );

  // Calculate values
  let cpuGivingValue = cpuGivingPicks.reduce(
    (sum, pick) => sum + getPickValue(pick),
    0,
  );
  let cpuReceivingValue = cpuReceivingPicks.reduce(
    (sum, pick) => sum + getPickValue(pick),
    0,
  );

  // Add future pick values
  for (const piece of trade.proposerReceives) {
    if (piece.type === 'future-pick' && piece.year && piece.round) {
      const yearsOut = piece.year - draft.config.year;
      cpuGivingValue += getFuturePickValue(piece.round, yearsOut);
    }
  }

  for (const piece of trade.proposerGives) {
    if (piece.type === 'future-pick' && piece.year && piece.round) {
      const yearsOut = piece.year - draft.config.year;
      cpuReceivingValue += getFuturePickValue(piece.round, yearsOut);
    }
  }

  // Apply Round 1 premium if user is acquiring a first round pick
  const premium = acquiringRound1 ? 45 : 0;
  cpuReceivingValue += premium;

  const netValue = cpuReceivingValue - cpuGivingValue;

  // CPU accepts if they're getting at least 95% of what they're giving
  const threshold = cpuGivingValue * 0.95;
  const accept = cpuReceivingValue >= threshold;

  let reason: string;
  if (accept) {
    if (netValue > 0) {
      reason = `CPU gains ${netValue.toFixed(1)} points in value`;
    } else {
      reason = `Trade is fair (within 5% tolerance)`;
    }
  } else {
    const deficit = threshold - cpuReceivingValue;
    reason = `CPU would lose ${deficit.toFixed(1)} points beyond acceptable threshold`;
  }

  return {
    accept,
    reason,
    cpuGivingValue,
    cpuReceivingValue,
    netValue,
  };
}

/**
 * Check if a trade involves any picks that have already been made.
 */
export function validateTradePicksAvailable(
  trade: Trade,
  draft: Draft,
): { valid: boolean; error?: string } {
  const currentPick = draft.currentPick;

  for (const piece of [...trade.proposerGives, ...trade.proposerReceives]) {
    if (piece.type === 'current-pick' && piece.overall) {
      if (piece.overall < currentPick) {
        return {
          valid: false,
          error: `Pick #${piece.overall} has already been made`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Check if user owns the picks they're trying to trade.
 */
export function validateUserOwnsPicks(
  userId: string,
  pieces: TradePiece[],
  draft: Draft,
): { valid: boolean; error?: string } {
  for (const piece of pieces) {
    if (piece.type === 'current-pick' && piece.overall) {
      const slot = draft.pickOrder.find((s) => s.overall === piece.overall);
      if (!slot) {
        return { valid: false, error: `Pick #${piece.overall} not found` };
      }
      const controller = getPickController(draft, slot);
      if (controller !== userId) {
        return {
          valid: false,
          error: `You don't control pick #${piece.overall}`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Get the picks controlled by a team (including via trades).
 */
export function getPicksOwnedByTeam(
  team: TeamAbbreviation,
  draft: Draft,
): DraftSlot[] {
  const teamUserId = draft.teamAssignments[team];
  return draft.pickOrder.filter((slot) => {
    const controller = getPickController(draft, slot);
    return controller === teamUserId;
  });
}

/**
 * Get available current-draft picks controlled by a user.
 * Only returns picks that haven't been made yet.
 */
export function getAvailableCurrentPicks(
  draft: Draft,
  forUserId: string,
): DraftSlot[] {
  return draft.pickOrder.filter((slot) => {
    if (slot.overall < draft.currentPick) return false;
    const controller = getPickController(draft, slot);
    return controller === forUserId;
  });
}

/**
 * Get future picks owned by teams a user controls.
 */
export function getAvailableFuturePicks(
  draft: Draft,
  forUserId: string,
): FutureDraftPick[] {
  if (!draft.futurePicks) return [];
  return draft.futurePicks.filter((pick) => {
    const controller = draft.teamAssignments[pick.ownerTeam] ?? null;
    return controller === forUserId;
  });
}

/**
 * Get future picks owned by a specific team.
 */
export function getTeamFuturePicks(
  draft: Draft,
  team: TeamAbbreviation,
): FutureDraftPick[] {
  if (!draft.futurePicks) return [];
  return draft.futurePicks.filter((pick) => pick.ownerTeam === team);
}

/**
 * Pure computation for trade execution: returns updated pickOrder and futurePicks
 * with ownership changes applied.
 */
export function computeTradeExecution(
  trade: Trade,
  draft: Draft,
): { pickOrder: DraftSlot[]; futurePicks: FutureDraftPick[] } {
  // Update current pick ownership via ownerOverride
  const pickOrder = draft.pickOrder.map((slot) => {
    const isGivenByProposer = trade.proposerGives.some(
      (p) => p.type === 'current-pick' && p.overall === slot.overall,
    );
    if (isGivenByProposer) {
      return {
        ...slot,
        ownerOverride: trade.recipientId,
        teamOverride: trade.recipientTeam,
      };
    }

    const isReceivedByProposer = trade.proposerReceives.some(
      (p) => p.type === 'current-pick' && p.overall === slot.overall,
    );
    if (isReceivedByProposer) {
      return {
        ...slot,
        ownerOverride: trade.proposerId,
        teamOverride: trade.proposerTeam,
      };
    }

    return slot;
  });

  // Update future pick ownership via ownerTeam
  const futurePicks = (draft.futurePicks ?? []).map((fp) => {
    const isGivenByProposer = trade.proposerGives.some(
      (p) =>
        p.type === 'future-pick' &&
        p.year === fp.year &&
        p.round === fp.round &&
        p.originalTeam === fp.originalTeam,
    );
    if (isGivenByProposer) {
      return { ...fp, ownerTeam: trade.recipientTeam };
    }

    const isReceivedByProposer = trade.proposerReceives.some(
      (p) =>
        p.type === 'future-pick' &&
        p.year === fp.year &&
        p.round === fp.round &&
        p.originalTeam === fp.originalTeam,
    );
    if (isReceivedByProposer) {
      return { ...fp, ownerTeam: trade.proposerTeam };
    }

    return fp;
  });

  return { pickOrder, futurePicks };
}
