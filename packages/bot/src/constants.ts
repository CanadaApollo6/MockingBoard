// Embed colors
export const COLORS = {
  DEFAULT: 0x2f3136,
  BLURPLE: 0x5865f2,
  GREEN: 0x57f287,
  ORANGE: 0xffa500,
  RED: 0xed4245,
  GREY: 0x99aab5,
  YELLOW: 0xfee75c,
} as const;

// CPU pick delays (ms)
export const CPU_DELAY = { fast: 300, normal: 1500 } as const;

// Discord limits
export const DISCORD_SELECT_MAX = 25;
export const QUICK_PICK_COUNT = 5;
export const BROWSE_PLAYER_MAX = 30;

// CPU pick probabilities
export const CPU_PICK_WEIGHTS = { TOP: 0.7, MID: 0.9 } as const;

// Trade proposal state TTL (ms) - clean up abandoned flows
export const TRADE_PROPOSAL_TTL = 10 * 60 * 1000; // 10 minutes
