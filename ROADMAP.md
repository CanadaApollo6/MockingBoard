# MockingBoard Development Roadmap

## Phase 1: MVP — Discord Bot ✓

**Goal**: A functional Discord bot that can run a mock draft entirely within a Discord thread.

### Milestone 1.1: Project Setup ✓

- [x] Initialize monorepo structure (`/packages/bot`, `/packages/shared`)
- [x] Configure TypeScript, ESLint, Prettier
- [x] Set up Vitest for testing
- [x] Create Firebase project, initialize Firestore
- [x] Set up Discord application and bot token
- [x] Basic bot scaffolding with discord.js (connects, responds to ping)

### Milestone 1.2: Data Foundation ✓

- [x] Define core types in `/packages/shared`: `Draft`, `Pick`, `Player`, `User`, `Team`
- [x] Hand-curate initial prospect list (~100-150 players): name, position, school, consensus rank
- [x] Seed NFL team data (name, pick order for current year)
- [x] Firestore schema and security rules
- [x] Basic CRUD operations for drafts

### Milestone 1.3: Core Draft Loop ✓

- [x] `/startdraft` command: configure rounds, assign teams to users
- [x] Create dedicated thread for draft
- [x] On-the-clock notifications with player buttons
- [x] Record pick, announce to thread, advance to next user
- [x] Handle clock expiration (auto-pick BPA or skip)
- [x] `/draft` command for manual pick by name (fallback if buttons fail)
- [x] Draft completion: post summary, mark draft as complete

### Milestone 1.4: Draft Variants ✓

- [x] Support single-team mode (user drafts one team through N rounds, CPU handles rest)
- [x] Configurable draft settings: number of rounds, time per pick, randomize order
- [x] Pause/resume draft functionality
- [x] Configurable CPU speed: instant (batched), fast (0.3s), normal (1.5s)

### Milestone 1.5: Polish & Testing ✓

- [x] Comprehensive unit tests for draft logic (218 tests across all packages)
- [x] Error handling and user-friendly error messages (custom error classes, timer error handling)
- [x] Rate limiting and basic abuse prevention (rateLimit.service.ts)
- [x] Documentation for bot commands (/help command, bot README)
- [x] Deploy bot to GCP (Dockerfile, cloudbuild.yaml for Cloud Run)

### Milestone 1.6: Draft Trades ✓

- [x] Trade proposal UI during drafts (offer picks to other teams)
- [x] CPU trade acceptance logic using Rich Hill trade value chart
- [x] "Force Trade" button for users who want to skip realism
- [x] Trade acceptance/rejection for user-to-user trades
- [x] Trade timeout with auto-expiration
- [x] Pick ownership tracking for traded picks
- [x] Configurable: enable/disable trades per draft

**Phase 1 Complete**: Bot is usable in real Discord servers for real drafts.

---

## Phase 2: Web App — Draft History ✓

**Goal**: A web application where users can view draft history and watch live drafts.

### Milestone 2.1: Web Setup ✓

- [x] Initialize `/packages/web` with Next.js 16 (App Router, TypeScript, Tailwind v4)
- [x] Configure shadcn/ui component library (new-york style, neutral base)
- [x] Wire into Turborepo monorepo with `transpilePackages` for shared
- [x] Basic layout and navigation (header, landing page)

### Milestone 2.2: Firebase Integration ✓

- [x] Firebase Admin SDK for server-side Firestore access
- [x] Firebase Client SDK (lazy init) for real-time listeners
- [x] Discord OAuth → Firebase custom token (uid=discordId) → session cookie
- [x] Auth context provider with sign in/out
- [x] Secrets management via Google Secret Manager

### Milestone 2.3: Draft History View ✓

- [x] List view of drafts with status badges, dates, participant counts
- [x] "My Drafts" tab filtered by authenticated user's Discord ID
- [x] Detail view with pick-by-pick draft board and trade summaries
- [x] Loading skeletons for all pages
- [x] Mobile-responsive design (grid layouts, responsive tables)

