/**
 * Simple in-memory rate limiter for Discord bot actions.
 *
 * Note: Discord already handles rate limiting for API calls, but this provides
 * application-level protection against spam (e.g., rapid pick attempts).
 */

const rateLimits = new Map<string, number>();

/**
 * Check if an action is rate limited.
 * Returns true if the action is allowed, false if rate limited.
 *
 * @param userId - The user's Discord ID
 * @param action - The action being performed (e.g., 'pick', 'trade')
 * @param cooldownMs - The cooldown period in milliseconds
 */
export function checkRateLimit(
  userId: string,
  action: string,
  cooldownMs: number,
): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const lastAction = rateLimits.get(key) ?? 0;

  if (now - lastAction < cooldownMs) {
    return false; // Rate limited
  }

  rateLimits.set(key, now);
  return true;
}

/**
 * Get the remaining cooldown time for an action.
 * Returns 0 if not rate limited.
 *
 * @param userId - The user's Discord ID
 * @param action - The action being performed
 * @param cooldownMs - The cooldown period in milliseconds
 */
export function getRemainingCooldown(
  userId: string,
  action: string,
  cooldownMs: number,
): number {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const lastAction = rateLimits.get(key) ?? 0;
  const elapsed = now - lastAction;

  if (elapsed >= cooldownMs) {
    return 0;
  }

  return cooldownMs - elapsed;
}

/**
 * Clear the rate limit for a specific user and action.
 * Useful for testing or administrative purposes.
 */
export function clearRateLimit(userId: string, action: string): void {
  const key = `${userId}:${action}`;
  rateLimits.delete(key);
}

/**
 * Clear all rate limits.
 * Useful for testing.
 */
export function clearAllRateLimits(): void {
  rateLimits.clear();
}

// Default cooldowns (in milliseconds)
export const COOLDOWNS = {
  PICK: 1000, // 1 second between picks
  TRADE_PROPOSAL: 5000, // 5 seconds between trade proposals
  JOIN_DRAFT: 2000, // 2 seconds between join attempts
} as const;

// Cleanup old entries every minute to prevent memory leaks
const CLEANUP_INTERVAL = 60000; // 1 minute
const MAX_ENTRY_AGE = 60000; // 1 minute

setInterval(() => {
  const cutoff = Date.now() - MAX_ENTRY_AGE;
  for (const [key, time] of rateLimits) {
    if (time < cutoff) {
      rateLimits.delete(key);
    }
  }
}, CLEANUP_INTERVAL);
