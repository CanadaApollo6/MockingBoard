# Gaming Features: Gamification + Arcade Draft Modes

> Design document for MockingBoard's gaming layer. This is not fantasy football — it's draft culture gamified.

MockingBoard's core drafting, scouting, and leaderboard features are solid. The next differentiation layer is making the platform _fun to come back to_ — both through rewarding existing behaviors (gamification) and adding new ways to draft (arcade modes). No other draft platform has these.

Two layers:

1. **Gamification** — XP, levels, achievements, streaks layered on existing features
2. **Arcade Modes** — New draft formats: Speed Draft, Chaos Draft, Power-Up Draft, and eventually a Balatro-inspired card game

---

## Layer 1: Gamification

### Data Model

**Firestore: `users/{uid}` — extend existing doc:**

```ts
// New fields on the existing User document
xp: number; // Lifetime XP
level: number; // Derived from XP thresholds
streak: {
  current: number; // Consecutive days with qualifying activity
  longest: number; // All-time record
  lastActiveDate: string; // "2026-03-18" — to detect streak continuation
}
```

**Firestore: new `achievements` subcollection on users:**

```ts
// users/{uid}/achievements/{achievementId}
{
  achievementId: string; // e.g. "first-draft", "accuracy-90"
  unlockedAt: Timestamp;
  xpAwarded: number;
}
```

**Shared: Achievement definitions (code-only, not Firestore):**

```ts
// packages/shared/src/achievements.ts
interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon name
  xp: number;
  category: 'drafting' | 'scouting' | 'community' | 'accuracy' | 'arcade';
  check: (ctx: AchievementContext) => boolean; // Pure function
}
```

### XP Sources

| Action                              | XP     | Notes               |
| ----------------------------------- | ------ | ------------------- |
| Complete a draft                    | 50     | Any mode            |
| Write a scouting report             | 30     |                     |
| Create/update a big board           | 20     |                     |
| Lock a prediction                   | 25     | Commitment reward   |
| Daily login streak (per day)        | 5      | Caps at 50/day      |
| Get a like on your content          | 5      | Social reward       |
| Win a speed draft                   | 75     | Arcade bonus        |
| Accuracy > 80% on locked prediction | 100    | Season-end          |
| Achievement unlock                  | Varies | Per achievement def |

### Achievement Categories (Starter Set)

**Drafting:** First Draft, 10 Drafts, 50 Drafts, All-Teams Draft, Complete a Trade, Draft All 7 Rounds

**Scouting:** First Report, 10 Reports, First Video Breakdown, Get 10 Likes on a Report

**Community:** First Follow, 10 Followers, First Comment, First Board Like

**Accuracy:** Lock a Prediction, Top 10% Accuracy, Called a First-Round Pick Exactly

**Arcade:** Win a Speed Draft, Complete a Chaos Draft, Use All Power-Ups in One Draft

### Level Thresholds

Simple exponential curve: `Level N requires N * 100 XP` (Level 1 = 100 XP, Level 10 = 1000 XP, Level 25 = 2500 XP). Display as a progress bar on profile.

### Where It Shows Up

- **Profile page** — Level badge, XP progress bar, achievement showcase
- **Leaderboard** — Level badge next to username
- **Draft room** — Small level badge next to drafter name
- **Achievement toast** — Non-blocking notification when unlocked mid-session

### Open Decisions

1. **XP award timing:** On action (instant) or batch at end-of-day/session? Instant is simpler and more satisfying.
2. **Achievement checking:** On every relevant action (eager) or periodic scan (lazy)? Eager for count-based ("10 drafts"), lazy for complex ("top 10% accuracy" — season-end only).
3. **Retroactive unlocks:** Award achievements for existing activity on first login post-launch? Probably yes — users shouldn't start at zero.

---

## Layer 2: Arcade Draft Modes

### Architecture: How Modes Plug In

All arcade modes share the same pick flow (`preparePickRecord`, `recordPick`, Firestore transaction). They differ in:

| Extension Point                     | What Changes                       |
| ----------------------------------- | ---------------------------------- |
| `Draft.config` (types.ts)           | New optional fields per mode       |
| `useDraftCore` — `availablePlayers` | Constraint filtering injected here |
| `usePickTimer` / new hooks          | Timer model changes (chess clock)  |
| `DraftCreator`                      | New UI sections for mode config    |
| `PlayerPicker` component            | Visual constraint indicators       |

**Design decisions:**

- All arcade modes support **multiplayer from day one** — no solo-only phase
- Power-up scope is **TBD** until Phase D
- `config.gameMode` is orthogonal to `DraftFormat` — you can do a single-team chaos draft or an all-teams speed draft

```ts
// packages/shared/src/types.ts
type GameMode = 'classic' | 'speed' | 'chaos' | 'powerup';

// In Draft.config:
gameMode?: GameMode;  // Default: 'classic' (undefined = classic for backwards compat)
```