### Milestone 2.4: Live Spectating ✓

- [x] Real-time draft view with Firestore `onSnapshot` listeners
- [x] "On the Clock" header with current team and progress bar
- [x] SSR initial paint with client-side real-time hydration
- [x] Automatic routing: active drafts link to live view

### Milestone 2.5: Deploy ✓

- [x] Firebase App Hosting configuration (apphosting.yaml, Cloud Run)
- [x] Cross-platform dependency resolution (lightningcss, SWC)
- [x] Turborepo `packageManager` field for build server
- [x] Reverse proxy origin detection for OAuth redirects (APP_URL env var)
- [x] Service Account Token Creator role for `createCustomToken`
- [x] Production deployment live and verified

**Phase 2 Complete**: Users can log in with Discord, browse all drafts, view pick boards, and spectate live.

---

## Phase 2.5: Brand & Polish ✓

**Goal**: Establish visual identity and fix known issues before building new features.

- [x] Brand restyle: blue jay color scheme, custom design system with CSS variables (globals.css, DESIGN_SYSTEM.md)
- [x] Add logo to header and landing page hero
- [x] Fix drafter count for single-user all-teams drafts (uses `participants` map)
- [x] Clean up debug auth error codes with user-facing messages

**Phase 2.5 Complete**: Custom design system with dark/light themes, brand colors, logo, and polished error handling.

---

## Phase 3: Web Draft Functionality

**Goal**: Users can run drafts through the web app, not just Discord.

### Milestone 3.0: Shared Package Extraction ✓

Extract platform-agnostic business logic from bot services to `packages/shared`. This is the critical path — every web draft feature depends on it.

- [x] CPU pick logic (`selectCpuPick`, `CPU_PICK_WEIGHTS`) → `shared/src/cpu.ts`
- [x] Pick controller resolution (`getPickController`) → `shared/src/draft.ts`
- [x] Draft order building (pure ordering logic) → `shared/src/draft.ts`
- [x] Trade validation functions (7 pure functions) → `shared/src/trade.ts`
- [x] CPU trade evaluation (`evaluateCpuTrade`) → `shared/src/trade.ts`
- [x] Trade execution (pure `computeTradeExecution`) → `shared/src/trade.ts`
- [x] Update bot imports to use shared; all tests pass throughout

### Milestone 3.1: Solo Draft Mode ✓

- [x] Draft creation form (year, rounds, format, team, CPU speed, pick timer, trades toggle)
- [x] Interactive picking UI with player search and position filters
- [x] Server-side CPU pick advancement (`runCpuCascade` in pick API route)
- [x] Server-side `recordPick` via Firestore transaction (Admin SDK)
- [x] Full draft lifecycle on web: create → pick → complete
- [x] Guest draft mode (no login required, fully client-side state)
- [x] Trade proposals with CPU evaluation on web (trade modal, result UI, API routes)
- [x] Pick timer with urgency states and auto-pick on expiry (client-side)
- [x] Pause/resume (Firestore-persisted for authed drafts, local state for guest)
- [x] Draft clock with SVG progress ring, countdown, urgency color shifts
- [x] CPU speed animation (instant/fast/normal) matching bot behavior
- [x] Dark mode with theme toggle
- [x] Design system documentation (DESIGN_SYSTEM.md)

**Phase 3.0–3.1 Complete**: Full solo draft experience on web with feature parity to Discord bot, plus guest mode and design system.

### Milestone 3.2: Independent Auth (Email/Password) ← CURRENT

- [ ] Enable Email/Password provider in Firebase Console
- [ ] Login page with both Discord and email/password options
- [ ] Sign-up page with account creation
- [ ] Update `User` type: make `discordId` optional, add `email`, `displayName`
- [ ] Fix `getUserDrafts` to look up by `firebaseUid` instead of `discordId`
- [ ] Account linking: Discord ↔ email via settings page

