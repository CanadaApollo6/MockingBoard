import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import type {
  Draft,
  DraftSlot,
  Pick,
  Player,
  TeamAbbreviation,
} from '@mockingboard/shared';
import type { TeamSeed } from '@mockingboard/shared';

interface JoinedUser {
  discordId: string;
  team: TeamAbbreviation;
}

export function buildLobbyEmbed(
  draft: Draft,
  joinedUsers: JoinedUser[],
  teams: TeamSeed[],
) {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const mode =
    draft.config.teamAssignmentMode === 'random' ? 'Random' : 'Player Choice';
  const timer =
    draft.config.secondsPerPick === 0
      ? 'Unlimited'
      : `${draft.config.secondsPerPick}s`;
  const formatLabel =
    draft.config.format === 'single-team'
      ? 'Single Team (Solo)'
      : 'Full 32-Team';
  const cpuSpeedLabel =
    draft.config.cpuSpeed === 'instant'
      ? 'Instant'
      : draft.config.cpuSpeed === 'fast'
        ? 'Fast'
        : 'Normal';

  const participantList =
    joinedUsers.length > 0
      ? joinedUsers
          .map((u) => {
            const team = teamMap.get(u.team);
            return `<@${u.discordId}> - ${team?.name ?? u.team}`;
          })
          .join('\n')
      : 'No one has joined yet.';

  const isSingleTeam = draft.config.format === 'single-team';

  const embed = new EmbedBuilder()
    .setTitle(isSingleTeam ? 'Solo Mock Draft' : 'Mock Draft Lobby')
    .setColor(0x2f3136)
    .addFields(
      { name: 'Format', value: formatLabel, inline: true },
      { name: 'Rounds', value: `${draft.config.rounds}`, inline: true },
      { name: 'Pick Timer', value: timer, inline: true },
      { name: 'CPU Speed', value: cpuSpeedLabel, inline: true },
      ...(isSingleTeam
        ? []
        : [{ name: 'Team Assignment', value: mode, inline: true }]),
      { name: 'Participants', value: participantList },
    )
    .setFooter({
      text: isSingleTeam
        ? 'Select your team to start the draft.'
        : 'Click Join Draft to enter the draft.',
    });

  // For single-team mode, only show team select (no Join button, no Start button)
  if (isSingleTeam) {
    const availableTeams = teams.filter(
      (t) => draft.teamAssignments[t.id] === null,
    );
    const { components } = buildTeamSelectMenu(draft.id, availableTeams);
    return { embed, components };
  }

  const joinButton = new ButtonBuilder()
    .setCustomId(`join:${draft.id}`)
    .setLabel('Join Draft')
    .setStyle(ButtonStyle.Primary);

  const startButton = new ButtonBuilder()
    .setCustomId(`start:${draft.id}`)
    .setLabel('Start Draft')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    joinButton,
    startButton,
  );

  return { embed, components: [row] };
}

export function buildTeamSelectMenu(
  draftId: string,
  availableTeams: TeamSeed[],
) {
  const options = availableTeams.slice(0, 25).map((t) => ({
    label: t.name,
    value: t.id,
    description: `${t.city} ${t.mascot}`,
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`teamselect:${draftId}`)
    .setPlaceholder('Choose your team')
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    menu,
  );

  return { components: [row] };
}

export function buildOnTheClockEmbed(
  draft: Draft,
  slot: DraftSlot,
  teamName: string,
  userDiscordId: string | null,
  topPlayers: Player[],
  showPauseButton = true,
) {
  const pickLabel = `Round ${slot.round}, Pick ${slot.pick} (Overall #${slot.overall})`;
  const onClock = userDiscordId ? `<@${userDiscordId}>` : `CPU (${teamName})`;
  const timer =
    draft.config.secondsPerPick > 0
      ? `You have ${draft.config.secondsPerPick} seconds.`
      : '';

  const embed = new EmbedBuilder()
    .setTitle(`On the Clock: ${teamName}`)
    .setColor(0x5865f2)
    .setDescription(`${onClock} is picking.\n${pickLabel}\n${timer}`)
    .addFields({
      name: 'Top Available Players',
      value: topPlayers
        .slice(0, 10)
        .map((p, i) => `${i + 1}. **${p.name}** (${p.position} - ${p.school})`)
        .join('\n'),
    });

  // Build player buttons (2 rows of 5)
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const buttonPlayers = topPlayers.slice(0, 10);

  for (let i = 0; i < buttonPlayers.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    const chunk = buttonPlayers.slice(i, i + 5);
    for (const player of chunk) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`pick:${draft.id}:${player.id}`)
          .setLabel(`${player.name} (${player.position})`)
          .setStyle(ButtonStyle.Primary),
      );
    }
    rows.push(row);
  }

  // Add control buttons row (only for human picks, not CPU)
  if (showPauseButton && userDiscordId) {
    const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`trade:${draft.id}`)
        .setLabel('Propose Trade')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`pause:${draft.id}`)
        .setLabel('Pause Draft')
        .setStyle(ButtonStyle.Secondary),
    );
    rows.push(controlRow);
  }

  return { embed, components: rows };
}

