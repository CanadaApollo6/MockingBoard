# MockingBoard System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│    Discord Bot      │      Web App        │     iMessage Extension          │
│    (discord.js)     │   (Next.js/Remix)   │        (Future)                 │
└──────────┬──────────┴──────────┬──────────┴─────────────────────────────────┘
           │                     │
           │                     │
           ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FIREBASE                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│   │  Firebase Auth  │    │    Firestore    │    │ Cloud Functions │        │
│   │                 │    │                 │    │   (optional)    │        │
│   │ - Discord OAuth │    │ - Users         │    │                 │        │
│   │ - Session mgmt  │    │ - Drafts        │    │ - Scheduled     │        │
│   │                 │    │ - Picks         │    │   tasks         │        │
│   │                 │    │ - Players       │    │ - Webhooks      │        │
│   │                 │    │ - Teams         │    │                 │        │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Models

### User

```typescript
interface User {
  id: string; // Firestore document ID
  discordId: string; // Discord user ID (primary identifier initially)
  firebaseUid?: string; // Firebase Auth UID (linked when web account created)
  discordUsername: string; // Cached for display
  discordAvatar?: string; // Cached avatar URL
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Preferences (Phase 4+)
  preferences?: {
    statedWeights?: PreferenceWeights;
    revealedWeights?: PreferenceWeights; // Computed from drafting behavior
  };

  // Stats (Phase 5+)
  stats?: {
    totalDrafts: number;
    totalPicks: number;
    accuracyScore?: number;
  };
}

interface PreferenceWeights {
  athleticism: number; // 0-100
  production: number; // 0-100
  conference: Record<string, number>; // e.g., { "SEC": 80, "Big Ten": 70 }
  positionalValue: Record<Position, number>;
}
```

### Draft

```typescript
interface Draft {
  id: string; // Firestore document ID
  createdBy: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Configuration
  config: {
    rounds: number; // 1-7
    secondsPerPick: number; // 0 for unlimited
    format: 'full' | 'single-team'; // Full 32-team or single team focus
    year: number; // Draft class year
  };

  // State
  status: 'lobby' | 'active' | 'paused' | 'complete';
  currentPick: number; // 1-indexed overall pick number
  currentRound: number;
  clockExpiresAt?: Timestamp; // When current pick times out

  // Platform info
  platform: 'discord' | 'web';
  discord?: {
    guildId: string;
    channelId: string;
    threadId: string;
  };

  // Participants: map of team abbreviation to user assignment
  // null value means CPU-controlled
  teamAssignments: Record<TeamAbbreviation, string | null>;

  // Pick order for the draft (accounts for trades in future)
  pickOrder: DraftSlot[];

  // Locked prediction (Phase 5)
  isLocked?: boolean;
  lockedAt?: Timestamp;
}

interface DraftSlot {
  overall: number; // Overall pick number
  round: number;
  pick: number; // Pick within round
  team: TeamAbbreviation;
}
```

### Pick

```typescript
interface Pick {
  id: string; // Firestore document ID
  draftId: string; // Parent draft

  overall: number; // Overall pick number
  round: number;
  pick: number; // Pick within round

  team: TeamAbbreviation;
  userId: string | null; // null if CPU pick
  playerId: string;

  // Context for preference analysis (Phase 4)
  context?: {
    availablePlayerIds: string[]; // Who was available
    pickTimestamp: Timestamp;
    secondsUsed?: number;
  };

  createdAt: Timestamp;
}
```

### Player

```typescript
interface Player {
  id: string; // Firestore document ID

  // Core info
  name: string;
  position: Position;
  school: string;

  // Rankings
  consensusRank: number; // ADP / consensus big board rank
  year: number; // Draft class year

  // Extended attributes (populated over time)
  attributes?: {
    conference: string;
    height?: number; // Inches
    weight?: number; // Pounds
    fortyYard?: number; // Seconds
    vertical?: number; // Inches
    bench?: number; // Reps
    broad?: number; // Inches
    cone?: number; // Seconds
    shuttle?: number; // Seconds
    armLength?: number; // Inches
    handSize?: number; // Inches
    captain?: boolean;
    yearInSchool?: 'FR' | 'SO' | 'JR' | 'SR';
    gamesStarted?: number;
  };

  // Scouting (future: crowdsourced or licensed)
  scouting?: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    comparison?: string; // "Pro comparison: Player X"
  };

  updatedAt: Timestamp;
}

type Position =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'OT'
  | 'OG'
  | 'C'
  | 'EDGE'
  | 'DL'
  | 'LB'
  | 'CB'
  | 'S'
  | 'K'
  | 'P';
```

