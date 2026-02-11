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

- [x] Comprehensive unit tests for draft logic (439 tests across 28 files)
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

**Phase 3.0–3.4 Complete**: Full draft functionality on web — solo and multiplayer — with Discord as an alternative entry point.

### Milestone 3.8: Additional Sign-In Providers

- [x] Google OAuth (Firebase Auth provider — largest potential user base)
- [ ] Sign in with Apple (required for iOS App Store if native app ever ships; good practice regardless)
- [ ] X (Twitter) OAuth (aligns with NFL/draft community presence on the platform)
- [x] Unified account linking: link any combination of providers in settings
- [x] Auth UI updates: provider buttons on sign-in/sign-up pages

### Milestone 3.5: Draft Enhancements (Partial) ✓

- [x] CPU pick randomness/variance so drafts don't play out identically (`CpuPickOptions` with jitter + interpolated probability windows)
- [x] Configurable draft sliders (CPU Randomness and CPU Draft Strategy range inputs on draft creator, persisted through API and guest URL params)
- [x] Multi-team draft mode (one user controls 2–31 teams; multi-select team grid, "Picking for [TEAM]" indicator in draft rooms)
- [x] Public draft lobbies polish (ISR revalidation every 30s, "Possibly inactive" badge for lobbies older than 2 hours)
- [ ] Collaborative drafting (vote-based picks with friends controlling one team)
- [x] Run mock drafts using personal big board rankings as the CPU pick order
- [ ] In-draft web chat for multiplayer (message feed alongside pick UI)

### Milestone 3.6: Post-Draft Recap & Analytics ✓

- [x] Analytics engine with research-calibrated models (Massey/Thaler, Baldwin surplus curves, OTC/PFF positional value, Unexpected Points surplus tiers)
- [x] Positional value model (`POSITIONAL_VALUE`): 15-position multiplier table synthesized from four independent sources
- [x] Surplus value curve calibrated to Baldwin's empirical data (peaks at pick 12, not pick 1)
- [x] Pick classification with position-adaptive thresholds (great-value through big-reach)
- [x] Pick scoring (0–100 composite: value, positional value, need fill, base)
- [x] Team grading across five dimensions (value 30%, positional value 20%, surplus 15%, needs 20%, BPA adherence 15%)
- [x] Full draft recap generation: 32-team grades, trade analysis with Rich Hill chart, optimal BPA comparison
- [x] Post-draft team grades (needs filled, BPA adherence, reach/value picks)
- [x] Draft recap page with per-team analysis and highlights (DraftRecapSummary, TeamGradeCard, PickBreakdown, TradeAnalysisCard)
- [x] Comparison to consensus: show where user diverged and by how much (valueDelta, boardDelta)
- [x] Shareable recap cards (extend existing image sharing — RecapShareCard with team color gradient, dimension bars, graded pick table)
- [x] Suggested pick highlighting during user's turn (analytics-scored best available with reason string)
- [x] CPU positional value weighting across all pick call sites (fourth-root scaling for subtle premium-position boost)
- [x] 60 analytics tests + 5 CPU positional weight tests + 7 suggestPick tests (508 total)

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

### Milestone 4.6: Advanced Board Generation

- [ ] Rapid-generate boards filtered by position group with trait and production weighting
- [ ] Compare your board to friends' boards and community scouts (moved from 4.1)

### Milestone 4.7: Data Pipeline

