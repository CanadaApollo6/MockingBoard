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
  PositionFilterGroup,
} from '@mockingboard/shared';
import { POSITION_GROUPS } from '@mockingboard/shared';
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
  const tradesLabel = draft.config.tradesEnabled ? 'Enabled' : 'Disabled';

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
      { name: 'Trades', value: tradesLabel, inline: true },
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

// Filter labels for display
const FILTER_LABELS: Record<Exclude<PositionFilterGroup, null>, string> = {
  QB: 'QB',
  WR_TE: 'WR/TE',
  RB: 'RB',
  OL: 'OL',
  DEF: 'DEF',
};

/**
 * Filter players by position group
 */
function filterByPositionGroup(
  players: Player[],
  filter: PositionFilterGroup,
): Player[] {
  if (filter === null) return players;
  const positions = POSITION_GROUPS[filter];
  return players.filter((p) => positions.includes(p.position));
}

/**
 * Build position filter button row
 */
function buildPositionFilterRow(
  draftId: string,
  activeFilter: PositionFilterGroup,
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  const filters: Exclude<PositionFilterGroup, null>[] = [
    'QB',
    'WR_TE',
    'RB',
    'OL',
    'DEF',
  ];

  for (const filter of filters) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`filter:${draftId}:${filter}`)
        .setLabel(FILTER_LABELS[filter])
        .setStyle(
          activeFilter === filter ? ButtonStyle.Primary : ButtonStyle.Secondary,
        ),
    );
  }

  return row;
}

/**
 * Build quick-pick button row (top 5 filtered players)
 */
function buildQuickPickRow(
  draftId: string,
  players: Player[],
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  const topFive = players.slice(0, 5);

  for (const player of topFive) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`pick:${draftId}:${player.id}`)
        .setLabel(`${player.name} (${player.position})`)
        .setStyle(ButtonStyle.Primary),
    );
  }

  return row;
}

/**
 * Build browse select menu (players 6-30 after quick picks)
 */
function buildBrowseSelectRow(
  draftId: string,
  players: Player[],
  filterLabel: string | null,
): ActionRowBuilder<StringSelectMenuBuilder> {
  // Skip first 5 (shown as buttons), take up to 25 more
  const browsePlayers = players.slice(5, 30);

  const options = browsePlayers.map((p, i) => ({
    label: `${i + 6}. ${p.name} (${p.position})`,
    value: p.id,
    description: p.school,
  }));

  // If no browse players available, show placeholder
  if (options.length === 0) {
    options.push({
      label: 'No additional players',
      value: 'none',
      description: 'Try removing position filter',
    });
  }

  const placeholder = filterLabel
    ? `Browse more ${filterLabel} players...`
    : 'Browse more players...';

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`browse:${draftId}`)
    .setPlaceholder(placeholder)
    .addOptions(options.slice(0, 25)); // Discord limit

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

/**
 * Build control button row (Trade, Pause, Clear Filter)
 */
function buildControlRow(
  draftId: string,
  hasFilter: boolean,
  showPauseButton: boolean,
  tradesEnabled: boolean,
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  if (tradesEnabled) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`trade:${draftId}`)
        .setLabel('Propose Trade')
        .setStyle(ButtonStyle.Primary),
    );
  }

  if (showPauseButton) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`pause:${draftId}`)
        .setLabel('Pause Draft')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  if (hasFilter) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`clearfilter:${draftId}`)
        .setLabel('Clear Filter')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  return row;
}

export function buildOnTheClockEmbed(
  draft: Draft,
  slot: DraftSlot,
  teamName: string,
  userDiscordId: string | null,
  allPlayers: Player[],
  showPauseButton = true,
  positionFilter: PositionFilterGroup = null,
) {
  const pickLabel = `Round ${slot.round}, Pick ${slot.pick} (Overall #${slot.overall})`;
  const onClock = userDiscordId ? `<@${userDiscordId}>` : `CPU (${teamName})`;
  const timer =
    draft.config.secondsPerPick > 0
      ? `You have ${draft.config.secondsPerPick} seconds.`
      : '';

  // Filter players by position if filter is active
  const filteredPlayers = filterByPositionGroup(allPlayers, positionFilter);
  const filterLabel = positionFilter ? FILTER_LABELS[positionFilter] : null;

  // Build description with filter info
  const filterInfo = filterLabel ? `\n**Filtering: ${filterLabel}**` : '';
  const description =
    `${onClock} is picking.\n${pickLabel}${filterInfo}\n${timer}`.trim();

  const embed = new EmbedBuilder()
    .setTitle(`On the Clock: ${teamName}`)
    .setColor(0x5865f2)
    .setDescription(description)
    .addFields({
      name: filterLabel
        ? `Top ${filterLabel} Players`
        : 'Top Available Players',
      value:
        filteredPlayers.length > 0
          ? filteredPlayers
              .slice(0, 5)
              .map(
                (p, i) =>
                  `${i + 1}. **${p.name}** (${p.position} - ${p.school})`,
              )
              .join('\n')
          : 'No players available for this filter.',
    })
    .setFooter({ text: 'Tip: Use /draft to search by name' });

  // For CPU picks, just return embed without components
  if (!userDiscordId) {
    return { embed, components: [] };
  }

  // Build 4-row layout for human picks
  const rows: (
    | ActionRowBuilder<ButtonBuilder>
    | ActionRowBuilder<StringSelectMenuBuilder>
  )[] = [];

  // Row 1: Position filter buttons
  rows.push(buildPositionFilterRow(draft.id, positionFilter));

  // Row 2: Quick-pick buttons (top 5)
  if (filteredPlayers.length > 0) {
    rows.push(buildQuickPickRow(draft.id, filteredPlayers));
  }

  // Row 3: Browse select menu (players 6-30)
  if (filteredPlayers.length > 5) {
    rows.push(buildBrowseSelectRow(draft.id, filteredPlayers, filterLabel));
  }

  // Row 4: Control buttons (only add if there are buttons to show)
  const controlRow = buildControlRow(
    draft.id,
    positionFilter !== null,
    showPauseButton,
    draft.config.tradesEnabled,
  );
  if (controlRow.components.length > 0) {
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
