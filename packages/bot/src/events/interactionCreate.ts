import {
  type Interaction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  type TextChannel,
  Collection,
} from 'discord.js';

// Helper to get a sendable channel, returns null if channel can't send
function getSendableChannel(interaction: {
  channel: unknown;
}): TextChannel | null {
  const channel = interaction.channel;
  if (channel && typeof channel === 'object' && 'send' in channel) {
    return channel as TextChannel;
  }
  return null;
}
import type { Draft, Player, TeamAbbreviation } from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';
import { getOrCreateUser } from '../services/user.service.js';
import {
  getDraft,
  updateDraft,
  recordPickAndAdvance,
  setPickTimer,
  clearPickTimer,
} from '../services/draft.service.js';
import { selectCpuPick } from '../services/cpu.service.js';
import { getCachedPlayers } from '../commands/draft.js';
import {
  buildLobbyEmbed,
  buildTeamSelectMenu,
  buildOnTheClockEmbed,
  buildPickAnnouncementEmbed,
  buildDraftSummaryEmbed,
  buildPausedEmbed,
  buildCpuPicksBatchEmbed,
} from '../components/draftEmbed.js';
import { getPicksByDraft } from '../services/pick.service.js';

// Commands are registered by index.ts
export const commands = new Collection<
  string,
  {
    data: { name: string };
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  }
>();

const teamSeeds = new Map(teams.map((t) => [t.id, t]));

export async function handleInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Command ${interaction.commandName} failed:`, error);
      const reply = {
        content: 'Something went wrong. Please try again.',
        ephemeral: true,
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply(reply);
      }
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);
    if (command?.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Autocomplete ${interaction.commandName} failed:`, error);
      }
    }
    return;
  }

  if (interaction.isButton()) {
    await handleButton(interaction);
    return;
  }

  if (interaction.isStringSelectMenu()) {
    await handleSelectMenu(interaction);
    return;
  }
}

// ---- Button Handlers ----

async function handleButton(interaction: ButtonInteraction) {
  const [action, draftId, ...rest] = interaction.customId.split(':');

  try {
    switch (action) {
      case 'join':
        await handleJoin(interaction, draftId);
        break;
      case 'start':
        await handleStart(interaction, draftId);
        break;
      case 'pick':
        await handlePickButton(interaction, draftId, rest[0]);
        break;
      case 'pause':
        await handlePause(interaction, draftId);
        break;
      case 'resume':
        await handleResume(interaction, draftId);
        break;
      default:
        await interaction.reply({
          content: 'Unknown action.',
          ephemeral: true,
        });
    }
  } catch (error) {
    console.error(`Button ${action} failed:`, error);
    const msg =
      error instanceof Error ? error.message : 'Something went wrong.';
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: msg, ephemeral: true });
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  }
}

async function handleJoin(interaction: ButtonInteraction, draftId: string) {
  await interaction.deferUpdate();

  const draft = await getDraft(draftId);
  if (!draft || draft.status !== 'lobby') {
    await interaction.followUp({
      content: 'This draft is no longer accepting players.',
      ephemeral: true,
    });
    return;
  }

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
    interaction.user.displayAvatarURL(),
  );

  // Check if already joined
  const existingTeam = Object.entries(draft.teamAssignments).find(
    ([, userId]) => userId === user.id,
  );
  if (existingTeam) {
    await interaction.followUp({
      content: `You're already in the draft as the ${teamSeeds.get(existingTeam[0] as TeamAbbreviation)?.name ?? existingTeam[0]}.`,
      ephemeral: true,
    });
    return;
  }

  if (draft.config.teamAssignmentMode === 'choice') {
    // Show team selection menu
    const availableTeams = teams.filter(
      (t) => draft.teamAssignments[t.id] === null,
    );
    if (availableTeams.length === 0) {
      await interaction.followUp({
        content: 'All teams have been claimed.',
        ephemeral: true,
      });
      return;
    }
    const { components } = buildTeamSelectMenu(draftId, availableTeams);
    await interaction.followUp({
      content: 'Choose your team:',
      components,
      ephemeral: true,
    });
    return;
  }

  // Random assignment
  const availableTeamIds = (
    Object.entries(draft.teamAssignments) as [TeamAbbreviation, string | null][]
  )
    .filter(([, userId]) => userId === null)
    .map(([teamId]) => teamId);

  if (availableTeamIds.length === 0) {
    await interaction.followUp({
      content: 'All teams have been claimed.',
      ephemeral: true,
    });
    return;
  }

  const randomTeam =
    availableTeamIds[Math.floor(Math.random() * availableTeamIds.length)];
  draft.teamAssignments[randomTeam] = user.id;
  draft.participants[user.id] = interaction.user.id;

  await updateDraft(draftId, {
    teamAssignments: draft.teamAssignments,
    participants: draft.participants,
  });

  // Rebuild lobby embed
  const joinedUsers = getJoinedUsers(draft);
  const { embed, components } = buildLobbyEmbed(draft, joinedUsers, teams);
  await interaction.editReply({ embeds: [embed], components });

  await interaction.followUp({
    content: `You've been assigned the **${teamSeeds.get(randomTeam)?.name ?? randomTeam}**!`,
    ephemeral: true,
  });
}

