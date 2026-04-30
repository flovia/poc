---
name: PoC screen architecture
description: Screen list, layout policy, navigation, transition patterns, and demo story
type: project
---

# PoC screen architecture

> Last updated: 2026-04-28

## ★ Access model (reiterated)

**Fully flat** — all Provider pages are publicly visible. No authentication.

User-entered `pay_to` values are saved to **localStorage**, and can be switched or deleted quickly.

## ★ Screen list

| # | Screen | Path (proposal) | Role |
|---|---|---|---|
| 0 | **Setup / Onboarding** | `/setup` | First-time entry. Register `pay_to` |
| 1 | **My Customers** | `/providers/[providerId]/customers` | Customer wallet list for that Provider |
| 2 | **Wallet 360°** | `/providers/[providerId]/wallet/[address]` | Individual wallet detail (hero screen) |
| 3 | **Co-usage Patterns** | `/providers/[providerId]/patterns` | Aggregated view (strategy hints) |
| - | (Provider index) | `/providers` | Public directory (optional) |

## ★ Navigation structure

### Sidebar (always visible)

```
┌─────────────────┐
│  [Flovia logo]  │
├─────────────────┤
│ 📊 Customers    │
│ 🔀 Patterns     │
│ ⚙️  Setup        │
├─────────────────┤
│ Currently       │
│ viewing:        │
│ 🟢 Northwind    │
│    Price [▼]    │ ← switch from registered pay_to list
└─────────────────┘
```

### Provider selector (sidebar bottom + header)

- Choose from locally stored `pay_to` list
- Show **delete button (×)** for each selector entry
- "+ Add new pay_to" → go to Setup

## ★ Transition patterns

| Source | Action | Destination |
|---|---|---|
| Customer row on Customers | click | Wallet 360° (same Provider) |
| Co-used Provider tag on Wallet 360° | click | **My Customers for another Provider** |
| Co-usage Map node on Wallet 360° | click | **My Customers for the clicked Provider** |
| Provider mention in an Insight card | click | My Customers for that Provider |
| Provider selector | choose | reopen same screen type with selected Provider |

Even a different Provider page is opened with the same URL structure (= flat routing).

---

## ★ Screen 0: Setup / Onboarding

### First-time flow

