import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import type {
  DraftSlot,
  FutureDraftPick,
  Trade,
  TradePiece,
  Draft,
  TeamAbbreviation,
} from '@mockingboard/shared';
import {
  getPickValue,
  getFuturePickValue,
  getPickRound,
} from '@mockingboard/shared';
import type { CpuTradeEvaluation } from '../services/trade.service.js';
import { COLORS, DISCORD_SELECT_MAX } from '../constants.js';

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

/**
 * Parse a select menu value into a TradePiece.
 * Current picks: "42" → { type: 'current-pick', overall: 42 }
 * Future picks: "f:2027:1:GB" → { type: 'future-pick', year: 2027, round: 1, originalTeam: 'GB' }
 */
export function parseTradePieceValue(value: string): TradePiece {
  if (value.startsWith('f:')) {
    const [, yearStr, roundStr, originalTeam] = value.split(':');
    return {
      type: 'future-pick',
      year: parseInt(yearStr, 10),
      round: parseInt(roundStr, 10),
      originalTeam: originalTeam as TeamAbbreviation,
    };
  }
  return { type: 'current-pick', overall: parseInt(value, 10) };
}

/**
 * Compute the total trade value from select menu value strings.
 */
export function computeGivingValue(
  values: string[],
  draftYear: number,
): number {
  let total = 0;
  for (const v of values) {
    if (v.startsWith('f:')) {
      const [, yearStr, roundStr] = v.split(':');
      const yearsOut = parseInt(yearStr, 10) - draftYear;
      total += getFuturePickValue(parseInt(roundStr, 10), yearsOut);
    } else {
      total += getPickValue(parseInt(v, 10));
    }
  }
  return total;
}

/**
 * Format select menu values as readable labels for display.
 */
function formatGivingLabels(values: string[]): string {
  return values
    .map((v) => {
      if (v.startsWith('f:')) {
        const [, year, round, team] = v.split(':');
        return `${year} R${round} (${team})`;
      }
      return `#${v}`;
    })
    .join(', ');
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
    .setColor(COLORS.BLURPLE)
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
    .setColor(evaluation.accept ? COLORS.GREEN : COLORS.RED)
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
    .setColor(COLORS.GREEN)
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
    .setColor(COLORS.RED)
    .setDescription(
      `${recipientName} has rejected ${proposerName}'s trade proposal.`,
    );

  return { embed };
}

export function buildTradeCancelledEmbed(proposerName: string) {
  const embed = new EmbedBuilder()
    .setTitle('Trade Cancelled')
    .setColor(COLORS.GREY)
    .setDescription(`${proposerName} has cancelled their trade proposal.`);

  return { embed };
}

export function buildTradeExpiredEmbed(
  proposerName: string,
  recipientName: string,
) {
  const embed = new EmbedBuilder()
    .setTitle('Trade Expired')
    .setColor(COLORS.ORANGE)
    .setDescription(
      `The trade proposal from ${proposerName} to ${recipientName} has expired.`,
    );

  return { embed };
}

export function buildTradePausedEmbed(draft: Draft, reason: string) {
  const embed = new EmbedBuilder()
    .setTitle('Draft Paused for Trade')
    .setColor(COLORS.ORANGE)
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
    .setColor(COLORS.BLURPLE)
    .setDescription('Select a team to trade with:')
    .setFooter({
      text: 'CPU teams will evaluate trades using the Rich Hill value chart.',
    });

  const options = targets.slice(0, DISCORD_SELECT_MAX).map((t) => ({
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
  futurePicks: FutureDraftPick[],
  draftYear: number,
) {
  const embed = new EmbedBuilder()
    .setTitle(`Trade with ${targetName}`)
    .setColor(COLORS.BLURPLE)
    .setDescription('Select the picks you want to **give**:')
    .setFooter({ text: 'You can select multiple picks.' });

  const currentOptions = availablePicks.map((slot) => {
    const value = getPickValue(slot.overall);
    return {
      label: `Pick #${slot.overall} (Round ${slot.round})`,
      value: `${slot.overall}`,
      description: `${value.toFixed(1)} pts`,
    };
  });

  const futureOptions = futurePicks.map((fp) => {
    const yearsOut = fp.year - draftYear;
    const value = getFuturePickValue(fp.round, yearsOut);
    return {
      label: `${fp.year} Round ${fp.round} (${fp.originalTeam})`,
      value: `f:${fp.year}:${fp.round}:${fp.originalTeam}`,
      description: `${value.toFixed(1)} pts — Future pick`,
    };
  });

  const options = [...currentOptions, ...futureOptions].slice(
    0,
    DISCORD_SELECT_MAX,
  );

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
  targetFuturePicks: FutureDraftPick[],
  givingValues: string[],
  draftYear: number,
) {
  const givingValue = computeGivingValue(givingValues, draftYear);
  const givingLabel = formatGivingLabels(givingValues);

  const embed = new EmbedBuilder()
    .setTitle(`Trade with ${targetName}`)
    .setColor(COLORS.BLURPLE)
    .setDescription(
      `You are giving: **${givingLabel}** (${givingValue.toFixed(1)} pts)\n\nSelect the picks you want to **receive**:`,
    )
    .setFooter({ text: 'You can select multiple picks.' });

  const currentOptions = targetPicks.map((slot) => {
    const value = getPickValue(slot.overall);
    return {
      label: `Pick #${slot.overall} (Round ${slot.round})`,
      value: `${slot.overall}`,
      description: `${value.toFixed(1)} pts`,
    };
  });

  const futureOptions = targetFuturePicks.map((fp) => {
    const yearsOut = fp.year - draftYear;
    const value = getFuturePickValue(fp.round, yearsOut);
    return {
      label: `${fp.year} Round ${fp.round} (${fp.originalTeam})`,
      value: `f:${fp.year}:${fp.round}:${fp.originalTeam}`,
      description: `${value.toFixed(1)} pts — Future pick`,
    };
  });

  const options = [...currentOptions, ...futureOptions].slice(
    0,
    DISCORD_SELECT_MAX,
  );

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