async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  const [action, draftId] = interaction.customId.split(':');

  if (action !== 'teamselect') return;

  try {
    await interaction.deferUpdate();

    const draft = await getDraft(draftId);
    if (!draft || draft.status !== 'lobby') {
      await interaction.followUp({
        content: 'This draft is no longer accepting players.',
        ephemeral: true,
      });
      return;
    }

    const user = await getOrCreateUser(
      interaction.user.id,
      interaction.user.username,
      interaction.user.displayAvatarURL(),
    );

    const selectedTeam = interaction.values[0] as TeamAbbreviation;

    if (draft.teamAssignments[selectedTeam] !== null) {
      await interaction.followUp({
        content: 'That team has already been claimed.',
        ephemeral: true,
      });
      return;
    }

    draft.teamAssignments[selectedTeam] = user.id;
    draft.participants[user.id] = interaction.user.id;
    await updateDraft(draftId, {
      teamAssignments: draft.teamAssignments,
      participants: draft.participants,
    });

    // For single-team mode, start the draft immediately
    if (draft.config.format === 'single-team') {
      await updateDraft(draftId, { status: 'active' });
      draft.status = 'active';

      const teamName = teamSeeds.get(selectedTeam)?.name ?? selectedTeam;
      await interaction.followUp({
        content: `You're drafting as the **${teamName}**! The draft is starting...`,
        ephemeral: true,
      });

      const channel = getSendableChannel(interaction);
      if (channel) {
        await channel.send('The solo draft has begun!');
      }

      await advanceDraft(interaction, draft);
      return;
    }

    const joinedUsers = getJoinedUsers(draft);
    // Update the original lobby message in the thread
    const thread = interaction.channel;
    if (thread) {
      const messages = await thread.messages.fetch({ limit: 20 });
      const lobbyMsg = messages.find(
        (m) =>
          m.author.id === interaction.client.user?.id &&
          m.embeds[0]?.title === 'Mock Draft Lobby',
      );
      if (lobbyMsg) {
        const { embed, components } = buildLobbyEmbed(
          draft,
          joinedUsers,
          teams,
        );
        await lobbyMsg.edit({ embeds: [embed], components });
      }
    }

    await interaction.followUp({
      content: `You've selected the **${teamSeeds.get(selectedTeam)?.name ?? selectedTeam}**!`,
      ephemeral: true,
    });
  } catch (error) {
    console.error('Team select failed:', error);
    const msg =
      error instanceof Error ? error.message : 'Something went wrong.';
    await interaction.followUp({ content: msg, ephemeral: true });
  }
}

