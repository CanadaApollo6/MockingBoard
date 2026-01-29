/**
 * Base error class for all draft-related errors
 */
export class DraftError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DraftError';
  }
}

/**
 * Thrown when user tries to pick out of turn
 */
export class NotYourTurnError extends DraftError {
  constructor() {
    super("It's not your turn to pick.", 'NOT_YOUR_TURN');
    this.name = 'NotYourTurnError';
  }
}

/**
 * Thrown when draft is not in the required status
 */
export class DraftNotActiveError extends DraftError {
  constructor() {
    super('This draft is not active.', 'DRAFT_NOT_ACTIVE');
    this.name = 'DraftNotActiveError';
  }
}

/**
 * Thrown when player has already been drafted
 */
export class PlayerAlreadyDraftedError extends DraftError {
  constructor(playerName?: string) {
    super(
      playerName
        ? `${playerName} has already been drafted.`
        : 'That player has already been drafted.',
      'PLAYER_ALREADY_DRAFTED',
    );
    this.name = 'PlayerAlreadyDraftedError';
  }
}

/**
 * Thrown when user tries to perform an action they're not authorized for
 */
export class UnauthorizedError extends DraftError {
  constructor(action: string) {
    super(`Only the draft creator can ${action}.`, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * Thrown for trade-related errors
 */
export class TradeError extends DraftError {
  constructor(message: string) {
    super(message, 'TRADE_ERROR');
    this.name = 'TradeError';
  }
}

/**
 * Thrown when a trade is not found
 */
export class TradeNotFoundError extends TradeError {
  constructor() {
    super('Trade not found.');
    this.name = 'TradeNotFoundError';
  }
}

/**
 * Thrown when a trade is not in the required status
 */
export class TradeNotPendingError extends TradeError {
  constructor() {
    super('This trade is no longer pending.');
    this.name = 'TradeNotPendingError';
  }
}

/**
 * Thrown when draft is not found
 */
export class DraftNotFoundError extends DraftError {
  constructor() {
    super('Draft not found.', 'DRAFT_NOT_FOUND');
    this.name = 'DraftNotFoundError';
  }
}

/**
 * Thrown when user is rate limited
 */
export class RateLimitError extends DraftError {
  constructor(action: string, cooldownSeconds: number) {
    super(
      `Please wait ${cooldownSeconds} second${cooldownSeconds > 1 ? 's' : ''} before ${action}.`,
      'RATE_LIMITED',
    );
    this.name = 'RateLimitError';
  }
}
