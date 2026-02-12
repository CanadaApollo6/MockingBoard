# MockingBoard Roadmap

Organized by status. Each item is scoped to be a single GitHub project board card. See [MONETIZATION.md](MONETIZATION.md) for revenue strategy details.

---

## Complete

### Discord Bot (MVP)

- **Project scaffolding**: Monorepo (`/packages/bot`, `/packages/shared`), TypeScript, ESLint, Prettier, Vitest, Firebase, discord.js
- **Data foundation**: Core types (`Draft`, `Pick`, `Player`, `User`, `Team`), hand-curated prospect list, NFL team data, Firestore schema and security rules, basic CRUD
- **Core draft loop**: `/startdraft` command, dedicated thread, on-the-clock notifications with player buttons, pick recording, auto-pick on clock expiration, `/draft` manual pick command, draft completion summary
- **Draft variants**: Single-team mode (user drafts one team, CPU handles rest), configurable rounds/time/order, pause/resume, configurable CPU speed (instant/fast/normal)
- **Draft trades**: Trade proposal UI, CPU trade acceptance logic (Rich Hill chart), force trade option, user-to-user trades, trade timeout, pick ownership tracking, per-draft trade toggle
- **Polish**: 439+ unit tests across 28 files, error handling with custom error classes, rate limiting, `/help` command, GCP deployment (Cloud Run via Cloud Build)
- **Traded pick display fix**: `slotTeam()` helper to resolve `teamOverride ?? team` across all pick/announce code paths

### Web App Foundation

- **Web setup**: Next.js 16 (App Router, TypeScript, Tailwind v4), shadcn/ui, Turborepo monorepo integration
- **Firebase integration**: Admin SDK (server-side Firestore), Client SDK (real-time listeners), Discord OAuth with Firebase custom tokens, session cookies, auth context provider, Google Secret Manager
- **Draft history view**: List view with status badges/dates/participants, "My Drafts" tab, detail view with pick-by-pick board and trade summaries, loading skeletons, mobile-responsive
- **Live spectating**: Real-time Firestore `onSnapshot` listeners, "On the Clock" header with progress bar, SSR initial paint with client-side hydration, automatic active draft routing
- **Deployment**: Firebase App Hosting (Cloud Run), cross-platform dependency resolution, Turborepo build, OAuth redirect handling, production live

### Brand & Polish

- **Design system**: Blue jay color scheme, custom CSS variables, dark/light themes, logo in header and hero
- **Bug fixes**: Drafter count for single-user all-teams drafts, debug auth error codes cleaned up

### Draft Functionality (Solo + Multiplayer)

- **Shared package extraction**: CPU pick logic, pick controller resolution, draft order building, trade validation (7 functions), CPU trade evaluation, trade execution — all moved to `packages/shared`
- **Solo draft mode**: Draft creation form, interactive picking UI with search/filters, server-side CPU cascade, Firestore transactions, full draft lifecycle, guest mode (no login, client-side state)
- **Web trade support**: Trade proposals with CPU evaluation, trade modal and result UI, API routes
- **Pick timer**: Urgency states, auto-pick on expiry, SVG progress ring, countdown, urgency color shifts
- **CPU behavior**: Speed animation (instant/fast/normal), need-adjusted picking (positional multipliers), randomness/variance (jitter + interpolated probability windows), configurable strategy sliders
- **Draft enhancements**: Multi-team mode (one user controls 2-31 teams), auto-generated draft names, cursor-based pagination, trade UI for current-year extra-round picks
- **Independent auth**: Email/password provider, sign-up page, `User` type updated (`discordId` optional, added `email`/`displayName`), account linking (Discord + email in settings)
- **Multiplayer draft rooms**: Room creation with privacy settings (public/unlisted/private), lobby page with real-time participants, public lobbies browser, join flow with team selection, guest join, multiplayer turn management, client-side pick timer with auto-pick, multiplayer trade support, host pause/resume, server-side timer enforcement
- **Platform sync**: Discord drafts viewable live on web (shared Firestore), web drafts optionally send Discord notifications (webhook-based, configurable: off/link-only/pick-by-pick)
- **Google OAuth**: Firebase Auth provider, unified account linking, auth UI updates
- **Public lobbies polish**: ISR revalidation every 30s, "Possibly inactive" badge for old lobbies
- **Personal big board drafting**: Run mock drafts using personal big board rankings as CPU pick order

### Post-Draft Analytics

