# MockingBoard Design System

## Design Philosophy

MockingBoard's visual identity sits at the intersection of premium sports media and modern product design. The guiding principles:

1. **Confident restraint**: Let content breathe. Resist the urge to fill every pixel. Negative space signals quality.
2. **Motion with purpose**: Animate the moments that matter (picks, transitions, reveals). Everything else is still and grounded.
3. **Information density, visual calm**: The data is rich but the presentation is clean. Progressive disclosure over overwhelming upfront.
4. **Dark-first, color-as-punctuation**: A dark foundation with strategic bursts of color (primarily team colors) during key moments.
5. **Editorial sensibility**: Player profiles and draft content should feel like magazine layouts, not database rows.

### Inspiration References

- **The Ringer**: Editorial typography, bold hierarchy, magazine-quality sports content presentation
- **Awwwards / CSS Design Awards**: Interaction design, micro-animations, scroll-driven storytelling
- **Apple product pages**: Progressive disclosure, cinematic reveals, restrained elegance
- **ESPN/NFL draft broadcasts**: Dark environments with bright accent lighting, dramatic tension
- **Stripe**: Component design, spacing discipline, subtle depth and layering

---

## Color System

### Core Palette

```
--mb-black:          #0A0A0B     /* True background, deepest layer */
--mb-surface:        #141416     /* Card backgrounds, elevated surfaces */
--mb-surface-hover:  #1C1C1F     /* Hover states on surfaces */
--mb-surface-active: #242428     /* Active/pressed states */
--mb-border:         #2A2A2E     /* Subtle borders, dividers */
--mb-border-strong:  #3A3A3F     /* Emphasized borders */

--mb-text-primary:   #F0F0F2     /* Primary text, headings */
--mb-text-secondary: #A0A0A8     /* Secondary text, labels, metadata */
--mb-text-tertiary:  #6A6A72     /* Disabled text, placeholders, timestamps */

--mb-accent:         #3DFFA0     /* Primary accent — bright mint/green */
--mb-accent-hover:   #2DE88E     /* Accent hover state */
--mb-accent-muted:   rgba(61, 255, 160, 0.12)  /* Accent backgrounds, glows */

--mb-danger:         #FF4D6A     /* Errors, destructive actions, clock warnings */
--mb-warning:        #FFB84D     /* Caution states, clock running low */
--mb-success:        #3DFFA0     /* Success states (same as accent) */
```

### Why Mint Green?

Every sports site uses blue, red, or orange. The mint accent is unexpected — it reads as modern, slightly futuristic, and pops hard against dark backgrounds. It also doesn't clash with any NFL team's primary colors, which matters when team colors are used contextually during drafts.

### Team Colors

Team colors are used contextually, never as part of the core brand palette. During a draft, the current team's primary color appears as:

- A subtle background gradient or vignette behind the "on the clock" state
- The accent color on the active pick card
- A brief flash when a pick is confirmed

```
/* Applied dynamically via CSS custom properties */
--team-primary:   var(--nfl-NE-primary, #002244);
--team-secondary: var(--nfl-NE-secondary, #C60C30);
```

Store all 32 team color pairs as constants. Use the primary color at low opacity (8-15%) for backgrounds, full opacity only for small accents like borders or icons.

### Light Mode (Optional, Secondary)

If implemented, light mode inverts the surface hierarchy but keeps the same accent:

```
--mb-black:          #FFFFFF
--mb-surface:        #F5F5F7
--mb-surface-hover:  #EBEBEF
--mb-border:         #D5D5DA
--mb-text-primary:   #0A0A0B
--mb-text-secondary: #6A6A72
--mb-accent:         #00C468     /* Slightly deeper green for contrast on light */
```

---

## Typography

### Font Stack

**Primary (Headings, Player Names, Numbers)**: Inter Tight or DM Sans

Both are free, highly legible, and have the slightly condensed, modern feel that works for sports data. Inter Tight is preferred for its numerical clarity and tighter default spacing.

```css
--font-primary: 'Inter Tight', 'DM Sans', system-ui, sans-serif;
```

**Display (Hero moments, "On the Clock", Draft Round Headers)**: A condensed or compressed variant for high-impact moments.

