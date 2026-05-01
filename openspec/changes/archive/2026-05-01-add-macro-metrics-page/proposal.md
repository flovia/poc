## Why

CEO review identified that the current demo lacks an executive-level macro metrics page for comparing monetization, repeat usage, ecosystem adjacency, and endpoint behavior signals. The existing co-usage page has useful primitives, but the requested indicators need a dedicated view with realistic demo data and concise business takeaways.

## What Changes

- Add a new frontend page, tentatively named **Macro Metrics**, separate from the existing Co-usage Patterns page.
- Add realistic demo data for macro-level wallet/service workflows, reusing existing SDK demo providers where possible for consistency.
- Surface CEO-facing indicators, including paid active wallets, total spend, paid usage / transaction count, 7d / 30d trend, spend concentration, repeat wallet rate, other service candidates, shared spend / shared transaction rankings, endpoint category usage, endpoint category flow, source/intermediary ranking, and action-oriented recommendations.
- Move macro-only cards out of Co-usage Patterns so that page remains focused on co-usage/ecosystem exploration.
- Keep implementation demo/offline-first; live BFF integration can follow later.

## Capabilities

### New Capabilities

- `macro-metrics-dashboard`: Provides a dedicated executive dashboard for macro wallet, spend, repeat usage, ecosystem, endpoint behavior, and growth-action indicators using realistic demo data.

### Modified Capabilities

- None.

## Impact

- Affects `apps/frontend` routes, sidebar navigation, demo fixture data, metric calculation helpers, UI components, and tests.
- Does not require external services, live RPC calls, schema migrations, or API changes for the initial demo implementation.
- Existing Co-usage Patterns UI should be simplified by removing macro cards added during the exploratory implementation.
