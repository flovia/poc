---
name: Per-screen moodboard instructions
description: Visual design guidance for 4 screens (based on Codex proposal)
type: project
---

# Per-screen moodboard instructions

> Last updated: 2026-04-28
> Source: [Codex proposal](/tmp/flovia-codex-review/moodboard_per_screen.md)
> Premise: Hybrid policy from [06_design_direction.md](06_design_direction.md)

## ★ Shared theme (across all 4 screens)

> **"On the foundation of quiet precision, invisible relationships surface."**

- The UI shell stays disciplined and restrained, preserving trust
- The hero analysis screen gains depth and distinctiveness with **blue mesh traces** as subtle emphasis
- Use color and motion not for flair, but for making structure legible
- The result should be institutional calm rather than crypto hype

---

## ★ Setup / Onboarding (`/setup`)

### Purpose

Capture `pay_to` registration quickly and guide the user into the analysis experience with minimum friction.

### First impression

Within 5 seconds users should feel this is a **reliable product entry**, not a complicated setup form.

### Layout

```
+----------------------------------------------------------------------------------+
| Sidebar (264)        | Header: Provider selector / Saved pay_to shortcuts       |
|                      +-----------------------------------------------------------+
|                      |   [ Intro block ]                                         |
|                      |   Title + 1 sentence + mode toggle                        |
|                      |                                                           |
|                      |   +------------------------+  +------------------------+  |
|                      |   | Simple Mode            |  | Advanced Mode          |  |
|                      |   | pay_to input           |  | multiple fields / tags |  |
|                      |   | helper text            |  | validation rules       |  |
|                      |   +------------------------+  +------------------------+  |
|                      |                                                           |
|                      |   [ Saved pay_to list ]                                   |
|                      |   compact rows / switch / delete                          |
|                      |                                                           |
|                      |   [ Primary CTA ]                                         |
+----------------------------------------------------------------------------------+
```

### Visual hierarchy

- Hero = registration form (brightest surface, center of screen)
- Mode toggle = stronger emphasis above form, as operation trigger
- Saved list = weaker contrast, one level down
- Help text = minimal; no explanation overload, rely on ease of input for trust

### Typography

| Element | Value |
|---|---|
| Heading | 32px / 700 / Geist Sans |
| Section heading | 18px / 600 |
| Input value | 15px / 500 / Geist Mono where useful |
| Body | 14px / 400 |
| Label | 12px / 500 / slightly wider letter-spacing |
| CTA | 14px / 600 |

### Colors

- Base background: `#020617`, cards use `rgba(15,23,42,0.72)` layering
- Teal `#2DD4BF`: limited to CTA, focus ring, completed state
- Mesh blue `#60A5FA`: restricted use in mode active state and subtle separators
- 4-level grayscale (base / surface / primary text / secondary text)

### Micro-interactions

| Element | Motion |
|---|---|
| mode toggle | 180ms ease-out, pill background slides |
| input focus | 120ms, border + glow transition to Teal |
| saved-row hover | 140ms, background brightness +3% |
| CTA active | 160ms, opacity to solid |

### States

- Loading: show spinner in CTA; no skeleton form needed
- Empty: simply state "No entries yet." No illustration
- Error: short inline copy under input, no top-level red banner

### Three elements that look premium

1. Very subtle two-layer glow (Teal + Blue) behind form card
2. Mono-masked address display for saved `pay_to` rows with subtle copy affordance
3. Crossfade + height interpolation when switching mode, not instant swap

### Things to avoid

- Flashy glow buttons like web3 wallet-connect screens
- Overlong explanatory text
- Making Advanced mode look like a developer burden
- Color-only red/green status communication

---

## ★ My Customers (`/providers/[providerId]/customers`)

### Purpose

Help users quickly scan customer wallets for a Provider and select the one to drill into next.

### First impression

The screen should immediately feel organized, trustworthy, and easy to scan.

### Layout

```
+----------------------------------------------------------------------------------+
| Sidebar              | Header: Provider selector / search / filters             |
|                      +-----------------------------------------------------------+
|                      | [ Page title ]      [ summary chips ]                    |
|                      |                                                           |
|                      | +------------------------------------------------------+  |
|                      | | Toolbar: search | segment | sort | export?          |  |
|                      +------------------------------------------------------+
|                      |                                                           |
|                      | +------------------------------------------------------+  |
|                      | | Customers table                                      |  |
|                      | | Address | Activity | Last seen | Score | Status ...   |  |
|                      | |------------------------------------------------------|  |
|                      | | row                                                > |  |
|                      +------------------------------------------------------+  |
|                      |                                                           |
|                      | [ Pagination / result count ]                            |
+----------------------------------------------------------------------------------+
```