Options (free): Barlow Condensed, Oswald, Big Shoulders Display
Options (paid, aspirational): Druk, GT America Compressed, Knockout

```css
--font-display: 'Barlow Condensed', 'Oswald', sans-serif;
```

**Mono (Stats, Combine Numbers, Pick Numbers)**: JetBrains Mono or IBM Plex Mono

Stats and numbers benefit from tabular figures and a distinct visual treatment that separates them from prose.

```css
--font-mono: 'JetBrains Mono', 'IBM Plex Mono', monospace;
```

### Type Scale

Using a modular scale (1.25 ratio) anchored at 16px:

```
--text-xs:    0.75rem   / 12px   — Timestamps, fine print
--text-sm:    0.875rem  / 14px   — Metadata, labels, secondary info
--text-base:  1rem      / 16px   — Body text, descriptions
--text-lg:    1.125rem  / 18px   — Emphasized body, card titles
--text-xl:    1.25rem   / 20px   — Section headers
--text-2xl:   1.5rem    / 24px   — Page subtitles, player names on cards
--text-3xl:   1.875rem  / 30px   — Page titles
--text-4xl:   2.25rem   / 36px   — Draft round headers
--text-5xl:   3rem      / 48px   — Hero display, "On the Clock"
--text-6xl:   3.75rem   / 60px   — Splash moments, pick number reveal
```

### Font Weights

```
--font-regular:  400   — Body text
--font-medium:   500   — Labels, secondary headings
--font-semibold: 600   — Card titles, player names
--font-bold:     700   — Page headings, emphasis
--font-black:    900   — Display text, "On the Clock" (display font only)
```

### Type Rules

- Headings use `--font-primary` at `--font-bold` or `--font-black`
- Display moments (on the clock, pick announcements) use `--font-display` at `--font-black`, uppercase, tight letter-spacing (`-0.02em`)
- Stats and numbers always use `--font-mono` for alignment and clarity
- Body text line-height: 1.6. Headings line-height: 1.1–1.2
- Never use more than two font weights on a single card or component

---

## Spacing System

An 8px base unit with a 4px half-step for fine adjustments:

```
--space-0:   0
--space-0.5: 2px
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px
--space-20:  80px
--space-24:  96px
```

### Spacing Rules

- Component internal padding: `--space-4` to `--space-6`
- Gap between related items (e.g., cards in a grid): `--space-3` to `--space-4`
- Gap between sections: `--space-12` to `--space-16`
- Page margins (mobile): `--space-4`
- Page margins (desktop): `--space-8` to `--space-12`
- Maximum content width: `1280px` with generous side margins

---

## Border Radius

```
--radius-sm:   6px    — Buttons, badges, small elements
--radius-md:   10px   — Cards, inputs
--radius-lg:   16px   — Modals, large cards, panels
--radius-xl:   24px   — Feature cards, hero elements
--radius-full: 9999px — Avatars, circular buttons, pills
```

Avoid mixing radius sizes within the same visual group. If cards use `--radius-md`, all cards use `--radius-md`.

---

## Elevation and Depth

Depth is achieved through layered surfaces and subtle borders rather than heavy box-shadows. On dark backgrounds, shadows are nearly invisible — use surface color differentiation and border hints instead.

```
--shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md:  0 4px 12px rgba(0, 0, 0, 0.4);
--shadow-lg:  0 8px 24px rgba(0, 0, 0, 0.5);
--shadow-xl:  0 16px 48px rgba(0, 0, 0, 0.6);

/* Glow effect for accent elements */
--shadow-glow: 0 0 20px rgba(61, 255, 160, 0.15);
```

### Layer Hierarchy

```
Layer 0: --mb-black         (page background)
Layer 1: --mb-surface       (cards, panels, nav)
Layer 2: --mb-surface-hover (elevated cards, dropdowns, modals)
Layer 3: --mb-surface-active (popovers on top of modals — rare)
```

Each layer step up should have a `1px` top border in `--mb-border` to create a subtle "lit from above" effect.

---

## Animation and Motion

### Core Principles