---

### Mode 1: Speed Draft (Chess Clock)

**Concept:** Each drafter has a total time budget (e.g., 5 minutes). Clock counts down only during your turns. Run out → CPU auto-picks your remaining selections.

**Config:**

```ts
config.gameMode: 'speed';
config.totalTimeSeconds: number;  // e.g., 300 (5 min)
```

**How it works:**

- New `useChessClock` hook wrapping `usePickTimer` — tracks `remainingTime` per userId, decrements only when `isUserTurn`
- `Draft.clockState: Record<string, number>` tracks remaining time per user, updated atomically with each pick via the existing Firestore transaction
- When a player's clock hits 0, subsequent picks auto-resolve via `prepareCpuPick()`
- Server-side enforcement via `clockExpiresAt` (field already exists on Draft type) — pick route validates and rejects late picks
- All connected clients see remaining time via `onSnapshot`

**UI:** Chess clock display, urgency indicators, "OUT OF TIME" badge when eliminated.

**Complexity:** Medium.

---

### Mode 2: Chaos Draft (Wheel of Chaos)

**Concept:** Before each pick (or each round), a random constraint is applied: position-locked, conference-locked, school-locked, rank-range, opposite-need, or wild (no constraint).

**Config:**

```ts
config.gameMode: 'chaos';
config.chaosType?: 'per-pick' | 'per-round';
config.chaosConstraints?: ChaosConstraint[];  // Optional whitelist; default = all
```

**Constraint types:**

```ts
// packages/shared/src/chaos.ts
type ChaosConstraint =
  | { type: 'position'; position: string }
  | { type: 'conference'; conference: string }
  | { type: 'school'; school: string }
  | { type: 'range'; minRank: number; maxRank: number }
  | { type: 'wild' }
  | { type: 'opposite-need' };
```

**How it works:**

- Constraints generated deterministically from pick number as seed (solo) or stored on Draft doc (multiplayer)
- Filter injected into `useDraftCore.availablePlayers` — existing `useMemo` pipeline
- CPU picks automatically respect constraints since `selectCpuPick()` receives the filtered list
- "Wheel" spin animation is purely visual — result is pre-determined
- Fallback: if no players match, relaxes to "wild"

**UI:** Wheel of Chaos spinner, active constraint badge, constraint history on draft board.

**Complexity:** Medium.

---

### Mode 3: Power-Up Draft

**Concept:** Each drafter starts with one-time power-ups that bend the rules.

| Power-Up    | Effect                                                   | Per Draft |
| ----------- | -------------------------------------------------------- | --------- |
| Steal Pick  | Take the current pick slot from another team (they skip) | 1         |
| Snatch      | Steal a just-picked player (opponent must re-pick)       | 1         |
| Swap        | Trade any two existing picks on the board                | 1         |
| Double Down | Make two picks in a row                                  | 1         |
| Rewind      | Undo the last pick and re-do from that point             | 1         |
| Scout       | Reveal which player the CPU would pick next for any team | 2         |
| Shield      | Protect your next pick from Snatch or Swap               | 1         |

**Data model:**

```ts
interface PowerUpState {
  available: { type: PowerUpType; count: number }[];
  used: { type: PowerUpType; usedAtPick: number; target?: string }[];
  activeShield: boolean;
}
```

**How it works:**

- Multiplayer: `drafts/{id}/powerups/{userId}` subcollection
- Each power-up is a function that mutates draft state, similar to `computeTradeExecution()`
- `isForceTrade` mechanism provides precedent for forced draft mutations
- Recommend starting with simpler power-ups (Scout, Shield, Steal Pick) before adding history-rewriting ones (Snatch, Rewind)

**Complexity:** High.

---

### Mode 4: Draft Card Game (Balatro-Inspired) — Future

**Concept:** A roguelike draft experience. Each "ante" is a round of the draft (7 → 1, getting harder). Between rounds, acquire modifier cards that change scoring rules, add bonuses, or impose constraints. Your "hand" of modifiers shapes your draft strategy.

Parked until the other three arcade modes prove out the infrastructure. The constraint system from Chaos Draft and the power-up system from Power-Up Draft are foundational building blocks for this mode.

---

## Build Order

| Phase | What                            | Why First                                                                      |
| ----- | ------------------------------- | ------------------------------------------------------------------------------ |
| **A** | Gamification (XP, achievements) | Adds engagement to ALL existing features immediately. No draft changes needed. |
| **B** | Speed Draft                     | Simplest arcade mode. Timer primitives exist. Proves the `gameMode` pattern.   |
| **C** | Chaos Draft                     | Clean filter layer. Reuses infrastructure from Speed Draft.                    |
| **D** | Power-Up Draft                  | Most complex. Benefits from battle-tested `gameMode` infrastructure.           |
| **E** | Card Game                       | Future. Builds on constraint + power-up systems from C and D.                  |
