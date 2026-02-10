import type { ButtonInteraction } from 'discord.js';
import { getOrCreateUser } from '../services/user.service.js';
import { getDraft, updateDraft } from '../services/draft.service.js';
import {
  getTrade,
  acceptTrade,
  rejectTrade,
  cancelTrade,
  executeTrade,
} from '../services/trade.service.js';
import { clearTradeTimer } from '../services/tradeTimer.service.js';
import {
  buildTradeAcceptedEmbed,
  buildTradeRejectedEmbed,
  buildTradeCancelledEmbed,
} from '../components/tradeEmbed.js';
import { teamSeeds, getSendableChannel, buildTeamInfoMap } from './shared.js';
import { advanceDraft } from './draftAdvance.js';

async function advanceDraftAfterTrade(
  interaction: ButtonInteraction,
  draftId: string,
): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft) return;

  if (draft.status === 'paused') {
    await updateDraft(draftId, { status: 'active' });
    draft.status = 'active';
  }

  if (draft.status === 'active') {
    await advanceDraft(interaction, draft);
  }
}

/**
 * Handle trade accept button (user-to-user trades)
 */
export async function handleTradeAccept(
  interaction: ButtonInteraction,
  tradeId: string,
): Promise<void> {
  await interaction.deferUpdate();

  const trade = await getTrade(tradeId);
  if (!trade) {
    await interaction.followUp({
      content: 'Trade not found.',
      ephemeral: true,
    });
    return;
  }

  if (trade.status !== 'pending') {
    await interaction.followUp({
      content: 'This trade is no longer pending.',
      ephemeral: true,
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );
  if (trade.recipientId !== user.id) {
    await interaction.followUp({
      content: 'Only the trade recipient can accept this trade.',
      ephemeral: true,
    });
    return;
  }

  const draft = await getDraft(trade.draftId);
  if (!draft) {
    await interaction.followUp({
      content: 'Draft not found.',
      ephemeral: true,
    });
    return;
  }

  clearTradeTimer(tradeId);
  await acceptTrade(tradeId, user.id);
  await executeTrade(trade, draft);

  const proposerDiscordId = draft.participants[trade.proposerId];
  const recipientDiscordId = draft.participants[trade.recipientId];
  const proposerName = proposerDiscordId
    ? `<@${proposerDiscordId}>`
    : 'Unknown';
  const recipientName = recipientDiscordId
    ? `<@${recipientDiscordId}>`
    : 'Unknown';

  const { embed } = buildTradeAcceptedEmbed(
    trade,
    proposerName,
    recipientName,
    buildTeamInfoMap(),
  );

  const channel = getSendableChannel(interaction);
  if (channel) {
    await channel.send({ embeds: [embed] });
  }

  await advanceDraftAfterTrade(interaction, draft.id);
}

/**
 * Handle trade reject button (user-to-user trades)
 */
export async function handleTradeReject(
  interaction: ButtonInteraction,
  tradeId: string,
): Promise<void> {
  await interaction.deferUpdate();

  const trade = await getTrade(tradeId);
  if (!trade) {
    await interaction.followUp({
      content: 'Trade not found.',
      ephemeral: true,
    });
    return;
  }

  if (trade.status !== 'pending') {
    await interaction.followUp({
      content: 'This trade is no longer pending.',
      ephemeral: true,
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );
  if (trade.recipientId !== user.id) {
    await interaction.followUp({
      content: 'Only the trade recipient can reject this trade.',
      ephemeral: true,
    });
    return;
  }

  const draft = await getDraft(trade.draftId);
  if (!draft) {
    await interaction.followUp({
      content: 'Draft not found.',
      ephemeral: true,
    });
    return;
  }

  clearTradeTimer(tradeId);
  await rejectTrade(tradeId, user.id);

  const proposerDiscordId = draft.participants[trade.proposerId];
  const recipientDiscordId = draft.participants[trade.recipientId];
  const proposerName = proposerDiscordId
    ? `<@${proposerDiscordId}>`
    : 'Unknown';
  const recipientName = recipientDiscordId
    ? `<@${recipientDiscordId}>`
    : 'Unknown';

  const { embed } = buildTradeRejectedEmbed(trade, proposerName, recipientName);

  const channel = getSendableChannel(interaction);
  if (channel) {
    await channel.send({ embeds: [embed] });
  }

  await advanceDraftAfterTrade(interaction, draft.id);
}

/**
 * Handle trade cancel button (proposer cancels their own trade)
 */
export async function handleTradeCancel(
  interaction: ButtonInteraction,
  tradeId: string,
): Promise<void> {
  await interaction.deferUpdate();

  const trade = await getTrade(tradeId);
  if (!trade) {
    await interaction.followUp({
      content: 'Trade not found.',
      ephemeral: true,
    });
    return;
  }

  if (trade.status !== 'pending') {
    await interaction.followUp({
      content: 'This trade is no longer pending.',
      ephemeral: true,
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );
  if (trade.proposerId !== user.id) {
    await interaction.followUp({
      content: 'Only the trade proposer can cancel this trade.',
      ephemeral: true,
    });
    return;
  }

  const draft = await getDraft(trade.draftId);
  if (!draft) {
    await interaction.followUp({
      content: 'Draft not found.',
      ephemeral: true,
    });
    return;
  }

  clearTradeTimer(tradeId);
  await cancelTrade(tradeId, user.id);

  const proposerDiscordId = draft.participants[trade.proposerId];
  const proposerName = proposerDiscordId
    ? `<@${proposerDiscordId}>`
    : 'Unknown';

  const { embed } = buildTradeCancelledEmbed(proposerName);

  const channel = getSendableChannel(interaction);
  if (channel) {
    await channel.send({ embeds: [embed] });
  }

  await advanceDraftAfterTrade(interaction, draft.id);
}

/**
 * Handle trade confirm button (CPU trades that were accepted)
 */
export async function handleTradeConfirm(
  interaction: ButtonInteraction,
  tradeId: string,
): Promise<void> {
  await interaction.deferUpdate();

  const trade = await getTrade(tradeId);
  if (!trade) {
    await interaction.followUp({
      content: 'Trade not found.',
      ephemeral: true,
    });
    return;
  }

  if (trade.status !== 'pending') {
    await interaction.followUp({
      content: 'This trade is no longer pending.',
      ephemeral: true,
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );
  if (trade.proposerId !== user.id) {
    await interaction.followUp({
      content: 'Only the trade proposer can confirm this trade.',
      ephemeral: true,
    });
    return;
  }

  if (trade.recipientId !== null) {
    await interaction.followUp({
      content: 'This is not a CPU trade.',
      ephemeral: true,
    });
    return;
  }

  const draft = await getDraft(trade.draftId);
  if (!draft) {
    await interaction.followUp({
      content: 'Draft not found.',
      ephemeral: true,
    });
    return;
  }

  clearTradeTimer(tradeId);
  await acceptTrade(tradeId, user.id);
  await executeTrade(trade, draft);

  const proposerDiscordId = draft.participants[trade.proposerId];
  const proposerName = proposerDiscordId
    ? `<@${proposerDiscordId}>`
    : 'Unknown';
  const cpuTeamName =
    teamSeeds.get(trade.recipientTeam)?.name ?? trade.recipientTeam;

  const { embed } = buildTradeAcceptedEmbed(
    trade,
    proposerName,
    cpuTeamName,
    buildTeamInfoMap(),
  );

  const channel = getSendableChannel(interaction);
  if (channel) {
    await channel.send({ embeds: [embed] });
  }

  await advanceDraftAfterTrade(interaction, draft.id);
}

/**
 * Handle trade force button (bypasses CPU value check)
 */
export async function handleTradeForce(
  interaction: ButtonInteraction,
  tradeId: string,
): Promise<void> {
  await interaction.deferUpdate();

  const trade = await getTrade(tradeId);
  if (!trade) {
    await interaction.followUp({
      content: 'Trade not found.',
      ephemeral: true,
    });
    return;
  }

  if (trade.status !== 'pending') {
    await interaction.followUp({
      content: 'This trade is no longer pending.',
      ephemeral: true,
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );
  if (trade.proposerId !== user.id) {
    await interaction.followUp({
      content: 'Only the trade proposer can force this trade.',
      ephemeral: true,
    });
    return;
  }

  if (trade.recipientId !== null) {
    await interaction.followUp({
      content: 'Only CPU trades can be forced.',
      ephemeral: true,
    });
    return;
  }

  const draft = await getDraft(trade.draftId);
  if (!draft) {
    await interaction.followUp({
      content: 'Draft not found.',
      ephemeral: true,
    });
    return;
  }

  clearTradeTimer(tradeId);
  await acceptTrade(tradeId, user.id);
  await executeTrade({ ...trade, isForceTrade: true }, draft);

  const proposerDiscordId = draft.participants[trade.proposerId];
  const proposerName = proposerDiscordId
    ? `<@${proposerDiscordId}>`
    : 'Unknown';
  const cpuTeamName =
    teamSeeds.get(trade.recipientTeam)?.name ?? trade.recipientTeam;

  const { embed } = buildTradeAcceptedEmbed(
    trade,
    proposerName,
    `${cpuTeamName} (Forced)`,
    buildTeamInfoMap(),
  );

  const channel = getSendableChannel(interaction);
  if (channel) {
    await channel.send({ embeds: [embed] });
  }

  await advanceDraftAfterTrade(interaction, draft.id);
}
