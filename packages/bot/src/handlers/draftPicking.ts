import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
} from 'discord.js';
import type {
  Draft,
  Player,
  TeamAbbreviation,
  PositionFilterGroup,
} from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';
import { getOrCreateUser } from '../services/user.service.js';
import {
  getDraft,
  updateDraft,
  recordPickAndAdvance,
  setPickTimer,
  clearPickTimer,
  getPickController,
} from '../services/draft.service.js';
import { selectCpuPick } from '../services/cpu.service.js';
import { getCachedPlayers } from '../commands/draft.js';
import {
  buildOnTheClockEmbed,
  buildPickAnnouncementEmbed,
  buildDraftSummaryEmbed,
  buildPausedEmbed,
  buildCpuPicksBatchEmbed,
} from '../components/draftEmbed.js';
import { getPicksByDraft } from '../services/pick.service.js';
import {
  teamSeeds,
  getSendableChannel,
  sendFollowUp,
  resolveDiscordId,
  type DraftInteraction,
} from './shared.js';

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

  // Verify the creator is pausing
  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );
  if (draft.createdBy !== user.id) {
    await interaction.followUp({
      content: 'Only the draft creator can pause the draft.',
      ephemeral: true,
    });
    return;
  }

  clearPickTimer(draftId);
  await updateDraft(draftId, { status: 'paused' });

  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  if (!currentSlot) return;

  const teamName = teamSeeds.get(currentSlot.team)?.name ?? currentSlot.team;
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

  // Verify the creator is resuming
  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );
  if (draft.createdBy !== user.id) {
    await interaction.followUp({
      content: 'Only the draft creator can resume the draft.',
      ephemeral: true,
    });
    return;
  }

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
  interaction: ButtonInteraction,
  draftId: string,
  playerId: string,
): Promise<void> {
  await interaction.deferUpdate();

  const draft = await getDraft(draftId);
  if (!draft) return;

  await handlePick(interaction, draft, playerId);
}

/**
 * Handle position filter button click - re-renders embed with filtered players
 */
