# MockingBoard System Architecture

## Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                            CLIENTS                               │
├──────────────────┬──────────────────┬────────────────────────────┤
│   Discord Bot    │     Web App      │    iMessage Extension      │
│  (discord.js)    │  (Next.js 16)    │       (Future)             │
└────────┬─────────┴────────┬─────────┴────────────────────────────┘
         │                  │
         ▼                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                         FIREBASE                                 │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Firebase Auth │  │  Firestore   │  │  Firebase App Hosting  │ │
│  │              │  │              │  │                        │ │
│  │ - Discord    │  │ - Users      │  │  - Next.js web app     │ │
│  │ - Google     │  │ - Drafts     │  │  - SSR + ISR           │ │
│  │ - Email/pwd  │  │ - Players    │  │  - API routes          │ │
│  │ - Sessions   │  │ - Teams      │  │                        │ │
│  │              │  │ - Boards     │  │                        │ │
│  │              │  │ - Reports    │  │                        │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      GOOGLE CLOUD                                │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Cloud Run   │  │ Cloud Build  │  │   Secret Manager       │ │
│  │  (Bot host)  │  │ (CI/CD bot)  │  │   (Credentials)        │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```text
mockingboard/
├── packages/
│   ├── bot/              # Discord bot — discord.js, slash commands, draft management
│   ├── web/              # Next.js 16 web app — App Router, server components, ISR
│   └── shared/           # Shared types, utilities, constants — platform-agnostic logic
├── firebase/             # Firestore rules and indexes
├── cloudbuild.yaml       # Cloud Build config for bot deployment
├── turbo.json            # Turborepo pipeline config
└── vitest.config.ts      # Root test config
```

**Workspaces**: `@mockingboard/bot`, `@mockingboard/web`, `@mockingboard/shared`

**Build orchestration**: Turborepo with npm workspaces. `shared` builds first, then `bot` and `web` in parallel.

## Tech Stack

| Layer         | Technology                          | Notes                                                        |
| ------------- | ----------------------------------- | ------------------------------------------------------------ |
| Language      | TypeScript 5.7                      | Strict mode, shared types across all packages                |
| Web framework | Next.js 16 (App Router)             | Server components, ISR, API routes                           |
| UI            | React 19, Tailwind CSS 4, shadcn/ui | Radix primitives, team-color theming                         |
| Bot framework | discord.js                          | Slash commands, button interactions, thread management       |
| Database      | Cloud Firestore                     | Real-time listeners, security rules, composite indexes       |
| Auth          | Firebase Auth                       | Discord OAuth, Google OAuth, email/password, session cookies |
| Hosting (web) | Firebase App Hosting                | Managed Cloud Run under the hood, SSR support                |
| Hosting (bot) | Google Cloud Run                    | Always-on (min-instances=1), single container                |
| CI/CD (bot)   | Cloud Build                         | Dockerfile → Artifact Registry → Cloud Run                   |
| Secrets       | Google Secret Manager               | Discord token, Firebase service account                      |
| Testing       | Vitest, Testing Library             | 500+ unit tests across all packages                          |
| Monorepo      | Turborepo + npm workspaces          | Parallel builds, shared config                               |
| Rich text     | TipTap                              | Scouting report editor                                       |
| Drag & drop   | @dnd-kit                            | Big board ranking                                            |
| PDF           | @react-pdf/renderer                 | Client-side draft guide generation                           |
| Animations    | Framer Motion                       | Page transitions, draft UI                                   |

## Web App Architecture