### Milestone 3.3: Multiplayer Draft Rooms

- [ ] Room creation with privacy settings (public listing / invite-link-only)
- [ ] Lobby page with real-time participant list and shareable invite link
- [ ] Join flow: invite link → auth check → team selection → join
- [ ] Multiplayer turn management via Firestore real-time listeners
- [ ] Timer support via `clockExpiresAt` field + server-side validation

### Milestone 3.4: Platform Sync

- [x] Drafts started in Discord viewable live on web (already works via shared Firestore)
- [ ] Drafts started on web optionally send Discord notifications

**Phase 3 Complete**: Full draft functionality on web, with Discord as an alternative entry point.

---

## Phase 4: Preference Engine & Scouting Profiles

**Goal**: Learn user preferences from their drafting behavior, surface insights.

### Milestone 4.1: Data Collection

- [ ] Track every pick with context (available players, team needs, pick position)
- [ ] Store player attributes for analysis (conference, combine metrics, position, etc.)

### Milestone 4.2: Preference Modeling

- [ ] Analyze drafting patterns: position preferences, school/conference biases, athleticism vs. production
- [ ] Generate "scouting profile" summary for each user
- [ ] Compare stated preferences (if implemented) vs. revealed preferences

### Milestone 4.3: Recommendations

- [ ] "Prospects you might like" based on drafting history
- [ ] During draft: highlight players that match user's tendencies
- [ ] Sleeper alerts: undervalued players matching user's profile

### Milestone 4.4: Shareable Profiles

- [ ] Public profile page with scouting identity
- [ ] Shareable graphics/cards for social media

**Phase 4 Complete**: Users have a persistent scouting identity that evolves with each draft.

---

## Phase 5: Leaderboards & Accuracy Tracking

**Goal**: Track prediction accuracy, create year-round engagement.

### Milestone 5.1: Prediction Locking

- [ ] Allow users to "lock in" a mock draft as a prediction
- [ ] Timestamp and freeze locked predictions
- [ ] Support multiple locked predictions per user (track best, average, etc.)

### Milestone 5.2: Real Draft Integration

- [ ] Ingest actual NFL draft results (manual entry initially, API later)
- [ ] Score predictions against real results
- [ ] Scoring algorithm in `shared/src/scoring.ts`: exact pick, correct round, correct team, etc.

### Milestone 5.3: Leaderboards

- [ ] Global leaderboard by accuracy score
- [ ] Leaderboard by server/community
- [ ] Historical leaderboards (by year)
- [ ] "Bold take" bonus: extra credit for correctly predicting reaches/slides
- [ ] Filter: "vs all users", "vs analysts", "vs friends"

### Milestone 5.4: Receipts & Sharing

- [ ] Auto-generate "I called it" graphics when predictions hit
- [ ] Historical accuracy stats on user profiles
- [ ] Live draft companion: surface correct predictions in real time as picks happen

### Milestone 5.5: Analyst Mock Draft Aggregation

- [ ] Ingest analyst mock drafts (similar to Mock Draft Database)
- [ ] Display analyst predictions alongside user mocks
- [ ] Include analysts in leaderboard comparisons

**Phase 5 Complete**: Full accountability system with year-round leaderboard engagement.

---

## Phase 6: Cost & Monetization

**Goal**: Sustainable cost structure with a paid tier. No ads, ever.

### Milestone 6.1: Cost Optimization

- [ ] Optimize `getUserDrafts` query (denormalized subcollection vs. fetch-and-filter)
- [ ] Cache player data (read-heavy, rarely changes)
- [ ] Monitor Firestore reads from real-time listeners during active drafts
- [ ] GCP budget alerts and spending dashboards

### Milestone 6.2: Custom Domain

- [ ] Register domain
- [ ] Configure via Firebase App Hosting console (DNS verification)