export async function handlePositionFilter(
  interaction: ButtonInteraction,
  draftId: string,
  positionFilter: PositionFilterGroup,
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

  const teamName = teamSeeds.get(currentSlot.team)?.name ?? currentSlot.team;

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
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  draft: Draft,
  playerId: string,
): Promise<void> {
  if (draft.status !== 'active') {
    await sendFollowUp(interaction, 'This draft is not active.');
    return;
  }

  // Validate it's this user's turn
  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );
  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  if (!currentSlot) return;

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
  const teamName = teamSeeds.get(currentSlot.team)?.name ?? currentSlot.team;

  const channel = getSendableChannel(interaction);
  if (player && channel) {
    const { embed } = buildPickAnnouncementEmbed(
      currentSlot,
      player,
      teamName,
      false,
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

// ---- Draft Advancement Loop ----

/**
 * Advance the draft to the next pick (CPU or human)
 */
export async function advanceDraft(
  interaction: DraftInteraction,
  draft: Draft,
): Promise<void> {
  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  if (!currentSlot) return;

  // Use getPickController to handle traded picks
  const pickController = getPickController(draft, currentSlot);
  const allPlayers = await getCachedPlayers(draft.config.year);
  const pickedIds = new Set(draft.pickedPlayerIds ?? []);
  const available = allPlayers.filter((p) => !pickedIds.has(p.id));

  if (available.length === 0) {
    console.error('No available players - this should not happen');
    return;
  }

  if (pickController === null) {
    // CPU pick - behavior depends on cpuSpeed setting
    const cpuSpeed = draft.config.cpuSpeed ?? 'normal';

    if (cpuSpeed === 'instant') {
      // Batch all consecutive CPU picks
      await doCpuPicksBatch(interaction, draft, allPlayers);
    } else {
      // Individual CPU picks with delay
      const delay = cpuSpeed === 'fast' ? 300 : 1500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      await doCpuPick(interaction, draft, currentSlot, available);
    }
  } else {
    // Human pick -- post on-the-clock message
    await postOnTheClock(
      interaction,
      draft,
      currentSlot,
      pickController,
      available,
    );
  }
}

async function doCpuPicksBatch(
  interaction: DraftInteraction,
  draft: Draft,
  allPlayers: Player[],
): Promise<void> {
  const batchedPicks: {
    slot: (typeof draft.pickOrder)[0];
    player: Player;
    teamName: string;
  }[] = [];
  let currentDraft = draft;

  // Process all consecutive CPU picks
  while (true) {
    const currentSlot = currentDraft.pickOrder[currentDraft.currentPick - 1];
    if (!currentSlot) break;

    const pickController = getPickController(currentDraft, currentSlot);
    if (pickController !== null) break; // Hit a human pick

    const pickedIds = new Set(currentDraft.pickedPlayerIds ?? []);
    const available = allPlayers.filter((p) => !pickedIds.has(p.id));
    if (available.length === 0) break;

    const teamSeed = teamSeeds.get(currentSlot.team);
    const teamNeeds = teamSeed?.needs ?? [];
    const player = selectCpuPick(available, teamNeeds);
    const teamName = teamSeed?.name ?? currentSlot.team;

    const { isComplete } = await recordPickAndAdvance(
      currentDraft.id,
      player.id,
      null,
    );

    batchedPicks.push({ slot: currentSlot, player, teamName });

    if (isComplete) {
      // Post batch summary then draft summary
      const batchChannel = getSendableChannel(interaction);
      if (batchChannel && batchedPicks.length > 0) {
        const { embed } = buildCpuPicksBatchEmbed(batchedPicks);
        await batchChannel.send({ embeds: [embed] });
      }
      await postDraftSummary(interaction, currentDraft.id, allPlayers);
      return;
    }

    // Refresh draft state
    const refreshed = await getDraft(currentDraft.id);
    if (!refreshed || refreshed.status !== 'active') return;
    currentDraft = refreshed;
  }

  // Post batched CPU picks summary
  const batchChannel = getSendableChannel(interaction);
  if (batchChannel && batchedPicks.length > 0) {
    const { embed } = buildCpuPicksBatchEmbed(batchedPicks);
    await batchChannel.send({ embeds: [embed] });
  }

  // Continue to next pick (should be human or end of draft)
  const updatedDraft = await getDraft(draft.id);
  if (updatedDraft && updatedDraft.status === 'active') {
    await advanceDraft(interaction, updatedDraft);
  }
}

async function doCpuPick(
  interaction: DraftInteraction,
  draft: Draft,
  slot: (typeof draft.pickOrder)[0],
  available: Player[],
): Promise<void> {
  const teamSeed = teamSeeds.get(slot.team);
  const teamNeeds = teamSeed?.needs ?? [];
  const player = selectCpuPick(available, teamNeeds);
  const teamName = teamSeed?.name ?? slot.team;

  const { isComplete } = await recordPickAndAdvance(draft.id, player.id, null);

  const channel = getSendableChannel(interaction);
  if (channel) {
    const { embed } = buildPickAnnouncementEmbed(slot, player, teamName, true);
    await channel.send({ embeds: [embed] });
  }

  if (isComplete) {
    const allPlayers = await getCachedPlayers(draft.config.year);
    await postDraftSummary(interaction, draft.id, allPlayers);
    return;
  }

  // Continue to next pick
  const updatedDraft = await getDraft(draft.id);
  if (updatedDraft) {
    await advanceDraft(interaction, updatedDraft);
  }
}

async function postOnTheClock(
  interaction: DraftInteraction,
  draft: Draft,
  slot: (typeof draft.pickOrder)[0],
  internalUserId: string,
  available: Player[],
): Promise<void> {
  const discordUserId = resolveDiscordId(draft, internalUserId);

  const teamName = teamSeeds.get(slot.team)?.name ?? slot.team;
  // Sort all available players by rank - embed handles filtering/slicing
  const sortedPlayers = available.sort(
    (a, b) => a.consensusRank - b.consensusRank,
  );

  const { embed, components } = buildOnTheClockEmbed(
    draft,
    slot,
    teamName,
    discordUserId,
    sortedPlayers,
  );

  const channel = getSendableChannel(interaction);
  if (channel) {
    await channel.send({
      content: discordUserId ? `<@${discordUserId}>` : undefined,
      embeds: [embed],
      components,
    });
  }

  // Set pick timer
  if (draft.config.secondsPerPick > 0) {
    setPickTimer(draft.id, draft.config.secondsPerPick, async () => {
      try {
        // Auto-pick on clock expiration
        const freshDraft = await getDraft(draft.id);
        if (!freshDraft || freshDraft.status !== 'active') return;

        const currentSlot = freshDraft.pickOrder[freshDraft.currentPick - 1];
        if (!currentSlot || currentSlot.overall !== slot.overall) return;

        const allPlayers = await getCachedPlayers(freshDraft.config.year);
        const pickedIds = new Set(freshDraft.pickedPlayerIds ?? []);
        const avail = allPlayers.filter((p) => !pickedIds.has(p.id));

        if (avail.length === 0) {
          console.error('No available players in timer callback');
          return;
        }

        const teamSeed = teamSeeds.get(slot.team);
        const player = selectCpuPick(avail, teamSeed?.needs ?? []);
        const tName = teamSeed?.name ?? slot.team;

        const { isComplete } = await recordPickAndAdvance(
          freshDraft.id,
          player.id,
          null,
        );

        const timerChannel = getSendableChannel(interaction);
        if (timerChannel) {
          const { embed } = buildPickAnnouncementEmbed(
            currentSlot,
            player,
            tName,
            true,
          );
          await timerChannel.send({ embeds: [embed] });
        }

        if (isComplete) {
          await postDraftSummary(interaction, freshDraft.id, allPlayers);
          return;
        }

        const updatedDraft = await getDraft(freshDraft.id);
        if (updatedDraft) {
          await advanceDraft(interaction, updatedDraft);
        }
      } catch (error) {
        console.error(`Timer callback error for draft ${draft.id}:`, error);
      }
    });
  }
}

async function postDraftSummary(
  interaction: DraftInteraction,
  draftId: string,
  allPlayers: Player[],
): Promise<void> {
  const picks = await getPicksByDraft(draftId);
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
  const teamNameMap = new Map(
    teams.map((t) => [t.id as TeamAbbreviation, t.name]),
  );

  const { embed } = buildDraftSummaryEmbed(picks, playerMap, teamNameMap);

  const channel = getSendableChannel(interaction);
  if (channel) {
    await channel.send({ embeds: [embed] });
  }
}