async function handleStart(interaction: ButtonInteraction, draftId: string) {
  await interaction.deferUpdate();

  const draft = await getDraft(draftId);
  if (!draft || draft.status !== 'lobby') {
    await interaction.followUp({
      content: 'This draft cannot be started.',
      ephemeral: true,
    });
    return;
  }

  // Verify the creator is starting
  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
  );
  if (draft.createdBy !== user.id) {
    await interaction.followUp({
      content: 'Only the draft creator can start the draft.',
      ephemeral: true,
    });
    return;
  }

  // Need at least 1 human participant
  const hasHuman = Object.values(draft.teamAssignments).some((v) => v !== null);
  if (!hasHuman) {
    await interaction.followUp({
      content: 'At least one person must join before starting.',
      ephemeral: true,
    });
    return;
  }

  await updateDraft(draftId, { status: 'active' });
  draft.status = 'active';

  await interaction.followUp('The draft has started!');

  // Begin the pick loop
  await advanceDraft(interaction, draft);
}

async function handlePause(interaction: ButtonInteraction, draftId: string) {
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

async function handleResume(interaction: ButtonInteraction, draftId: string) {
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

async function handlePickButton(
  interaction: ButtonInteraction,
  draftId: string,
  playerId: string,
) {
  await interaction.deferUpdate();

  const draft = await getDraft(draftId);
  if (!draft) return;

  await handlePick(interaction, draft, playerId);
}

// ---- Core Pick Logic (shared by buttons and /draft command) ----

export async function handlePick(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  draft: Draft,
  playerId: string,
) {
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

  const assignedUserId = draft.teamAssignments[currentSlot.team];
  if (assignedUserId !== user.id) {
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

async function advanceDraft(
  interaction:
    | ButtonInteraction
    | ChatInputCommandInteraction
    | StringSelectMenuInteraction,
  draft: Draft,
) {
  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  if (!currentSlot) return;

  const assignedUserId = draft.teamAssignments[currentSlot.team];
  const allPlayers = await getCachedPlayers(draft.config.year);
  const pickedIds = new Set(draft.pickedPlayerIds ?? []);
  const available = allPlayers.filter((p) => !pickedIds.has(p.id));

  if (available.length === 0) {
    console.error('No available players - this should not happen');
    return;
  }

  if (assignedUserId === null) {
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
      assignedUserId,
      available,
    );
  }
}

async function doCpuPicksBatch(
  interaction:
    | ButtonInteraction
    | ChatInputCommandInteraction
    | StringSelectMenuInteraction,
  draft: Draft,
  allPlayers: Player[],
) {
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

    const assignedUserId = currentDraft.teamAssignments[currentSlot.team];
    if (assignedUserId !== null) break; // Hit a human pick

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
  interaction:
    | ButtonInteraction
    | ChatInputCommandInteraction
    | StringSelectMenuInteraction,
  draft: Draft,
  slot: (typeof draft.pickOrder)[0],
  available: Player[],
) {
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
  interaction:
    | ButtonInteraction
    | ChatInputCommandInteraction
    | StringSelectMenuInteraction,
  draft: Draft,
  slot: (typeof draft.pickOrder)[0],
  internalUserId: string,
  available: Player[],
) {
  const discordUserId = resolveDiscordId(draft, internalUserId);

  const teamName = teamSeeds.get(slot.team)?.name ?? slot.team;
  const topPlayers = available
    .sort((a, b) => a.consensusRank - b.consensusRank)
    .slice(0, 10);

  const { embed, components } = buildOnTheClockEmbed(
    draft,
    slot,
    teamName,
    discordUserId,
    topPlayers,
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
    });
  }
}

// ---- Helpers ----

function resolveDiscordId(draft: Draft, internalUserId: string): string | null {
  return draft.participants[internalUserId] ?? null;
}

async function postDraftSummary(
  interaction:
    | ButtonInteraction
    | ChatInputCommandInteraction
    | StringSelectMenuInteraction,
  draftId: string,
  allPlayers: Player[],
) {
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

async function sendFollowUp(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  content: string,
) {
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content, ephemeral: true });
  } else {
    await interaction.reply({ content, ephemeral: true });
  }
}

function getJoinedUsers(draft: Draft) {
  return (
    Object.entries(draft.teamAssignments) as [TeamAbbreviation, string | null][]
  )
    .filter(([, internalId]) => internalId !== null)
    .map(([team, internalId]) => ({
      discordId: draft.participants[internalId!] ?? internalId!,
      team,
    }));
}
