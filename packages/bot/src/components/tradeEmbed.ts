import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import type { DraftSlot } from '@mockingboard/shared';
import type {
  Trade,
  TradePiece,
  Draft,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { getPickValue, getPickRound } from '@mockingboard/shared';
import type { CpuTradeEvaluation } from '../services/trade.service.js';

interface TeamInfo {
  name: string;
  abbreviation: TeamAbbreviation;
}

function formatPiece(
  piece: TradePiece,
  teams: Map<TeamAbbreviation, TeamInfo>,
): string {
  if (piece.type === 'current-pick' && piece.overall) {
    const round = getPickRound(piece.overall);
    const pickInRound = ((piece.overall - 1) % 32) + 1;
    const teamInfo = piece.originalTeam ? teams.get(piece.originalTeam) : null;
    const teamLabel = teamInfo ? ` (${teamInfo.abbreviation})` : '';
    const value = getPickValue(piece.overall);
    return `Pick #${piece.overall}${teamLabel} — Round ${round}, Pick ${pickInRound} — **${value.toFixed(1)} pts**`;
  } else if (piece.type === 'future-pick') {
    const teamInfo = piece.originalTeam ? teams.get(piece.originalTeam) : null;
    const viaLabel = teamInfo ? ` (via ${teamInfo.abbreviation})` : '';
    return `${piece.year} Round ${piece.round}${viaLabel}`;
  }
  return 'Unknown pick';
}

function formatPieceSimple(
  piece: TradePiece,
  teams: Map<TeamAbbreviation, TeamInfo>,
): string {
  if (piece.type === 'current-pick' && piece.overall) {
    const round = getPickRound(piece.overall);
    const teamInfo = piece.originalTeam ? teams.get(piece.originalTeam) : null;
    const teamLabel = teamInfo ? ` (${teamInfo.abbreviation})` : '';
    return `Pick #${piece.overall}${teamLabel}, Round ${round}`;
  } else if (piece.type === 'future-pick') {
    const teamInfo = piece.originalTeam ? teams.get(piece.originalTeam) : null;
    const viaLabel = teamInfo ? ` (via ${teamInfo.abbreviation})` : '';
    return `${piece.year} Round ${piece.round}${viaLabel}`;
  }
  return 'Unknown pick';
}

export function buildTradeProposalEmbed(
  trade: Trade,
  proposerName: string,
  recipientName: string,
  teams: Map<TeamAbbreviation, TeamInfo>,
  expiresInSeconds?: number,
) {
  const givesLines = trade.proposerGives.map(
    (p) => `• ${formatPieceSimple(p, teams)}`,
  );
  const receivesLines = trade.proposerReceives.map(
    (p) => `• ${formatPieceSimple(p, teams)}`,
  );

  const embed = new EmbedBuilder()
    .setTitle('Trade Proposal')
    .setColor(0x5865f2)
    .addFields(
      {
        name: `${proposerName} offers:`,
        value: givesLines.join('\n') || 'Nothing',
      },
      {
        name: `${proposerName} requests:`,
        value: receivesLines.join('\n') || 'Nothing',
      },
    );

  if (expiresInSeconds !== undefined) {
    const minutes = Math.floor(expiresInSeconds / 60);
    const seconds = expiresInSeconds % 60;
    embed.setFooter({
      text: `Expires in ${minutes}:${seconds.toString().padStart(2, '0')}`,
    });
  }

  const acceptButton = new ButtonBuilder()
    .setCustomId(`trade-accept:${trade.id}`)
    .setLabel('Accept')
    .setStyle(ButtonStyle.Success);

  const rejectButton = new ButtonBuilder()
    .setCustomId(`trade-reject:${trade.id}`)
    .setLabel('Reject')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    acceptButton,
    rejectButton,
  );

  return { embed, components: [row] };
}

