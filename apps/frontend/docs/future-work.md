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

## Restore `activityGrowth` on the Customers list

The Customers page used to show an `Activity growth` column powered by
`CustomerListItemDto.activityGrowth`. The column was removed because the
underlying value carried no real signal in the current BFF read model — see
the entry in [current-capabilities.md](current-capabilities.md) for the
present column set — and we want it back once the value is meaningful.

### Status

Removed from the table. The DTO field is **kept** so Wallet 360°
(`metrics.activityGrowth` in `IdentityBar` / `Insights`) and the BFF contract
remain unchanged.

Removed pieces:

- column header and cell in
  [`components/customers/CustomersTable.tsx`](../components/customers/CustomersTable.tsx)
- `activityGrowth` entry in `SORT_OPTIONS` in
  [`components/customers/Toolbar.tsx`](../components/customers/Toolbar.tsx)
- `activityGrowth` entry in `CustomerSortKey` and the matching comparator in
  [`lib/customers/filter.ts`](../lib/customers/filter.ts)
- the corresponding sort test case in
  [`lib/customers/filter.test.ts`](../lib/customers/filter.test.ts)
- the related grid column in
  [`app/globals.css`](../app/globals.css) (`.cust-row` and `.cust-row-sdk`)

### Why deferred

1. **The value is a placeholder.** The active analytics generator
   ([`apps/cli/scripts/analytics/read-models.ts`](../../../apps/cli/scripts/analytics/read-models.ts))
   hard-codes `activityGrowth: 0` for every payer wallet, and the legacy
   `projection-builder.ts` produced an index-derived synthetic value
   (`0.12 + index * 0.04`). Neither carries the "first-half / second-half
   ratio" semantic documented in
   [current-capabilities.md](current-capabilities.md).
2. **Provenance was not declared.** The `provenanceByField` emitted by the
   analytics generator omits `activityGrowth`, so the UI always fell back to
   the object-level `derived_insight`. With every row showing the same
   "hypothesis" badge, the column added noise rather than signal.
