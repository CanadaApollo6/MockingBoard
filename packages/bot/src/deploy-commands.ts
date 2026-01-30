import './utils/env.js';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { data as startdraftData } from './commands/startdraft.js';
import { data as draftData } from './commands/draft.js';
import { data as helpData } from './commands/help.js';

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if MockingBoard is online'),
  startdraftData,
  draftData,
  helpData,
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID!;

async function deployCommands() {
  try {
    console.log('Registering slash commands...');

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands.map((command) => command.toJSON()),
    });

    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Failed to register slash commands:', error);
    process.exit(1);
  }
}

deployCommands();
