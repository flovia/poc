## Why

The current Macro Metrics dashboard covers the core P0 story but does not yet let stakeholders compare the full metric list across P0/P1/P2/P3. A dedicated full metrics catalog page is needed to make every requested metric visible, clearly label demo/proxy status, and distinguish what is already supported from what requires richer future data.

## What Changes

- Add a new frontend page for a **Full Metrics Catalog** that lists and visualizes all requested metrics across P0, P1, P2, and P3.
- Extend demo metric data so each catalog item has a realistic sample value, chart/table preview, status, priority, meaning, and implementation note.
- Include metrics that need richer data as demo/proxy visualizations rather than omitting them, with explicit labels for proxy, missing-live-data, and future-grade analytics.
- Cover the full provided metric list: provider-scoped activity/spend/usage, wallet intelligence, co-usage/ecosystem, source/intermediary, endpoint behavior, service comparison/quadrant, growth/pricing, latency/error, retention lift, and workflow/causal-ish future metrics.
- Keep the existing Macro Metrics dashboard as the executive summary page; the catalog is a comprehensive comparison and review page.

## Capabilities

### New Capabilities

- `full-metrics-catalog`: Provides a comprehensive demo-backed catalog of all requested macro, wallet, ecosystem, endpoint, growth, pricing, and future analytics metrics.

### Modified Capabilities

- None.

## Impact

- Affects `apps/frontend` routes, sidebar/navigation or page links, metric catalog fixtures, metric view-model helpers, UI components, and frontend tests.
- Does not require live RPC, external services, backend schema changes, or new charting dependencies for the initial implementation.
- Builds on the committed Macro Metrics dashboard data/model but should remain clear that advanced P1/P2/P3 metrics are demo/proxy where applicable.
