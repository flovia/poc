## 1. Catalog Data Model

- [x] 1.1 Define catalog metric types for priority, product page/category, status, visualization type, explanation text, demo preview, and caveat labels.
- [x] 1.2 Encode every requested P0, P1, P2, and P3 metric as a catalog item with a stable ID.
- [x] 1.3 Add demo/proxy preview data for metrics not directly derivable from the committed macro event log, including latency, error rate, pricing opportunity, retention lift, service comparison, service quadrant, workflow clusters, and causal-ish odds ratio.
- [x] 1.4 Reuse existing macro metrics demo data where practical so catalog values stay consistent with the Macro Metrics dashboard.

## 2. Catalog Metrics and Validation

- [x] 2.1 Build a view-model helper that groups catalog items by priority and product page/category.
- [x] 2.2 Add helper output for summary counts: total metrics, by-priority counts, directly supported count, demo-proxy count, and future/instrumentation-dependent count.
- [x] 2.3 Add Bun tests that assert all expected metric IDs exist and every item has priority, category, status, meaning, visualization, and preview metadata.
- [x] 2.4 Add tests that assert P0/P1/P2/P3 coverage and explicit proxy labels for advanced metrics.

## 3. Full Metrics Catalog UI

- [x] 3.1 Add a provider-scoped catalog route, tentatively `apps/frontend/app/providers/[providerId]/metrics-catalog/page.tsx`.
- [x] 3.2 Build a `MetricsCatalogScreen` with page header, summary counters, and sections grouped by priority and page/category.
- [x] 3.3 Render metric cards that show title, priority, status badge, what it represents, why it matters, recommended visualization, caveat, and demo preview.
- [x] 3.4 Implement lightweight preview components for KPI, trend, ranked table, histogram/bar, heatmap, quadrant, flow/Sankey-style list, forest-style row, box-plot-style row, and scatter-style preview.
- [x] 3.5 Ensure P2/P3 and instrumentation-dependent metrics are visually labeled as demo proxy or future analytics.

## 4. Discoverability

- [x] 4.1 Add a discoverable link from the Macro Metrics page to the Full Metrics Catalog, or add sidebar navigation if it fits without overcrowding.
- [x] 4.2 Ensure provider switching preserves or sensibly falls back from the catalog route.
- [x] 4.3 Ensure the catalog is reachable in SDK/demo mode without setup or live network dependencies.

## 5. Verification

- [x] 5.1 Run targeted frontend catalog tests.
- [x] 5.2 Run `bun run format` if formatting changes are needed.
- [x] 5.3 Run `bun run verify` from the repository root and resolve failures.