```
┌──────────────────────────────────────────────┐
│  Welcome to Flovia                            │
│                                               │
│  Register your API's pay_to address and        │
│  visualize the wallets using x402 payments.    │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │ Provider Name (optional)             │    │
│  │ [Northwind Price API               ]  │    │
│  │                                       │    │
│  │ Mode:                                 │    │
│  │ (●) Simple — only one pay_to           │    │
│  │ ( ) Advanced — pay_to per API path     │    │
│  │                                       │    │
│  │ pay_to address                        │    │
│  │ [0x...                              ] │    │
│  │                                       │    │
│  │ [Save & Continue]                     │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

### Detailed spec

- **Simple mode**: register only one `pay_to` (one customer-level address for the entire Provider)
- **Advanced mode**: register multiple API path + `pay_to` pairs. Separate addresses per path for customers with per-endpoint routing
  ```
  API path: /v1/generate     → pay_to: 0xabc...
  API path: /v1/upload       → pay_to: 0xdef...
  [+ Add another path]
  ```
- After registration, save to localStorage and show in Provider selector in sidebar
- Clicking **Save & Continue** navigates to My Customers (`/providers/[providerId]/customers`)
- **Preparing data state**: after save, show mock "aggregating..." skeleton for 1–2 seconds before showing data (for richness)

### Post-registration setup mode

Reopening `/setup` enters manage mode:

- list of registered `pay_to`
- edit/delete button per entry
- add new Provider as separate entries

---

## ★ Screen 1: My Customers

Wallet list for the current (or selected) Provider API.

### Components

```
┌────────────────────────────────────────────────────────────────────┐
│ Northwind Price API — Customers                  [Period: 30d ▼]  │
├────────────────────────────────────────────────────────────────────┤
│ Filter: [Agent ▼] [Endpoint ▼] [Sort: Revenue ▼]                  │
├────────────────────────────────────────────────────────────────────┤
│ Wallet              Agent      Revenue    Used Endpoints           │
│                                                       Co-used with │
├────────────────────────────────────────────────────────────────────┤
│ 0x1234...abcd  🟢  Claude Code  $1,240   /v1/generate, /v1/upload │
│                                                  [Storage A][Notify B][Auth C] │
│                                                  ⭐ Loyal           │
├────────────────────────────────────────────────────────────────────┤
│ 0x5678...efgh  🟢  Cursor       $820     /v1/generate              │
│                                                  [Storage A][Data D] │
│                                                  📈 Growth Potential│
├────────────────────────────────────────────────────────────────────┤
│ ...                                                                │
└────────────────────────────────────────────────────────────────────┘
```

### Columns

- **Wallet** (masking: `0x1234...abcd`)
- **Agent** (Claude Code / Cursor / custom bot, etc.)
- **Revenue** (USD sales from this Provider)
- **Used Endpoints** (top 3)
- **Co-used with** (top 3 co-used Provider mini tags)
- **Status badge** (Loyal / Growth Potential / Cohort maturing, etc.)

### Transitions

- row click → Wallet 360°
- co-used tag click → My Customers for that Provider
- Sort by: Revenue / Co-usage score / Retention / recent activity

---

## ★ Screen 2: Wallet 360° (Demo hero)

Whole view for a single wallet. **Activity Timeline is fixed as hero** (Co-usage Map is supporting).
Details: [10_design_review.md](10_design_review.md) and D14 decision records.

### Element priority (demo script-driven)

| Priority | Element |
|---|---|
| 1 | **Identity bar** business summary (Monthly spend / 7d growth / Free tier progress / **Entry-point Badge**) |
| 2 | **Activity Timeline** (hero) + Workflow Summary Strip |
| 3 | **Upsell Opportunity Card** (within insight stack) |
| 4 | Co-usage Map (evidence reinforcement) |
| 5 | Other insight cards |

### Critical UI elements (must be in demo script)

1. **Free Tier Progress Bar** — located in identity bar. Glows above 80%
2. **7d Volume Sparkline** — beside `7d growth` to show rapid increase at a glance
3. **Upsell Opportunity Card** — includes `Recommended plan` / `Why now` / `Projected monthly expansion`
4. **Workflow Summary Strip** — one-line `Price API → LLM → DEX → Discord` above timeline
5. **Entry-point Badge** — `Your API is step 1 in 87% of observed loops`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Wallet  0x1234...abcd  🟢 Claude Code                         │
│ Total spent: $3,420   Active: 28d   First seen: 2026-03-30   │
├──────────────────────────────────────────────────────────────┤
│ ★ Activity Timeline (hero)                                    │
│ ─────────────────────────────────────────────────────────    │
│ 2026-04-27 14:23  [Northwind Price API]   /v1/price    $0.05 │
│ 2026-04-27 14:24  [Storage A]        /upload         $0.01  │
│ 2026-04-27 14:25  [Notify B]         /send           $0.002 │
│ 2026-04-27 14:50  [Northwind Price API]   /v1/price    $0.05 │
│ 2026-04-27 14:51  [Storage A]        /upload         $0.01  │
│ ...                                                          │
│ [Load more] [Filter by Provider ▼]                           │
├──────────────────────────────┬───────────────────────────────┤
│ Co-usage Map (network)      │ Insight Cards                  │
│                             │ ────────────                   │
│   [Northwind]               │ • 82% co-usage with Storage A  │
│    │  ╲                     │ • frequent chained calls w/      │
│    │   ╲                    │   Notify B                      │
│    [Storage A]──[Notify B]    │ • activity concentrates in      │
│                              │   weekdays                     │
│                              │ • recent 7d volume increasing │
└──────────────────────────────┴───────────────────────────────┘
```

