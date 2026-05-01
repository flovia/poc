## Context

The committed Macro Metrics page provides an executive summary with core P0 signals and selected proxy recommendations. The user-provided metric list is broader: it includes every P0/P1/P2/P3 metric, desired meanings, and preferred visualization forms. The next change should add a comprehensive catalog page so the team can review all metrics side-by-side, including metrics that are only feasible as demo/proxy values today.

## Goals / Non-Goals

**Goals:**

- Add a **Full Metrics Catalog** frontend page distinct from the existing Macro Metrics executive dashboard.
- Represent every metric in the user-provided list across P0/P1/P2/P3.
- For each metric, show priority, current/demo status, what it represents, why it matters, recommended visualization type, and a realistic demo preview.
- Extend the existing macro demo data/model where useful, and add catalog-specific demo/proxy data for latency, errors, retention cohorts, lift, pricing, service comparison, service quadrant, workflow clusters, and causal-ish metrics.
- Make proxy status explicit so stakeholders do not confuse demo/statistical placeholders with live measured production analytics.
- Keep implementation offline and testable with Bun.

**Non-Goals:**

- Replacing the Macro Metrics executive dashboard.
- Producing production-grade statistical inference, causal proof, or exact cohort retention from live data.
- Adding external charting libraries.
- Adding backend APIs, database migrations, or live RPC dependencies.

## Decisions

1. **Add a catalog page instead of overloading Macro Metrics.**
   - Rationale: the full list is a review and comparison surface, while Macro Metrics is an executive summary. Keeping them separate avoids a dense dashboard that tries to serve both audiences.
   - Alternative considered: expand Macro Metrics directly. Rejected because it would become too long and make core P0 KPIs harder to read.

2. **Use a catalog item model with explicit metadata.**
   - Rationale: every metric needs priority, status, meaning, visualization, demo value, and caveat fields. A structured model makes completeness verifiable and makes missing/proxy status visible.
   - Alternative considered: hard-code ad hoc cards in JSX. Rejected because it is harder to audit against the requested list.

3. **Build catalog previews using lightweight chart primitives.**
   - Rationale: existing UI uses custom CSS/SVG rather than chart dependencies. Simple KPI cards, ranked bars, small tables, heatmap grids, quadrant plots, and flow lists are enough for review.
   - Alternative considered: add a chart library for Sankey, UMAP, forest plots, and box plots. Rejected for this demo pass to avoid dependency and polish overhead.

4. **Treat P2/P3 advanced analytics as demo/proxy previews.**
   - Rationale: latency, error rate, pricing opportunity, retention lift, odds ratio, and workflow clustering require richer instrumentation or statistical modeling. The catalog should show the intended output while labeling it as proxy/future-grade.
   - Alternative considered: omit unmeasurable metrics. Rejected because the user wants to compare the whole catalog.

5. **Keep the catalog data mostly consistent with existing macro data.**
   - Rationale: using the same Northwind/VectorMind/RouteZero story keeps the demo coherent. Some synthetic peer, latency, error, cost, and lift rows can be layered on top where the existing event log lacks fields.
   - Alternative considered: create fully independent data for every card. Rejected because it risks contradictory stories.

## Risks / Trade-offs

- **The page may become too dense** → Use grouping by page/category and priority, with compact cards and tables.
- **Proxy metrics may look too authoritative** → Use visible badges such as `Demo proxy`, `Future analytics`, or `Needs live instrumentation`.
- **Custom preview charts may be less accurate than real chart types** → Label them as preview representations and avoid overclaiming exact Sankey/UMAP/forest behavior.
- **Completeness may drift from the requested list** → Encode the requested metrics as data entries and add tests for expected metric IDs/counts.
- **Navigation may get crowded** → Add the catalog as a child/link from Macro Metrics or a nearby provider-scoped route, choosing the least disruptive pattern during implementation.

## Migration Plan

1. Add full metric catalog types and fixture/view-model helpers.
2. Add tests that verify all requested metrics are represented and proxy/live status is explicit.
3. Add the provider-scoped Full Metrics Catalog page and UI components.
4. Add a discoverable navigation path from Macro Metrics or Sidebar.
5. Run formatting and `bun run verify`.

Rollback is straightforward: remove the route/link and catalog fixture/components/tests.

## Open Questions

- Final route label can be **Metrics Catalog** unless product naming changes.
- Whether the catalog should be top-level sidebar navigation or linked from Macro Metrics can be decided during implementation based on sidebar density.
