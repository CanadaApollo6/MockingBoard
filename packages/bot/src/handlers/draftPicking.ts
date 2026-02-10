import type {
  ButtonInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import type {
  Draft,
  DraftSlot,
  TeamAbbreviation,
  PositionFilterGroup,
} from '@mockingboard/shared';
import { getOrCreateUser } from '../services/user.service.js';
import {
  getDraft,
  updateDraft,
  recordPickAndAdvance,
  clearPickTimer,
  getPickController,
} from '../services/draft.service.js';
import { getCachedPlayers } from '../commands/draft.js';
import {
  buildOnTheClockEmbed,
  buildPickAnnouncementEmbed,
  buildPausedEmbed,
} from '../components/draftEmbed.js';
import {
  teamSeeds,
  getSendableChannel,
  sendFollowUp,
  resolveDiscordId,
  describeDraftStatus,
  assertDraftCreator,
  type DraftInteraction,
} from './shared.js';
import { advanceDraft, postDraftSummary } from './draftAdvance.js';

/** Resolve the team that currently owns a slot (respects trade overrides). */
function slotTeam(slot: DraftSlot): TeamAbbreviation {
  return slot.teamOverride ?? slot.team;
}

/**
 * Handle "Pause Draft" button click
 */
export async function handlePause(
  interaction: ButtonInteraction,
  draftId: string,
): Promise<void> {
  await interaction.deferUpdate();

  const draft = await getDraft(draftId);
  if (!draft || draft.status !== 'active') {
    await interaction.followUp({
      content: 'This draft cannot be paused.',
      ephemeral: true,
    });
    return;
  }

  const { authorized } = await assertDraftCreator(interaction, draft, 'pause');
  if (!authorized) return;

  clearPickTimer(draftId);
  await updateDraft(draftId, { status: 'paused' });

  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  if (!currentSlot) {
    console.error(
      `Pause: no slot at pick ${draft.currentPick} for draft ${draftId}`,
    );
    return;
  }

  const teamName =
    teamSeeds.get(slotTeam(currentSlot))?.name ?? slotTeam(currentSlot);
  const { embed, components } = buildPausedEmbed(draft, currentSlot, teamName);

  const channel = getSendableChannel(interaction);
  if (channel) {
    await channel.send({ embeds: [embed], components });
  }
}

/**
 * Handle "Resume Draft" button click
 */
export async function handleResume(
  interaction: ButtonInteraction,
  draftId: string,
): Promise<void> {
  await interaction.deferUpdate();

  const draft = await getDraft(draftId);
  if (!draft || draft.status !== 'paused') {
    await interaction.followUp({
      content: 'This draft is not paused.',
      ephemeral: true,
    });
    return;
  }

  const { authorized } = await assertDraftCreator(interaction, draft, 'resume');
  if (!authorized) return;

  await updateDraft(draftId, { status: 'active' });
  draft.status = 'active';

  await interaction.followUp('The draft has resumed!');

  // Continue from current pick
  await advanceDraft(interaction, draft);
}

/**
 * Handle pick button click (quick pick from on-the-clock embed)
 */
export async function handlePickButton(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  draftId: string,
  playerId: string,
  expectedOverall?: number,
): Promise<void> {
  await interaction.deferUpdate();

  const draft = await getDraft(draftId);
  if (!draft) {
    await interaction.followUp({
      content: 'Draft not found.',
      ephemeral: true,
    });
    return;
  }

  // Validate this button belongs to the current pick
  if (expectedOverall) {
    const currentSlot = draft.pickOrder[draft.currentPick - 1];
    if (!currentSlot || currentSlot.overall !== expectedOverall) {
      await interaction.followUp({
        content:
          'This pick has already passed. Use the latest on-the-clock embed.',
        ephemeral: true,
      });
      return;
    }
  }

  await handlePick(interaction, draft, playerId);
}

/**
 * Handle position filter button click - re-renders embed with filtered players
 */
export async function handlePositionFilter(
  interaction: ButtonInteraction,
  draftId: string,
  positionFilter: PositionFilterGroup,
  expectedOverall?: number,
): Promise<void> {
  const draft = await getDraft(draftId);
  if (!draft || draft.status !== 'active') {
    await interaction.reply({
      content: 'This draft is not active.',
      ephemeral: true,
    });
    return;
  }

  const currentSlot = draft.pickOrder[draft.currentPick - 1];

  // Validate this button belongs to the current pick
  if (
    expectedOverall &&
    currentSlot &&
    currentSlot.overall !== expectedOverall
  ) {
    await interaction.reply({
      content:
        'This pick has already passed. Use the latest on-the-clock embed.',
      ephemeral: true,
    });
    return;
  }
  if (!currentSlot) {
    await interaction.reply({
      content: 'No active pick.',
      ephemeral: true,
    });
    return;
  }

  // Verify the user clicking is the one on the clock
  const pickController = getPickController(draft, currentSlot);
  const discordUserId = resolveDiscordId(draft, pickController ?? '');

  if (discordUserId !== interaction.user.id) {
    await interaction.reply({
      content: 'Only the player on the clock can filter.',
      ephemeral: true,
    });
    return;
  }

  // Get available players
  const allPlayers = await getCachedPlayers(draft.config.year);
  const pickedIds = new Set(draft.pickedPlayerIds ?? []);
  const available = allPlayers
    .filter((p) => !pickedIds.has(p.id))
    .sort((a, b) => a.consensusRank - b.consensusRank);

  const teamName =
    teamSeeds.get(slotTeam(currentSlot))?.name ?? slotTeam(currentSlot);

  const { embed, components } = buildOnTheClockEmbed(
    draft,
    currentSlot,
    teamName,
    discordUserId,
    available,
    true,
    positionFilter,
  );

  await interaction.update({ embeds: [embed], components });
}

/**
 * Core pick logic - shared by buttons and /draft command
 */
export async function handlePick(
  interaction: DraftInteraction,
  draft: Draft,
  playerId: string,
): Promise<void> {
  if (draft.status !== 'active') {
    await sendFollowUp(
      interaction,
      `This draft is ${describeDraftStatus(draft.status)}.`,
    );
    return;
  }

  // Validate it's this user's turn
  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );
  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  if (!currentSlot) {
    await sendFollowUp(interaction, 'No active pick found.');
    return;
  }

  // Use getPickController to handle traded picks
  const pickController = getPickController(draft, currentSlot);
  if (pickController !== user.id) {
    await sendFollowUp(interaction, "It's not your turn to pick.");
    return;
  }

  // Validate player is available
  if ((draft.pickedPlayerIds ?? []).includes(playerId)) {
    await sendFollowUp(interaction, 'That player has already been drafted.');
    return;
  }

  clearPickTimer(draft.id);

  const { isComplete } = await recordPickAndAdvance(
    draft.id,
    playerId,
    user.id,
  );

  // Announce the pick
  const allPlayers = await getCachedPlayers(draft.config.year);
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
  const player = playerMap.get(playerId);
  const teamName =
    teamSeeds.get(slotTeam(currentSlot))?.name ?? slotTeam(currentSlot);

  const channel = getSendableChannel(interaction);
  if (player && channel) {
    const { embed } = buildPickAnnouncementEmbed(
      currentSlot,
      player,
      teamName,
      'human',
    );
    await channel.send({ embeds: [embed] });
  }

  if (isComplete) {
    await postDraftSummary(interaction, draft.id, allPlayers);
    return;
  }

  // Refresh draft state and continue
  const updatedDraft = await getDraft(draft.id);
  if (updatedDraft) {
    await advanceDraft(interaction, updatedDraft);
  }
}
