import {
  type Interaction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  Collection,
} from 'discord.js';

import type { PositionFilterGroup } from '@mockingboard/shared';
import { checkRateLimit, COOLDOWNS } from '../services/rateLimit.service.js';

// Import all handlers
import {
  handleJoin,
  handleStart,
  handleAllTeams,
  handleTeamSelect,
  handlePause,
  handleResume,
  handlePickButton,
  handlePositionFilter,
  handleTradeAccept,
  handleTradeReject,
  handleTradeCancel,
  handleTradeConfirm,
  handleTradeForce,
  handleTradeStart,
  handleTradeTargetSelect,
  handleTradeGiveSelect,
  handleTradeReceiveSelect,
  handleTradeFlowCancel,
} from '../handlers/index.js';

// Re-export handlePick for use by /draft command
export { handlePick } from '../handlers/index.js';

// Commands are registered by index.ts
export const commands = new Collection<
  string,
  {
    data: { name: string };
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  }
>();

/**
 * Main interaction handler - routes to specific handlers based on interaction type
 */
export async function handleInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    await handleCommand(interaction);
    return;
  }

  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
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

// ---- Command Handler ----

async function handleCommand(interaction: ChatInputCommandInteraction) {
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
}

// ---- Autocomplete Handler ----

async function handleAutocomplete(interaction: AutocompleteInteraction) {
  const command = commands.get(interaction.commandName);
  if (command?.autocomplete) {
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`Autocomplete ${interaction.commandName} failed:`, error);
    }
  }
}

// ---- Button Router ----

const ACTION_COOLDOWNS: Record<string, { action: string; cooldownMs: number }> =
  {
    pick: { action: 'pick', cooldownMs: COOLDOWNS.PICK },
    trade: { action: 'trade', cooldownMs: COOLDOWNS.TRADE_PROPOSAL },
    join: { action: 'join', cooldownMs: COOLDOWNS.JOIN_DRAFT },
  };

async function handleButton(interaction: ButtonInteraction) {
  const [action, id, ...rest] = interaction.customId.split(':');

  const cooldown = ACTION_COOLDOWNS[action];
  if (
    cooldown &&
    !checkRateLimit(interaction.user.id, cooldown.action, cooldown.cooldownMs)
  ) {
    await interaction.reply({
      content: 'Slow down! Please wait a moment.',
      ephemeral: true,
    });
    return;
  }

  try {
    switch (action) {
      // Draft lobby actions
      case 'join':
        await handleJoin(interaction, id);
        break;
      case 'start':
        await handleStart(interaction, id);
        break;
      case 'allteams':
        await handleAllTeams(interaction, id);
        break;

      // Draft picking actions
      case 'pick':
        await handlePickButton(interaction, id, rest[0], Number(rest[1]));
        break;
      case 'filter':
        await handlePositionFilter(
          interaction,
          id,
          rest[0] as Exclude<PositionFilterGroup, null>,
          Number(rest[1]),
        );
        break;
      case 'clearfilter':
        await handlePositionFilter(interaction, id, null, Number(rest[0]));
        break;
      case 'pause':
        await handlePause(interaction, id);
        break;
      case 'resume':
        await handleResume(interaction, id);
        break;

      // Trade proposal flow
      case 'trade':
        await handleTradeStart(interaction, id);
        break;
      case 'trade-flow-cancel':
        await handleTradeFlowCancel(interaction, id);
        break;

      // Trade resolution actions
      case 'trade-accept':
        await handleTradeAccept(interaction, id);
        break;
      case 'trade-reject':
        await handleTradeReject(interaction, id);
        break;
      case 'trade-cancel':
        await handleTradeCancel(interaction, id);
        break;
      case 'trade-confirm':
        await handleTradeConfirm(interaction, id);
        break;
      case 'trade-force':
        await handleTradeForce(interaction, id);
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

// ---- Select Menu Router ----

async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  const [action, id, ...rest] = interaction.customId.split(':');

  try {
    switch (action) {
      case 'teamselect':
        await handleTeamSelect(interaction, id);
        break;

      // Player browsing (from on-the-clock embed)
      case 'browse':
        await handlePickButton(
          interaction,
          id,
          interaction.values[0],
          Number(rest[0]),
        );
        break;

      // Trade proposal flow
      case 'trade-select-target':
        await handleTradeTargetSelect(interaction, id);
        break;
      case 'trade-select-give':
        await handleTradeGiveSelect(interaction, id);
        break;
      case 'trade-select-receive':
        await handleTradeReceiveSelect(interaction, id);
        break;

      default:
        // Unknown select menu - silently ignore
        break;
    }
  } catch (error) {
    console.error(`Select menu ${action} failed:`, error);
    const msg =
      error instanceof Error ? error.message : 'Something went wrong.';
    await interaction.followUp({ content: msg, ephemeral: true });
  }
}
