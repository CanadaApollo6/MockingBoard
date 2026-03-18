const windows = new Map<string, number[]>();

/**
 * In-memory sliding window rate limiter.
 * Returns true if the request is allowed, false if rate-limited.
 *
 * NOTE: This is per-process — each Cloud Run instance maintains its own map.
 * In a multi-instance deployment a client can bypass the limit by hitting
 * different instances. A distributed solution (e.g. Redis/Upstash) would be
 * needed for strict enforcement. Acceptable for now as a best-effort guard.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const timestamps = (windows.get(key) ?? []).filter((t) => t > now - windowMs);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  windows.set(key, timestamps);

  // Sweep stale entries when the map grows too large
  if (windows.size > 10_000) {
    for (const [k, ts] of windows) {
      if (ts.every((t) => t <= now - windowMs)) windows.delete(k);
    }
  }

  return true;
}

/** Extract a best-effort client IP from request headers. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