export function buildPausedEmbed(
  draft: Draft,
  slot: DraftSlot,
  teamName: string,
) {
  const pickLabel = `Round ${slot.round}, Pick ${slot.pick} (Overall #${slot.overall})`;

  // Count picks made
  const picksMade = draft.currentPick - 1;
  const totalPicks = draft.pickOrder.length;

  const embed = new EmbedBuilder()
    .setTitle('Draft Paused')
    .setColor(0xffa500)
    .setDescription(`The draft has been paused.`)
    .addFields(
      { name: 'Next Pick', value: `${teamName}\n${pickLabel}`, inline: true },
      {
        name: 'Progress',
        value: `${picksMade}/${totalPicks} picks`,
        inline: true,
      },
    )
    .setFooter({ text: 'Only the draft creator can resume.' });

  const resumeButton = new ButtonBuilder()
    .setCustomId(`resume:${draft.id}`)
    .setLabel('Resume Draft')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(resumeButton);

  return { embed, components: [row] };
}

export function buildCpuPicksBatchEmbed(
  picks: { slot: DraftSlot; player: Player; teamName: string }[],
) {
  const embed = new EmbedBuilder()
    .setTitle(`CPU Picks (${picks.length})`)
    .setColor(0x99aab5);

  const lines = picks.map(
    (p) =>
      `**#${p.slot.overall}** ${p.teamName}: **${p.player.name}** (${p.player.position})`,
  );

  // Split into chunks if needed (1024 char limit per field)
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if (current.length + line.length + 1 > 1000) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);

  for (let i = 0; i < chunks.length; i++) {
    embed.addFields({
      name: chunks.length === 1 ? 'Picks' : `Picks (${i + 1}/${chunks.length})`,
      value: chunks[i],
    });
  }

  return { embed };
}

export function buildPickAnnouncementEmbed(
  slot: DraftSlot,
  player: Player,
  teamName: string,
  isAutoPick: boolean,
) {
  const autoLabel = isAutoPick ? ' (Auto-Pick)' : '';

  const embed = new EmbedBuilder()
    .setTitle(`Pick #${slot.overall}${autoLabel}`)
    .setColor(0x57f287)
    .setDescription(
      `The **${teamName}** select **${player.name}**, ${player.position} from ${player.school}.`,
    )
    .addFields(
      { name: 'Round', value: `${slot.round}`, inline: true },
      { name: 'Pick', value: `${slot.pick}`, inline: true },
      {
        name: 'Consensus Rank',
        value: `#${player.consensusRank}`,
        inline: true,
      },
    );

  return { embed };
}

export function buildDraftSummaryEmbed(
  picks: Pick[],
  playerMap: Map<string, Player>,
  teamMap: Map<TeamAbbreviation, string>,
) {
  const embed = new EmbedBuilder()
    .setTitle('Draft Complete!')
    .setColor(0xfee75c);

  // Group picks by round
  const rounds = new Map<number, Pick[]>();
  for (const pick of picks) {
    const roundPicks = rounds.get(pick.round) ?? [];
    roundPicks.push(pick);
    rounds.set(pick.round, roundPicks);
  }

  for (const [round, roundPicks] of rounds) {
    const sortedPicks = roundPicks.sort((a, b) => a.overall - b.overall);
    const lines = sortedPicks.map((p) => {
      const player = playerMap.get(p.playerId);
      const team = teamMap.get(p.team) ?? p.team;
      const name = player?.name ?? 'Unknown';
      const pos = player?.position ?? '??';
      return `${p.pick}. ${team}: **${name}** (${pos})`;
    });

    // Discord embed field values have a 1024 char limit
    // Split into chunks that fit within the limit
    const chunks: string[][] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const line of lines) {
      const lineLength = line.length + 1; // +1 for newline
      if (currentLength + lineLength > 1000 && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentLength = 0;
      }
      currentChunk.push(line);
      currentLength += lineLength;
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    // Add fields for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const fieldName =
        chunks.length === 1
          ? `Round ${round}`
          : `Round ${round} (${i + 1}/${chunks.length})`;
      embed.addFields({ name: fieldName, value: chunks[i].join('\n') });
    }
  }

  return { embed };
}
