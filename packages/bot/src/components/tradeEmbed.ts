import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
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

  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  if (evaluation.accept) {
    const confirmButton = new ButtonBuilder()
      .setCustomId(`trade-confirm:${trade.id}`)
      .setLabel('Confirm Trade')
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`trade-cancel:${trade.id}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        confirmButton,
        cancelButton,
      ),
    );
  } else {
    const forceButton = new ButtonBuilder()
      .setCustomId(`trade-force:${trade.id}`)
      .setLabel('Force Trade')
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`trade-cancel:${trade.id}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        forceButton,
        cancelButton,
      ),
    );
  }

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
