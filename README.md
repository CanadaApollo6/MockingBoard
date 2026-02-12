# MockingBoard

A full-stack NFL draft platform where mock drafting meets community scouting. Draft with friends inside Discord or on the web, build big boards, write scouting reports, track prediction accuracy on leaderboards, and explore NFL team and player data — all without a single ad.

## Features

| Feature                                              | Status  |
| ---------------------------------------------------- | ------- |
| Mock drafting (solo, multiplayer, multi-team, guest) | Live    |
| Draft inside Discord                                 | Live    |
| Draft on the web                                     | Live    |
| Saved draft history with replay                      | Live    |
| Big board builder with snapshots and comparison      | Live    |
| Community scouting reports and video breakdowns      | Live    |
| Public boards, scout profiles, follow system         | Live    |
| Prediction accuracy leaderboards                     | Live    |
| NFL team breakdowns (roster, needs, draft capital)   | Live    |
| NFL player pages with ESPN stats                     | Live    |
| Trade value calculator                               | Live    |
| Draft order with pick ownership                      | Live    |
| Post-draft analytics and grading                     | Live    |
| OBS overlays and embeddable widgets                  | Live    |
| PDF draft guide export                               | Live    |
| Content creator profiles and attribution             | Live    |
| Draft Day countdown and live companion               | Live    |
| Monetization (Stripe, Pro tier)                      | Planned |
| GM Mode / Offseason Simulator                        | Planned |

## Tech Stack

- **Web App** — Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui
- **Discord Bot** — TypeScript, discord.js
- **Shared Logic** — TypeScript (npm workspace)
- **Database** — Cloud Firestore
- **Auth** — Firebase Auth (Discord, Google, email/password)
- **Cloud** — GCP (Cloud Run, Firebase App Hosting)
- **Build** — Turborepo, npm workspaces

## Project Structure

```text
packages/
  bot/        # Discord bot (discord.js)
  web/        # Next.js web application
  shared/     # Shared types, utilities, constants
firebase/     # Firestore rules, indexes
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
   - `DISCORD_TOKEN` — Discord bot token
   - `DISCORD_CLIENT_ID` — Discord application client ID
   - `DISCORD_GUILD_ID` — Development server ID (for dev command registration)

## Development

```bash
# Run the bot locally
npm run dev:bot

# Run the web app locally
npm run dev:web

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Format
npm run format

# Full verification (lint + test + format check)
npm run verify

# Build all packages
npm run build
```

## Documentation

- [ROADMAP.md](ROADMAP.md) — Project status and planned features
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — Visual design system
- [MONETIZATION.md](MONETIZATION.md) — Revenue strategy
- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment procedures
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution guidelines

## License

MIT