### Visual hierarchy

- Hero = table. Avoid competing KPI cards
- Toolbar = clear operation source but not the hero
- summary chips = support info that only guides initial attention
- row hover/selection indicates next click destination

### Typography

| Element | Value |
|---|---|
| Page heading | 24px / 700 |
| Summary numerals | 18px / 600 / Geist Mono |
| Table body | 14px / 400 |
| Address display | 13px / 500 / Geist Mono |
| Header label | 12px / 600 |
| Row helper text | 12px / 400 |

### Colors

- **Precision Graph first**: Mesh blue is minimal
- Teal: selected row, sort active, search focus, important status only
- Separators are thin semi-transparent lines, not high-contrast borders
- Row hover = surface +4–6%
- Risk states use minimal desaturated red

### Micro-interactions

| Element | Motion |
|---|---|
| row hover | 100ms, background shift + right arrow 4px movement |
| sort change | 120ms, caret rotation |
| search input | 140ms, focus ring |
| initial table render | 220ms, rows fade up from +8px |

### States

- Loading: table skeleton with production-like column widths
- Empty: instead of "No customers," suggest next action
- Separate "filter no hit" and "no data yet" states
- Error: inline message in table area, not full-screen block

### Three premium effects

1. On row hover, only the mono address text gets slightly brighter
2. Summary chips use subtle vertical gradient + thin inner highlight
3. 2px Teal left indicator on selected rows

### Things to avoid

- Too many KPI cards above table, losing table primacy
- Excessive badge color usage
- Too many icons per row reducing density
- Neon-heavy crypto dashboard style

---

## ★ Wallet 360° (`/providers/[providerId]/wallet/[address]`)

### Purpose

Show the complete behavior, relationships, and implications of a single wallet in the most visually compelling and persuasive format.

### First impression

Users should feel this is **not just an admin UI, but an analytical product showing structure**.

### Layout

```
+----------------------------------------------------------------------------------+
| Sidebar              | Header: Provider / wallet breadcrumb / actions           |
|                      +-----------------------------------------------------------+
|                      | [ Wallet identity bar ]                                   |
|                      | address / labels / risk? / key stats                      |
|                      |                                                           |
|                      | +----------------------------------+--------------------+ |
|                      | | Activity Timeline                | Insight stack      | |
|                      | |                                  | card 1             | |
|                      | |                                  | card 2             | |
|                      | |                                  | card 3             | |
|                      | +----------------------------------+--------------------+ |
|                      |                                                           |
|                      | +------------------------------------------------------+  |
|                      | | Co-usage Map (hero network visualization)            |  |
|                      | |                    node graph                         |  |
|                      | +------------------------------------------------------+  |
|                      |                                                           |
|                      | [ supporting detail strip / legend / filters ]           |
+----------------------------------------------------------------------------------+
```

Note: **Main actor decision is already resolved (D14)**. The demo script ([08_demo_script.md](08_demo_script.md)) requires the climax a to be only possible through Activity Timeline, so Timeline is fixed as hero. The Co-usage Map remains supportive, with strong visual presence in the lower half.

### Visual hierarchy

- Hero = Co-usage Map (in original draft; keep network footprint broad)
- Secondary = Timeline (for causal or temporal understanding)
- Insight cards = right stack, conclusion-oriented
- Identity bar = trust anchor, prioritize refinement over flair

### Typography

| Element | Value |
|---|---|
| Page / Wallet heading | 28px / 700 / **Space Grotesk optional** |
| Section heading | 18px / 600 |
| Large value / KPI | 24px / 600 / Geist Mono |
| Body | 14px / 400 |
| Label / legend | 12px / 500 |
| Address / ID | 13px / 500 / Geist Mono |

### Colors

- Background: `#0A0F1E`, deeper than general shell
- Co-usage Map primary light source = **Mesh blue `#60A5FA`**
- Teal only on selected nodes, important insight, and interaction affordances
- Glass surfaces: `rgba(10,15,30,0.58)` with thin white highlight borders
- Keep grayscale dark; avoid excessive white

