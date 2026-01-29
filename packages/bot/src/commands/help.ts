import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show available MockingBoard commands');

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('MockingBoard Commands')
    .setColor(0x5865f2)
    .setDescription(
      'MockingBoard is a social mock draft bot for Discord. Run drafts with friends, track picks, and trade with CPU teams.',
    )
    .addFields(
      {
        name: '/startdraft',
        value:
          'Start a new mock draft. Configure rounds, format, pick timer, team assignment, and CPU speed.',
      },
      {
        name: '/draft [player]',
        value:
          "Search and draft a player by name when it's your turn. Use the autocomplete to find players.",
      },
      {
        name: '/help',
        value: 'Show this help message.',
      },
    )
    .addFields({
      name: 'During a Draft',
      value: [
        '**Quick Pick**: Click player buttons to draft instantly',
        '**Position Filter**: Filter by QB, WR/TE, RB, OL, or DEF',
        '**Browse More**: Use the dropdown to see more players',
        '**Trade**: Click "Propose Trade" to trade picks',
        '**Pause**: Draft creator can pause/resume the draft',
      ].join('\n'),
    })
    .addFields({
      name: 'Draft Formats',
      value: [
        '**Full 32-Team**: Draft with friends, CPU fills remaining teams',
        '**Single Team (Solo)**: Draft one team through all rounds against CPU',
      ].join('\n'),
    })
    .setFooter({ text: 'MockingBoard v1.0' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
