# MockingBoard Roadmap

> Mock drafting is structured football conversation.
>
> This roadmap shows where MockingBoard has been and where it's headed. For granular work tracking, see the [Project Board](https://github.com/users/CanadaApollo6/projects/1). For revenue strategy, see [MONETIZATION.md](MONETIZATION.md).

---

## What's Live

MockingBoard launched as a Discord bot and has grown into a full-stack NFL draft platform. Everything below is shipped and in production.

**Mock Drafting** — Solo, multiplayer, multi-team, and guest mode across Discord and web. Configurable rounds, timer, CPU speed, and trade rules. Real-time lobbies with turn management, pick timer, and cross-platform Discord sync.

**Big Boards & Scouting** — Drag-and-drop board builder with snapshots, comparison, and public sharing. Community scouting reports, video breakdowns, scout profiles, and prospect pages aggregating all community content.

**Post-Draft Analytics** — Research-calibrated grading engine (Massey/Thaler, Baldwin surplus curves, positional value models). Per-pick scoring, 32-team grades, trade analysis, suggested picks, and shareable recap cards.

**Community Platform** — Public profiles, follow system, discovery hub. Creator tools: OBS overlays, embeddable widgets, spectator mode, and PDF draft guides.

**Leaderboards** — Lock predictions, score against real NFL results, global accuracy rankings, draft day companion, and shareable "I called it" receipts.

**Reference Tools** — Team breakdowns, draft order, trade calculator, NFL player pages with ESPN stats, and unified Cmd+K search.

**Infrastructure** — 12-section admin dashboard, SEO/OG meta, notification triggers, 500+ unit tests, mobile-responsive, dark/light theming.

---

## First Flight `NOW`

> _Polish the core and ship the features users are already asking for._

| Feature                      | Description                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- |
| NFL Player Finishing Touches | Contract info on hero cards, side-by-side player comparison                 |
| Notification UI              | In-app bell/drawer with unread count, optional email digest                 |
| Draft Chat                   | In-draft message feed for multiplayer rooms                                 |
| Collaborative Drafting       | Vote-based picks — a group of friends controls one team together            |
| Auth Expansion               | Apple Sign-In, X (Twitter) OAuth                                            |
| Cost Optimization            | Query tuning, player data caching, Firestore read monitoring, budget alerts |

---

## Chorus `NEXT`

> _Grow the community, reward creators, and build a sustainable business._

| Feature                  | Description                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Monetization Foundation  | Stripe setup, Pro subscription, checkout, billing management, free trial, student discount            |
| Feature Gating           | Tiered access for scouting reports, PDF guide, board comparison, analytics depth, leaderboard filters |
| Team Plan                | Group subscriptions with per-seat pricing, invitations, member management                             |
| Creator Program          | Application flow, tiered advancement, Stripe Connect payouts, creator dashboard                       |
| Content Moderation       | Report/flag system, author notifications, creation rate limits, platform health metrics               |
| Leaderboard Expansion    | Historical/year filters, server scoping, "bold take" bonus, friend comparisons                        |
| Analyst Aggregation      | Import analyst mock drafts, display alongside community mocks, include in leaderboard                 |
| Scouting Accuracy        | Score scout grades vs. real draft outcomes, accuracy badges, scout leaderboard                        |
| Data Pipeline Automation | Semi-automated prospect ingestion, combine/pro day refresh, annual class rollover                     |
| Conversion Optimization  | Analytics events, funnel tracking, A/B pricing, seasonal promotions                                   |

---

## Nest Builder `LATER`

> _Lay the foundation for GM Mode — the salary cap engine, contract data, and standalone tools._
>
> See [GM Mode Design Principles](ARCHITECTURE.md#gm-mode-design-principles) for philosophy and anti-features.

| Feature                 | Description                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Salary Cap Rules Engine | Full CBA Article 13 compliance — contract components, cap hits, dead money, restructures, franchise tags, rookie wage scale, Top 51, rollover, cash floor   |
| Contract Data Pipeline  | Admin import (OTC HTML parsing), NFLPA cross-reference, nflverse backfill. Per-player per-year model with all CBA components and staleness indicators       |
| Contract Builder        | Three-tier complexity (Basic / Standard / Advanced), real-time cap preview, franchise tag and rookie contract calculators. Standalone at `/tools/contracts` |
| Team Cap Dashboard      | Visual cap overview, "Make a Move" search, full roster table, what-if columns, multi-year projections                                                       |

---

## Wingspan `LATER`

> _Full offseason simulation — trades, roster moves, free agency, and scenario planning._

| Feature            | Description                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Trade Simulator    | Multi-team builder with cap impact, dead money breakdown, feasibility checks, player search with contract cards, shareable proposals |
| Roster Management  | Cut (pre/post June 1), restructure, extend, franchise tag, trade — all with action history and undo                                  |
| Scenario Builder   | Fork any team's roster, chain moves chronologically, multiple save files, public sharing, side-by-side comparison, community browse  |
| Free Agency        | Card-based FA database, sign players via contract builder, community signing patterns, RFA mechanics                                 |
| Integrated Draft   | Start mock draft from scenario state, auto-updated needs, rookie slot values, traded picks carry over                                |
| Compensatory Picks | Track UFA gains/losses per scenario, project comp pick round, dynamic updates as FA moves happen                                     |

---

## Migration `FUTURE`

> _Platform expansion and long-term bets._

| Feature               | Description                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Dynasty / Keeper Mode | Persistent leagues across draft years, keeper slots, multi-year history, aging and retirement, year-over-year cap tracking |
| Preference Engine     | Draft behavior analysis, scouting profile generation, "prospects you might like" recommendations, sleeper alerts           |
| iMessage Integration  | Draft participation via iMessage app extension, compact pick interface, result sharing                                     |
| Mobile Native App     | Only if demand warrants — responsive web is the priority path                                                              |
| Package Integration   | Incorporate `espn-api` and `nflverse-ts` for broader reference tooling                                                     |

---

_No ads, ever. See [MONETIZATION.md](MONETIZATION.md)._
