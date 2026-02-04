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
- [x] Need-adjusted CPU picking (positional need multipliers, effective needs)
- [x] Auto-generated draft names (football-themed, no user input for content moderation)
- [x] Cursor-based pagination for draft listing (page size 10)
- [x] Trade UI: current-year extra-round picks categorized under "Current Picks" with round + overall

**Phase 3.0–3.1 Complete**: Full solo draft experience on web with feature parity to Discord bot, plus guest mode and design system.

### Milestone 3.2: Independent Auth (Email/Password) ✓

- [x] Enable Email/Password provider in Firebase Console
- [x] Login page with both Discord and email/password options
- [x] Sign-up page with account creation
- [x] Update `User` type: make `discordId` optional, add `email`, `displayName`
- [x] Fix `getUserDrafts` to look up by `firebaseUid` instead of `discordId`
- [x] Account linking: Discord ↔ email via settings page

### Milestone 3.3: Multiplayer Draft Rooms ✓

- [x] Room creation with privacy settings (public / unlisted / private with invite codes)
- [x] Lobby page with real-time participant list, settings display, and shareable invite link
- [x] Public lobbies browser page (`/lobbies`)
- [x] Join flow: invite link → auth check → team selection (choice/random modes) → join
- [x] Guest join support for unauthenticated users
- [x] Multiplayer turn management via Firestore real-time listeners
- [x] Client-side pick timer with auto-pick on expiry and urgency states
- [x] Multiplayer trade support (human-to-human and human-to-CPU)
- [x] Pause/resume for draft hosts
- [ ] Server-side timer enforcement via `clockExpiresAt` field

### Milestone 3.4: Platform Sync ✓

- [x] Drafts started in Discord viewable live on web (already works via shared Firestore)
- [x] Drafts started on web optionally send Discord notifications (webhook-based, per-draft configurable: off/link-only/pick-by-pick)

**Phase 3 Complete**: Full draft functionality on web — solo and multiplayer — with Discord as an alternative entry point.

---

## Phase 4: Big Board & Community Scouting ✓

**Goal**: Personalized prospect rankings and a community-driven scouting data layer. Content creators contribute data and get attribution + traffic; premium subscribers get access to enriched player cards.

**Design partner**: Brett Kollmann (NFL YouTube creator, already providing prospect data and QA feedback).

### Milestone 4.1: Big Board Builder ✓

- [x] Drag-and-drop interface for ranking players (`@dnd-kit/core` + `@dnd-kit/sortable`)
- [x] Start from consensus ADP or blank
- [x] Add custom players (for deep sleepers)
- [x] Use personal board during drafts (sort available players by your ranking)
- [x] Board history: save labeled snapshots, restore previous versions
- [x] Compare board to snapshots with rank delta visualization (↑/↓/NEW indicators)
- [ ] Compare your board to friends' boards and community scouts

### Milestone 4.2: Community Scouting Data ✓

- [x] Structured data upload flow (CSV/sheet import via web UI, admin-only)
- [x] Data schema templates per position group (shared `POSITION_STAT_SECTIONS` map)
- [x] Data validation and normalization on upload (school names, measurement formats)
- [x] Prospect import parsers extracted to `@mockingboard/shared` (33 unit tests)
- [x] Attribution on player cards: "Scouting data by [Provider Name]" linking to provider profile
- [ ] Community data visible to premium subscribers (gated once Stripe is integrated; visible to all until then)

### Milestone 4.3: Scout Profiles ✓

- [x] Provider profile page: name, bio, avatar, social links (YouTube, Twitter/X, Bluesky, website)
- [x] Scout directory page at `/scouts` with profile cards
- [x] Contribution stats: players covered, positions, data completeness
- [x] Contributor badge/tier system based on volume and quality
- [x] Profile designed as a landing page to funnel traffic back to the creator's channels
- [x] Cached scout profile data for performance

### Milestone 4.4: Prospect Big Board Page ✓

- [x] Extract shared player utilities to `lib/player-utils.ts` (DRY refactor from `player-card.tsx`)
- [x] Public `/players` page with editorial, magazine-style prospect cards (Ringer-inspired)
- [x] ProspectCard component: large rank, display font name, NFL Comp callout, scouting summary, measurables, combine metrics, position stats, strength/weakness tags, attribution
- [x] Search by player name, school, or NFL comp
- [x] Position group filters (All / QB / WR-TE / RB / OL / DEF)
- [x] Load-more pagination (50 prospects at a time)
- [x] Sticky filter bar with backdrop blur
- [x] Loading skeleton matching card layout
- [x] "Players" nav link added between Drafts and Board

### Milestone 4.5: Draft Image Sharing ✓

- [x] `html-to-image` library for client-side PNG capture
- [x] Full Board share card (1200px dark theme, round-by-round table, team color borders, position badges, CPU labels)
- [x] My Team share card (800px, team color gradient, filtered picks with round.pick column)
- [x] Share button with dropdown menu on completed draft detail pages
- [x] 2x resolution capture with automatic PNG download
- [x] User team detection from `teamAssignments` (shows per-team download options)

### Bug Fix: Traded Picks in Discord

- [x] Fix traded picks showing original team instead of new owner in Discord embeds
- [x] Add `slotTeam()` helper to resolve `teamOverride ?? team` across all pick/announce code paths

**Phase 4 Complete**: Users have personalized big boards with snapshot history and comparison. Public prospect big board with editorial cards. Shareable draft result images. Community scouting data pipeline is live with attribution. Content creators have profile pages driving traffic to their channels.

---