```text
packages/web/src/
├── app/                          # Next.js App Router
│   ├── admin/                    # Auth-gated admin dashboard (12 sections)
│   ├── api/                      # API routes (drafts, auth, boards, reports, etc.)
│   ├── auth/                     # Sign-in, sign-up, OAuth callbacks
│   ├── board/                    # Big board builder + comparison
│   ├── boards/                   # Public board browse + [slug] view
│   ├── community/                # Discovery hub
│   ├── companion/                # Draft day companion
│   ├── draft-order/              # Draft order page
│   ├── drafts/                   # Draft history, detail, creation, guest mode
│   ├── embed/                    # Embeddable widgets (board, player card)
│   ├── leaderboard/              # Accuracy leaderboard
│   ├── lobbies/                  # Public lobby browser
│   ├── overlay/                  # OBS stream overlays
│   ├── players/                  # NFL player directory + [espnId] detail
│   ├── profile/                  # Public user profiles + [slug]
│   ├── prospects/                # Prospect browse + [id] hub
│   ├── scouts/                   # Scout directory + [slug]
│   ├── settings/                 # User settings + profile editor
│   ├── teams/                    # Team breakdowns + [abbreviation]
│   └── trade-calculator/         # Standalone trade value calculator
├── components/                   # React components by feature area
│   ├── auth/                     # OAuth buttons, auth guards
│   ├── board/                    # Board builder, board cards
│   ├── community/                # Community feed, profile cards
│   ├── draft/                    # Draft UI, pick interface, lobby
│   ├── draft-guide/              # PDF generation components
│   ├── grade/                    # Grade display, grade buttons
│   ├── layout/                   # Sidebar, navigation, dashboard widgets
│   ├── nfl-player/               # NFL player cards, stat tables
│   ├── notification/             # Notification drawer, bell icon
│   ├── overlays/                 # OBS overlay components
│   ├── player/                   # Prospect cards, player hero
│   ├── profile/                  # Profile pages, share cards
│   ├── recap/                    # Draft recap, team grades
│   ├── share/                    # Image sharing, share buttons
│   ├── team-breakdown/           # Team pages (cap, roster, draft, FA tabs)
│   ├── trade/                    # Trade modal, trade UI
│   ├── ui/                       # shadcn/ui primitives
│   └── video/                    # Video gallery, video submit
├── hooks/                        # React hooks
│   ├── use-big-board.ts          # Board state management
│   ├── use-draft-core.ts         # Draft state machine
│   ├── use-draft-timer.ts        # Pick countdown timer
│   ├── use-live-draft.ts         # Firestore onSnapshot listener
│   ├── use-live-trades.ts        # Real-time trade updates
│   ├── use-local-draft.ts        # Guest mode (client-side state)
│   ├── use-notifications.ts      # Notification subscription
│   ├── use-pick-timer.ts         # SVG progress ring timer
│   └── use-team-theme.ts         # Team color theming
├── lib/                          # Server-side utilities
│   ├── cache/                    # ISR cache, ESPN data cache, player cache
│   ├── colors/                   # Team colors, gradient utilities
│   ├── data-import/              # CSV import, prospect parsers
│   ├── draft-actions/            # Server-side draft logic (picks, trades, setup)
│   └── firebase/                 # Admin SDK, auth sessions, data queries, sanitization
└── middleware.ts                 # Auth middleware, route protection
```

### Key Patterns

**Server Components + ISR**: Data-driven pages (teams, players, draft order) use server components with `revalidate = 3600`. Initial paint is SSR, then ISR handles staleness.

**Real-time Hydration**: Live draft pages SSR the initial state, then hydrate with Firestore `onSnapshot` listeners for real-time updates (picks, trades, timer, participants).

**ESPN Data Caching**: In-memory `CacheEntry<T>` with `getOrExpire()` pattern. 1-hour TTL for player data, 6-hour TTL for aggregated rosters. See `lib/cache/`.

**API Route Pattern**: All mutations go through `/api/` routes. Routes validate auth via `getSessionUser()`, call business logic in `lib/`, return JSON responses.

## Discord Bot Architecture

```text
packages/bot/src/
├── commands/                     # Slash command definitions
│   ├── startdraft.ts             # /startdraft — create and configure a draft
│   ├── draft.ts                  # /draft — manual pick command
│   └── help.ts                   # /help — command reference
├── components/                   # Discord UI (buttons, embeds, announcements)
├── events/                       # Discord gateway event handlers
├── handlers/                     # Draft flow orchestration
│   ├── draftLobby.ts             # Lobby creation, team selection
│   ├── draftPicking.ts           # Pick recording, player buttons
│   ├── draftAdvance.ts           # Turn advancement, CPU cascade, completion
│   ├── trade.ts                  # Trade execution
│   ├── tradeProposal.ts          # Trade proposal UI
│   └── shared.ts                 # Common handler utilities
├── services/                     # Business logic
│   ├── draft.service.ts          # Draft state management
│   ├── pick.service.ts           # Pick recording and validation
│   ├── player.service.ts         # Player queries
│   ├── user.service.ts           # User management (lazy creation)
│   ├── trade.service.ts          # Trade validation and execution
│   ├── tradeTimer.service.ts     # Trade timeout management
│   └── rateLimit.service.ts      # Command rate limiting
├── utils/                        # Firestore client, formatting helpers
└── index.ts                      # Entry point, client initialization
```

### Command Flow: Making a Pick

```text
User clicks player button
        │
        ▼
interactionCreate event handler
        │
        ▼
Validate: user's turn? player available?
        │
        ▼
pick.service.recordPick()
        ├── Write Pick document to Firestore
        ├── Update Draft state (currentPick, clockExpiresAt)
        └── Post pick announcement to thread
        │
        ▼
draftAdvance handler
        ├── Draft complete? → Post summary, set status
        └── Next pick is CPU? → CPU cascade (recursive picks)
        │
        ▼
Send player buttons to next human drafter
```

## Shared Package

