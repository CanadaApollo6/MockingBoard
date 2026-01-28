# MockingBoard

A social-first mock draft platform. Draft with your friends inside Discord -- no
separate app, no context switching. Every draft is saved, your preferences are
learned over time, and leaderboards track who actually knows football.

## Why MockingBoard?

| Feature                 | MockingBoard | Typical mock draft sites |
| ----------------------- | ------------ | ------------------------ |
| Draft inside Discord    | Yes          | No                       |
| Saved draft history     | Yes          | No                       |
| Preference learning     | Yes          | No                       |
| Year-round leaderboards | Planned      | No                       |

## Tech Stack

- **Discord Bot** -- TypeScript, discord.js
- **Database** -- Cloud Firestore
- **Shared Logic** -- TypeScript (npm workspace)
- **Cloud Platform** -- Google Cloud Platform

## Project Structure

```text
packages/
  bot/        # Discord bot (discord.js)
  shared/     # Shared types, utilities, constants
```

## Prerequisites

- [Node.js](https://nodejs.org/) v22.12+
- npm v10+
- A [Discord Application](https://discord.com/developers/applications) with a bot token
- A [Firebase project](https://console.firebase.google.com/) with Firestore enabled

## Setup

1. Clone the repo:

   ```bash
   git clone https://github.com/rielst/MockingBoard.git
   cd MockingBoard
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the example environment file and fill in your values:

   ```bash
   cp .env.example .env
   ```

4. Required environment variables (see `.env.example`):
   - `DISCORD_TOKEN` -- Your Discord bot token
   - `DISCORD_CLIENT_ID` -- Your Discord application client ID
   - `DISCORD_GUILD_ID` -- Your development server ID (for dev command registration)

## Development

```bash
# Run the bot in development mode (auto-restart on changes)
npm run dev:bot

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Format
npm run format
```

## License

MIT
