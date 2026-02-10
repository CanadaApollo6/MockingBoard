import type {
  ButtonInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import type { TeamAbbreviation } from '@mockingboard/shared';
import { teams, isTeamAbbreviation } from '@mockingboard/shared';
import { getOrCreateUser } from '../services/user.service.js';
import { getDraft, getPickController } from '../services/draft.service.js';
import type { Trade } from '@mockingboard/shared';
import {
  createTrade,
  acceptTrade,
  executeTrade,
  evaluateCpuTrade,
  expireTrade,
  getAvailableCurrentPicks,
  getAvailableFuturePicks,
  getTeamFuturePicks,
  validateTradePicksAvailable,
  validateUserOwnsPicks,
} from '../services/trade.service.js';
import {
  buildTradeTargetSelect,
  buildTradeGiveSelect,
  buildTradeReceiveSelect,
  buildCpuTradeProposalEmbed,
  buildTradeProposalEmbed,
  buildTradeAcceptedEmbed,
  buildTradeExpiredEmbed,
  parseTradePieceValue,
} from '../components/tradeEmbed.js';
import {
  setTradeTimer,
  DEFAULT_TRADE_TIMEOUT_SECONDS,
} from '../services/tradeTimer.service.js';
import { TRADE_PROPOSAL_TTL } from '../constants.js';
import {
  teamSeeds,
  getSendableChannel,
  describeDraftStatus,
  buildTeamInfoMap,
} from './shared.js';

// Store in-progress trade proposals (userId:draftId -> state)
interface TradeProposalState {
  targetTeam: TeamAbbreviation;
  targetUserId: string | null; // null = CPU
  targetName: string;
  givingValues: string[]; // Raw select menu values (current + future)
  createdAt: number;
}

const tradeProposalState = new Map<string, TradeProposalState>();

// Clean up stale trade proposal states periodically
setInterval(() => {
  const cutoff = Date.now() - TRADE_PROPOSAL_TTL;
  for (const [key, state] of tradeProposalState) {
    if (state.createdAt < cutoff) tradeProposalState.delete(key);
  }
}, TRADE_PROPOSAL_TTL);

function getStateKey(userId: string, draftId: string): string {
  return `${userId}:${draftId}`;
}

/**
 * Handle "Propose Trade" button click - start the trade proposal flow
 */
export async function handleTradeStart(
  interaction: ButtonInteraction,
  draftId: string,
): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft || draft.status !== 'active') {
    await interaction.reply({
      content: `This draft is ${describeDraftStatus(draft?.status ?? 'complete')}.`,
      ephemeral: true,
    });
    return;
  }

  if (!draft.config.tradesEnabled) {
    await interaction.reply({
      content: 'Trading is disabled for this draft.',
      ephemeral: true,
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );

  // Get all potential trade targets (other teams in the draft)
  const userTeams = new Set(
    Object.entries(draft.teamAssignments)
      .filter(([, userId]) => userId === user.id)
      .map(([team]) => team),
  );

  const targets: { id: string; name: string; isCpu: boolean }[] = [];

  for (const team of teams) {
    const assignedUserId = draft.teamAssignments[team.id];

    // Skip user's own teams unless they control multiple (self-trade)
    if (userTeams.has(team.id) && userTeams.size <= 1) continue;

    // Check if this team has any remaining picks
    const hasRemainingPicks = draft.pickOrder.some((slot) => {
      if (slot.overall < draft.currentPick) return false;
      if (userTeams.has(team.id)) {
        // Self-trade target: count picks originally belonging to this team
        return slot.team === team.id;
      }
      if (assignedUserId === null) {
        return (
          slot.team === team.id &&
          (slot.ownerOverride === undefined || slot.ownerOverride === null)
        );
      }
      const controller = getPickController(draft, slot);
      return controller === assignedUserId;
    });

    if (!hasRemainingPicks) continue;

    if (userTeams.has(team.id)) {
      // Self-trade target
      targets.push({ id: team.id, name: team.name, isCpu: false });
    } else if (assignedUserId === null) {
      targets.push({ id: team.id, name: team.name, isCpu: true });
    } else {
      const discordId = draft.participants[assignedUserId];
      targets.push({
        id: team.id,
        name: discordId ? `<@${discordId}> (${team.name})` : team.name,
        isCpu: false,
      });
    }
  }

  if (targets.length === 0) {
    await interaction.reply({
      content: 'No teams available to trade with.',
      ephemeral: true,
    });
    return;
  }

  // Clear any existing state for this user/draft
  tradeProposalState.delete(getStateKey(user.id, draftId));

  const { embed, components } = buildTradeTargetSelect(draftId, targets);
  await interaction.reply({
    embeds: [embed],
    components,
    ephemeral: true,
  });
}

/**
 * Handle trade target selection
 */
export async function handleTradeTargetSelect(
  interaction: StringSelectMenuInteraction,
  draftId: string,
): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft || draft.status !== 'active') {
    await interaction.update({
      content: `This draft is ${describeDraftStatus(draft?.status ?? 'complete')}.`,
      embeds: [],
      components: [],
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );

  const targetValue = interaction.values[0];
  if (!isTeamAbbreviation(targetValue)) {
    await interaction.followUp({
      content: 'Invalid team selection.',
      ephemeral: true,
    });
    return;
  }
  const targetTeam = targetValue;
  const targetUserId = draft.teamAssignments[targetTeam];
  const teamInfo = teamSeeds.get(targetTeam);
  const targetName = teamInfo?.name ?? targetTeam;

  // Store the target in state
  const stateKey = getStateKey(user.id, draftId);
  tradeProposalState.set(stateKey, {
    targetTeam,
    targetUserId,
    targetName,
    givingValues: [],
    createdAt: Date.now(),
  });

  // Get user's available picks (exclude target team's picks for self-trades)
  let userPicks = getAvailableCurrentPicks(draft, user.id);
  let userFuturePicks = getAvailableFuturePicks(draft, user.id);
  if (targetUserId === user.id) {
    userPicks = userPicks.filter((slot) => slot.team !== targetTeam);
    userFuturePicks = userFuturePicks.filter(
      (fp) => fp.ownerTeam !== targetTeam,
    );
  }

  const { embed, components } = buildTradeGiveSelect(
    draftId,
    targetName,
    userPicks,
    userFuturePicks,
    draft.config.year,
  );
  await interaction.update({
    embeds: [embed],
    components,
  });
}

/**
 * Handle picks to give selection
 */
export async function handleTradeGiveSelect(
  interaction: StringSelectMenuInteraction,
  draftId: string,
): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft || draft.status !== 'active') {
    await interaction.update({
      content: `This draft is ${describeDraftStatus(draft?.status ?? 'complete')}.`,
      embeds: [],
      components: [],
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );

  const stateKey = getStateKey(user.id, draftId);
  const state = tradeProposalState.get(stateKey);

  if (!state) {
    await interaction.update({
      content: 'Trade session expired. Please start over.',
      embeds: [],
      components: [],
    });
    return;
  }

  // Store raw select values (current + future picks)
  state.givingValues = interaction.values;

  // Get target's available current picks
  const targetPicks = draft.pickOrder.filter((slot) => {
    if (slot.overall < draft.currentPick) return false;
    if (state.targetUserId === null) {
      return (
        slot.team === state.targetTeam &&
        (slot.ownerOverride === undefined || slot.ownerOverride === null)
      );
    }
    if (state.targetUserId === user.id) {
      return slot.team === state.targetTeam;
    }
    const controller = getPickController(draft, slot);
    return controller === state.targetUserId;
  });

  // Get target's future picks
  const targetFuturePicks = getTeamFuturePicks(draft, state.targetTeam);

  const { embed, components } = buildTradeReceiveSelect(
    draftId,
    state.targetName,
    targetPicks,
    targetFuturePicks,
    state.givingValues,
    draft.config.year,
  );
  await interaction.update({
    embeds: [embed],
    components,
  });
}

/**
 * Handle picks to receive selection - finalize the trade proposal
 */
export async function handleTradeReceiveSelect(
  interaction: StringSelectMenuInteraction,
  draftId: string,
): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft || draft.status !== 'active') {
    await interaction.update({
      content: `This draft is ${describeDraftStatus(draft?.status ?? 'complete')}.`,
      embeds: [],
      components: [],
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );

  const stateKey = getStateKey(user.id, draftId);
  const state = tradeProposalState.get(stateKey);

  if (!state || state.givingValues.length === 0) {
    await interaction.update({
      content: 'Trade session expired. Please start over.',
      embeds: [],
      components: [],
    });
    return;
  }

  // Parse all select menu values into TradePieces
  const proposerGives = state.givingValues.map(parseTradePieceValue);
  const proposerReceives = interaction.values.map(parseTradePieceValue);

  // Validate picks are still available (not already drafted)
  const picksValidation = validateTradePicksAvailable(
    { proposerGives, proposerReceives } as Trade,
    draft,
  );
  if (!picksValidation.valid) {
    await interaction.update({
      content:
        picksValidation.error ??
        'Some picks in this trade are no longer available.',
      embeds: [],
      components: [],
    });
    tradeProposalState.delete(stateKey);
    return;
  }

  // Validate proposer owns the picks they're giving
  const ownershipValidation = validateUserOwnsPicks(
    user.id,
    proposerGives,
    draft,
  );
  if (!ownershipValidation.valid) {
    await interaction.update({
      content:
        ownershipValidation.error ??
        "You don't own some of the picks you're offering.",
      embeds: [],
      components: [],
    });
    tradeProposalState.delete(stateKey);
    return;
  }

  // Determine proposer's team (non-target team they control)
  const userTeams = Object.entries(draft.teamAssignments)
    .filter(([, uid]) => uid === user.id)
    .map(([team]) => team as TeamAbbreviation);
  const proposerTeam =
    userTeams.find((t) => t !== state.targetTeam) ?? userTeams[0];

  // Create the trade
  const trade = await createTrade({
    draftId,
    proposerId: user.id,
    proposerTeam,
    recipientId: state.targetUserId,
    recipientTeam: state.targetTeam,
    proposerGives,
    proposerReceives,
  });

  // Clear the proposal state
  tradeProposalState.delete(stateKey);

  const teamInfoMap = buildTeamInfoMap();

  if (state.targetUserId === user.id) {
    // Self-trade - auto-execute immediately
    await acceptTrade(trade.id, user.id);
    await executeTrade(trade, draft);

    const proposerDiscordId = draft.participants[user.id];
    const proposerName = proposerDiscordId
      ? `<@${proposerDiscordId}>`
      : 'Unknown';

    const { embed } = buildTradeAcceptedEmbed(
      trade,
      proposerName,
      state.targetName,
      teamInfoMap,
    );

    await interaction.update({
      content: 'Trade executed!',
      embeds: [],
      components: [],
    });

    const channel = getSendableChannel(interaction);
    if (channel) {
      await channel.send({ embeds: [embed] });
    }
  } else if (state.targetUserId === null) {
    // CPU trade - evaluate immediately
    const evaluation = evaluateCpuTrade(trade, draft);
    const proposerDiscordId = draft.participants[user.id];
    const proposerName = proposerDiscordId
      ? `<@${proposerDiscordId}>`
      : 'Unknown';

    const { embed, components } = buildCpuTradeProposalEmbed(
      trade,
      proposerName,
      state.targetName,
      teamInfoMap,
      evaluation,
    );

    // Clear the ephemeral message and post to channel
    await interaction.update({
      content: 'Trade proposal sent!',
      embeds: [],
      components: [],
    });

    const channel = getSendableChannel(interaction);
    if (channel) {
      await channel.send({
        embeds: [embed],
        components,
      });
    }
  } else {
    // User-to-user trade - send proposal to recipient
    const proposerDiscordId = draft.participants[user.id];
    const recipientDiscordId = draft.participants[state.targetUserId];
    const proposerName = proposerDiscordId
      ? `<@${proposerDiscordId}>`
      : 'Unknown';
    const recipientName = recipientDiscordId
      ? `<@${recipientDiscordId}>`
      : state.targetName;

    const { embed, components } = buildTradeProposalEmbed(
      trade,
      proposerName,
      recipientName,
      teamInfoMap,
      DEFAULT_TRADE_TIMEOUT_SECONDS,
    );

    // Capture channel reference before interaction goes stale
    const channel = getSendableChannel(interaction);

    // Set trade expiration timer
    setTradeTimer(trade.id, DEFAULT_TRADE_TIMEOUT_SECONDS, async () => {
      try {
        await expireTrade(trade.id);
        if (channel) {
          const { embed: expiredEmbed } = buildTradeExpiredEmbed(
            proposerName,
            recipientName,
          );
          await channel.send({ embeds: [expiredEmbed] });
        }
      } catch (error) {
        console.error(
          `Trade timer expired but failed to process trade ${trade.id}:`,
          error,
        );
      }
    });

    // Clear the ephemeral message and post to channel
    await interaction.update({
      content: 'Trade proposal sent!',
      embeds: [],
      components: [],
    });

    if (channel) {
      await channel.send({
        content: recipientDiscordId ? `<@${recipientDiscordId}>` : undefined,
        embeds: [embed],
        components,
      });
    }
  }
}

/**
 * Handle trade flow cancellation
 */
export async function handleTradeFlowCancel(
  interaction: ButtonInteraction,
  draftId: string,
): Promise<void> {
  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );

  // Clear state
  tradeProposalState.delete(getStateKey(user.id, draftId));

  await interaction.update({
    content: 'Trade cancelled.',
    embeds: [],
    components: [],
  });
}
