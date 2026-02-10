import type {
  Draft,
  DraftSlot,
  Player,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { teams, prepareCpuPick, CPU_SPEED_DELAY } from '@mockingboard/shared';
import {
  getDraft,
  recordPickAndAdvance,
  setPickTimer,
  getPickController,
} from '../services/draft.service.js';
import { getCachedPlayers } from '../commands/draft.js';
import {
  buildOnTheClockEmbed,
  buildPickAnnouncementEmbed,
  buildDraftSummaryEmbed,
  buildCpuPicksBatchEmbed,
} from '../components/draftEmbed.js';
import { getPicksByDraft } from '../services/pick.service.js';
import {
  teamSeeds,
  getSendableChannel,
  resolveDiscordId,
  type DraftInteraction,
} from './shared.js';

/** Resolve the team that currently owns a slot (respects trade overrides). */
function slotTeam(slot: DraftSlot): TeamAbbreviation {
  return slot.teamOverride ?? slot.team;
}

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
      const delay = CPU_SPEED_DELAY[cpuSpeed] ?? CPU_SPEED_DELAY.normal;
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
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  // Process all consecutive CPU picks
  while (true) {
    const currentSlot = currentDraft.pickOrder[currentDraft.currentPick - 1];
    if (!currentSlot) break;

    const pickController = getPickController(currentDraft, currentSlot);
    if (pickController !== null) break; // Hit a human pick

    const pickedIds = new Set(currentDraft.pickedPlayerIds ?? []);
    const available = allPlayers.filter((p) => !pickedIds.has(p.id));
    if (available.length === 0) break;

    const player = prepareCpuPick({
      team: slotTeam(currentSlot),
      pickOrder: currentDraft.pickOrder,
      pickedPlayerIds: currentDraft.pickedPlayerIds ?? [],
      playerMap,
      available,
    });
    const teamName =
      teamSeeds.get(slotTeam(currentSlot))?.name ?? slotTeam(currentSlot);

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
  const allPlayers = await getCachedPlayers(draft.config.year);
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
  const player = prepareCpuPick({
    team: slotTeam(slot),
    pickOrder: draft.pickOrder,
    pickedPlayerIds: draft.pickedPlayerIds ?? [],
    playerMap,
    available,
  });
  const teamName = teamSeeds.get(slotTeam(slot))?.name ?? slotTeam(slot);

  const { isComplete } = await recordPickAndAdvance(draft.id, player.id, null);

  const channel = getSendableChannel(interaction);
  if (channel) {
    const { embed } = buildPickAnnouncementEmbed(slot, player, teamName, 'cpu');
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

  const teamName = teamSeeds.get(slotTeam(slot))?.name ?? slotTeam(slot);
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

        const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
        const player = prepareCpuPick({
          team: slotTeam(slot),
          pickOrder: freshDraft.pickOrder,
          pickedPlayerIds: freshDraft.pickedPlayerIds ?? [],
          playerMap,
          available: avail,
        });
        const tName = teamSeeds.get(slotTeam(slot))?.name ?? slotTeam(slot);

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
            'timer',
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

export async function postDraftSummary(
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
