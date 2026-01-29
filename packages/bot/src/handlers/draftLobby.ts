import type {
  ButtonInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import type { TeamAbbreviation } from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';
import { getOrCreateUser } from '../services/user.service.js';
import { getDraft, updateDraft } from '../services/draft.service.js';
import {
  buildLobbyEmbed,
  buildTeamSelectMenu,
} from '../components/draftEmbed.js';
import { teamSeeds, getSendableChannel, getJoinedUsers } from './shared.js';
import { advanceDraft } from './draftPicking.js';

/**
 * Handle "Join Draft" button click
 */
export async function handleJoin(
  interaction: ButtonInteraction,
  draftId: string,
): Promise<void> {
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

/**
 * Handle "Start Draft" button click
 */
export async function handleStart(
  interaction: ButtonInteraction,
  draftId: string,
): Promise<void> {
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

/**
 * Handle team selection from dropdown menu
 */
export async function handleTeamSelect(
  interaction: StringSelectMenuInteraction,
  draftId: string,
): Promise<void> {
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
      const { embed, components } = buildLobbyEmbed(draft, joinedUsers, teams);
      await lobbyMsg.edit({ embeds: [embed], components });
    }
  }

  await interaction.followUp({
    content: `You've selected the **${teamSeeds.get(selectedTeam)?.name ?? selectedTeam}**!`,
    ephemeral: true,
  });
}
