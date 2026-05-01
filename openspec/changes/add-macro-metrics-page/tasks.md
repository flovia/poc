## 1. Route and Navigation

- [x] 1.1 Add a new provider-scoped Macro Metrics route under `apps/frontend/app/providers/[providerId]/macro-metrics/page.tsx`.
- [x] 1.2 Add a Macro Metrics navigation item to the sidebar using the existing provider-aware URL pattern.
- [x] 1.3 Ensure the page renders through the existing shell/top bar conventions and is reachable in SDK/demo mode.

## 2. Demo Data Model

- [x] 2.1 Create a centralized macro demo dataset for wallets, services, workflow sessions, endpoint categories, spend, transactions, source/intermediary labels, and recommendation metadata.
- [x] 2.2 Reuse existing SDK demo provider names and wallet story elements where practical, especially Northwind Price API and adjacent services.
- [x] 2.3 Make the dataset realistic and impact-oriented, including high-repeat trading bots, research workflows, execution-heavy wallets, and one-off lookup wallets.
- [x] 2.4 Label demo/proxy fields clearly in the data or view model for advanced metrics.

## 3. Metric Helpers and Tests

- [x] 3.1 Implement pure helper functions for overview KPIs: paid active wallets, total spend, paid usage or transaction count, and 7d / 30d trend.
- [x] 3.2 Implement pure helper functions for spend concentration and repeat wallet summaries.
- [x] 3.3 Implement pure helper functions for other service candidates and shared spend/shared transaction rankings.
- [x] 3.4 Implement pure helper functions for endpoint category usage and endpoint category flow.
- [x] 3.5 Implement pure helper functions or view models for source/intermediary ranking and growth-action recommendations.
- [x] 3.6 Add focused Bun tests covering the macro metric helpers and edge cases such as empty datasets and one-off wallets.

## 4. Macro Metrics UI

- [x] 4.1 Build the Macro Metrics screen with sections for Overview, Customer/Wallet, Ecosystem, Endpoint Behavior, and Growth Action.
- [x] 4.2 Add KPI cards for paid active wallets, total spend, paid usage / transaction count, and 7d / 30d trend.
- [x] 4.3 Add customer/wallet visuals for spend concentration and repeat wallet summary.
- [x] 4.4 Add ecosystem tables for other service candidates and shared spend/shared transaction ranking.
- [x] 4.5 Add endpoint category usage and endpoint category flow visualizations using lightweight existing UI patterns.
- [x] 4.6 Add growth-action cards for upsell opportunity, source/intermediary ranking, co-marketing recommendation, reprice/discount recommendation, and retention lift proxy.
- [x] 4.7 Add executive takeaway copy that explains business impact without overstating proxy metrics.

## 5. Co-usage Cleanup

- [x] 5.1 Remove exploratory macro cards from `PatternsScreen` so Co-usage Patterns stays focused on co-usage/ecosystem discovery.
- [x] 5.2 Keep existing Co-usage bubble chart, workflow clusters, and retention-by-agent behavior intact.

## 6. Verification

- [x] 6.1 Run targeted frontend tests for macro metric helpers.
- [x] 6.2 Run `bun run format` if implementation changes require formatting.
- [x] 6.3 Run `bun run verify` from the repository root and resolve failures.
