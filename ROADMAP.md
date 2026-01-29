# MockingBoard Development Roadmap

## Phase 1: MVP — Discord Bot

**Goal**: A functional Discord bot that can run a mock draft entirely within a Discord thread.

### Milestone 1.1: Project Setup ✓

- [x] Initialize monorepo structure (`/packages/bot`, `/packages/shared`)
- [x] Configure TypeScript, ESLint, Prettier
- [x] Set up Jest for testing
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

### Milestone 1.5: Polish & Testing

- [ ] Comprehensive unit tests for draft logic
- [ ] Error handling and user-friendly error messages
- [ ] Rate limiting and basic abuse prevention
- [ ] Documentation for bot commands
- [ ] Deploy bot to GCP (Cloud Run or Compute Engine)

### Milestone 1.6: Draft Trades

- [ ] Trade proposal UI during drafts (offer picks to other teams)
- [ ] CPU trade acceptance logic using Rich Hill trade value chart
- [ ] "Force Trade" button for users who want to skip realism
- [ ] Configurable: enable/disable trades per draft
- [ ] Trade history tracking and announcements

**Phase 1 Complete**: Bot is usable in real Discord servers for real drafts.

---

## Phase 2: Web App — Draft History

**Goal**: A minimal web application where users can view their past drafts.

### Milestone 2.1: Web Setup

- [ ] Initialize `/packages/web` with Next.js or Remix
- [ ] Configure Tailwind CSS
- [ ] Set up Firebase Auth (Discord OAuth provider)
- [ ] Basic layout and navigation

### Milestone 2.2: Identity Linking

- [ ] Login with Discord flow
- [ ] Link Discord ID to Firebase Auth UID
- [ ] Update bot to recognize linked accounts

### Milestone 2.3: Draft History View

- [ ] List view of user's past drafts (date, format, teams involved)
- [ ] Detail view of individual draft (pick-by-pick breakdown)
- [ ] Filter/search drafts by date, format, team drafted
- [ ] Mobile-responsive design

### Milestone 2.4: Deploy

- [ ] Deploy web app (Vercel, Firebase Hosting, or Cloud Run)
- [ ] Custom domain setup

**Phase 2 Complete**: Users can log in and view all drafts they've participated in.

---

## Phase 3: Web Draft Functionality

**Goal**: Users can run drafts through the web app, not just Discord.

### Milestone 3.1: Draft Creation

- [ ] Create draft form (rounds, teams, invite friends)
- [ ] Invite system (share link or invite by username)
- [ ] Lobby view while waiting for participants

### Milestone 3.2: Live Draft UI

- [ ] Real-time draft board (Firestore listeners)
- [ ] On-the-clock interface with player selection
- [ ] Player list with filtering (position, school, search)
- [ ] Pick confirmation and announcement
- [ ] Chat/reactions sidebar (optional, lightweight)

### Milestone 3.3: Solo Draft Mode

- [ ] CPU opponent logic (draft by ADP with some variance)
- [ ] Visible CPU "personalities" (team tendencies, reported interests)
- [ ] Optional: post-pick beat reporter flavor text

### Milestone 3.4: Sync Between Platforms

- [ ] Drafts started in Discord can be viewed live on web
- [ ] Drafts started on web send notifications to Discord (optional integration)

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
- [ ] Scoring algorithm: exact pick, correct round, correct team, etc.

### Milestone 5.3: Leaderboards

- [ ] Global leaderboard by accuracy score
- [ ] Leaderboard by server/community
- [ ] Historical leaderboards (by year)
- [ ] "Bold take" bonus: extra credit for correctly predicting reaches/slides

### Milestone 5.4: Receipts & Sharing

- [ ] Auto-generate "I called it" graphics when predictions hit
- [ ] Historical accuracy stats on user profiles
- [ ] Live draft companion: surface correct predictions in real time as picks happen

### Milestone 5.5: Analyst Mock Draft Aggregation

- [ ] Ingest analyst mock drafts (similar to Mock Draft Database)
- [ ] Display analyst predictions alongside user mocks
- [ ] Include analysts in leaderboard comparisons
- [ ] Filter leaderboard: "vs all users", "vs analysts only", "vs friends"

**Phase 5 Complete**: Full accountability system with year-round leaderboard engagement.

---

## Phase 6: Big Board Builder

**Goal**: Users can create and maintain their own prospect rankings.

### Milestone 6.1: Board Creation

- [ ] Drag-and-drop interface for ranking players
- [ ] Start from consensus ADP or blank
- [ ] Add custom players (for deep sleepers)

### Milestone 6.2: Philosophy Weighting

- [ ] User sets preferences: athleticism vs. production, positional value, conference trust, etc.
- [ ] System generates recommended board based on weights
- [ ] User can accept, modify, or ignore recommendations

### Milestone 6.3: Board Integration

- [ ] Use personal board during drafts (sort available players by your ranking)
- [ ] Compare your board to consensus, friends, experts
- [ ] Track how your board evolves over time

**Phase 6 Complete**: Users have a living, personalized big board integrated into the draft experience.

---

## Phase 7: iMessage Integration

**Goal**: Bring the in-chat draft experience to iMessage.

### Milestone 7.1: Research & Prototyping

- [ ] Explore iMessage app extension capabilities and constraints
- [ ] Prototype basic message sending from extension
- [ ] Determine minimum viable UX within iMessage limitations

### Milestone 7.2: Implementation

- [ ] iMessage extension for draft participation
- [ ] Compact pick interface (fits iMessage app drawer)
- [ ] Send pick results as iMessage to group chat

### Milestone 7.3: Feature Parity

- [ ] Match core Discord functionality where possible
- [ ] Graceful degradation for features that can't translate

**Phase 7 Complete**: Users can draft in iMessage group chats.

---

## Phase 8: GM Mode / Offseason Simulator

**Goal**: Full offseason simulation for content creators and serious fans.

**Prerequisites**: Research NFL salary cap mechanics, contract structures, free agency rules.

### Milestone 8.1: Salary Cap Foundation

- [ ] Research and document NFL salary cap rules
- [ ] Ingest contract data (source TBD - may need manual curation or paid API)
- [ ] Model cap hits, dead money, restructures
- [ ] Team cap situation snapshots by date

### Milestone 8.2: Team Forking

- [ ] "Fork" a team from a specific date (like git branches)
- [ ] Multiple save files per user
- [ ] Name and describe each scenario

### Milestone 8.3: Free Agency Simulation

- [ ] Available free agents list
- [ ] Sign players with cap implications
- [ ] CPU teams make signings too (optional realism)

### Milestone 8.4: Integrated Draft

- [ ] Use forked team in mock drafts
- [ ] Picks reflect trades made in scenario
- [ ] Draft results save back to scenario

**Phase 8 Complete**: Content creators can create "what if" scenarios and return to them over time.

---

## Future Considerations (Not Scheduled)

- **Trades during draft**: Propose and accept trades mid-draft
- **Dynasty/keeper support**: Carry over rosters between years
- **Collaborative drafting**: Vote-based picks with friends controlling one team
- **Public draft lobbies**: Join drafts with strangers
- **Content creator tools**: Spectator mode, stream overlays
- **Mobile native app**: If iMessage extension proves too limiting
- **Paid data integration**: Licensed scouting reports, combine data
