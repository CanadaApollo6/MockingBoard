import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from 'discord.js';
import { getActiveDraftInThread } from '../services/draft.service.js';
import { getPlayersByYear } from '../services/player.service.js';
import type { Player } from '@mockingboard/shared';

// In-memory player cache keyed by year (1-hour TTL, max 10 years)
const PLAYER_CACHE_TTL = 60 * 60 * 1000;
const PLAYER_CACHE_MAX = 10;
const playerCache = new Map<number, { data: Player[]; expiresAt: number }>();

async function getCachedPlayers(year: number): Promise<Player[]> {
  const cached = playerCache.get(year);
  if (cached && Date.now() < cached.expiresAt) return cached.data;
  if (cached) playerCache.delete(year);
  const players = await getPlayersByYear(year);
  playerCache.set(year, {
    data: players,
    expiresAt: Date.now() + PLAYER_CACHE_TTL,
  });
  // Evict oldest if over capacity
  if (playerCache.size > PLAYER_CACHE_MAX) {
    const oldest = playerCache.keys().next().value;
    if (oldest !== undefined) playerCache.delete(oldest);
  }
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