- [ ] Semi-automated prospect data ingestion (scheduled fetches from public sources + admin review)
- [ ] Automated combine/pro day data refresh when results are published
- [ ] Annual draft class rollover workflow (archive current year, seed next year's class)
- [ ] Data freshness indicators on player cards (last updated timestamp)

**Phase 4 Complete (4.1–4.5)**: Users have personalized big boards with snapshot history and comparison. Public prospect big board with editorial cards. Shareable draft result images. Community scouting data pipeline is live with attribution. Content creators have profile pages driving traffic to their channels.

---

## Phase 4.5: Community Content Platform ✓

**Goal**: Transform MockingBoard from a mock draft tool into a community-sourced scouting and content creation platform. Public boards, crowdsourced reports, player pages, social features, video breakdowns, and PDF draft guides.

### Milestone 4.5.1: Public Big Boards ✓

- [x] Board visibility toggle (private/public) and URL slug system
- [x] Public board browse page at `/boards` with search and filtering
- [x] Public board view at `/boards/[slug]` with Skim / Peruse / Deep Dive view modes
- [x] Slug uniqueness validation at API level

### Milestone 4.5.2: User Scouting Reports ✓

- [x] `ScoutingReport` type with structured fields (grade, NFL comp, strengths, weaknesses)
- [x] TipTap rich text editor for long-form scouting analysis
- [x] One report per user per player per year (upsert semantics)
- [x] Report API endpoints (create/update, delete, list by player or author)

### Milestone 4.5.3: Individual Player Pages ✓

- [x] `/players/[id]` page as hub for all community content about a player
- [x] PlayerHero component with school color gradient, rank, position badge
- [x] CommunityGradeSummary: average grade, top NFL comps, report count
- [x] CommunityReports: inline report list with write CTA and auto-refresh
- [x] Linked player names in ProspectCard and ProspectRow to player pages

### Milestone 4.5.4: Social & Discovery ✓

- [x] Public user profiles at `/profile/[slug]` with bio, avatar, social links
- [x] Follow system with composite document IDs for idempotent follow/unfollow
- [x] Profile editor in settings page (slug, bio, avatar, social links, public toggle)
- [x] Community discovery hub at `/community` (analysts grid, recent boards)
- [x] AnalystProfileCard with follower/board/report counts

### Milestone 4.5.5: Video Breakdowns ✓

- [x] `VideoBreakdown` type with YouTube URL parsing (watch, youtu.be, embed, shorts)
- [x] VideoGallery on player pages with responsive YouTube embeds
- [x] VideoSubmitForm for authenticated users (URL, title, timestamp, tags)
- [x] Author-only delete for submitted videos

### Milestone 4.5.6: PDF Draft Guide Generation ✓

- [x] `@react-pdf/renderer` for client-side PDF generation (no server cost)
- [x] DraftGuidePdf document: cover page, per-player entries, headers/footers, MockingBoard branding
- [x] Three depth levels: Quick Look (table), Detailed (+ measurables/comp/tags), Full Breakdown (full cards)
- [x] DraftGuideOptions: detail level selector + "All" vs "Top N" player count
- [x] "Draft Guide PDF" button on public board pages and board editor
- [x] Downloads as `mockingboard-{boardName}-{year}.pdf`

**Phase 4.5 Complete**: Full community content platform with public boards, crowdsourced scouting reports, player hub pages, social profiles with follow system, YouTube video breakdowns, and PDF draft guide export.

---

## Phase 4.75: Platform Infrastructure

**Goal**: Foundation systems that make the social features work at scale and prepare the platform for public growth. Should be tackled before the more ambitious Phases 5+.

### Milestone 4.75.1: Notification System

- [ ] In-app notification feed (bell icon, unread count, notification drawer)
- [ ] Notification triggers: new follower, new report on a player you've scouted, new board from someone you follow, new video on a player you've scouted
- [ ] Draft notifications: trade proposals, your turn (multiplayer), draft completed
- [ ] Email digest option (daily/weekly summary of activity)
- [ ] Notification preferences per user (toggle categories on/off)

### Milestone 4.75.2: Admin Dashboard & Content Management ✓

Auth-gated admin dashboard (`/admin`) with 12 feature sections, eliminating deploy-to-change workflows for all configurable data.

- [x] Admin dashboard with card grid linking to all feature sections
- [x] Auth-gated access (Firebase UID allowlist)
- [x] Reusable admin UI components (Input, Select, Textarea) for consistent UX
- [x] Team management: key players, coaching staff, front office, team needs, future picks per team
- [x] Team history: year-by-year season records, playoff results, coaching staff, front office, key players
- [x] Player search input with team-filtered autocomplete
- [x] Draft order editor: 256-slot table with trade marking, seed from team list
- [x] Draft results: enter actual NFL draft picks per year (round, pick, team, player, trades)
- [x] Draft scoring engine: score mock drafts against real results (team/player/position/round accuracy)
- [x] Prospect browser: search, filter by position, paginated table, inline edit, delete
- [x] CSV upload for prospect and scouting data (existing, carried from Phase 4.2)
- [x] Featured content: override Prospect of the Day and Mock Draft of the Week with date-bounded selections
- [x] Content moderation queue: review scouting reports, videos, boards, profiles (approve/remove)
- [x] Season config: draft year, stats year
- [x] Announcement banner: text, variant (info/warning/success), active toggle — rendered in app shell
- [x] Cache flush: reset all server-side caches (teams, players, rosters, draft orders, etc.)
- [x] Draft name generator: override adjective/noun word lists
- [x] Trade value chart: edit all 256 pick values + round 1 premium
- [x] CPU tuning: need multipliers, wild thresholds, max need multipliers, pick weights
- [ ] Report/flag system for user-generated content (user-facing)
- [ ] Content removal with author notification
- [ ] Rate limiting on content creation (prevent spam)
- [ ] Platform health metrics and user management views

### Milestone 4.75.3: SEO & Social Sharing

- [x] Dynamic Open Graph meta tags for player pages, public boards, and analyst profiles
- [x] Social card images (auto-generated or template-based) for link previews
- [x] Structured data (JSON-LD) for player pages (searchable by Google)
- [x] Sitemap generation for public pages
- [x] Canonical URLs and proper meta titles/descriptions

### Milestone 4.75.4: Unified Search

- [x] Global search bar in navigation (search players, boards, reports, users from one input)
- [x] Search results grouped by type with quick-jump
- [x] Firestore full-text search strategy (Algolia, Typesense, or Firestore-native with `contentText` fields)

**Phase 4.75 Status**: Admin dashboard and SEO are complete. Notification system and unified search remain. Admin tooling eliminates deploy-to-change for all configurable data — teams, prospects, draft order, trade values, CPU behavior, featured content, and moderation are all manageable through the web UI.

---

## Phase 5: Preference Engine & Scouting Profiles

**Goal**: Learn user preferences from their drafting behavior, surface insights.

### Milestone 5.1: Data Collection

- [ ] Track every pick with context (available players, team needs, pick position)
- [ ] Store player attributes for analysis (conference, combine metrics, position, etc.)

### Milestone 5.2: Preference Modeling

- [ ] User-configurable preference options for prospect stats and traits (explicit preferences)
- [ ] Analyze drafting patterns: position preferences, school/conference biases, athleticism vs. production
- [ ] Generate "scouting profile" summary for each user
- [ ] Compare stated preferences vs. revealed preferences (drafting behavior)

### Milestone 5.3: Recommendations

- [ ] "Prospects you might like" based on drafting history
- [ ] During draft: highlight players that match user's tendencies
- [ ] Sleeper alerts: undervalued players matching user's profile

### Milestone 5.4: Shareable Profiles

- [ ] Public profile page with scouting identity
- [ ] Shareable graphics/cards for social media

**Phase 5 Complete**: Users have a persistent scouting identity that evolves with each draft.

---

## Phase 5.5: Content Creator Tools

**Goal**: First-class support for content creators broadcasting drafts and scouting content. High strategic priority — Brett Kollmann and similar creators drive community growth.

### Milestone 5.5.1: Spectator Mode

- [x] Read-only live draft view optimized for stream embedding
- [x] Minimal/clean UI mode that hides navigation and controls
- [x] Configurable overlay themes (dark, light, transparent)

### Milestone 5.5.2: Stream Overlays

- [x] OBS-compatible browser source overlays for live drafts
- [x] Current pick overlay (team, pick number, countdown)
- [x] Recent picks ticker overlay
- [x] Draft board overlay (full or condensed)

### Milestone 5.5.3: Embeddable Widgets

- [x] Embeddable big board widget for external sites/blogs
- [x] Embeddable player card widget
- [x] Configurable widget theming and sizing

**Phase 5.5 Complete**: Content creators can stream drafts with professional overlays and embed MockingBoard content on their own platforms.

---

## Phase 6: Leaderboards & Accuracy Tracking

**Goal**: Track prediction accuracy, create year-round engagement.

### Milestone 6.1: Prediction Locking

- [ ] Allow users to "lock in" a mock draft as a prediction
- [ ] Timestamp and freeze locked predictions
- [ ] Support multiple locked predictions per user (track best, average, etc.)

### Milestone 6.2: Real Draft Integration ✓

- [x] Ingest actual NFL draft results via admin draft results editor (manual entry per round/pick/team/player)
- [x] Score predictions against real results (admin scoring engine, per-pick and aggregate)
- [x] Scoring algorithm in `web/src/lib/scoring.ts`: team match (+30), player match (+40), position match (+15), round accuracy (+15 scaled)

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

### Milestone 6.6: Scouting Accuracy Tracking

- [ ] Score scout-contributed grades against actual draft position and NFL performance
- [ ] Accuracy badges on scout profiles (ties into Phase 4.5 community profiles)
- [ ] Scout leaderboard: most accurate community evaluators

**Phase 6 Complete**: Full accountability system with year-round leaderboard engagement for both mock drafters and scouts.

---

## Phase 6.5: Reference & Tools

**Goal**: Standalone reference pages and tools that enrich the platform and drive organic search traffic.

### Milestone 6.5.1: Team Breakdown Pages ✓

- [x] Individual team analysis pages: current roster, positional needs, draft capital, coaching staff
- [x] Visual draft pick inventory per team
- [x] Team needs admin-curated with positional priority rankings

### Milestone 6.5.2: Draft Order & Trade Value

- [x] Tankathon-style draft order page with pick ownership and trade value chart
- [x] Standalone trade value calculator (outside of active drafts)
- [ ] Support for salary cap implications in trade evaluation (precursor to Phase 9)

**Phase 6.5 Status**: Team breakdown pages and draft order/trade value tools are complete. Salary cap integration remains as a future Phase 9 precursor.

---

## Phase 7: Cost & Monetization

**Goal**: Sustainable cost structure with a paid tier. No ads, ever. See [MONETIZATION.md](MONETIZATION.md) for full strategy, pricing, and philosophy.

### Milestone 7.1: Cost Optimization

- [ ] Optimize `getUserDrafts` query (denormalized subcollection vs. fetch-and-filter)
- [ ] Cache player data (read-heavy, rarely changes)
- [ ] Monitor Firestore reads from real-time listeners during active drafts
- [ ] GCP budget alerts and spending dashboards

### Milestone 7.2: Custom Domain

- [x] Register domain
- [x] Configure via Firebase App Hosting console (DNS verification)

### Milestone 7.3: Stripe Foundation

Core payment infrastructure that all paid features depend on.

- [ ] Stripe account setup with product/price objects (Pro Monthly, Pro Annual, Team Plan)
- [ ] Webhook handler API route (`/api/stripe/webhook`) for subscription lifecycle events (created, updated, canceled, payment failed)
- [ ] `subscriptionStatus` field on User document (`free | pro | team`) with `stripeCustomerId` and `stripeSubscriptionId`
- [ ] Server-side subscription status helper: `getUserTier(userId)` for use in API routes and middleware
- [ ] Client-side subscription context provider (read tier from user doc, expose `isPro` / `isTeam` booleans)

### Milestone 7.4: Individual Pro Subscription

- [ ] Pricing page with Free vs. Pro comparison table, monthly/annual toggle
- [ ] Checkout flow: Stripe Checkout Session → redirect to success page → webhook updates user doc
- [ ] Account management page: current plan, next billing date, payment method, cancel/resume
- [ ] Billing history page (Stripe Customer Portal or custom with invoice list)
- [ ] Free trial: 14-day Pro on signup (Stripe trial period, no payment method required)
- [ ] Student discount: .edu email verification → apply 50% coupon
- [ ] Upgrade/downgrade proration handling (Stripe handles this, surface in UI)

### Milestone 7.5: Feature Gating

Server-side and client-side enforcement of Free/Pro boundaries across the platform. Each gate is a check against `getUserTier()`.

- [ ] **Scouting report cap**: track monthly report count per user (`reportCounts/{userId}_{yearMonth}` doc), block creation at 10 for free tier, show count in report form ("3 of 10 this month")
- [ ] **PDF draft guide**: free tier limited to 32 players and default formatting; Pro unlocks unlimited players, custom covers, watermark removal, community report integration. Gate in `DraftGuideOptions` and `DraftGuideButton`
- [ ] **Board comparison**: Pro-only (Milestone 4.6). Show locked state with upgrade CTA for free users
- [ ] **Draft analytics**: Pro-only (Milestone 3.7 post-draft grades). Free users see summary, Pro sees full breakdown
- [ ] **Advanced leaderboard filters**: Pro-only (Phase 6). Free users get global leaderboard, Pro gets year/position/user filters
- [ ] **Historical access**: free tier = current year + 1 prior for draft history. Pro = all years
- [ ] **Pro badge**: display on profile cards, report cards, and community feeds for Pro/Team subscribers
- [ ] **Soft conversion prompts**: contextual upgrade CTAs at each gate boundary (non-blocking, dismissible)

### Milestone 7.6: Team Plan (Group Subscription)

- [ ] `teams` Firestore collection: `{ ownerId, name, stripeSubscriptionId, memberIds[], maxMembers, createdAt }`
- [ ] Stripe product with per-seat pricing (3–6 members)
- [ ] Team creation flow: owner creates team → selects member count → Stripe Checkout → team doc created
- [ ] Invitation system: owner generates invite link or sends email → invitee accepts → added to `memberIds` and user's `subscriptionStatus` set to `team`
- [ ] Member management: owner can remove members, members can leave. Seat freed for replacement
- [ ] Billing adjustment: when members change, update Stripe subscription quantity
- [ ] Team dashboard page (`/settings/team`): member list, invite link, billing info, plan status
- [ ] Pro status resolution: `getUserTier()` checks individual subscription first, then team membership

### Milestone 7.7: Creator Program

- [ ] Creator application form (linked from profile page for users meeting minimum criteria: 10+ reports or 100+ followers)
- [ ] Admin review queue for creator applications (approve/reject with optional message)
- [ ] Creator tier tracking: automated promotion from Contributor → Verified Creator → Partner based on criteria in MONETIZATION.md
- [ ] Engagement attribution: track referral links per creator, log `referredBy` on new user signups
- [ ] Content engagement metrics: report views, board views, follower growth, video views — stored as daily aggregates
- [ ] Stripe Connect onboarding for Verified Creator+ tier (connected accounts for payouts)
- [ ] Revenue share calculation: attribute Pro subscriptions to creator-driven signups, compute monthly share
- [ ] Creator dashboard page (`/creator`): earnings summary, payout history, engagement metrics, referral stats
- [ ] Payout system: monthly cycle, $25 minimum threshold, Stripe Connect transfers

### Milestone 7.8: Conversion & Optimization

- [ ] Analytics events for all conversion touchpoints (PDF gate hit, report cap hit, comparison gate, etc.)
- [ ] Conversion funnel tracking: free user → pricing page → checkout → subscriber
- [ ] A/B test pricing (feature flag for price variants)
- [ ] Adjust free/Pro boundaries based on usage data (make data-driven decisions on caps)
- [ ] Annual plan promotions and seasonal discounts (draft season push)

**Phase 7 Complete**: Revenue offsets hosting costs; free tier remains generous. Team plans capture group value. Top creators share in platform success.

---

## Phase 7.5: UX Overhaul

**Goal**: Comprehensive UX refresh for usability, mobile experience, and personalization.

### Milestone 7.5.1: Navigation Rework

- [x] Move from top navbar to left sidebar navigation
- [x] Collapsible sidebar for mobile/small screens
- [x] Navigation grouping by feature area (Drafts, Boards, Community, Tools)

### Milestone 7.5.2: Responsive Mobile

- [x] Audit and fix all pages for mobile breakpoints
- [x] Touch-friendly interactions (drag-and-drop, modals, dropdowns)
- [x] Mobile-optimized draft picking interface

### Milestone 7.5.3: Auth & Dashboard Polish ✓

- [x] Authenticated dashboard at `/` with widgets (Prospect of the Day, Mock Draft of the Week, Leaderboard Top 5, Quick Actions, User Stats)
- [x] Landing page single-viewport layout with animated sign-in transition
- [x] OAuth sign-in buttons with provider logos (Discord, Google)
- [x] Green glow background on auth pages matching landing page
- [x] Sign-out redirect to landing page (full server re-render)

### Milestone 7.5.4: Player Page Polish ✓

- [x] Community reports overhaul: tier-based grade buttons replacing slider
- [x] Word cloud visualization for community strengths/weaknesses
- [x] Full-width player page layout

### Milestone 7.5.5: Configurable Theming

- [x] Team-based theming (select your favorite NFL or college team, app adopts their colors)
- [x] Theme persistence in user profile
- [x] Extend existing dark/light toggle to support team color palettes

**Phase 7.5 Complete**: Polished, mobile-friendly experience with personalized theming.

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

- [x] Match core Discord functionality where possible
- [x] Graceful degradation for features that can't translate

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

### Milestone 9.5: Dynasty/Keeper Mode

- [ ] Carry over rosters between draft years
- [ ] Keeper slot designation and management
- [ ] Multi-year draft history per league

**Phase 9 Complete**: Content creators can create "what if" scenarios and return to them over time.

---

## Future Considerations

- **Mobile native app**: Only if popularity demands it — responsive web (Phase 7.5.2) is the priority path
- **Draft suggestion algo** ✓: Implemented in Milestone 3.7. Research-calibrated analytics engine drawing from Massey/Thaler (Weibull market value, 52% accuracy baseline), Baldwin (surplus curves, OFV tables), Unexpected Points (positional surplus tiers), OTC (Positional Value Index), PFF (Pro-Adjusted WAA), and Keefer (sunk-cost fallacy). Powers CPU positional weighting, suggested pick highlighting, and full post-draft grading.
- **Add my other packages**: Incorporate my espn-api and nflverse-ts packages into this site to drive further reference ability and tooling powers (need to get these to 1.0 versions first)
- **NFL player pages**: Pages akin to ESPN featuring player stats, snap count, etc
- **Broader video sharing** ✓: Add support for short form videos from Instagram, TikTok, Twitter, and YouTube
