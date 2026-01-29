import type {
  ButtonInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import type { TeamAbbreviation, TradePiece } from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';
import { getOrCreateUser } from '../services/user.service.js';
import { getDraft, getPickController } from '../services/draft.service.js';
import {
  createTrade,
  evaluateCpuTrade,
  getAvailableCurrentPicks,
} from '../services/trade.service.js';
import {
  buildTradeTargetSelect,
  buildTradeGiveSelect,
  buildTradeReceiveSelect,
  buildCpuTradeProposalEmbed,
  buildTradeProposalEmbed,
} from '../components/tradeEmbed.js';
import {
  setTradeTimer,
  DEFAULT_TRADE_TIMEOUT_SECONDS,
} from '../services/tradeTimer.service.js';
import { teamSeeds, getSendableChannel } from './shared.js';

// Store in-progress trade proposals (userId:draftId -> state)
interface TradeProposalState {
  targetTeam: TeamAbbreviation;
  targetUserId: string | null; // null = CPU
  targetName: string;
  givingPicks: number[];
}

const tradeProposalState = new Map<string, TradeProposalState>();

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
      content: 'This draft is not active.',
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
    // Skip teams the user controls
    if (userTeams.has(team.id)) continue;

    const assignedUserId = draft.teamAssignments[team.id];

    // Check if this team has any available picks
    const teamPicks = draft.pickOrder.filter((slot) => {
      if (slot.overall < draft.currentPick) return false;
      const controller = getPickController(draft, slot);
      return controller === assignedUserId;
    });

    if (teamPicks.length === 0) continue;

    if (assignedUserId === null) {
      // CPU team
      targets.push({ id: team.id, name: team.name, isCpu: true });
    } else {
      // Human player
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
      content: 'This draft is not active.',
      embeds: [],
      components: [],
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );

  const targetTeam = interaction.values[0] as TeamAbbreviation;
  const targetUserId = draft.teamAssignments[targetTeam];
  const teamInfo = teamSeeds.get(targetTeam);
  const targetName = teamInfo?.name ?? targetTeam;

  // Store the target in state
  const stateKey = getStateKey(user.id, draftId);
  tradeProposalState.set(stateKey, {
    targetTeam,
    targetUserId,
    targetName,
    givingPicks: [],
  });

  // Get user's available picks
  const userPicks = getAvailableCurrentPicks(draft, user.id);

  const { embed, components } = buildTradeGiveSelect(
    draftId,
    targetName,
    userPicks,
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
      content: 'This draft is not active.',
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

  // Parse selected picks
  const givingPicks = interaction.values.map((v) => parseInt(v, 10));
  state.givingPicks = givingPicks;

  // Get target's available picks
  const targetPicks = draft.pickOrder.filter((slot) => {
    if (slot.overall < draft.currentPick) return false;
    const controller = getPickController(draft, slot);
    return controller === state.targetUserId;
  });

  const { embed, components } = buildTradeReceiveSelect(
    draftId,
    state.targetName,
    targetPicks,
    givingPicks,
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
      content: 'This draft is not active.',
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

  if (!state || state.givingPicks.length === 0) {
    await interaction.update({
      content: 'Trade session expired. Please start over.',
      embeds: [],
      components: [],
    });
    return;
  }

  // Parse selected picks
  const receivingPicks = interaction.values.map((v) => parseInt(v, 10));

  // Build trade pieces
  const proposerGives: TradePiece[] = state.givingPicks.map((overall) => {
    const slot = draft.pickOrder.find((s) => s.overall === overall);
    return {
      type: 'current-pick',
      overall,
      originalTeam: slot?.team,
    };
  });

  const proposerReceives: TradePiece[] = receivingPicks.map((overall) => {
    const slot = draft.pickOrder.find((s) => s.overall === overall);
    return {
      type: 'current-pick',
      overall,
      originalTeam: slot?.team,
    };
  });

  // Create the trade
  const trade = await createTrade({
    draftId,
    proposerId: user.id,
    recipientId: state.targetUserId,
    recipientTeam: state.targetTeam,
    proposerGives,
    proposerReceives,
  });

  // Clear the proposal state
  tradeProposalState.delete(stateKey);

  // Build team info map for embeds
  const teamInfoMap = new Map(
    teams.map((t) => [t.id, { name: t.name, abbreviation: t.id }]),
  );

  if (state.targetUserId === null) {
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

    // Set trade expiration timer
    setTradeTimer(trade.id, DEFAULT_TRADE_TIMEOUT_SECONDS * 1000, async () => {
      // This will be called when the trade expires
      // The handler for expired trades is already in trade.ts
    });

    // Clear the ephemeral message and post to channel
    await interaction.update({
      content: 'Trade proposal sent!',
      embeds: [],
      components: [],
    });

    const channel = getSendableChannel(interaction);
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
