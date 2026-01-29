import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from 'discord.js';
import { getActiveDraftInThread } from '../services/draft.service.js';
import { getPlayersByYear } from '../services/player.service.js';
import type { Player } from '@mockingboard/shared';

// In-memory player cache keyed by year
const playerCache = new Map<number, Player[]>();

async function getCachedPlayers(year: number): Promise<Player[]> {
  const cached = playerCache.get(year);
  if (cached) return cached;
  const players = await getPlayersByYear(year);
  playerCache.set(year, players);
  return players;
}

export { getCachedPlayers };

export const data = new SlashCommandBuilder()
  .setName('draft')
  .setDescription('Draft a player by name')
  .addStringOption((opt) =>
    opt
      .setName('player')
      .setDescription('Player name')
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused();
  const draft = await getActiveDraftInThread(interaction.channelId);

  if (!draft) {
    await interaction.respond([]);
    return;
  }

  const allPlayers = await getCachedPlayers(draft.config.year);
  const pickedIds = new Set(draft.pickedPlayerIds);
  const available = allPlayers.filter((p) => !pickedIds.has(p.id));

  const search = focused.toLowerCase();
  const matches = available
    .filter((p) => p.name.toLowerCase().includes(search))
    .slice(0, 25)
    .map((p) => ({
      name: `${p.name} (${p.position} - ${p.school})`,
      value: p.id,
    }));

  await interaction.respond(matches);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  // Execution is handled by the interactionCreate event router
  // which calls the shared pick handler
  const playerId = interaction.options.getString('player', true);

  const draft = await getActiveDraftInThread(interaction.channelId);
  if (!draft) {
    await interaction.reply({
      content: 'No active draft in this thread.',
      ephemeral: true,
    });
    return;
  }

  // Pass to the pick handler (imported dynamically to avoid circular deps)
  const { handlePick } = await import('../events/interactionCreate.js');
  await interaction.deferReply();
  await handlePick(interaction, draft, playerId);
}
