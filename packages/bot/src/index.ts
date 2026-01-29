import './utils/env.js';
import { createServer } from 'http';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { handleInteraction, commands } from './events/interactionCreate.js';
import { config, validateConfig, logConfig } from './config.js';
import * as startdraft from './commands/startdraft.js';
import * as draft from './commands/draft.js';
import * as help from './commands/help.js';

// Validate configuration
validateConfig();
logConfig();

// Register commands
commands.set(startdraft.data.name, startdraft);
commands.set(draft.data.name, draft);
commands.set(help.data.name, help);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`MockingBoard bot is online as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, handleInteraction);

client.login(config.discordToken);

// Health check server for Cloud Run
// Cloud Run requires a listening HTTP server for health checks
if (config.isProduction) {
  const port = process.env.PORT ?? 8080;
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      const isReady = client.isReady();
      res.writeHead(isReady ? 200 : 503);
      res.end(isReady ? 'OK' : 'Not Ready');
    } else {
      res.writeHead(200);
      res.end('MockingBoard Bot');
    }
  });
  server.listen(port, () => {
    console.log(`Health check server listening on port ${port}`);
  });
}
