/**
 * Application configuration with validation.
 *
 * Environment variables are loaded from .env via utils/env.js
 * In production (Cloud Run), secrets are injected via Secret Manager.
 */

export const config = {
  /** Discord bot token */
  discordToken: process.env.DISCORD_TOKEN ?? '',

  /** Firebase project ID (optional, auto-detected from service account) */
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,

  /** Current environment */
  environment: process.env.NODE_ENV ?? 'development',

  /** Whether we're running in production */
  isProduction: process.env.NODE_ENV === 'production',
} as const;

/**
 * Validate required configuration at startup.
 * Throws if required values are missing.
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.discordToken) {
    errors.push('DISCORD_TOKEN is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

/**
 * Log configuration (without sensitive values) for debugging.
 */
export function logConfig(): void {
  console.log('Configuration:', {
    environment: config.environment,
    isProduction: config.isProduction,
    hasDiscordToken: !!config.discordToken,
    firebaseProjectId: config.firebaseProjectId ?? '(auto-detect)',
  });
}