### Milestone 6.3: Paid Tier (Stripe)

- [ ] Stripe integration (webhook handler, subscription management)
- [ ] Pricing page
- [ ] Premium features: unlimited draft history, advanced leaderboard filters, custom room settings, scouting profiles, draft result exports

**Phase 6 Complete**: Revenue offsets hosting costs; free tier remains generous.

---

## Phase 7: Big Board Builder

**Goal**: Users can create and maintain their own prospect rankings.

### Milestone 7.1: Board Creation

- [ ] Drag-and-drop interface for ranking players
- [ ] Start from consensus ADP or blank
- [ ] Add custom players (for deep sleepers)

### Milestone 7.2: Philosophy Weighting

- [ ] User sets preferences: athleticism vs. production, positional value, conference trust, etc.
- [ ] System generates recommended board based on weights
- [ ] User can accept, modify, or ignore recommendations

### Milestone 7.3: Board Integration

- [ ] Use personal board during drafts (sort available players by your ranking)
- [ ] Compare your board to consensus, friends, experts
- [ ] Track how your board evolves over time

**Phase 7 Complete**: Users have a living, personalized big board integrated into the draft experience.

---

## Phase 8: iMessage Integration

**Goal**: Bring the in-chat draft experience to iMessage.

### Milestone 8.1: Research & Prototyping

- [ ] Explore iMessage app extension capabilities and constraints
- [ ] Prototype basic message sending from extension
- [ ] Determine minimum viable UX within iMessage limitations

### Milestone 8.2: Implementation

- [ ] iMessage extension for draft participation
- [ ] Compact pick interface (fits iMessage app drawer)
- [ ] Send pick results as iMessage to group chat

### Milestone 8.3: Feature Parity

- [ ] Match core Discord functionality where possible
- [ ] Graceful degradation for features that can't translate

**Phase 8 Complete**: Users can draft in iMessage group chats.

---

## Phase 9: GM Mode / Offseason Simulator

**Goal**: Full offseason simulation for content creators and serious fans.

**Prerequisites**: Research NFL salary cap mechanics, contract structures, free agency rules.

### Milestone 9.1: Salary Cap Foundation

- [ ] Research and document NFL salary cap rules
- [ ] Ingest contract data (source TBD - may need manual curation or paid API)
- [ ] Model cap hits, dead money, restructures
- [ ] Team cap situation snapshots by date

### Milestone 9.2: Team Forking

- [ ] "Fork" a team from a specific date (like git branches)
- [ ] Multiple save files per user
- [ ] Name and describe each scenario

### Milestone 9.3: Free Agency Simulation

- [ ] Available free agents list
- [ ] Sign players with cap implications
- [ ] CPU teams make signings too (optional realism)

### Milestone 9.4: Integrated Draft

- [ ] Use forked team in mock drafts
- [ ] Picks reflect trades made in scenario
- [ ] Draft results save back to scenario

**Phase 9 Complete**: Content creators can create "what if" scenarios and return to them over time.

---

## Future Considerations (Not Scheduled)

- **Dynasty/keeper support**: Carry over rosters between years
- **Collaborative drafting**: Vote-based picks with friends controlling one team
- **Public draft lobbies**: Join drafts with strangers
- **Content creator tools**: Spectator mode, stream overlays
- **Mobile native app**: If iMessage extension proves too limiting
- **Paid data integration**: Licensed scouting reports, combine data
- **Full NFL trade simulator**: Akin to the NBA trade emulator with full accountings of cap rules
- **Multi-faceted and multi-step cap manager**: Comprehensive cap manager with the ability to see the implications of multiple moves at once/in sequence (example: automate move this year into future years alongside multiple other moves)
- **Expansion to other pro sports leagues (NBA, NHL, MLB)**: Taking this process feature set from just the NFL all the way into the other 3 of the 4 major North American sports