export function buildCpuTradeProposalEmbed(
  trade: Trade,
  proposerName: string,
  cpuTeamName: string,
  teams: Map<TeamAbbreviation, TeamInfo>,
  evaluation: CpuTradeEvaluation,
) {
  const givesLines = trade.proposerGives.map(
    (p) => `• ${formatPiece(p, teams)}`,
  );
  const receivesLines = trade.proposerReceives.map(
    (p) => `• ${formatPiece(p, teams)}`,
  );

  const givingTotal = trade.proposerGives.reduce((sum, p) => {
    if (p.type === 'current-pick' && p.overall) {
      return sum + getPickValue(p.overall);
    }
    return sum;
  }, 0);

  const receivingTotal = trade.proposerReceives.reduce((sum, p) => {
    if (p.type === 'current-pick' && p.overall) {
      return sum + getPickValue(p.overall);
    }
    return sum;
  }, 0);

  const statusEmoji = evaluation.accept ? '✅' : '❌';
  const statusText = evaluation.accept ? 'CPU Accepts' : 'CPU Rejects';

  const embed = new EmbedBuilder()
    .setTitle(`Trade Proposal to CPU (${cpuTeamName})`)
    .setColor(evaluation.accept ? 0x57f287 : 0xed4245)
    .addFields(
      {
        name: 'You offer:',
        value: `${givesLines.join('\n')}\n**Total: ${givingTotal.toFixed(1)} pts**`,
      },
      {
        name: 'You request:',
        value: `${receivesLines.join('\n')}\n**Total: ${receivingTotal.toFixed(1)} pts**`,
      },
      {
        name: 'CPU Analysis',
        value: evaluation.reason,
        inline: true,
      },
      {
        name: 'Status',
        value: `${statusEmoji} ${statusText}`,
        inline: true,
      },
    );

  const buttons: ButtonBuilder[] = [];

  if (evaluation.accept) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`trade-confirm:${trade.id}`)
        .setLabel('Confirm Trade')
        .setStyle(ButtonStyle.Success),
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId(`trade-force:${trade.id}`)
      .setLabel('Force Trade')
      .setStyle(ButtonStyle.Danger),
  );

  buttons.push(
    new ButtonBuilder()
      .setCustomId(`trade-cancel:${trade.id}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary),
  );

  const components = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons),
  ];

  return { embed, components };
}

export function buildTradeAcceptedEmbed(
  trade: Trade,
  proposerName: string,
  recipientName: string,
  teams: Map<TeamAbbreviation, TeamInfo>,
) {
  const givesLines = trade.proposerGives.map(
    (p) => `• ${formatPieceSimple(p, teams)}`,
  );
  const receivesLines = trade.proposerReceives.map(
    (p) => `• ${formatPieceSimple(p, teams)}`,
  );

  const embed = new EmbedBuilder()
    .setTitle('Trade Accepted!')
    .setColor(0x57f287)
    .setDescription(
      `${proposerName} and ${recipientName} have completed a trade.`,
    )
    .addFields(
      {
        name: `${proposerName} sends:`,
        value: givesLines.join('\n') || 'Nothing',
        inline: true,
      },
      {
        name: `${recipientName} sends:`,
        value: receivesLines.join('\n') || 'Nothing',
        inline: true,
      },
    );

  return { embed };
}

export function buildTradeRejectedEmbed(
  trade: Trade,
  proposerName: string,
  recipientName: string,
) {
  const embed = new EmbedBuilder()
    .setTitle('Trade Rejected')
    .setColor(0xed4245)
    .setDescription(
      `${recipientName} has rejected ${proposerName}'s trade proposal.`,
    );

  return { embed };
}

export function buildTradeCancelledEmbed(proposerName: string) {
  const embed = new EmbedBuilder()
    .setTitle('Trade Cancelled')
    .setColor(0x99aab5)
    .setDescription(`${proposerName} has cancelled their trade proposal.`);

  return { embed };
}

export function buildTradeExpiredEmbed(
  proposerName: string,
  recipientName: string,
) {
  const embed = new EmbedBuilder()
    .setTitle('Trade Expired')
    .setColor(0xffa500)
    .setDescription(
      `The trade proposal from ${proposerName} to ${recipientName} has expired.`,
    );

  return { embed };
}

