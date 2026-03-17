# MockingBoard Roadmap

> The Letterboxd of NFL Draft and Scouting.
>
> This roadmap shows where MockingBoard has been and where it's headed. For granular work tracking, see the [Project Board](https://github.com/users/CanadaApollo6/projects/1). For revenue strategy, see [MONETIZATION.md](MONETIZATION.md).

---

## What's Live

MockingBoard launched as a Discord bot and has grown into a full-stack NFL draft platform. Everything below is shipped and in production.

**Mock Drafting** — Solo, multiplayer, multi-team, all-teams, and guest mode across Discord and web. Configurable rounds, timer, CPU speed, and trade rules. In-draft trading with trade value chart. Real-time lobbies with turn management, pick timer, and cross-platform Discord sync.

**Big Boards & Scouting** — Drag-and-drop board builder with snapshots, comparison, and public sharing. Community scouting reports with likes, video breakdowns, scout profiles with follower system, and prospect pages aggregating all community content.

**Post-Draft Analytics** — Research-calibrated grading engine (Massey/Thaler, Baldwin surplus curves, positional value models). Per-pick scoring, 32-team grades, trade analysis, suggested picks, and shareable recap cards. Mock draft stats tracking.

**Community Platform** — Public profiles, follow system, discovery hub. Creator tools: OBS overlays, embeddable widgets, spectator mode, and PDF draft guides.

**Leaderboards** — Lock predictions, score against real NFL results, global accuracy rankings, draft day companion, and shareable "I called it" receipts.

**Reference Tools** — Team breakdowns, draft order, trade calculator, NFL player pages with ESPN stats, contract builder, salary cap explainer, and unified Cmd+K search.

**Infrastructure** — 12-section admin dashboard, SEO/OG meta, notification triggers, 500+ unit tests, mobile-responsive, dark/light theming.

---

## First Flight `NOW`

> _Polish the core and add the first social engagement features._

| Feature            | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| Notification UI    | In-app bell/drawer with unread count, optional email digest                       |
| Draft Chat         | In-draft message feed for multiplayer rooms                                       |
| Board Likes        | Like big boards the same way you like scouting reports — social proof on rankings |
| Prospect Watchlist | Quick-add prospects to track, surface new reports and board movement on them      |
| Cost Optimization  | Query tuning, player data caching, Firestore read monitoring, budget alerts       |

---

## Chorus `NEXT`

> _Grow the community, reward creators, and build a sustainable business._

| Feature                  | Description                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Monetization Foundation  | Stripe setup, Pro subscription, checkout, billing management, free trial, student discount            |
| Feature Gating           | Tiered access for scouting reports, PDF guide, board comparison, analytics depth, leaderboard filters |
| Creator Program          | Application flow, tiered advancement, Stripe Connect payouts, creator dashboard                       |
| Content Moderation       | Report/flag system, author notifications, creation rate limits, platform health metrics               |
| Activity Feed            | "Scouts you follow posted a new report", "X liked Y's board" — make the platform feel alive           |
| Comments                 | Discussion threads on scouting reports and big boards                                                 |
| Consensus Board          | Aggregated community rankings from all public boards — the community's big board                      |
| Trending Prospects       | Most discussed players, biggest risers and fallers across boards, hot prospect alerts                 |
| Hot Takes                | Surface when a scout's ranking significantly diverges from consensus — celebrate bold opinions        |
| Analyst Aggregation      | Import analyst mock drafts, display alongside community mocks, include in leaderboard                 |
| Scouting Accuracy        | Score scout grades vs. real draft outcomes, accuracy badges, scout leaderboard                        |
| Data Pipeline Automation | Semi-automated prospect ingestion, combine/pro day refresh, annual class rollover                     |

---

## Flock `LATER`

> _The full social platform — tracking, reflection, and deeper community connections._

| Feature                  | Description                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Board Evolution Timeline | Visual timeline of how your board changed over the draft season — snapshots presented as a story              |
| Draft Season Wrapped     | Annual summary: reports written, accuracy score, board changes, mocks completed, "I called it" highlights     |
| Scout Stats Dashboard    | Reports written, total likes, accuracy over time, follower growth, most-liked report — your scouting identity |
| Enhanced Notifications   | Configurable alerts: new reports on watched prospects, follower activity, comment replies, board mentions     |
| Trade Calculator Impact  | Light salary cap impact line on existing trade calculator — show cap consequences without full simulation     |
| Friend Comparisons       | Compare your board and accuracy against friends, not just the global leaderboard                              |

---

## Migration `FUTURE`

> _Platform expansion and long-term bets._

| Feature           | Description                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Dynasty Mode      | Persistent leagues across draft years, keeper slots, multi-year history, aging and retirement, year-over-year tracking |
| Preference Engine | Draft behavior analysis, scouting profile generation, "prospects you might like" recommendations, sleeper alerts       |
| Mobile Native App | Only if demand warrants — responsive web is the priority path                                                          |

---

_No ads, ever. See [MONETIZATION.md](MONETIZATION.md)._