3. **The metric needs a period window to mean anything.** "Growth" without a
   reference window is not a defined quantity. Reintroducing it depends on
   the [Period filter](#period-filter) work above.
4. **Wallet 360° is the right home for now.** The original vision uses
   `7d +184%` as a hero number on the wallet detail screen, not as a list
   column (see
   [`docs/vision-vs-bff-gap.md`](vision-vs-bff-gap.md)). Wallet 360° still
   reads `metrics.activityGrowth`, so the field is exercised end-to-end.

### What needs to change to ship it

1. **Define the comparison window.** Either piggy-back on the Period filter
   (compare the selected window to the preceding window of the same length)
   or pin a fixed 7d / 30d window for this column specifically and label the
   header accordingly.
2. **Compute the value.** Replace the placeholder in
   `apps/cli/scripts/analytics/read-models.ts` with a real aggregation over
   `payment_observation.blockTimestamp`. Decide how to handle wallets with
   only one half of the window populated (treat as `null`? clamp?).
3. **Declare provenance.** Add
   `provenanceByField.activityGrowth: "future_sdk_field"` (or
   `"derived_insight"` once the value is real) so any future provenance
   badge resolves correctly instead of falling back to the object-level
   value.
4. **Re-add the column.** Restore the table cell, the sort option, the
   `CustomerSortKey` entry, and the grid column. Pair it with the
   provenance badge once that is reintroduced (see
   "Surface column-level provenance badges across all customer fields"
   below) so the data origin is visible.
5. **Tests.** Restore the `sorts by activity growth desc` case in
   `filter.test.ts` and snapshot the new BFF projection output.

### Open questions

- Should the column header read `Activity growth` (period-relative) or
  `7d growth` (fixed window)?
- For wallets with too few observations to compute a ratio, what do we
  display — `—`, `n/a`, or hide the row from the sort?
- Should the SDK-connected dashboard mode show its own version (it already
  has a 7d sparkline), or is the column redundant there?

---

## Per-row reason hover on the Customers table

Show the `reasons[].description` from the BFF `CustomerListItem` contract
(surfaced on the frontend as `CustomerListItemDto.reasons`, plus any
`provenanceByField`-scoped subset) on hover over each table cell, so the
user can read **why** a specific cell holds the value it does — not just
what the column conceptually means.

### Status

Not implemented. The Customers table currently uses
[`HeaderTooltip`](../components/customers/HeaderTooltip.tsx) on each column
header to show a **static, column-level description** that is identical for
every row (e.g. "Number of payment observations recorded for this wallet by
the current provider."). It does not surface per-row, value-specific
rationale.

An earlier iteration shipped a `ProvenanceBadge` next to the upsell pill that
read `reasons` filtered by `EvidenceLabel.sourceFields`. It was removed
together with the badge component because every row resolved to the same
"hypothesis" label and the badge added no signal. The CustomerListItemDto
still carries `provenance`, `provenanceByField`, and `reasons`, so the data
plumbing remains in place — the missing piece is field-specific rationale on
the producer side. See **Surface column-level provenance badges across all
customer fields** below for the visual half of this work.

### Why deferred

1. **The current `reasons` are envelope-level boilerplate.** The active
   analytics generator
   ([`apps/cli/scripts/analytics/read-models.ts`](../../../apps/cli/scripts/analytics/read-models.ts))
   emits one identical reason for every customer:
   `"Generated from local SQLite analytics store; no BFF request-path
   external calls."` There is no `sourceFields` and no per-wallet variation,
   so a "per-row, per-cell" hover would just repeat the same sentence
   everywhere.
2. **A useful version requires BFF data work.** To make hover content
   meaningful we need the read-model generator to emit reasons such as:
   - `{ provenance: "onchain_fact", label: "onchain payment observations",
     description: "Aggregated from N Base USDC transfer facts.",
     sourceFields: ["address", "spendAtomic", "observationCount"] }`
   - `{ provenance: "derived_insight", label: "upsell heuristic",
     description: "High because providerCount=3 and observationCount=12.",
     sourceFields: ["upsellOpportunity"] }`
   That work spans the analytics generator and possibly the contract
   (whether the heuristic prose belongs in `description` or in a typed
   structured field).
3. **Regeneration / deployment dependency.** `analytics.json` is
   git-ignored and produced by `bun --cwd apps/cli analytics:read-models`,
   which requires a populated `analytics.sqlite`. Local re-generation is not
   currently part of `bun run verify`, and the deployed BFF reads a
   pre-built file. So changing only the code path does not change what the
   demo shows until a regen + redeploy happens.
4. **Static column tooltips already cover the "what is this column"
   question.** `HeaderTooltip` ships now and is enough for the immediate
   demo. The deferred work targets the higher-value "why does *this row*
   show this number" question.

### What needs to change to ship it

1. **Generator side**
   ([`apps/cli/scripts/analytics/read-models.ts`](../../../apps/cli/scripts/analytics/read-models.ts))
   - Replace the single envelope reason with multiple field-specific
     reasons, each with explicit `sourceFields`.
   - Personalize at least the `upsellOpportunity` description per row using
     the same heuristic that produced the value (so "High because …" matches
     reality).
2. **Frontend (Customers page)**
   - Wrap each cell whose column has matching `reasons` in a tooltip that
     filters `c.reasons` by `EvidenceLabel.sourceFields` matching the
     column key, and renders the `description` fields. Reuse or extend
     `HeaderTooltip` rather than introducing a third tooltip pattern.
   - Keep the static `HeaderTooltip` description as a fallback when there
     are no field-scoped reasons for the row, so the UI degrades gracefully
     against older BFF payloads.
3. **Contract / docs**
   - If we settle on structured per-cell rationale (e.g.
     `{ providerCount: 3, observationCount: 12 }` rather than free text),
     extend the `EvidenceLabel` schema accordingly and update
     [`docs/phase-b/api-contract.md`](../../../docs/phase-b/api-contract.md).
   - Otherwise document the convention that `description` is intended to be
     human-readable per-row prose.
4. **Tests**
   - Add an adapter / contract test that asserts the generator emits at
     least one field-specific reason per `derived_insight` field.
   - When the field-filter helper is reintroduced (likely alongside the
     column-level provenance badges below), restore the unit tests that
     covered `sourceFields` matching and `aria-label` composition.
   - Add a UI test (when a testing-library setup lands) that hovering a
     cell surfaces the right `description`.

### Open questions

- Should hover live on the **cell** (current proposal) or on a small ⓘ
  affordance next to the value? The former is more discoverable, the latter
  is less noisy on dense tables.
- Do we want both the static column description and the row-specific
  reason in the same tooltip, or separate them (header → static, cell →
  row-specific)?
- For columns whose value is purely `onchain_fact`, is per-row prose
  (`"Aggregated from 12 transfers"`) worth it, or is the static
  `HeaderTooltip` enough? This decides how much generator work is needed.

---

## Surface column-level provenance badges across all customer fields

Render a small provenance badge (onchain / demo / sdk / hypothesis) next to
**every** value in the Customers table whose origin meaningfully differs
from the others, so the reader can tell at a glance which numbers are
on-chain facts and which are derived insights.

### Status

Removed. An initial implementation placed a single `ProvenanceBadge` next
to the `UpsellPill`. Because the active BFF payload sets
`provenanceByField.upsellOpportunity = "derived_insight"` for every row,
the badge always read "hypothesis" and added visual noise without
information gain. The badge component, its tests, and the wiring inside
`CustomersTable` were deleted; `CustomerListItemDto.provenance` /
`provenanceByField` / `reasons` and the static column-level
`HeaderTooltip` remain.

### Why deferred

1. **A single-color badge is just noise.** The Phase B provenance design
   only carries weight when *different* rows or *different* columns light
   up in different colors. With one column at one provenance value, the
   badge teaches nothing and crowds the table.
2. **Other columns are not yet provenance-rich.** `spendAtomic`,
   `observationCount`, and `address` are uniformly `onchain_fact`;
   `providerCount` and `upsellOpportunity` are uniformly `derived_insight`.
   Until at least one column shows row-level variation (e.g.
   `derived_insight` here, `onchain_fact` there), green/purple contrast on
   the page can only come from spreading badges *across* columns rather
   than across rows.
3. **Generator work is required first.** Per-column rendering implies
   that the read-model generator declares
   `provenanceByField.<each-field>` deliberately for every customer. Today
   `apps/cli/scripts/analytics/read-models.ts` declares only a subset, and
   the deployed BFF reads a pre-built `analytics.json` that is regenerated
   out-of-band.

### What needs to change to ship it

1. **Reintroduce a small badge component** modelled on the deleted
   `ProvenanceBadge` (or extend `HeaderTooltip` if we keep a single
   tooltip primitive).
2. **Wire it into multiple columns** in
   `apps/frontend/components/customers/CustomersTable.tsx`. At a minimum:
   `Spend (atomic)` → onchain, `Observations` → onchain, `Providers` →
   derived_insight, `Upsell` → derived_insight. The badges should fall
   back to the object-level `provenance` when `provenanceByField[<field>]`
   is missing.
3. **Tighten the read-model generator** so every value-bearing field has
   an explicit `provenanceByField` entry. This is shared with the
   "Per-row reason hover" item above.
4. **Pair the badges with the per-row reasons hover** (above) so the
   badge surfaces "what kind of value this is" and the cell hover
   surfaces "why this specific row got this value".
5. **Tests.** When the badge component returns, restore unit coverage for
   the field-filter helper (`sourceFields` matching) and `aria-label`
   composition.

### Open questions

- One badge per cell, or one badge per column header? Per-cell is more
  truthful when generators eventually emit per-row variation; per-header
  is calmer for the overwhelmingly common case where the column is
  uniform.
- Do we collapse `onchain_fact` rows to no badge (treating it as the
  silent default) and only badge non-onchain values? That removes most
  visual noise but trains readers to ignore the silent column.
- How does this interact with the SDK-connected dashboard mode, which
  paints the entire table purple already?

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
4. ~~**Inline hex literals bypass the tokens.**~~ **Done.** All accent
   colors now flow through CSS variables. Bubble chart gradient stops
   moved to dedicated `--bubble-{blue|teal|slate|priority}-{from|to|mid}`
   tokens since gradients are not a 1:1 mapping to a single color.
   Remaining inline hex values in `*.tsx` are deliberately left as
   structural neutrals (`#FFFFFF` / `#FAFBFC` / `#F2F4F7` / `#F8FAFC` /
   `#F6F8FA` etc.) and dark overlay tints
   (`rgba(15, 23, 42, 0.92)` for tooltips, `rgba(255, 255, 255, 0.18)`
   for translucent strokes); they are not part of the brand palette.

### What needs to change to ship it

1. **Decide the headline serif** and add it via `next/font`. Update
   `--display` to point at the new family and review H1 / H2 weights
   and letter-spacing.
2. **Introduce spacing and radius tokens** (`--space-1` … `--space-12`,
   `--radius-sm/md/lg/xl`) and migrate the most visited surfaces
   (CustomersTable, IdentityBar, KPI cards) first.
3. **Define `--shadow-sm/md/lg`** matching the guide's Sm/Md/Lg samples
   and apply to cards / popovers consistently.
4. ~~**Sweep inline hex literals**~~ — done. Future colors should be
   added via `:root` tokens (or new gradient-specific tokens for SVG
   stops) rather than inline literals, to keep the sweep from
   regressing.
5. **Document the chosen mapping** in `docs/current-capabilities.md` so
   the next reader knows which tokens to use where.

### Open questions

- Does the editorial serif appear only on H1, or do we extend it to
  card titles and KPI labels too?
- Do we keep separate "soft" and "dim" rgba derivatives per accent
  color, or replace them with `color-mix()` at use sites once browser
  support is acceptable?