export function buildTradePausedEmbed(draft: Draft, reason: string) {
  const embed = new EmbedBuilder()
    .setTitle('Draft Paused for Trade')
    .setColor(0xffa500)
    .setDescription(reason)
    .setFooter({ text: 'Draft will resume when the trade is resolved.' });

  return { embed };
}

// ---- Trade Proposal Flow Components ----

interface TradeTarget {
  id: string; // Team abbreviation for CPU, or internal user ID for humans
  name: string;
  isCpu: boolean;
}

export function buildTradeTargetSelect(
  draftId: string,
  targets: TradeTarget[],
) {
  const embed = new EmbedBuilder()
    .setTitle('Propose Trade')
    .setColor(0x5865f2)
    .setDescription('Select a team to trade with:')
    .setFooter({
      text: 'CPU teams will evaluate trades using the Rich Hill value chart.',
    });

  const options = targets.slice(0, 25).map((t) => ({
    label: t.name,
    value: t.id,
    description: t.isCpu ? 'CPU Team' : 'Human Player',
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`trade-select-target:${draftId}`)
    .setPlaceholder('Select trade partner')
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    menu,
  );

  const cancelButton = new ButtonBuilder()
    .setCustomId(`trade-flow-cancel:${draftId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    cancelButton,
  );

  return { embed, components: [row, buttonRow] };
}

export function buildTradeGiveSelect(
  draftId: string,
  targetName: string,
  availablePicks: DraftSlot[],
) {
  const embed = new EmbedBuilder()
    .setTitle(`Trade with ${targetName}`)
    .setColor(0x5865f2)
    .setDescription('Select the picks you want to **give**:')
    .setFooter({ text: 'You can select multiple picks.' });

  const options = availablePicks.slice(0, 25).map((slot) => {
    const value = getPickValue(slot.overall);
    return {
      label: `Pick #${slot.overall} (Round ${slot.round})`,
      value: `${slot.overall}`,
      description: `${value.toFixed(1)} pts`,
    };
  });

  if (options.length === 0) {
    embed.setDescription('You have no picks available to trade.');
    const cancelButton = new ButtonBuilder()
      .setCustomId(`trade-flow-cancel:${draftId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      cancelButton,
    );
    return { embed, components: [buttonRow] };
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`trade-select-give:${draftId}`)
    .setPlaceholder('Select picks to give')
    .setMinValues(1)
    .setMaxValues(Math.min(options.length, 5))
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    menu,
  );

  const cancelButton = new ButtonBuilder()
    .setCustomId(`trade-flow-cancel:${draftId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    cancelButton,
  );

  return { embed, components: [row, buttonRow] };
}

export function buildTradeReceiveSelect(
  draftId: string,
  targetName: string,
  targetPicks: DraftSlot[],
  givingPicks: number[],
) {
  const givingValue = givingPicks.reduce((sum, p) => sum + getPickValue(p), 0);

  const embed = new EmbedBuilder()
    .setTitle(`Trade with ${targetName}`)
    .setColor(0x5865f2)
    .setDescription(
      `You are giving: **${givingPicks.map((p) => `#${p}`).join(', ')}** (${givingValue.toFixed(1)} pts)\n\nSelect the picks you want to **receive**:`,
    )
    .setFooter({ text: 'You can select multiple picks.' });

  const options = targetPicks.slice(0, 25).map((slot) => {
    const value = getPickValue(slot.overall);
    return {
      label: `Pick #${slot.overall} (Round ${slot.round})`,
      value: `${slot.overall}`,
      description: `${value.toFixed(1)} pts`,
    };
  });

  if (options.length === 0) {
    embed.setDescription(`${targetName} has no picks available to trade.`);
    const cancelButton = new ButtonBuilder()
      .setCustomId(`trade-flow-cancel:${draftId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      cancelButton,
    );
    return { embed, components: [buttonRow] };
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`trade-select-receive:${draftId}`)
    .setPlaceholder('Select picks to receive')
    .setMinValues(1)
    .setMaxValues(Math.min(options.length, 5))
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    menu,
  );

  const cancelButton = new ButtonBuilder()
    .setCustomId(`trade-flow-cancel:${draftId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    cancelButton,
  );

  return { embed, components: [row, buttonRow] };
}
