export const Routes = {
  // Core
  HOME: '/',
  AUTH: '/auth',
  AUTH_SIGNIN: '/auth/signin',

  // Drafts
  DRAFTS: '/drafts',
  DRAFT_NEW: '/drafts/new',
  DRAFT_DAY: '/draft-day',
  COMPANION: '/companion',
  LOBBIES: '/lobbies',

  // Scouting
  PROSPECTS: '/prospects',
  WATCHLIST: '/watchlist',
  TAPE_LOG: '/tape-log',
  BOARD: '/board',
  BOARD_COMPARE: '/board/compare',
  RANKINGS: '/rankings',
  BOARDS: '/boards',
  CONSENSUS: '/consensus',
  TRENDING: '/trending',

  // Community
  DISCOVER: '/discover',
  COMMUNITY: '/community',
  LISTS: '/lists',
  SCOUTS: '/scouts',
  LEADERBOARD: '/leaderboard',

  // Tools
  DRAFT_ORDER: '/draft-order',
  TEAMS: '/teams',
  PLAYERS: '/players',
  COMPARE_PLAYERS: '/comparePlayers',
  TRADE_CALCULATOR: '/trade-calculator',
  CONTRACT_BUILDER: '/contract-builder',
  INVITE: '/invite',

  // Learn
  LEARN_SALARY_CAP: '/learn/salary-cap',
  LEARN_NFL_DRAFT: '/learn/nfl-draft',

  // Settings
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',

  // Admin
  ADMIN: '/admin',
  ADMIN_TEAMS: '/admin/teams',
  ADMIN_DRAFT_RESULTS: '/admin/draft-results',
  ADMIN_UPLOAD: '/admin/upload',
  ADMIN_TEAM_HISTORY: '/admin/team-history',
  ADMIN_DRAFT_ORDER: '/admin/draft-order',
  ADMIN_PROSPECTS: '/admin/prospects',
  ADMIN_FEATURED: '/admin/featured',
  ADMIN_TRADE_VALUES: '/admin/trade-values',
  ADMIN_CPU_TUNING: '/admin/cpu-tuning',
  ADMIN_SCORING: '/admin/scoring',
  ADMIN_CONTRACTS: '/admin/contracts',
  ADMIN_ROOKIE_SLOTS: '/admin/rookie-slots',
  ADMIN_STAFF: '/admin/staff',
  ADMIN_MODERATION: '/admin/moderation',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_DRAFT_DAY: '/admin/draft-day',

  // API
  API_AUTH_DISCORD: '/api/auth/discord',
  API_AUTH_DISCORD_CALLBACK: '/api/auth/discord/callback',

  // Dynamic route helpers
  team: (abbr: string) => `/teams/${abbr}`,
  player: (espnId: string) => `/players/${espnId}`,
  prospect: (id: string) => `/prospects/${id}`,
  draft: (draftId: string) => `/drafts/${draftId}`,
  draftLive: (draftId: string) => `/drafts/${draftId}/live`,
  profile: (slug: string) => `/profile/${slug}`,
  scout: (slug: string) => `/scouts/${slug}`,
  board: (slug: string) => `/boards/${slug}`,
  list: (slug: string) => `/lists/${slug}`,
  overlay: (draftId: string, type: 'board' | 'ticker' | 'current-pick') =>
    `/overlay/${draftId}/${type}`,
  adminTeam: (abbr: string) => `/admin/teams/${abbr}`,
  adminTeamHistory: (abbr: string, year: string | number) =>
    `/admin/team-history/${abbr}/${year}`,
  comparePlayers: (p1?: string, p2?: string) => {
    const params = new URLSearchParams();
    if (p1) params.set('p1', p1);
    if (p2) params.set('p2', p2);
    const qs = params.toString();
    return qs ? `/comparePlayers?${qs}` : '/comparePlayers';
  },
} as const;