### Team

```typescript
interface Team {
  id: TeamAbbreviation; // e.g., "NE", "DAL"
  name: string; // e.g., "New England Patriots"
  city: string; // e.g., "New England"
  mascot: string; // e.g., "Patriots"
  conference: 'AFC' | 'NFC';
  division: 'North' | 'South' | 'East' | 'West';

  // Current year draft capital
  picks: {
    year: number;
    slots: DraftSlot[];
  };

  // For CPU drafting logic
  needs?: Position[]; // Ordered list of positional needs

  // Flavor for solo mode (Phase 3)
  personality?: {
    tendencies?: string; // "Always takes BPA"
    recentDraftHistory?: string;
    reportedInterests?: string[];
  };
}

type TeamAbbreviation =
  | 'ARI'
  | 'ATL'
  | 'BAL'
  | 'BUF'
  | 'CAR'
  | 'CHI'
  | 'CIN'
  | 'CLE'
  | 'DAL'
  | 'DEN'
  | 'DET'
  | 'GB'
  | 'HOU'
  | 'IND'
  | 'JAX'
  | 'KC'
  | 'LAC'
  | 'LAR'
  | 'LV'
  | 'MIA'
  | 'MIN'
  | 'NE'
  | 'NO'
  | 'NYG'
  | 'NYJ'
  | 'PHI'
  | 'PIT'
  | 'SEA'
  | 'SF'
  | 'TB'
  | 'TEN'
  | 'WAS';
```

## Firestore Schema

```
/users
  /{userId}
    - discordId
    - firebaseUid
    - discordUsername
    - ...

/drafts
  /{draftId}
    - config
    - status
    - teamAssignments
    - pickOrder
    - ...

    /picks (subcollection)
      /{pickId}
        - overall
        - round
        - team
        - playerId
        - userId
        - ...

/players
  /{playerId}
    - name
    - position
    - school
    - consensusRank
    - ...

/teams
  /{teamAbbreviation}
    - name
    - picks
    - needs
    - ...

/bigBoards (Phase 6)
  /{boardId}
    - userId
    - year
    - rankings: playerId[]
    - ...

/predictions (Phase 5)
  /{predictionId}
    - userId
    - draftId
    - lockedAt
    - ...

/actualResults (Phase 5)
  /{year}
    - picks: { overall, playerId, team }[]
```

## Discord Bot Architecture

```
/packages/bot
  /src
    index.ts                 # Entry point, client initialization

    /commands                # Slash command definitions
      startdraft.ts
      pick.ts
      board.ts
      status.ts
      pause.ts
      resume.ts

    /events                  # Discord event handlers
      ready.ts
      interactionCreate.ts

    /services                # Business logic
      draft.service.ts       # Draft state management
      pick.service.ts        # Pick recording and validation
      player.service.ts      # Player queries
      user.service.ts        # User management
      cpu.service.ts         # CPU pick logic

    /components              # Discord UI components
      playerButtons.ts       # Button rows for player selection
      draftEmbed.ts          # Rich embeds for draft state
      pickAnnouncement.ts    # Pick announcement formatting

    /utils
      firestore.ts           # Firestore client and helpers
      formatting.ts          # Text formatting utilities

    /types
      index.ts               # Re-export from shared
```

### Command Flow Example: Making a Pick

```
User clicks player button
        │
        ▼
interactionCreate.ts
        │
        ▼
Validate: Is it user's turn? Is player available?
        │
        ▼
pick.service.recordPick()
        │
        ├── Write Pick document to Firestore
        ├── Update Draft.currentPick
        └── Update Draft.clockExpiresAt
        │
        ▼
pickAnnouncement.ts → Post pick to thread
        │
        ▼
draft.service.advanceDraft()
        │
        ├── If draft complete → Post summary, set status
        └── If next pick is CPU → cpu.service.makePick() → recurse
        │
        ▼
playerButtons.ts → Send new buttons to next user
```

## Web App Architecture

```
/packages/web
  /src
    /app                     # Next.js App Router (or Remix routes)
      layout.tsx
      page.tsx               # Home/landing

      /auth
        /login/page.tsx
        /callback/page.tsx   # Discord OAuth callback

      /drafts
        page.tsx             # Draft history list
        /[draftId]/page.tsx  # Draft detail view
        /new/page.tsx        # Create draft (Phase 3)
        /live/[draftId]/page.tsx  # Live draft UI (Phase 3)

      /profile
        page.tsx             # User profile, scouting identity (Phase 4)

      /leaderboard
        page.tsx             # Accuracy leaderboard (Phase 5)

      /board
        page.tsx             # Big board builder (Phase 6)

    /components
      /ui                    # Generic UI components
      /draft                 # Draft-specific components
      /player                # Player card, list, etc.

    /lib
      firebase.ts            # Firebase client initialization
      auth.ts                # Auth helpers
      api.ts                 # Firestore queries

    /hooks
      useDraft.ts            # Real-time draft subscription
      useUser.ts             # Current user state
```