- **Analytics engine**: Research-calibrated models (Massey/Thaler, Baldwin surplus curves, OTC/PFF positional value, Unexpected Points surplus tiers)
- **Positional value model**: 15-position multiplier table from four independent sources
- **Surplus value curve**: Calibrated to Baldwin's empirical data (peaks at pick 12)
- **Pick classification**: Position-adaptive thresholds (great-value through big-reach)
- **Pick scoring**: 0-100 composite (value, positional value, need fill, base)
- **Team grading**: Five dimensions (value 30%, positional value 20%, surplus 15%, needs 20%, BPA adherence 15%)
- **Draft recap**: 32-team grades, trade analysis (Rich Hill chart), optimal BPA comparison, per-team analysis, shareable recap cards
- **Suggested picks**: Analytics-scored best available with reason string during user's turn
- **CPU positional weighting**: Fourth-root scaling for subtle premium-position boost
- **Tests**: 60 analytics tests + 5 CPU positional weight tests + 7 suggestPick tests

### Big Board & Community Scouting

- **Big board builder**: Drag-and-drop (`@dnd-kit`), start from consensus ADP or blank, custom players, use personal board during drafts, board history with labeled snapshots, compare to snapshots with rank delta visualization
- **Community scouting data**: CSV/sheet import (admin-only), position-group data schema templates, data validation/normalization, prospect import parsers in shared package (33 tests), attribution on player cards
- **Scout profiles**: Provider profile page (name, bio, avatar, social links), scout directory at `/scouts`, contribution stats, contributor badge/tier system, traffic funnel to creator channels, cached data
- **Prospect big board page**: Public `/prospects` page with editorial magazine-style cards, search by name/school/NFL comp, position group filters, load-more pagination, sticky filter bar, loading skeleton
- **Draft image sharing**: `html-to-image` for client-side PNG, full board share card (1200px), my team share card (800px), share button with dropdown, 2x resolution capture
- **Advanced board generation**: Rapid-generate boards by position group with trait/production weighting
- **Board comparison**: Compare your board to friends' boards and community scouts

### Community Content Platform

- **Public big boards**: Visibility toggle (private/public), URL slug system, public browse page at `/boards`, public board view with Skim/Peruse/Deep Dive modes, slug uniqueness validation
- **User scouting reports**: `ScoutingReport` type with structured fields, TipTap rich text editor, one report per user per player per year, CRUD API endpoints
- **Prospect player pages**: `/prospects/[id]` hub for community content, PlayerHero with school color gradient, CommunityGradeSummary, CommunityReports with write CTA, linked player names throughout
- **Social & discovery**: Public user profiles at `/profile/[slug]`, follow system, profile editor in settings, community discovery hub at `/community`, AnalystProfileCard with counts
- **Video breakdowns**: YouTube URL parsing (watch/youtu.be/embed/shorts), VideoGallery with responsive embeds, VideoSubmitForm, author-only delete. Broader video sharing supports Instagram, TikTok, Twitter, YouTube
- **PDF draft guide**: `@react-pdf/renderer` client-side, cover page + per-player entries + branding, three depth levels (Quick Look/Detailed/Full Breakdown), player count options, download as PDF

### Content Creator Tools

- **Spectator mode**: Read-only live draft view, minimal/clean UI mode, configurable overlay themes (dark/light/transparent)
- **Stream overlays**: OBS-compatible browser source overlays, current pick overlay, recent picks ticker, draft board overlay (full/condensed)
- **Embeddable widgets**: Embeddable big board widget, embeddable player card widget, configurable theming and sizing

### Leaderboards & Accuracy Tracking

- **Prediction locking**: Lock in a mock draft as a prediction, timestamp and freeze, multiple locked predictions per user
- **Real draft integration**: Actual NFL draft results via admin editor (manual entry per round/pick/team/player), scoring engine (team +30, player +40, position +15, round accuracy +15 scaled)
- **Global leaderboard**: Global accuracy score leaderboard
- **Receipts & sharing**: "I called it" graphics when predictions hit, historical accuracy on profiles, live draft companion surfacing correct predictions in real time
- **Draft Day countdown page**: Countdown to draft day with prediction tracking and live scoring

### Reference & Tools

