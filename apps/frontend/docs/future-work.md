# Future work — deferred features and known gaps

This document tracks features that were intentionally deferred during PoC
development. Each entry records **what** is missing, **why** it was deferred,
and **what needs to change** when we pick it up. New entries should follow the
same structure so the rationale stays discoverable.

For shipped features see [current-capabilities.md](current-capabilities.md).
For the original vision (which exceeds PoC scope) see [vision/](vision/).

---

## Period filter

Allow users to scope dashboard data to a time window such as the last 7 / 30 /
90 days, or a custom range. The original vision sketches a `[Period: 30d ▼]`
control inside each page header (see [vision/01_screens.md](vision/01_screens.md)).

### Status

Not implemented. A non-functional `All time` badge previously sat in the global
TopBar; it was removed because (a) it implied a button users could click,
(b) it appeared on the Setup page where it has no meaning, and (c) putting a
period filter in a global TopBar is not the right UX (see "Where it should
live" below).

The placeholder removal is recorded inline in
[`components/shell/TopBar.tsx`](../components/shell/TopBar.tsx).

### Why deferred

1. **BFF API is cumulative-only.** Today the projection endpoints
   (`projection-builder.ts`) aggregate `observationCount` / `spendAtomic` /
   `firstSeenAt` / `lastSeenAt` over all observations and return a single
   summary. There is no `?periodDays=` parameter. Implementing period filters
   requires adding query parameters and re-aggregating per request.
2. **Some metrics are not period-aware by design.** `activityGrowth` is marked
   `provenanceByField: "future_sdk_field"` and is currently a placeholder
   (`0.12 + index * 0.04`). A real period filter forces us to define what
   "growth in the last 30 days" actually means and where the comparison window
   starts.
3. **Three-layer change.** A correct implementation touches BFF
   (`apps/bff/src`), the contract package (`packages/contracts`), and the
   frontend data fetch + UI. That is too large for a single PoC iteration that
   was focused on layout and naming polish.
4. **Underlying data does support it.** Each `payment_observation` record
   carries `blockTimestamp`, so the constraint is purely the API surface and
   the UI design — not data availability. We can revisit this at any time.

### Where it should live (when implemented)

**Per page, inside the page's own toolbar / header — not in the global TopBar.**

Reasons:

- The Setup page has no time-series data; a global control is meaningless
  there.
- Customers / Patterns / Wallet detail may want different periods at the same
  time (e.g. browse Customers at 30d while Patterns shows 90d retention).
- Industry-standard analytics dashboards (Stripe, Linear, Vercel, Mixpanel)
  place period selectors next to the other page-level filters, not in a global
  chrome.
- The original vision already places `[Period: 30d ▼]` inside each page
  header, not in a shared TopBar.

Concrete placement when implemented:

| Page | Placement |
| --- | --- |
| Setup | none (no data) |
| Customers | inside [`components/customers/Toolbar.tsx`](../components/customers/Toolbar.tsx), next to existing `Sort` / `Upsell` selects |
| Patterns | inside the screen header in [`components/patterns/PatternsScreen.tsx`](../components/patterns/PatternsScreen.tsx) |
| Wallet detail | near the `IdentityBar` / `ActivityTimeline` headers |

### What needs to change to ship it

1. **Contract** (`packages/contracts`)
   - Add `periodDays?: number` (or a `from` / `to` pair) to the relevant
     request DTOs.
   - Decide a canonical default (`null` = all time) and document it.
2. **BFF** (`apps/bff/src/data/projection-builder.ts` and friends)
   - Filter `JoinedProjectionRecord` by `record.timestamp >= cutoff` before
     aggregation.
   - Decide how `firstSeenAt` should behave inside a window (clip to the
     window, or keep the true historical first-seen — they answer different
     questions).
   - Replace the placeholder `activityGrowth` with a real comparison between
     the selected window and the preceding window of the same length, or
     remove the field from the response when no window is selected.
3. **Frontend**
   - Encode the selected period in the URL (e.g. `?period=30d`) so it survives
     reload, sharing, and Server Component data fetches.
   - Add the `<select>` to each page-level toolbar listed above.
   - Update the freshness label `updatedLabel` semantics: today it shows the
     last observation across all data; with a period filter we may want to
     show the window boundary instead.
4. **Tests / fixtures**
   - Extend BFF fixtures so at least one observation falls outside common
     windows (e.g. >90 days old) to exercise the filter.
   - Snapshot the projection output for `periodDays=30` and `null`.

### Open questions

- Should the period selector be persisted per-provider, per-user, or per-tab?
- Do we expose absolute date ranges, or only relative presets, for the PoC
  follow-up?
- How does the period filter interact with the SDK-connected dashboard mode,
  which has its own fixed-window narrative?

---

## Data freshness indicator

Surface the freshness of the underlying data (e.g. "last observation 19h ago",
"latest event today", or a stale-data warning when the BFF stops ingesting).

### Status

Not implemented. A `Updated 19h ago` label previously sat in the global
TopBar, computed from `summary.observations[].blockTimestamp` via
`pickLatestObservationUnixSec`. It was removed because:

- The label was display-only — there was no warning state, no tooltip with
  the absolute timestamp, and no UX consequence when data was stale.
- It appeared on the Setup page where there is no underlying data to be
  fresh or stale about.
- A bare relative-age string is more confusing than helpful when the user
  cannot scope what time window the dashboard covers (see
  [Period filter](#period-filter) above — these two features should be
  designed together).

The BFF-side helpers (`pickLatestObservationUnixSec` in `lib/api/client.ts`,
`getSummary` dispatch in `lib/data-source.ts`) are intentionally kept so we can
reuse them when we redesign the indicator.

### Why deferred

1. **Single concept, multiple meanings.** "Freshness" can mean "when the most
   recent observation arrived", "when the BFF projection was rebuilt", or "as
   of which point in time the displayed period is anchored". Without a period
   filter to pin the user's frame of reference, picking one definition is
   premature.
2. **No actionable threshold.** A freshness indicator becomes valuable when
   crossing a threshold changes user behavior (e.g. red badge if >24h old).
   Today's PoC has no such thresholds and no incident path tied to stale data.
3. **Cheap to reintroduce later.** The data and helpers already exist
   (`blockTimestamp` per observation, `pickLatestObservationUnixSec`,
   `getSummary`). Re-adding the UI is a small change once the surrounding
   design is decided.

### Where it should live (when implemented)

Same principle as Period filter: **not in the global TopBar.** Place it next
to whichever data view it qualifies, ideally adjacent to the period selector
so the user reads "30 days · updated 2h ago" as a single phrase.

If a single global "system status" indicator is desired (e.g. for BFF outage
visibility), that is a different feature and should be styled as such — a
status dot or banner, not a relative-time string.

### What needs to change to ship it

1. **Decide the canonical meaning.** Most-recent-observation vs.
   projection-build-time vs. period-window-end. Document the choice in
   `current-capabilities.md` once made.
2. **Add a stale threshold.** e.g. warn when older than 24h, error when older
   than 7d. Tie the threshold to the active period selector if applicable.
3. **Tooltip with the absolute timestamp.** Always show the source UTC time
   on hover — relative ages alone become ambiguous near boundaries.
4. **Pair with period filter.** Render the two side-by-side (`30 days · as of
   2026-04-30 14:23 UTC`).
5. **Restore wiring.** Reintroduce `updatedAtUnixSec` / `renderedAtUnixSec`
   on `TopBarPageContext` (or a new per-page context), and wire to whichever
   component owns the period-aware data view.

### Open questions

- Should we expose freshness on a per-data-source basis (Customers, Patterns,
  Wallet) or as a single page-level value?
- For SDK-connected mode (mock data), what does "freshness" mean? A separate
  "demo data" badge may be more honest than a relative time.

---

## Global header actions (search / filters)

The TopBar previously rendered two icon-only buttons — a magnifier ("Search")
and a funnel ("Filters") — as a header-level affordance for cross-page lookup
and filtering.

### Status

Not implemented. Both buttons had no `onClick` handler and no behavior; they
existed only as visual placeholders carried over from the original UI mock in
[vision/01_screens.md](vision/01_screens.md). They were removed because:

- The buttons looked clickable but did nothing, which is a bigger UX cost than
  their decorative value.
- Page-level equivalents already exist where they actually make sense:
  - [`components/customers/Toolbar.tsx`](../components/customers/Toolbar.tsx)
    has a wallet-address search input and `Sort` / `Upsell` selects.
  - The Patterns bubble chart has its own hover-driven filtering.
- A shared CSS class `.topbar .icon-btn` was the only consumer of these
  buttons; it was deleted alongside the buttons.

### Why deferred

1. **Unclear scope.** A "global search" in Flovia could mean wallet-address
   lookup, provider lookup, API-path lookup, or a free-text combination. We
   have not chosen a target shape and the underlying BFF contracts are not
   designed for full-text search.
2. **Page-level filtering is sufficient today.** Customers and Patterns each
   have their own narrow filter surfaces. Adding a global filter without a
   clear pan-page concern (other than period, which is its own deferred item)
   would create two filter layers competing for the same job.
3. **Re-introducing icon buttons is cheap.** The minimal cost of restoring a
   `<button className="icon-btn">…</button>` plus the few CSS lines makes
   this a reversible decision.

### Where it should live (when implemented)

**Search**

- For wallet/provider lookup that spans pages (e.g. "jump to this address from
  anywhere"), a TopBar-level command palette (`Cmd+K` style) is appropriate.
- For per-resource filtering (filter customers, filter timeline events), keep
  it in the page Toolbar.

**Filters**

- There is no obvious global filter today. If one emerges (e.g. "hide
  fixture/demo data" toggle), it should be a labeled control, not an icon
  button — icons without labels invite the "what does this do?" problem we
  just removed.

### What needs to change to ship it

1. **Decide the search target** (wallet / provider / api-path / all) and
   confirm BFF support. May require new endpoints or indexes.
2. **Pick a UI shape**: command palette, search-input-in-header, or
   modal — each has different keyboard shortcut and accessibility
   implications.
3. **Reinstate `.topbar .icon-btn` (or a richer button class)** in
   `globals.css`, or use a labeled chip/button instead.

### Open questions

- Is a `Cmd+K` command palette in scope for the next milestone, or should
  search stay page-local?
- If we add a "demo data" toggle, does that belong in the TopBar or in the
  Setup page where demo opt-in already lives?

---

## User avatar / account menu

The TopBar previously rendered a small blue square in the top right with the
letter "F" inside, mimicking the user-avatar slot that Stripe / Linear /
Vercel / GitHub all place there. Clicking such an avatar would normally open
an account menu (settings, sign out, switch workspace, etc.).

### Status

Not implemented. The "F" was rendered as a non-interactive `<div>` with no
click handler, no menu, and no keyboard affordance. It was removed because:

- Flovia is currently a localStorage-only PoC. There is no login, no user
  identity, and no notion of "workspaces", so an avatar has nothing to
  represent.
- The sidebar already shows the Flovia wordmark and logo, so the "F" was
  also a visual duplicate of that brand.
- Leaving an avatar-shaped affordance in the corner suggests the app has
  user accounts when it doesn't, which is misleading.

### Why deferred

1. **No identity layer to surface yet.** An avatar is meaningful when it
   resolves to a person or workspace; introducing one before that feature
   exists is decorative cargo from the original UI mock.
2. **Account menus carry real interaction cost.** Sign out, account
   settings, theme switch, "what's new", workspace switch — none of these
   exist in the PoC, so the menu would be a list of disabled rows.
3. **Cheap to add later.** When we do introduce login or multi-workspace
   support, restoring an avatar in the same slot is a small change.

### Where it should live (when implemented)

Same slot, top-right of the TopBar, but as a proper `<button>` (or radix
DropdownMenu trigger) with:

- An accessible name (`aria-label="Account menu"`).
- A keyboard shortcut hint if the menu is reachable that way.
- Real menu items rendered via a popover, not just a hover tooltip.

If multiple workspaces become a thing, consider splitting workspace switch
out of the avatar menu and into a dedicated control near the breadcrumbs —
mixing identity and workspace into a single corner is a common source of
"where do I click?" confusion.

### What needs to change to ship it

1. **Identity model.** Decide how a user is represented (server-side
   account? wallet-based identity? both?). Until that exists the avatar
   has no source of truth.
2. **Menu surface.** Pick a popover/menu primitive (custom CSS, Radix,
   Headless UI) consistent with the rest of the app.
3. **Menu contents.** Define the items per environment — at minimum sign
   out, account settings, "switch dashboard mode" if we keep it as a user
   preference rather than a top-bar toggle, and a theme/feedback link if
   we add either.

### Open questions

- Should the avatar fall back to wallet-derived identicons (when wallet
  identity ships) or always to initials?
- Does the existing `DashboardModeToggle` move into this menu when both
  exist, or do we keep it surfaced for one-click switching?

---

## Style guide alignment (typography / spacing / shadows)

The Flovia style guide defines a "Professional Editorial Analytics" look:
serif headlines, sans-serif body, mono for metrics, an 8pt spacing grid,
explicit border-radius scale (4 / 8 / 12 / 16 / 24), and a three-tier
shadow ladder (Sm / Md / Lg). The CSS color tokens were aligned in
`globals.css` already (Muted Blue / Teal / Muted Purple / Warm Off-White /
Sand Beige / Graphite). The remaining gaps are below.

### Status

Partial. Color tokens match the guide; typography, spacing, shadows,
and a handful of inline color literals do not.

### Why deferred

1. **Headline serif requires a font addition.** The guide's H1 sample
   ("Insights that drive decisions") is set in a serif typeface, while
   the app currently uses Geist + Space Grotesk for everything. Adding
   a new font means deciding the family (Source Serif 4 / Crimson Pro /
   Playfair Display / etc.), wiring it through `app/layout.tsx`,
   weighing LCP and Web Vitals impact, and reviewing every existing H1
   for letter-spacing and weight. That is a UI direction change, not a
   token swap.
2. **Spacing and radius scale need a sweep.** Components author spacing
   inline (`padding: "8px 14px"`, `borderRadius: 10`, etc.) rather than
   reading from CSS variables. Aligning to the 8pt grid would touch
   most components and is best done with shared utility tokens
   introduced first.
3. **Shadow tokens are missing.** Today `globals.css` exposes only
   `--shadow-1: none` and `--shadow-2`. The guide has Sm / Md / Lg
   tiers; once defined, several inline `boxShadow: "none"` /
   `var(--shadow-1)` call sites become candidates for re-evaluation.
4. **Inline hex literals bypass the tokens.** Colors that should follow
   the new palette still appear hard-coded. They survived the token
   swap intentionally because picking the right replacement requires
   judgement (e.g. SVG gradient stops are not a 1:1 mapping). Known
   offenders, as of this writing:
   - [`globals.css`](../app/globals.css) `.btn.primary` and its hover
     state use `#1D4ED8` / `#1E40AF` instead of `var(--mesh-blue)` and
     a darker derivative
   - [`components/ui/FreeTierBar.tsx`](../components/ui/FreeTierBar.tsx)
     uses `#1D4ED8` / `#B45309`
   - [`components/wallet/ActivityTimeline.tsx`](../components/wallet/ActivityTimeline.tsx)
     `TYPE_BADGE` map uses `#2563EB` / `#0D9488` / `#1D4ED8` plus matching
     rgba backgrounds
   - [`components/wallet/NetworkStarChart.tsx`](../components/wallet/NetworkStarChart.tsx)
     fills the central node with `#0D9488` and peripheral nodes with
     `#1D4ED8`
   - [`components/patterns/BubbleChart.tsx`](../components/patterns/BubbleChart.tsx)
     gradient stops use `#93C5FD` / `#1E3A8A` / `#5EEAD4` / `#0F766E` /
     `#94A3B8` / `#334155`
   - [`components/setup/SetupForm.tsx`](../components/setup/SetupForm.tsx)
     mode-toggle background uses `#1D4ED8`

### What needs to change to ship it

1. **Decide the headline serif** and add it via `next/font`. Update
   `--display` to point at the new family and review H1 / H2 weights
   and letter-spacing.
2. **Introduce spacing and radius tokens** (`--space-1` … `--space-12`,
   `--radius-sm/md/lg/xl`) and migrate the most visited surfaces
   (CustomersTable, IdentityBar, KPI cards) first.
3. **Define `--shadow-sm/md/lg`** matching the guide's Sm/Md/Lg samples
   and apply to cards / popovers consistently.
4. **Sweep inline hex literals** so colors flow exclusively through CSS
   variables. SVG gradients may need new dedicated tokens
   (`--bubble-blue-from`, `--bubble-blue-to`, etc.) since they aren't a
   single-color value.
5. **Document the chosen mapping** in `docs/current-capabilities.md` so
   the next reader knows which tokens to use where.

### Open questions

- Does the editorial serif appear only on H1, or do we extend it to
  card titles and KPI labels too?
- Do we keep separate "soft" and "dim" rgba derivatives per accent
  color, or replace them with `color-mix()` at use sites once browser
  support is acceptable?
