# BistroPro RMS — DESIGN.md

**Status:** Design tokens extracted and reconciled from 6 Stitch-generated
screens (Menu Management, Admin Dashboard, Order Management, Reservations,
Floor Plan, Table Management — all under Stitch's "Heritage Theme").
Ready to translate into Mantine's `createTheme()`.

**Note for anyone (or any AI tool) picking this up:** This file is the
single source of truth for visual design tokens, the same way PLAN.md is
for architecture. If a color, font size, or spacing value is needed
anywhere in the frontend, it should come from here — not be eyeballed
fresh from a screenshot or re-invented per component. Where Stitch's own
generations disagreed with each other across screens, the resolution and
reasoning are recorded in Section 8, not just the final value — same
philosophy as PLAN.md's Decisions Log.

---

## 1. Overview

Stitch generated 6 admin-console screens independently, each with its own
embedded Tailwind config. Because each generation is a separate AI call,
small inconsistencies crept in between screens (see Section 8) — this file
reconciles them into one canonical set of tokens, so every future screen
(and the Mantine theme built from it) is internally consistent, rather
than each new component picking up whichever screen's values happen to be
closest at hand.

**Overall aesthetic:** A warm, upscale "Heritage" restaurant tone — cream
backgrounds, deep brick-red brand color, serif headlines paired with sans
body text, and mostly-square corners (max border radius is 12px) rather
than the heavily-rounded look typical of generic SaaS admin panels. This
is a deliberate, consistent choice across all 6 screens, not an accident.

---

## 2. Color System

### 2.1 Brand / Primary

| Token | Value | Notes |
|---|---|---|
| `primary` | **`#b81c30`** | Confirmed canonical (see Section 8 — this drifted across Stitch generations; resolved to the Order Management screen's value) |
| `primary-container` | `#b71b2f` | Identical across all 6 screens — a very close, slightly darker red used for containers/badges |
| `on-primary` | `#ffffff` | Text/icons on primary backgrounds |
| `on-primary-container` | `#ffcbc9` | |
| `surface-tint` | `#b81c30` | Matches canonical primary |
| `inverse-primary` | `#ffb3b1` | |
| `primary-fixed` | `#ffdad8` | |
| `primary-fixed-dim` | `#ffb3b1` | |
| `on-primary-fixed` | `#410008` | |
| `on-primary-fixed-variant` | `#92001e` | |

### 2.2 Surfaces & Background

| Token | Value | Used for |
|---|---|---|
| `background` | `#fff8f4` | Page background (warm cream, not white) |
| `surface` | `#fff8f4` | Same as background |
| `surface-bright` | `#fff8f4` | |
| `surface-dim` | `#e0d9d3` | Sidebar background (warm gray-tan) |
| `surface-container-lowest` | `#ffffff` | Cards, tables — pure white, the brightest surface |
| `surface-container-low` | `#faf2ec` | Table headers, subtle section backgrounds |
| `surface-container` | `#f5ece6` | |
| `surface-container-high` | `#efe7e1` | |
| `surface-container-highest` | `#e9e1db` | |
| `surface-variant` | `#e9e1db` | |
| `on-surface` | `#1e1b18` | Primary text color (near-black, warm) |
| `on-surface-variant` | `#5a403f` | Secondary/muted text (warm dark red-brown, not gray) |
| `on-background` | `#1e1b18` | |
| `inverse-surface` | `#33302c` | Used for "Occupied" table state on the floor plan |
| `inverse-on-surface` | `#f7efe9` | |

### 2.3 Secondary & Tertiary (used sparingly — avatars, accents)

| Token | Value |
|---|---|
| `secondary` | `#625e55` |
| `secondary-container` | `#e6dfd3` |
| `on-secondary` | `#ffffff` |
| `on-secondary-container` | `#676259` |
| `secondary-fixed` | `#e9e2d6` |
| `secondary-fixed-dim` | `#ccc6ba` |
| `tertiary` | `#004d5b` |
| `tertiary-container` | `#006778` |
| `on-tertiary` | `#ffffff` |
| `on-tertiary-container` | `#97e3f6` |
| `tertiary-fixed` | `#a9edff` |
| `tertiary-fixed-dim` | `#86d2e5` |

### 2.4 Outline & Structural

| Token | Value | Used for |
|---|---|---|
| `outline` | `#8e706f` | Icon/border accents |
| `outline-variant` | `#e3bebc` | Card borders, dividers, grid lines — the workhorse border color |

### 2.5 Error

| Token | Value |
|---|---|
| `error` | `#ba1a1a` |
| `error-container` | `#ffdad6` |
| `on-error` | `#ffffff` |
| `on-error-container` | `#93000a` |

### 2.6 Semantic Status Colors (deliberately separate from the brand palette)

Reservation, order, and table statuses are **not** rendered using the
Material-derived brand tokens above — every screen consistently uses raw
Tailwind palette colors instead. This is worth preserving as-is, not
"fixing" into brand tokens, since it's consistent across all 6 screens and
gives status meaning independent color identity from the brand:

| Status | Background | Text | Used on |
|---|---|---|---|
| Confirmed / Occupied | `blue-100` | `blue-800` | Reservations, Table Management |
| Checked-in / Available | `green-100` | `green-800` | Reservations, Table Management |
| No-show / Dirty | `error-container` (`#ffdad6`) | `on-error-container` / `error` | Reservations, Table Management |
| Reserved | `amber-100` | `amber-800` | Table Management |
| Live status dots (pulsing) | `green-500` (Available), `blue-500` (Occupied), `amber-500` (Reserved) | — | Table Management summary bar |

**Recommendation:** in the Mantine theme, register these four as their
own named colors (`available`/`occupied`/`reserved`/`attention` or
similar) rather than trying to force them into Mantine's default
`green`/`blue`/`yellow`/`red` shade scale — that keeps them referenceable
by semantic name in components (`color="reserved"`) instead of by raw hue.

---

## 3. Typography

| Token | Font | Size / Line-height | Weight | Letter-spacing |
|---|---|---|---|---|
| `headline-xl` | Source Serif 4 | 48px / 56px | 700 | -0.02em |
| `headline-xl-mobile` | Source Serif 4 | 32px / 40px | 700 | -0.01em |
| `headline-lg` | Source Serif 4 | 32px / 40px | 600 | — |
| `headline-md` | Source Serif 4 | 24px / 32px | 600 | — |
| `body-lg` | Source Sans 3 | 18px / 28px | 400 | — |
| `body-md` | Source Sans 3 | 16px / 24px | 400 | — |
| `label-md` | Source Sans 3 | 14px / 20px | 600 | 0.05em |
| `caption` | Source Sans 3 | 12px / 16px | 400 | — |

**Font families:**
- **Headlines** (`h1`–`h4`, page titles, card titles): `Source Serif 4` —
  this is what gives the "upscale restaurant" feel rather than a generic
  admin-panel look. Don't substitute a sans-serif here even for small
  headline sizes.
- **Body & labels**: `Source Sans 3`.
- **Icons**: Material Symbols Outlined throughout (not a different icon
  set per screen).

**Resolution note:** the Menu Management screen used a simpler token set
(`h1`/`h2`/`body-lg`/`body-md`/`label-sm`) while the other 5 screens used
the fuller scheme above. The fuller scheme is canonical since 5 of 6
screens agree on it, and it maps cleanly: Menu's `h1` ≈ `headline-xl-mobile`,
`h2` ≈ `headline-md`, `label-sm` ≈ a smaller variant of `label-md`.

---

## 4. Spacing & Radius

| Token | Value |
|---|---|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 40px |
| `sidebar-width` | 280px |
| `max-content-width` | 1200px |

Two screens (Floor Plan, Table Management) introduced extra local aliases
(`margin`, `gutter`) that just duplicate values already in the scale above
(e.g. `margin: 24px` = `lg`) — these aren't carried into the canonical
scale; use the named `xs`–`xl` tokens directly instead.

**Border radius** (deliberately restrained — part of the "architectural,"
not "bubbly," aesthetic):

| Token | Value |
|---|---|
| `DEFAULT` | 2px (0.125rem) |
| `lg` | 4px (0.25rem) |
| `xl` | 8px (0.5rem) |
| `full` | 12px (0.75rem) — note: NOT a true pill/circle radius despite the name; even "full" stays sharp |

---

## 5. Component Patterns Observed

These aren't tokens, but structural conventions repeated across all 6
screens — worth matching when building the real Mantine components so the
rebuilt UI reads as one coherent system, not 6 separately-styled screens:

- **Sidebar:** fixed 280px width, `surface-dim` background, active nav
  item gets a solid `primary` background pill.
- **Top bar:** sticky, `surface` background, search input on the left,
  notification/help icons + user avatar+name+role on the right.
- **Stat/KPI cards:** `surface-container-lowest` background, `outline-variant`
  border, big `headline-xl` number, small uppercase `label-md` caption
  above it.
- **Data tables:** `surface-container-low` header row, `outline-variant`
  row dividers, hover state on rows, status shown as a small pill badge
  (see Section 2.6), row actions right-aligned.
- **Status badges:** small rounded pill, uppercase, bold, 10–11px text,
  colored per Section 2.6 — consistent shape/sizing across Reservations
  and Table Management.
- **Detail drawer** (Reservations): slides in from the right, 420px wide,
  `surface-bright` background, header/footer pinned, scrollable middle.
- **Kanban columns** (Orders): fixed-width columns (~320–360px),
  status dot + count badge in the column header, cards with a colored
  top progress bar for in-progress items.
- **Floor plan canvas:** grid-snapped drag targets, three-state table
  coloring (Available = `primary` filled, Occupied = `inverse-surface`
  filled, Reserved = `surface-container-low` with dashed border).

---

## 6. Decisions Log

- **Primary color resolved to `#b81c30`** — Stitch generated three
  different values for `primary` across the 6 independent screen
  generations (`#91001d` on 3 screens, `#b71b2f` on 2 screens, `#b81c30`
  on 1 screen). Confirmed canonical: `#b81c30` (the Order Management
  screen's value). `primary-container` (`#b71b2f`) was identical across
  all 6 and required no resolution.
- **Typography scheme resolved to the fuller 8-token set** — 5 of 6
  screens agreed on `headline-xl/lg/md` + `body-lg/md` + `label-md` +
  `caption`; the Menu Management screen's simpler `h1/h2` naming was
  mapped onto the fuller scheme rather than kept as a second system.
- **Status colors kept as raw Tailwind palette values, not brand tokens**
  — deliberately preserved as-is since all 6 screens agree, and it keeps
  status semantics visually distinct from brand identity.
- **Redundant per-screen spacing aliases (`margin`, `gutter`) dropped** —
  they duplicated existing `xs`–`xl` values; the canonical scale uses only
  the named tokens.