## Phase 5: Preference Engine & Scouting Profiles

**Goal**: Learn user preferences from their drafting behavior, surface insights.

### Milestone 5.1: Data Collection

- [ ] Track every pick with context (available players, team needs, pick position)
- [ ] Store player attributes for analysis (conference, combine metrics, position, etc.)

### Milestone 5.2: Preference Modeling

- [ ] Analyze drafting patterns: position preferences, school/conference biases, athleticism vs. production
- [ ] Generate "scouting profile" summary for each user
- [ ] Compare stated preferences (if implemented) vs. revealed preferences

### Milestone 5.3: Recommendations

- [ ] "Prospects you might like" based on drafting history
- [ ] During draft: highlight players that match user's tendencies
- [ ] Sleeper alerts: undervalued players matching user's profile

### Milestone 5.4: Shareable Profiles

- [ ] Public profile page with scouting identity
- [ ] Shareable graphics/cards for social media

**Phase 5 Complete**: Users have a persistent scouting identity that evolves with each draft.

---

## Phase 6: Leaderboards & Accuracy Tracking

**Goal**: Track prediction accuracy, create year-round engagement.

### Milestone 6.1: Prediction Locking

- [ ] Allow users to "lock in" a mock draft as a prediction
- [ ] Timestamp and freeze locked predictions
- [ ] Support multiple locked predictions per user (track best, average, etc.)

### Milestone 6.2: Real Draft Integration

- [ ] Ingest actual NFL draft results (manual entry initially, API later)
- [ ] Score predictions against real results
- [ ] Scoring algorithm in `shared/src/scoring.ts`: exact pick, correct round, correct team, etc.

### Milestone 6.3: Leaderboards

- [ ] Global leaderboard by accuracy score
- [ ] Leaderboard by server/community
- [ ] Historical leaderboards (by year)
- [ ] "Bold take" bonus: extra credit for correctly predicting reaches/slides
- [ ] Filter: "vs all users", "vs analysts", "vs friends"

### Milestone 6.4: Receipts & Sharing

- [ ] Auto-generate "I called it" graphics when predictions hit
- [ ] Historical accuracy stats on user profiles
- [ ] Live draft companion: surface correct predictions in real time as picks happen

### Milestone 6.5: Analyst Mock Draft Aggregation

- [ ] Ingest analyst mock drafts (similar to Mock Draft Database)
- [ ] Display analyst predictions alongside user mocks
- [ ] Include analysts in leaderboard comparisons

**Phase 6 Complete**: Full accountability system with year-round leaderboard engagement.

---

## Phase 7: Cost & Monetization

**Goal**: Sustainable cost structure with a paid tier. No ads, ever.

### Milestone 7.1: Cost Optimization

- [ ] Optimize `getUserDrafts` query (denormalized subcollection vs. fetch-and-filter)
- [ ] Cache player data (read-heavy, rarely changes)
- [ ] Monitor Firestore reads from real-time listeners during active drafts
- [ ] GCP budget alerts and spending dashboards

### Milestone 7.2: Custom Domain

- [ ] Register domain
- [ ] Configure via Firebase App Hosting console (DNS verification)

### Milestone 7.3: Paid Tier (Stripe)

- [ ] Stripe integration (webhook handler, subscription management)
- [ ] Pricing page
- [ ] Premium features: unlimited draft history, advanced leaderboard filters, custom room settings, scouting profiles, community scouting data, draft result exports

**Phase 7 Complete**: Revenue offsets hosting costs; free tier remains generous.

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

## Future Considerations (Not Scheduled but planned)

- **Multi-team draft for one user**: Control multiple teams in a single draft session
- **Slight randomness to CPU picks**: Add variance to CPU selections so drafts don't play out identically
- **Mobile support**: Responsive web improvements (high effort, high value)
- **Trade calculator**: Standalone trade value calculator tool (outside of active drafts) with full accounting of salary cap and trade rules
- **Tankathon-style draft order page**: Visual draft order display combined with trade value chart on web (low effort but potentially high value)
- **Team breakdown pages**: Individual team analysis pages (roster, needs, draft capital) — requires content
- **Cap calculator**: Standalone salary cap calculator tool
- **Full contract builder**: Create and model contract structures with cap implications (basically an OTC clone with better UX and no ads everywhere)
- **Dynasty/keeper support**: Carry over rosters between years (deferred)
- **Collaborative drafting**: Vote-based picks with friends controlling one team
- **Public draft lobbies**: Join drafts with strangers (mostly done)
- **Content creator tools**: Spectator mode, stream overlays (this may take a high priority if Brett pushes to friends)
- **Mobile native app**: Only if popularity demands it
- **Multi-faceted and multi-step cap manager**: Comprehensive cap manager with the ability to see the implications of multiple moves at once/in sequence (example: automate move this year into future years alongside multiple other moves)
- **Rework nav**: Move nav to left sidebar style navigation rather than top of screen
- **Configurable styling**: Allow users to configure site theming based on their favourite NFL team
- **Sliders for Draft**: Allow users to set levels of things like randomness, BPA, and team needs
- **Revenue share for top scouts**: If community scouting data becomes a major subscription driver, offer revenue share to high-value contributors as a retention tool
- **Scouting accuracy tracking**: Extend Phase 6 leaderboards to score scout-contributed grades against actual draft position and NFL performance (ties scout profiles into the accuracy ecosystem)
- Add user configurable preference options for various stats and traits within college prospects
- Allow users to rapid generate boards for position groups and weight them based on trait and production filters
- Let users run mock drafts based on their own big boards