- **Team breakdown pages**: Individual team analysis (roster, positional needs, draft capital, coaching staff, front office, key players), visual draft pick inventory, admin-curated needs
- **Draft order**: Tankathon-style page with pick ownership and trade value chart
- **Trade value calculator**: Standalone calculator outside active drafts
- **NFL player pages**: Player directory at `/players` with search/filter, individual player detail pages at `/players/[espnId]` with ESPN bio/career stats/season splits/game log, team-color GradientCard hero, dynamic position-specific stat columns, IR/status tracking
- **NFL player search integration**: NFL players in unified Cmd+K search, player names linked in team roster tables and key player cards

### Platform Infrastructure

- **Admin dashboard**: Auth-gated `/admin` with 12 feature sections — team management (key players, coaching staff, front office, needs, future picks, team history), draft order editor, draft results entry, draft scoring engine, prospect browser with inline edit, CSV upload, featured content overrides, content moderation queue, season config, announcement banner, cache flush, draft name generator, trade value chart editor, CPU tuning
- **SEO & social sharing**: Dynamic Open Graph meta tags, social card images, JSON-LD structured data, sitemap generation, canonical URLs
- **Unified search**: Global Cmd+K search bar, results grouped by type (prospects, NFL players, teams, boards, scouts), quick-jump navigation
- **Notification triggers**: New follower, new report on scouted player, new board from followed user, new video on scouted player, trade proposals, your turn (multiplayer), draft completed, per-user notification preferences

### UX & Polish

- **Navigation**: Left sidebar with collapsible mobile, navigation grouping by feature area (Drafts, Scouting, Community, Tools)
- **Responsive mobile**: All pages audited for mobile breakpoints, touch-friendly interactions, mobile-optimized draft picking
- **Dashboard**: Authenticated dashboard with widgets (Prospect of the Day, Mock Draft of the Week, Leaderboard Top 5, Quick Actions, User Stats), landing page with animated sign-in transition
- **Auth UI**: OAuth buttons with provider logos (Discord, Google), green glow background, sign-out redirect
- **Player page polish**: Tier-based grade buttons replacing slider, word cloud for community strengths/weaknesses, full-width layout
- **Configurable theming**: Team-based theming (NFL or college team colors), theme persistence, dark/light toggle with team color palettes
- **Shareable profiles**: Public profile pages with scouting identity (top positions, most-drafted-for team, draft/pick counts), ProfileShareCard PNG + OG image route
- **Code quality**: Comprehensive code audit and security sweep, large file reorganization, single-user draft refactoring, 500+ unit tests

---

## In Progress

### NFL Player Pages (Finishing Touches)

- **Contract info on hero card**: Display player contract details (APY, years remaining, cap hit) on the player hero card once contract data pipeline is available
- **Player comparison**: Side-by-side stat comparison between two NFL players

---

## Not Yet Started

### Authentication Expansion

- **Apple Sign-In**: Required for iOS App Store if native app ever ships; good practice regardless
- **X (Twitter) OAuth**: Aligns with NFL/draft community presence on the platform

### Draft Enhancements

- **Collaborative drafting**: Vote-based picks with friends controlling one team
- **In-draft web chat**: Message feed alongside pick UI for multiplayer drafts

### Notification System (UI)

Notification triggers and preferences already exist. These items add the user-facing UI.

- **In-app notification feed**: Bell icon in header, unread count badge, notification drawer/panel
- **Email digest**: Daily/weekly summary of activity (opt-in)

### Content Moderation (Extended)

- **Report/flag system**: User-facing report button on scouting reports, videos, boards, and profiles
- **Content removal with author notification**: Notify authors when content is removed with reason
- **Rate limiting on content creation**: Prevent spam on reports, videos, and board publishing
- **Platform health metrics**: Admin dashboard views for user management, content volume, and system health

### Leaderboard Expansion

- **Historical leaderboards**: Filter by draft year
- **Community/server leaderboards**: Leaderboard scoped to a Discord server or friend group
- **"Bold take" bonus**: Extra credit for correctly predicting reaches/slides
- **Leaderboard filters**: "vs all users", "vs analysts", "vs friends" (Pro feature)

### Analyst Mock Draft Aggregation

- **Ingest analyst mocks**: Import analyst mock drafts (similar to Mock Draft Database)
- **Display alongside user mocks**: Show analyst predictions next to community mocks
- **Include analysts in leaderboard**: Compare analyst accuracy to user accuracy

### Scouting Accuracy Tracking

- **Score scout grades**: Compare scout-contributed grades against actual draft position and NFL performance
- **Accuracy badges on scout profiles**: Ties into community profiles
- **Scout leaderboard**: Most accurate community evaluators

### Data Pipeline Automation

