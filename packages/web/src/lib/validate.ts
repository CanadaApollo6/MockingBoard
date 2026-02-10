/** Pick only allowed keys from an object, ignoring all others. */
export function pickFields<T extends Record<string, unknown>>(
  body: T,
  allowed: string[],
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) result[key] = body[key];
  }
  return result as Partial<T>;
}

/** Application error with an HTTP status code for structured catch handling. */
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

const SAFE_MESSAGES = new Set([
  // Draft / pick errors
  'Draft not found',
  'Not a participant',
  'Not your turn',
  'Draft is not active',
  'Player already drafted',
  'No more picks',
  // Lobby errors
  'Draft is not in lobby state',
  'Already in this draft',
  'Invalid invite code',
  'No teams available',
  'Team selection required',
  'Team not available',
  'Only the creator can start the draft',
  'At least one participant required',
  'Creator cannot leave the draft',
  // Trade errors
  'Trade not found',
  'Trade is not pending',
  'Trade has expired',
  'You do not control that team',
]);

/** Return the error message if it's a known application message, otherwise the fallback. */
export function safeError(err: unknown, fallback: string): string {
  if (err instanceof AppError) return err.message;
  const msg = err instanceof Error ? err.message : '';
  return SAFE_MESSAGES.has(msg) ? msg : fallback;
}

/** Extract the error message, falling back to a default if not an Error. */
export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong',
): string {
  return err instanceof Error ? err.message : fallback;
}
