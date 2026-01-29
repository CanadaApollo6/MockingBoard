import './utils/env.js';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { handleInteraction, commands } from './events/interactionCreate.js';
import * as startdraft from './commands/startdraft.js';
import * as draft from './commands/draft.js';

// Register commands
commands.set(startdraft.data.name, startdraft);
commands.set(draft.data.name, draft);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`MockingBoard bot is online as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, handleInteraction);

client.login(process.env.DISCORD_TOKEN);
