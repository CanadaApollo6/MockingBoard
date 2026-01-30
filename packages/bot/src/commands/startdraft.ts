import {
  SlashCommandBuilder,
  ChannelType,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { getOrCreateUser } from '../services/user.service.js';
import {
  createDraft,
  buildPickOrder,
  buildFuturePicks,
  type CreateDraftInput,
} from '../services/draft.service.js';
import { buildLobbyEmbed } from '../components/draftEmbed.js';
import { teams } from '@mockingboard/shared';
import type {
  TeamAbbreviation,
  DraftFormat,
  CpuSpeed,
} from '@mockingboard/shared';

export const data = new SlashCommandBuilder()
  .setName('startdraft')
  .setDescription('Start a new mock draft')
  .addIntegerOption((opt) =>
    opt
      .setName('rounds')
      .setDescription('Number of rounds (1-7)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(7),
  )
  .addIntegerOption((opt) =>
    opt
      .setName('pick_timer')
      .setDescription('Seconds per pick (0 for unlimited, default 120)')
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(600),
  )
  .addStringOption((opt) =>
    opt
      .setName('team_assignment')
      .setDescription('How teams are assigned (default: random)')
      .setRequired(false)
      .addChoices(
        { name: 'Random', value: 'random' },
        { name: 'Player Choice', value: 'choice' },
      ),
  )
  .addStringOption((opt) =>
    opt
      .setName('format')
      .setDescription('Draft format (default: full)')
      .setRequired(false)
      .addChoices(
        { name: 'Multi-User', value: 'full' },
        { name: 'Single User', value: 'single-team' },
      ),
  )
  .addStringOption((opt) =>
    opt
      .setName('cpu_speed')
      .setDescription('CPU pick speed (default: normal)')
      .setRequired(false)
      .addChoices(
        { name: 'Instant (batched)', value: 'instant' },
        { name: 'Fast (0.3s)', value: 'fast' },
        { name: 'Normal (1.5s)', value: 'normal' },
      ),
  )
  .addBooleanOption((opt) =>
    opt
      .setName('trades')
      .setDescription('Allow trading picks during the draft (default: true)')
      .setRequired(false),
  )
  .addIntegerOption((opt) =>
    opt
      .setName('year')
      .setDescription('Draft class year (default: 2026)')
      .setRequired(false)
      .addChoices({ name: '2026', value: 2026 }, { name: '2025', value: 2025 }),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const rounds = interaction.options.getInteger('rounds', true);
  const secondsPerPick = interaction.options.getInteger('pick_timer') ?? 120;
  const format =
    (interaction.options.getString('format') as DraftFormat | null) ?? 'full';

  // For single-team mode, force 'choice' so user picks their team
  const teamAssignmentMode =
    format === 'single-team'
      ? 'choice'
      : ((interaction.options.getString('team_assignment') as
          | 'random'
          | 'choice'
          | null) ?? 'random');

  // Default CPU speed: 'fast' for single-team, 'normal' for full
  const cpuSpeedOption = interaction.options.getString(
    'cpu_speed',
  ) as CpuSpeed | null;
  const cpuSpeed: CpuSpeed =
    cpuSpeedOption ?? (format === 'single-team' ? 'fast' : 'normal');

  // Trades enabled by default
  const tradesEnabled = interaction.options.getBoolean('trades') ?? true;

  const year = interaction.options.getInteger('year') ?? 2026;

  await interaction.deferReply();

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
    interaction.user.displayAvatarURL(),
  );

  // Create thread
  if (!interaction.channel || !('threads' in interaction.channel)) {
    await interaction.editReply('This command must be used in a text channel.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const threadName =
    format === 'single-team'
      ? `Solo Mock Draft - ${dateStr}`
      : `Mock Draft - ${dateStr}`;

  const textChannel = interaction.channel as TextChannel;
  const thread = await textChannel.threads.create({
    name: threadName,
    type: ChannelType.PublicThread,
  });

  const [pickOrder, futurePicks] = await Promise.all([
    buildPickOrder(rounds, year),
    buildFuturePicks(year),
  ]);

  const teamAssignments = {} as Record<TeamAbbreviation, string | null>;
  for (const team of teams) {
    teamAssignments[team.id] = null;
  }

  const input: CreateDraftInput = {
    createdBy: user.id,
    config: {
      rounds,
      secondsPerPick,
      format,
      year,
      teamAssignmentMode,
      cpuSpeed,
      tradesEnabled,
    },
    platform: 'discord',
    discord: {
      guildId: interaction.guildId!,
      channelId: interaction.channelId,
      threadId: thread.id,
    },
    teamAssignments,
    pickOrder,
    futurePicks,
  };

  const draft = await createDraft(input);

  const { embed, components } = buildLobbyEmbed(draft, [], teams);
  await thread.send({ embeds: [embed], components });

  const replyMsg =
    format === 'single-team'
      ? `Solo draft created! Head to <#${thread.id}> to select your team.`
      : `Draft lobby created! Head to <#${thread.id}> to join.`;

  await interaction.editReply(replyMsg);
}
