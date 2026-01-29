/**
 * Trade Timer Service
 *
 * Manages trade expiration timers. Similar to pick timers but for trade offers.
 * Default timeout is 2 minutes (120 seconds).
 */

const tradeTimers = new Map<string, NodeJS.Timeout>();

export const DEFAULT_TRADE_TIMEOUT_SECONDS = 120;

/**
 * Set a timer for a trade to expire.
 *
 * @param tradeId - The trade ID
 * @param seconds - Seconds until expiration (default: 120)
 * @param onExpire - Callback when timer expires
 */
export function setTradeTimer(
  tradeId: string,
  seconds: number,
  onExpire: () => void,
): void {
  clearTradeTimer(tradeId);
  if (seconds <= 0) return;

  const timeout = setTimeout(onExpire, seconds * 1000);
  tradeTimers.set(tradeId, timeout);
}

/**
 * Clear a trade timer.
 */
export function clearTradeTimer(tradeId: string): void {
  const existing = tradeTimers.get(tradeId);
  if (existing) {
    clearTimeout(existing);
    tradeTimers.delete(tradeId);
  }
}

/**
 * Check if a trade has an active timer.
 */
export function hasTradeTimer(tradeId: string): boolean {
  return tradeTimers.has(tradeId);
}

/**
 * Get the number of active trade timers (for debugging).
 */
export function getActiveTradeTimerCount(): number {
  return tradeTimers.size;
}

/**
 * Clear all trade timers (for cleanup on shutdown).
 */
export function clearAllTradeTimers(): void {
  for (const timeout of tradeTimers.values()) {
    clearTimeout(timeout);
  }
  tradeTimers.clear();
}