- Default duration: `200ms` for micro-interactions (hovers, toggles), `350ms` for reveals and transitions, `500ms+` for dramatic moments (pick announcements)
- Default easing: `cubic-bezier(0.16, 1, 0.3, 1)` — a swift ease-out that feels responsive but smooth
- Spring physics (via Framer Motion) for drag-and-drop, card movements, and anything that should feel physical
- Every animation should be skippable/instant for power users. Respect `prefers-reduced-motion`

### Easing Tokens

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1); /* Default for most transitions */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* For symmetrical transitions */
--ease-spring: cubic-bezier(
  0.34,
  1.56,
  0.64,
  1
); /* Slight overshoot, playful */
--ease-dramatic: cubic-bezier(0.22, 1, 0.36, 1); /* Slow start, fast finish */
```

### Animation Catalog

**Hover: Card Lift**
Card moves up 2px, shadow increases, border lightens slightly. Subtle, not dramatic.

```css
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--mb-border-strong);
  transition: all 200ms var(--ease-out);
}
```

**Hover: Player Card Expand (Desktop)**
On hover, the card expands slightly in scale (1.02) and reveals a one-line scouting snippet that was hidden. Uses `overflow: hidden` and height animation.

**Pick Made: Card Stamp**
When a pick is confirmed, the player card scales up briefly (1.05), flashes the team color as a border/background pulse, then settles into its position on the draft board. Total duration: ~600ms.

```
0ms:   Card scales to 1.05, team color flash (opacity 0 → 0.3)
200ms: Card begins moving to board position
400ms: Card arrives, scales back to 1.0, team color fades
600ms: Settled. Board updated.
```

**On the Clock: Pulse**
When it's your turn, the background has a slow, subtle pulse of the team's primary color at very low opacity. The clock element has a gentle scale pulse (1.0 → 1.02 → 1.0) on a 2-second loop.

**Clock Warning: Urgency Ramp**
Under 30 seconds: pulse speed increases, `--mb-warning` color creeps into the clock.
Under 10 seconds: `--mb-danger` color, faster pulse, slight screen vignette darkening at edges.

**Draft Board: Pick Drops In**
New picks on the board animate in from above with a spring ease, landing in their slot with a slight bounce. Stagger if multiple CPU picks happen quickly (100ms stagger per pick).

**Page Transitions**
Content fades and shifts up slightly (8-12px) on page enter. Exit is instant (no exit animations — they slow navigation down).

**Big Board Drag-and-Drop**
Grabbed card lifts with increased shadow (`--shadow-lg`), slight scale (1.03), and reduced opacity on the original position. Drop target highlights with `--mb-accent-muted` background. On release, card springs into new position using spring physics (Framer Motion `layout` animation).

---

## Component Patterns

### Player Card

The most common component in the app. Three variants:

**Compact (draft board, lists)**

```
┌──────────────────────────────────────────────┐
│  12  Travis Hunter  ·  CB/WR  ·  Colorado   │
└──────────────────────────────────────────────┘
```

Single row. Pick number in `--font-mono`, bold. Player name in `--font-semibold`. Position and school in `--text-secondary`. Entire row is a hover target.

**Standard (available players panel, search results)**

```
┌─────────────────────────────────────┐
│  CB/WR                        #3   │
│  Travis Hunter                     │
│  Colorado · 6'1" · 185 lbs        │
│                                     │
│  Elite two-way playmaker...         │
└─────────────────────────────────────┘
```

Position as a colored pill/badge at top. Rank in `--font-mono` top-right. Name large (`--text-2xl`, `--font-semibold`). School and measurables in `--text-secondary`. One-line scouting snippet in `--text-tertiary`, truncated.

**Expanded (player detail view, modal)**
Full scouting report, combine data in a grid using `--font-mono`, comparison player, strengths/weaknesses. This is the editorial layout — generous spacing, type hierarchy doing the heavy lifting, stats presented as designed elements rather than a plain table.

### Draft Board

A grid that fills as picks are made. Each cell contains a compact player card with a team-color left border (3px).

```
┌─────────────────────────────────────────────┐
│  ROUND 1                                     │
├─────────────────────────────────────────────┤
│ ┃ 1  TEN  Travis Hunter  CB    Colorado    │
│ ┃ 2  CLE  Shedeur Sanders QB   Colorado    │
│ ┃ 3  NYG  Cam Ward  QB         Miami       │
│ ┃ 4  NE   ...                               │
│   5  (on the clock — pulsing)               │
│   6  (empty)                                 │
│   7  (empty)                                 │
└─────────────────────────────────────────────┘
```

The team-color left border (`┃`) is the only color on completed picks, keeping the board calm. The "on the clock" row is visually distinct — slightly elevated surface, team color glow, animated clock.

Empty rows are dimmed (`--mb-text-tertiary` for pick number and team name, no card).

### The Clock

A prominent but not obnoxious timer. Displayed in `--font-display`, `--text-5xl` on the draft page, using tabular figures for stable width.

The clock is a circle or pill shape with the time centered. The border of the clock acts as a progress indicator, depleting as time runs out (SVG stroke-dashoffset animation).

```
Normal:   White text, --mb-border ring, smooth depletion
Warning:  --mb-warning text, --mb-warning ring, faster pulse
Critical: --mb-danger text, --mb-danger ring, rapid pulse
```

### Buttons

**Primary**: `--mb-accent` background, `--mb-black` text, `--radius-sm`. Hover: slight brightness increase, `translateY(-1px)`.

**Secondary**: Transparent background, `--mb-border` border, `--mb-text-primary` text. Hover: `--mb-surface-hover` background.

**Ghost**: No background, no border, `--mb-text-secondary` text. Hover: `--mb-surface-hover` background, text brightens to `--mb-text-primary`.

**Danger**: `--mb-danger` background, white text. Used sparingly (delete draft, leave lobby).

All buttons: `--radius-sm`, `--space-3` vertical padding, `--space-5` horizontal padding, `--font-medium`, `--text-sm`. No uppercase (except display/CTA buttons which use `--font-display`).

### Input Fields

Dark inputs on dark backgrounds: `--mb-surface` background, `--mb-border` border, `--radius-md`. Focus: `--mb-accent` border with `--shadow-glow`. Placeholder text in `--mb-text-tertiary`.

### Navigation

Top nav bar at `--mb-surface` with a `1px` bottom border. Minimal items: logo (left), primary nav links (center or left-aligned), user avatar/menu (right).

Mobile: bottom tab bar with 4-5 items max (Draft, Board, History, Leaderboard, Profile).

Active nav item indicated by `--mb-accent` underline or icon fill, not background color.

---

## Layout Patterns

### Draft Page (Desktop)

```
┌────────────────────────────────────────────────────────────┐
│  Nav                                                        │
├────────────────────────────────┬───────────────────────────┤
│                                │                           │
│   Draft Board                  │   Available Players       │
│   (scrollable, grows           │   (filterable list,       │
│    as picks are made)          │    search bar at top)     │
│                                │                           │
│                                │                           │
├────────────────────────────────┤                           │
│   On the Clock                 │                           │
│   (team, clock, user)          │                           │
│                                │                           │
└────────────────────────────────┴───────────────────────────┘
```

Two-panel layout. Board + clock on the left (60%), available players on the right (40%). The "on the clock" section is sticky at the bottom of the left panel when it's your pick.

### Draft Page (Mobile)

Single column. Default view is the "on the clock" state with a compact board summary (last 3 picks, next pick). Swipe or tab to see full board or available players. The pick action (buttons or list selection) is always accessible without scrolling.

### Draft History Page

Card grid (2 columns desktop, 1 column mobile). Each card shows: date, format, teams involved, your team, a mini visual of the board (first few picks as colored dots or compact text). Tapping opens the full draft detail view.

### Player Profile Page (Editorial Layout)

```
┌────────────────────────────────────────────────────────────┐
│  Nav                                                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│    CB/WR                                                     │
│    TRAVIS HUNTER                                             │
│    Colorado · Junior · 6'1" · 185 lbs                       │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│    Scouting Report                        Combine Data      │
│    (prose, editorial style,               (grid of numbers  │
│     generous line-height)                  in mono font)    │
│                                                              │
│    Strengths & Weaknesses                                    │
│    (two-column layout,                                       │
│     minimal styling)                                         │
│                                                              │
│    Draft Projection                       Comparison         │
│    (range of picks,                       (player comp)      │
│     community consensus)                                     │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

