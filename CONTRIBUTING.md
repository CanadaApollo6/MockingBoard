# Contributing to MockingBoard

Thanks for your interest in contributing! This guide will help you get set up.

## Prerequisites

- Node.js v22.12+
- npm v10+
- A Discord application with a bot token ([create one here](https://discord.com/developers/applications))

## Getting Started

1. Fork and clone the repo
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your Discord credentials
4. Register slash commands in your test server:

   ```bash
   npm run deploy-commands -w packages/bot
   ```

5. Start the bot:

   ```bash
   npm run dev:bot
   ```

## Project Structure

This is a monorepo using npm workspaces:

```text
packages/
  bot/        # Discord bot (discord.js)
  shared/     # Shared types, utilities, constants
```

## Development Workflow

1. Create a branch from `main`
2. Make your changes
3. Ensure all checks pass:

   ```bash
   npm run lint
   npm run format:check
   npm test
   ```

4. Open a pull request against `main`

## Code Style

- TypeScript throughout, strict mode enabled
- Prettier handles formatting (`npm run format` to auto-fix)
- ESLint handles linting (`npm run lint:fix` to auto-fix)
- Single quotes, trailing commas
- ESM imports with `.js` extensions (TypeScript resolves these to `.ts` at compile time)

## Testing

- Tests live next to source files as `*.test.ts`
- Run tests: `npm test`
- Run in watch mode: `npm run test:watch`
- All business logic should have unit tests

## Commit Messages

Write clear, concise commit messages. Use the imperative mood ("Add feature" not "Added feature").

## Questions?

Open an issue if something is unclear or you need help getting started.