```text
packages/shared/src/
├── types.ts                      # All shared TypeScript types (Draft, Pick, Player, Team, etc.)
├── draft.ts                      # Pick order building, turn resolution, draft state helpers
├── cpu.ts                        # CPU pick logic (need-adjusted, positional weighting, variance)
├── trade.ts                      # Trade validation (7 functions), CPU trade evaluation
├── tradeValues.ts                # Rich Hill trade value chart
├── draft-analytics.ts            # Post-draft grading engine (Massey/Thaler, Baldwin, OTC/PFF)
├── grades.ts                     # Positional value model, surplus curves, pick classification
├── board-generator.ts            # Rapid board generation with trait/production weighting
├── draft-names.ts                # Auto-generated draft name logic
├── prospect-import.ts            # CSV/sheet import parsers, data validation
├── data/                         # Static data (teams, coaching staffs)
└── index.ts                      # Public API exports
```

**Design rule**: Only pure, platform-agnostic logic belongs in `shared`. No Firestore, no Discord, no Next.js imports. Both `bot` and `web` consume this package identically.

## Authentication

Three providers, unified through Firebase Auth:

| Provider       | Flow                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| Discord OAuth  | Redirect → callback → exchange code → Firebase custom token → session cookie |
| Google OAuth   | Firebase Auth popup → session cookie                                         |
| Email/Password | Firebase Auth createUser → session cookie                                    |

**Account linking**: Users can connect multiple providers to one account. `discordId` is optional (not all users come from Discord). Session cookies are HttpOnly, validated server-side via `getSessionUser()`.

## Firestore Schema

```text
/users/{userId}                   # User profile, preferences, notification settings
/drafts/{draftId}                 # Draft config, state, participants, pick order
  /picks/{pickId}                 # Individual picks (subcollection)
/players/{playerId}               # Prospect data (name, position, school, rank, attributes)
/teams/{abbreviation}             # NFL team data (needs, picks, coaching staff, front office)
/bigBoards/{boardId}              # User big boards (rankings, snapshots, visibility)
/scoutingReports/{reportId}       # Community scouting reports (per user, per player, per year)
/videos/{videoId}                 # Community video breakdowns
/notifications/{notificationId}   # User notifications
/predictions/{predictionId}       # Locked draft predictions
/actualResults/{year}             # Real NFL draft results for scoring
/draftOrder/{year}                # Official draft order with trade tracking
/contracts/{teamAbbreviation}     # Team contract/cap data (admin-imported)
```

**Security rules**: Users can only read/write their own data and drafts they participate in. Admin routes are gated by a `role: 'admin'` field on the user document.

## Deployment

### Web App (Firebase App Hosting)

```text
packages/web/apphosting.yaml
├── CPU: 1
├── Memory: 512 MB
├── Concurrency: 80
├── Environment: Firebase credentials, OAuth config, app URL
└── URL: https://mockingboard.app
```

Deployed automatically by Firebase App Hosting (managed Cloud Run). Supports SSR, ISR, and API routes natively.

### Discord Bot (Cloud Run via Cloud Build)

```text
cloudbuild.yaml
├── Build: Docker image from /Dockerfile
├── Registry: us-central1-docker.pkg.dev/$PROJECT_ID/mockingboard/bot
├── Deploy: Cloud Run (min-instances=1, max-instances=1, always-on)
├── CPU: 1, Memory: 512 MB
└── Secrets: Discord token, Firebase key (mounted at /secrets/)
```

### Infrastructure

```text
Firebase project
├── Firestore (us-central1)
│   ├── Security rules: firebase/firestore.rules
│   └── Indexes: firebase/firestore.indexes.json
├── Firebase Auth (Discord, Google, email/password providers)
└── Firebase App Hosting (web app)

Google Cloud project
├── Cloud Run (bot)
├── Cloud Build (bot CI/CD)
├── Artifact Registry (Docker images)
└── Secret Manager (credentials)
```

---

## GM Mode Design Principles

The following principles guide development of GM Mode (offseason simulation features on the [roadmap](ROADMAP.md)). Informed by competitive analysis of StickToTheModel and PFN.

### Core Principles

- **Facts, not opinions**: Every number is derived from real contract data or deterministic CBA math. No estimated market values, no AI-generated rankings.
- **Complete or nothing**: Cap features ship with full CBA Article 13 compliance. No half-measures.
- **User is the GM**: No CPU-initiated trades or signings. No guardrails on user decisions. Show consequences, don't prevent actions.
- **Tiered complexity**: Casual users can do basic moves (cut, sign, draft). Cap nerds can define void years, incentive structures, and restructure specifics. Both paths produce accurate math.
- **Editorial UX, not spreadsheets**: Card-based layouts, clear visual hierarchy, action-first flows. Progressive disclosure — start with the moves the user wants to make, reveal full roster complexity only on demand.

### Anti-Features

These are things we explicitly will not build:

- No AI-generated player rankings or tier lists
- No CPU-initiated trades or signings
- No "smart suggestions" for roster moves
- No estimated contract values for free agents
- No half-baked cap features (complete CBA compliance or nothing)
- No guardrails on user decisions (show consequences, don't prevent actions)