### Top summary

- Masked address
- total x402 spend
- active period (`first_seen` → `last_seen`)
- agent type

### Hero: Activity Timeline

- **Place each x402 request on time order**
- each row: time / Provider / API path / amount
- highlight self Provider rows (color difference or bold)
- filters: by Provider and period
- avoid intent interpretation; just show exactly "which API calls were used, when, and in what order"

### Center-left: Co-usage Map (supporting)

- Force-directed network graph
- center = target Provider, surround = co-usage peers
- line weight = co-usage frequency
- clicking node navigates to that Provider's My Customers

### Center-right: Insight Cards

- static scripted language is fine for PoC (templates acceptable)
- fade-in animation
- e.g. "82% co-usage with Storage A", "activity concentrates during weekdays"

### Removed element

- **Sankey removed** (replaced by timeline sequence)

### Activity Timeline visual support (script requirements)

- Bundle four rows in same workflow (Price → LLM → DEX → Discord) with a **subtle vertical guide** (Workflow Grouping)
- emphasize only self rows with a Teal hairline
- this controls comprehension speed for climax **a**

---

## ★ Screen 3: Co-usage Patterns (aggregate view)

Overview board of all customer wallets to derive strategic implications.

### Components

```
┌──────────────────────────────────────────────────────────────┐
│ Co-usage Patterns — Northwind Price API                      │
├──────────────────────────────────────────────────────────────┤
│ ★ Bubble Chart                                               │
│  retention rate                                              │
│    High    ● Storage A                                       │
│      ●Storage B                                             │
│    Mid     ●Storage C    ●Random F                          │
│      │              ●Notify B                                │
│      ●Notify A                                              │
│     ●Auth B         ●Route C                                │
│      │   Storage E                                           │
│      │                                                    ●Video A│
│   Low└────────────────────────────                            │
│      Low    co-usage frequency   High                            │
│                                                              │
│  → top-right = strategically important co-usage peers (partner target) │
├──────────────────────────────────────────────────────────────┤
│ Workflow Clusters                                            │
│ • Cluster 1: Image gen → Storage → Notify  (52% of wallets)  │
│ • Cluster 2: Image gen → Auth → Storage    (28%)             │
│ • Cluster 3: Image gen → Data API          (15%)             │
├──────────────────────────────────────────────────────────────┤
│ Retention by Agent (secondary narrative)                     │
│  Claude Code  ████████████ 86%                               │
│  Cursor       ████████ 59%                                   │
│  curl         ██ 14%                                         │
└──────────────────────────────────────────────────────────────┘
```

---

## ★ Demo story (3 minutes)

1. Input `pay_to` on **Setup** (pre-registered is OK for demo)
2. Open **My Customers**
   - pick one "loyal" wallet
   - co-used Provider tags reveal "this wallet is used broadly across providers"
3. Drill into **Wallet 360°**
   - show **Activity Timeline** so order is clear: called as price → storage → notification
   - validate structure with Co-usage Map
   - reinforce with insight cards
4. View **Co-usage Patterns** as overall picture
   - bubble: "Storage A is top partner priority"
   - workflow clusters: "three workflow patterns"
   - retention: "healthy customer base"

---

## ★ Richness of presentation

| Element | Motion |
|---|---|
| screen open | count-up animation on summary numbers |
| Co-usage Map | fade-in → nodes land via force placement |
| insight cards | staggered fade-in |
| loading | skeleton screen (richness) |
| post-Setup first open | "aggregating..." for 1–2 seconds → data render |

Real-time feeds (transaction feed, live stream) are not included in PoC.

---

## ★ States (empty / loading / error)

| State | expression |
|---|---|
| loading (normal) | skeleton screen |
| preparing data (immediately after first Setup) | "aggregating..." message + progress-like indicator |
| empty (no data) | "No x402 requests yet" + link to Setup |
| error | (mock-first PoC) minimal: show only "Failed to fetch data" |