Name in `--font-display`, `--text-6xl`, uppercase. Generous top padding. The page should feel like opening a magazine feature.

---

## Responsive Breakpoints

```
--bp-sm:  640px    — Mobile landscape, large phones
--bp-md:  768px    — Tablets
--bp-lg:  1024px   — Small laptops, tablets landscape
--bp-xl:  1280px   — Standard desktop
--bp-2xl: 1536px   — Large monitors
```

Mobile-first: base styles are mobile, progressively enhanced at larger breakpoints.

### Mobile-Specific Rules

- Touch targets minimum 44x44px
- No hover-dependent interactions (hover enhances but is never required)
- Bottom sheet modals instead of centered modals
- Swipe gestures for tab navigation on draft page
- Reduced motion by default on mobile (fewer simultaneous animations)

---

## Iconography

Use a single icon set consistently. Recommended: Lucide (open source, clean, consistent stroke weight). Fallback: Heroicons.

- Stroke width: 1.5px (matches the light, modern feel)
- Default size: 20px (nav, buttons), 16px (inline with text), 24px (feature icons)
- Color: `--mb-text-secondary` by default, `--mb-text-primary` on hover/active, `--mb-accent` for active state indicators

Custom icons only for: the MockingBoard logo, position icons (if desired), and any branded elements.