## Authentication Flow

### Discord Bot (Phase 1)

No authentication required. Users are identified by Discord ID. User documents are created lazily on first interaction.

```
User runs /startdraft
        │
        ▼
Bot extracts interaction.user.id (Discord ID)
        │
        ▼
Check if User doc exists for discordId
        │
        ├── Yes → Use existing user
        └── No  → Create User doc with discordId, cache username
```

### Web App with Discord OAuth (Phase 2+)

```
User clicks "Login with Discord"
        │
        ▼
Redirect to Discord OAuth
        │
        ▼
User authorizes, Discord redirects to /auth/callback
        │
        ▼
Exchange code for Discord access token
        │
        ▼
Fetch Discord user info (id, username, avatar)
        │
        ▼
Firebase Auth: signInWithCustomToken
  (Cloud Function creates custom token from Discord ID)
        │
        ▼
Check if User doc exists for discordId
        │
        ├── Yes → Link firebaseUid to existing User doc
        └── No  → Create User doc with discordId + firebaseUid
        │
        ▼
User is authenticated, session established
```

## CPU Drafting Logic

For solo mode and filling in non-user teams in multiplayer.

### Basic Algorithm (MVP)

```typescript
function cpuPick(draft: Draft, team: Team, availablePlayers: Player[]): Player {
  // 1. Filter to top N available by consensus rank
  const topAvailable = availablePlayers
    .sort((a, b) => a.consensusRank - b.consensusRank)
    .slice(0, 10);

  // 2. Check team needs
  const needPlayers = topAvailable.filter((p) =>
    team.needs?.includes(p.position),
  );

  // 3. If a need player is in top 5 available, take them
  const topFive = topAvailable.slice(0, 5);
  const needInTopFive = needPlayers.find((p) => topFive.includes(p));
  if (needInTopFive) return needInTopFive;

  // 4. Otherwise take BPA with slight randomization
  const bpaIndex = weightedRandom([0, 1, 2], [0.7, 0.2, 0.1]);
  return topAvailable[bpaIndex];
}
```

### Enhanced Algorithm (Phase 3)

Add team personalities, reported interests, historical tendencies. Occasionally make "surprising" picks that match real NFL chaos.

## Deployment Architecture

### Phase 1 (MVP)

```
┌─────────────────────────────────────┐
│          Google Cloud Run           │
│                                     │
│   Discord Bot (single container)    │
│   - Runs continuously               │
│   - Connects to Discord gateway     │
│   - Reads/writes Firestore          │
│                                     │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│            Firestore                │
└─────────────────────────────────────┘
```

**Alternative**: Compute Engine (single small VM) if Cloud Run's request-based model doesn't suit the persistent Discord gateway connection.

### Phase 2+ (With Web App)

```
┌──────────────────┐    ┌──────────────────┐
│   Cloud Run      │    │     Vercel       │
│   (Discord Bot)  │    │   (Next.js)      │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │       Firestore       │
         └───────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │    Firebase Auth      │
         └───────────────────────┘
```

**Web hosting options**:

- Vercel (easiest for Next.js)
- Firebase Hosting (if using Remix or want all-Firebase)
- Cloud Run (if you want everything in GCP)

## Key Technical Decisions

| Decision      | Choice                        | Rationale                                            |
| ------------- | ----------------------------- | ---------------------------------------------------- |
| Database      | Firestore                     | Real-time listeners, good DX, familiar to you        |
| Bot framework | discord.js                    | Mature, TypeScript support, active community         |
| Web framework | Next.js or Remix              | Both work well, pick based on preference             |
| Auth          | Firebase Auth + Discord OAuth | Handles session management, easy Discord integration |
| Hosting (bot) | Cloud Run or Compute Engine   | Depends on gateway connection requirements           |
| Hosting (web) | Vercel                        | Zero-config Next.js deployment                       |
| Monorepo      | npm workspaces or Turborepo   | Shared types between bot and web                     |

## Security Considerations

- Firestore security rules: Users can only read/write their own data, drafts they participate in
- Discord bot token stored in Secret Manager, not in code
- Firebase Auth rules: Validate custom token creation in Cloud Function
- Rate limiting on bot commands to prevent abuse
- Validate all user input (pick selections, draft configuration)
