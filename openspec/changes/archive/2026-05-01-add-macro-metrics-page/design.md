## Context

The frontend currently has separate pages for customer/wallet intelligence and co-usage patterns. The Co-usage Patterns page visualizes wallet-provider relationships, but it is not the right place for a CEO-facing comparison of macro KPIs, repeat behavior, endpoint behavior, and growth actions.

The initial implementation should be demo/offline-first. It can reuse existing SDK demo providers and wallets for consistency, but the macro page needs a more expressive event/workflow dataset than the existing fixture so that each indicator has a clear business interpretation and visible impact.

## Goals / Non-Goals

**Goals:**

- Add a dedicated **Macro Metrics** page reachable from navigation.
- Present all requested P0/P1/P2 indicators in one comparative executive view using realistic demo data.
- Derive metrics from a consistent demo workflow event model where practical.
- Keep metric computation in pure TypeScript helpers with focused tests.
- Keep default verification offline and compatible with the existing Bun/TypeScript/Biome workflow.
- Remove macro-only exploratory cards from Co-usage Patterns so that page remains focused.

**Non-Goals:**

- Live BFF/API integration for the new macro metrics page.
- New external charting dependencies.
- Exact financial accounting, cohort retention, or causal lift modeling.
- Backend schema changes or persistence changes.

## Decisions

1. **Create a dedicated `Macro Metrics` route instead of extending `PatternsScreen`.**
   - Rationale: the requested indicators span overview, ecosystem, endpoint behavior, and growth action. A dedicated route avoids overloading Co-usage Patterns and makes the CEO demo easier to compare.
   - Alternative considered: keep cards in Co-usage Patterns. Rejected because endpoint/category and growth-action signals are broader than co-usage.

2. **Use a shared demo workflow event dataset as the source of truth.**
   - Rationale: paid usage, repeat wallet rate, service adjacency, endpoint category flow, and recommendations should tell a coherent story. A shared event log prevents contradictory numbers across cards.
   - Alternative considered: hard-code each card independently. Rejected because it would be faster but less credible and harder to maintain.

3. **Model demo workflows around a Northwind Price API provider and adjacent services.**
   - Rationale: this aligns with existing SDK fixture names while allowing meaningful workflows such as `price lookup → AI inference → swap execution → notification`.
   - Alternative considered: invent a totally new dataset. Rejected because consistency with existing demo data is valuable.

4. **Build lightweight custom visualizations using existing UI patterns.**
   - Rationale: the repository currently avoids charting dependencies and uses inline SVG/CSS cards. Maintaining that pattern keeps implementation small and offline-friendly.
   - Alternative considered: add a charting library for Sankey/heatmap. Rejected for the initial demo to avoid dependency and styling overhead.

5. **Represent advanced metrics as transparent proxies.**
   - Rationale: true lift, forest plots, discount recommendations, and cohort retention require causal/statistical backing that the PoC does not have. The UI should show demo/proxy semantics clearly while still enabling visual comparison.
   - Alternative considered: hide P1/P2 metrics. Rejected because the user wants all requested indicators visible for comparison.

## Risks / Trade-offs

- **Demo data may be mistaken for live measured data** → Label the page and advanced metrics as demo/proxy where appropriate.
- **Too many indicators may overwhelm the page** → Organize into sections: Overview KPIs, Customer/Wallet, Ecosystem, Endpoint Behavior, and Growth Action.
- **Custom charts may be less polished than a chart library** → Use simple ranked tables, KPI cards, bars, trend lines, and flow lists first; reserve advanced Sankey/heatmap polish for later.
- **Metric definitions may evolve after CEO review** → Keep calculations in pure helpers and keep fixture data centralized so revisions are low-risk.
- **Existing exploratory changes could leak into Co-usage Patterns** → Explicitly revert/move macro cards during implementation.

## Migration Plan

1. Add the new route and sidebar entry.
2. Add centralized macro demo data and pure metric helpers.
3. Build the Macro Metrics page sections and visualizations.
4. Remove macro cards from Co-usage Patterns while keeping its original co-usage content.
5. Add tests for metric helpers and run `bun run verify`.

Rollback is straightforward: remove the route/sidebar entry and macro fixture/helpers, then restore the previous Co-usage Patterns component if necessary.

## Open Questions

- Final page label can remain **Macro Metrics** unless product naming changes.
- Exact threshold labels for proxy metrics may need tuning after visual review.