---

## Logo Usage

### Primary Mark

A stylized mockingbird silhouette in profile, angular and geometric. Minimal detail — the bird should be recognizable at 16px favicon size. The bird is perched on or integrated with a football shape.

### Lockup

Bird mark + "MockingBoard" wordmark in `--font-display`, `--font-black`, slight negative letter-spacing. The "B" in Board can be subtly emphasized (different weight or the accent color) to hint at "Board" as a distinct concept.

### Usage Rules

- The mark works in single-color (white on dark, black on light)
- Minimum clear space around the mark: the width of the football element
- Never rotate, stretch, or add effects to the mark
- On dark backgrounds: white mark, or `--mb-accent` mark for featured placements
- Favicon: bird mark only, no wordmark

---

## Accessibility

- All text meets WCAG 2.1 AA contrast ratios (4.5:1 for body text, 3:1 for large text)
- `--mb-text-primary` on `--mb-black`: 17.4:1 ratio (passes AAA)
- `--mb-text-secondary` on `--mb-black`: 6.7:1 ratio (passes AA)
- `--mb-accent` on `--mb-black`: 12.8:1 ratio (passes AAA)
- Focus states: visible `--mb-accent` outline (2px, 2px offset) on all interactive elements
- All animations respect `prefers-reduced-motion: reduce`
- Screen reader announcements for pick events, clock warnings, turn notifications
- Keyboard navigation for all draft interactions (arrow keys for player selection, Enter to confirm)

---

## Implementation Notes

### Recommended Libraries

- **Framer Motion**: Animations, layout transitions, drag-and-drop, spring physics
- **Tailwind CSS**: Utility-first styling, easy to map to the design tokens above
- **Radix UI**: Accessible unstyled primitives for modals, dropdowns, tooltips
- **Lucide React**: Icon set

### CSS Custom Properties Setup

Define all design tokens as CSS custom properties on `:root`. This makes theming (dark/light, team colors) trivial — swap the property values, everything updates.

```css
:root {
  --mb-black: #0a0a0b;
  --mb-surface: #141416;
  /* ... all tokens ... */
}

[data-theme='light'] {
  --mb-black: #ffffff;
  --mb-surface: #f5f5f7;
  /* ... light overrides ... */
}

[data-team='NE'] {
  --team-primary: #002244;
  --team-secondary: #c60c30;
}
```

### Tailwind Integration

Extend the Tailwind config with MockingBoard tokens:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        mb: {
          black: 'var(--mb-black)',
          surface: 'var(--mb-surface)',
          accent: 'var(--mb-accent)',
          // ... etc
        },
      },
      fontFamily: {
        primary: 'var(--font-primary)',
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
      },
      // ... spacing, radius, shadows mapped to tokens
    },
  },
};
```

This gives you the full power of Tailwind utilities (`bg-mb-surface`, `text-mb-accent`, `font-display`) while keeping the design system as the single source of truth.
