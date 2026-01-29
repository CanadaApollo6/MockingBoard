import type {
  TextChannel,
  ButtonInteraction,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
  Message,
  MessageCreateOptions,
} from 'discord.js';
import type { Draft, TeamAbbreviation } from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';

// Pre-built team lookup map
export const teamSeeds = new Map(teams.map((t) => [t.id, t]));

// Type for interactions that can advance the draft
export type DraftInteraction =
  | ButtonInteraction
  | ChatInputCommandInteraction
  | StringSelectMenuInteraction;

/**
 * Get a sendable channel from an interaction, returns null if channel can't send
 */
export function getSendableChannel(interaction: {
  channel: unknown;
}): TextChannel | null {
  const channel = interaction.channel;
  if (channel && typeof channel === 'object' && 'send' in channel) {
    return channel as TextChannel;
  }
  return null;
}

/**
 * Resolve an internal user ID to a Discord user ID
 */
export function resolveDiscordId(
  draft: Draft,
  internalUserId: string,
): string | null {
  return draft.participants[internalUserId] ?? null;
}

/**
 * Send a follow-up message, handling both deferred and non-deferred interactions
 */
export async function sendFollowUp(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content, ephemeral: true });
  } else {
    await interaction.reply({ content, ephemeral: true });
  }
}

/**
 * Get list of joined users with their Discord IDs and teams
 */
export function getJoinedUsers(
  draft: Draft,
): { discordId: string; team: TeamAbbreviation }[] {
  return (
    Object.entries(draft.teamAssignments) as [TeamAbbreviation, string | null][]
  )
    .filter(([, internalId]) => internalId !== null)
    .map(([team, internalId]) => ({
      discordId: draft.participants[internalId!] ?? internalId!,
      team,
    }));
}

/**
 * Safely send a message to a channel, catching and logging any errors.
 * Returns the sent message on success, null on failure.
 */
export async function safeSend(
  channel: TextChannel | null,
  options: MessageCreateOptions,
): Promise<Message | null> {
  if (!channel) return null;
  try {
    return await channel.send(options);
  } catch (error) {
    console.error('Failed to send message to channel:', error);
    return null;
  }
}