- **Semi-automated prospect ingestion**: Scheduled fetches from public sources + admin review
- **Automated combine/pro day data refresh**: When results are published
- **Annual draft class rollover**: Archive current year, seed next year's class
- **Data freshness indicators**: Last updated timestamp on player cards

### Monetization

See [MONETIZATION.md](MONETIZATION.md) for full strategy, pricing, and philosophy. No ads, ever.

#### Stripe Foundation

- **Stripe setup**: Product/price objects (Pro Monthly, Pro Annual, Team Plan)
- **Webhook handler**: `/api/stripe/webhook` for subscription lifecycle events
- **User subscription status**: `subscriptionStatus` field (`free | pro | team`), `stripeCustomerId`, `stripeSubscriptionId`
- **Server-side tier helper**: `getUserTier(userId)` for API routes and middleware
- **Client-side subscription context**: Read tier from user doc, expose `isPro` / `isTeam`

#### Individual Pro Subscription

- **Pricing page**: Free vs. Pro comparison table, monthly/annual toggle
- **Checkout flow**: Stripe Checkout Session, success page, webhook updates user doc
- **Account management**: Current plan, billing date, payment method, cancel/resume
- **Billing history**: Stripe Customer Portal or custom invoice list
- **Free trial**: 14-day Pro on signup (no payment method required)
- **Student discount**: .edu email verification, 50% coupon
- **Proration**: Upgrade/downgrade handling via Stripe

#### Feature Gating

- **Scouting report cap**: Track monthly count, block at 10 for free tier, show count in form
- **PDF draft guide**: Free limited to 32 players + default formatting; Pro unlocks full customization
- **Board comparison**: Pro-only with upgrade CTA for free users
- **Draft analytics**: Free sees summary, Pro sees full breakdown
- **Advanced leaderboard filters**: Pro-only year/position/user filters
- **Historical access**: Free = current year + 1 prior; Pro = all years
- **Pro badge**: Display on profile cards, reports, and community feeds
- **Soft conversion prompts**: Contextual, non-blocking upgrade CTAs at each gate boundary

#### Team Plan (Group Subscription)

- **Team data model**: `teams` collection with owner, members, Stripe subscription, max members
- **Stripe per-seat pricing**: 3-6 members
- **Team creation flow**: Owner creates team, selects count, Stripe Checkout
- **Invitation system**: Invite link or email, invitee accepts, added to team
- **Member management**: Owner add/remove, members can leave, seat replacement
- **Billing adjustment**: Update Stripe quantity on member changes
- **Team dashboard**: `/settings/team` with member list, invite link, billing, status

#### Creator Program

- **Creator application**: Linked from profile for users meeting criteria (10+ reports or 100+ followers)
- **Admin review queue**: Approve/reject with optional message
- **Creator tier tracking**: Automated promotion (Contributor, Verified Creator, Partner)
- **Engagement attribution**: Referral links, `referredBy` on new signups
- **Content engagement metrics**: Report/board/video views, follower growth (daily aggregates)
- **Stripe Connect**: Connected accounts for payouts (Verified Creator+ tier)
- **Revenue share**: Attribute Pro subscriptions to creator-driven signups, compute monthly share
- **Creator dashboard**: `/creator` with earnings, payout history, engagement, referral stats
- **Payout system**: Monthly cycle, $25 minimum, Stripe Connect transfers

#### Conversion & Optimization

- **Analytics events**: All conversion touchpoints (PDF gate, report cap, comparison gate)
- **Funnel tracking**: Free user, pricing page, checkout, subscriber
- **A/B test pricing**: Feature flag for price variants
- **Adjust boundaries**: Data-driven decisions on free/Pro caps
- **Seasonal promotions**: Annual plan discounts, draft season push

### Cost Optimization

- **Optimize `getUserDrafts` query**: Denormalized subcollection vs. fetch-and-filter
- **Cache player data**: Read-heavy, rarely changes
- **Monitor Firestore reads**: From real-time listeners during active drafts
- **GCP budget alerts**: Spending dashboards

### GM Mode / Offseason Simulator