### Micro-interactions

| Element | Motion |
|---|---|
| map node entrance | 280ms stagger, opacity + scale 0.96→1 |
| node hover | 120ms, outer glow + edge emphasis |
| timeline scrub/hover | 100ms, vertical guide follows cursor |
| insight card update | 180ms, content crossfade |
| screen load | very subtle mesh sway in hero background over 8–10s |

### States

- Loading: maintain structural composition in skeleton
- If map data is pending, show faint grid + placeholder nodes to avoid blank space
- Empty: not "no relationship" but **"No co-usage signal detected sufficiently"**
- Error: show cause and retry in visualization area while keeping other sections

### Three premium effects

1. Very faint volumetric haze behind Co-usage Map in blue
2. Selecting a node highlights corresponding interval on Timeline
3. One-line machine-summary-style sharp phrase at top of Insight cards

### Things to avoid

- Cyberpunk neon overload
- Too many nodes/edges causing meaningless complexity
- Long text blocks in insights
- One-color blue glow that erases hierarchy

---

## ★ Co-usage Patterns (`/providers/[providerId]/patterns`)

### Purpose

At portfolio level, provide an overview and reproducible pattern for common behavior across wallets.

### First impression

Users should immediately feel a structure they can see and act on.

### Layout

```
+----------------------------------------------------------------------------------+
| Sidebar              | Header: Provider / timeframe / filters                   |
|                      +-----------------------------------------------------------+
|                      | [ Title + compact explanation ]                           |
|                      |                                                           |
|                      | +-------------------------------+----------------------+  |
|                      | | Bubble Chart                  | Retention by Agent   |  |
|                      | | dominant visual               | compact comparison   |  |
|                      | +-------------------------------+----------------------+  |
|                      |                                                           |
|                      | +------------------------------------------------------+  |
|                      | | Workflow Clusters                                      | |
|                      | | cluster lanes / cards / step groupings                 | |
|                      | +------------------------------------------------------+  |
|                      |                                                           |
|                      | [ legend / notes / drilldown controls ]                  |
+----------------------------------------------------------------------------------+
```

### Visual hierarchy

- Hero = Bubble Chart (immediate global understanding)
- Secondary = Workflow Clusters (structural interpretation)
- Retention by Agent = concise comparative indicator in upper-right
- Legend = minimal, non-intrusive

### Typography

| Element | Value |
|---|---|
| Page heading | 24px / 700 |
| Visualization note | 12px / 400 |
| Metric number | 20px / 600 / Geist Mono |
| Cluster name | 16px / 600 |
| Body | 14px / 400 |
| Axis / legend | 11–12px / 500 |

### Colors

- Bubble Chart stays neutral; key clusters use limited Teal / Mesh blue core
- Primary series = Teal, relationship series / density = Mesh blue, others = desaturated slate/cyan
- Workflow Clusters card surfaces = shell dark, Teal emphasis lines
- Retention = low-saturation gradient instead of flat fills

### Micro-interactions

| Element | Motion |
|---|---|
| bubble initial placement | 300ms, positional interpolation + soft scale-in |
| bubble hover | 100ms, outline emphasis + tooltip fade |
| cluster selection | 160ms, dim everything else to 35% |
| retention bars | 220ms, grow from bottom |
| workflow lane expand/collapse | 180ms, height interpolation |

### States

- Loading: show skeleton of visualization first (axes / frame / placeholder circles)
- Empty: clarify whether timeframe is too strict or data is sparse
- Error: keep recoverable per visualization unit, no full-screen stop
- Keep legend and filters so users can continue next actions

### Three premium effects

1. Thin additive glow in bubble overlaps (density impression)
2. Selecting cluster highlights linked Workflow Clusters below
3. Add subtle outer line only to focused retention series

### Things to avoid

- Divergent visual languages across charts
- Over-coloring into "analytics toy"
- Illegible legends/axes from too-small text
- Dense information in overview view that hurts readability

---

## ★ Remaining decisions

| Item | Decision timing |
|---|---|
| ~~Wallet 360° hero fixed as Timeline vs Co-usage Map~~ | ✅ fixed as Timeline in D14 |
| Introducing Space Grotesk to Wallet 360° | during implementation |
| Animation budget tuning (richness vs noise) | tune after prototype by feel |
