# MockingBoard Discord Bot

A social mock draft bot for Discord. Run NFL mock drafts with friends directly in your Discord server.

## Features

- **Full 32-team drafts** with friends controlling some teams and CPU filling the rest
- **Single-team solo mode** for quick practice drafts
- **Position filtering** (QB, WR/TE, RB, OL, DEF) for quick player selection
- **Pick trading** with CPU teams (uses Rich Hill trade value chart)
- **Configurable settings**: rounds (1-7), pick timer, CPU speed
- **Draft history** saved to Firestore

## Setup

### Prerequisites

- Node.js 20+
- A Discord application with a bot token
- A Firebase project with Firestore enabled

### Environment Variables

Create a `.env` file in the project root (not the packages/bot directory):

```text
DISCORD_TOKEN=your_discord_bot_token
```

You also need a `firebase-key.json` service account key file in the project root.

### Installation

From the project root:

```bash
npm install
```

### Development

```bash
npm run dev:bot
```

### Production Build

```bash
npm run build --workspace=@mockingboard/bot
node packages/bot/dist/index.js
```

## Commands

### /startdraft

Start a new mock draft with configurable options:

- **rounds** (required): Number of rounds (1-7)
- **pick_timer**: Seconds per pick (0 for unlimited, default 120)
- **team_assignment**: Random or Player Choice
- **format**: Full 32-team or Single Team (Solo)
- **cpu_speed**: Instant, Fast, or Normal

### /draft [player]

Search and draft a player by name. Use the autocomplete to find players.

### /help

Show available commands and usage information.

## During a Draft

- **Quick Pick**: Click player buttons to draft instantly
- **Position Filter**: Filter available players by position group
- **Browse More**: Use the dropdown to see players beyond the top 5
- **Trade**: Click "Propose Trade" to trade picks with other teams
- **Pause/Resume**: Draft creator can pause and resume the draft

## Architecture

```text
packages/bot/src/
├── commands/          # Slash command definitions
├── components/        # Discord embed builders
├── events/            # Event handlers (interactionCreate)
├── handlers/          # Business logic for buttons/menus
├── services/          # Data access (Firestore, player cache)
├── errors/            # Custom error classes
└── utils/             # Utilities (env, firestore)
```

## Deployment

### Docker

Build the Docker image:

```bash
docker build -t mockingboard-bot .
```

Run with environment variables:

```bash
docker run -e DISCORD_TOKEN=your_token mockingboard-bot
```

### Google Cloud Run

See `cloudbuild.yaml` for Cloud Build configuration. Secrets should be stored in Secret Manager.

## Testing

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```