Full offseason simulation with real contract data and accurate salary cap math. See the [design principles and anti-features](#gm-mode-design-principles) section below for philosophy.

#### Salary Cap Rules Engine

CBA Article 13 compliant cap accounting. All calculations deterministic.

- **Contract component modeling**: Base salary, signing bonus (5yr max proration), roster/option/workout/reporting bonuses, incentives (LTBE/NLTBE), escalators, void years
- **Cap hit calculation**: Base + prorated bonuses + LTBE incentives
- **Dead money**: Pre-June 1 (all proration accelerates) vs. post-June 1 (split current + next year)
- **Post-June 1 designations**: 2 per team limit tracking
- **Restructure math**: Salary-to-bonus conversion with reproration over remaining years (up to 5yr max), including void year additions
- **Franchise/transition tag calculation**: Non-exclusive (avg top 5), exclusive (avg top 5 salaries), transition (avg top 10), 120%/144% consecutive-year escalators
- **Veteran Salary Benefit**: Minimum deals cap-charged at 2-year vet minimum rate
- **Top 51 rule**: Offseason vs. full-roster counting
- **Cap rollover**: Unused space carries forward
- **Cash spending floor**: 89-90% over rolling multi-year period
- **Rookie wage scale**: Slot values by draft position, 4yr structure, 5th-year option tiers, Proven Performance Escalator
- **Incentive classification**: Prior-year performance determines LTBE vs. NLTBE; year-end netting
- **Comprehensive tests**: Every calculation verified against known real-world contract examples

#### Contract Data Pipeline

No public API exists for NFL contract data. OTC and Spotrac compile from public sources (NFLPA filings, media reports, agent disclosures, CBA rules). Data ingestion uses admin-triggered HTML parsing.

- **Admin import tool**: Admin page that fetches and parses OTC HTML tables with `cheerio` — 4 tables per team (salary cap, free agents, dead money, league-wide cap space), review UI before committing to Firestore. "Refresh All Teams" button for bulk updates.
- **NFLPA Public Salary Cap Report**: Daily-updated official source for validation and cross-referencing against parsed OTC data
- **nflverse baseline**: Open-source contract summaries (APY, total value, guarantees — ~25 fields, free) for historical data and backfill
- **Data model**: Per-player, per-year with all CBA Article 13 components (base salary, prorated bonuses, roster/option/workout bonuses, guaranteed salary, cap number, cut/trade/restructure savings)
- **Free agent tracking**: FA type (UFA/RFA/ERFA), franchise/transition tender values, void year dead cap
- **Data freshness**: Last-updated timestamp per team, staleness indicators in UI
- **Admin override**: Manual correction interface for data discrepancies between sources
- **Refresh cadence**: Daily during free agency/cuts, weekly during season, post-draft bulk refresh for rookie contracts

#### Contract Builder

- **Basic mode**: APY, years, total guarantees with auto-distribution into per-year structure
- **Standard mode**: Per-year base salary, signing bonus, roster bonuses, per-year guarantee toggles
- **Advanced mode**: Void years, option bonuses, incentives (LTBE/NLTBE with thresholds), escalators, workout/reporting bonuses
- **Real-time cap preview**: Per-year cap hits, dead money schedule, total commitment as terms change
- **Franchise tag calculator**: Select position, see computed values with consecutive-year escalator preview
- **Rookie contract calculator**: Select draft slot, see slotted 4yr values and 5th-year option projections
- **Standalone page**: `/tools/contracts` as public reference tool, optionally select team to check cap fit

#### Trade Simulator

Upgrade existing trade value calculator into full NFL trade machine.

- **Multi-team trade builder**: 2-3 teams, add players and/or draft picks
- **Draft pick value balance**: Existing Rich Hill chart comparison retained
- **Cap impact per team**: Before/after cap, dead money absorbed by sending team, contract absorbed by receiving team
- **Dead money breakdown**: Sending team sees accelerated proration; receiving team takes face value
- **Cap feasibility check**: "Can absorb" or "needs $Y in cap space" — factual, no prescription
- **Player search with contract cards**: Search any player, see contract details, add to trade
- **Shareable trade proposals**: Unique URLs, extend `html-to-image` sharing
- **Scenario integration**: Trades import into scenarios, applying cap changes

#### Team Cap Dashboard

- **Visual cap overview**: Hero (committed, dead money, available, Top 51 effective), card groups (biggest hits, expiring, dead money leaders)
- **"Make a Move" search**: Type player name, see contract card, pick action (cut/extend/restructure/tag)
- **Full roster table**: Sortable/filterable by cap hit, dead money, position, years remaining (power-user toggle)
- **Factual "what if" columns**: Cap savings if cut, dead money, restructure savings
- **Year-over-year projection**: Committed cap 1-4 years out
- **No smart suggestions**: Just clear, well-presented data

#### Roster Management Actions

- **Cut player**: Pre/post-June 1 toggle, dead money vs. cap savings, designation counter
- **Restructure contract**: Max convertible base, new proration schedule, void year option
- **Extend contract**: Contract builder pre-filled with current terms, combined cap impact
- **Franchise/transition tag**: Auto-calculated by position, one per team per year, escalator shown
- **Trade player**: Opens trade simulator within scenario, dead money stays with original team
- **Action history with undo**: Revert individual actions or chains

#### Scenario Builder

- **Fork team roster**: Start from any team's current roster + cap as starting point
- **Chain actions**: Cut, restructure, sign FA, draft — see cumulative cap at each step
- **Scenario timeline**: Moves as chronological narrative, not spreadsheet
- **Multiple save files**: Name and describe each scenario
- **Share publicly**: Unique URLs like public boards
- **Compare scenarios**: Side-by-side (yours vs. friend's, or two of your own)
- **Shareable scenario cards**: Extend `html-to-image` sharing
- **Community browse**: See what scenarios others have built for each team

#### Free Agency

- **Free agent database**: Card-based browse by position, factual details (age, prior contract, experience, stats)
- **Sort by facts**: No subjective tier/ranking column
- **Sign a free agent**: Click FA card, contract builder opens, define terms, confirm, see cap impact
- **Community patterns**: "X users have signed this player, avg contract Y" (descriptive, not prescriptive)
- **Restricted free agents**: Qualifying offer mechanics, right of first refusal, draft pick compensation

#### Integrated Draft

- **Start draft from scenario**: Roster reflects all offseason moves
- **Needs auto-update**: Based on cuts/signings/trades
- **Rookie contracts**: Slot values applied automatically by pick position
- **Draft results save to scenario**: Complete offseason-to-draft pipeline
- **Traded picks carry over**: From scenario into mock draft pick order

#### Compensatory Pick Projections

- **Track UFA gains/losses**: Per team within a scenario
- **Project comp pick round**: Based on APY, snap count, honors formula
- **Clearly labeled estimates**: With methodology disclosure
- **Dynamic updates**: As user makes FA moves in scenarios

#### Dynasty / Keeper Mode

- **Carry over rosters**: Between draft years in a persistent league
- **Keeper slot designation**: And management
- **Multi-year draft history**: Per league
- **Year-over-year cap tracking**: Across seasons
- **Aging and retirement**: Contract expirations, UFA status

### Preference Engine

- **Data collection**: Track every pick with context (available players, team needs, pick position), store player attributes for analysis
- **Preference modeling**: User-configurable preference options, analyze drafting patterns (position/school/athleticism vs. production), generate scouting profile summary, compare stated vs. revealed preferences
- **Recommendations**: "Prospects you might like" based on history, in-draft tendency highlights, sleeper alerts for undervalued matches

### iMessage Integration

- **Research & prototyping**: Explore iMessage app extension capabilities, prototype basic message sending, determine minimum viable UX
- **Implementation**: iMessage extension for draft participation, compact pick interface (fits app drawer), send results as iMessage
- **Feature parity**: Match core Discord functionality where possible, graceful degradation for untranslatable features

### Future Considerations

- **Mobile native app**: Only if popularity demands it — responsive web is the priority path
- **Integrate espn-api and nflverse-ts packages**: Incorporate personal packages into the site for broader reference tooling (need to get these to 1.0 first)

---

### GM Mode Design Principles

**Design Principles** (informed by competitive analysis of StickToTheModel and PFN):

- **Facts, not opinions**: Every number is derived from real contract data or deterministic math. No estimated market values, no AI-generated rankings.
- **Complete or nothing**: Cap features ship with full CBA Article 13 compliance. No half-measures.
- **User is the GM**: No CPU-initiated trades or signings. No guardrails on user decisions. Show consequences, don't prevent actions.
- **Tiered complexity**: Casual users can do basic moves (cut, sign, draft). Cap nerds can define void years, incentive structures, and restructure specifics. Both paths produce accurate math.
- **Editorial UX, not spreadsheets**: Card-based layouts, clear visual hierarchy, action-first flows. Progressive disclosure — start with the moves the user wants to make, reveal full roster complexity only on demand.

**Anti-Features (What We Explicitly Won't Build)**:

- No AI-generated player rankings or tier lists
- No CPU-initiated trades or signings
- No "smart suggestions"
- No estimated contract values for free agents
- No half-baked cap features
- No guardrails on user decisions
