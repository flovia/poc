## Why

The expanded analytics capture is successful as a PoC data collection run, but the generated service analytics read model contains trust-breaking presentation defects: the CoinGecko summary can show unrelated global top endpoints, endpoint rows can be duplicated by service candidate joins, and sampling plans can report epoch timestamps. This change hardens generated analytics artifacts so the existing local capture can be regenerated into demo-ready outputs without re-fetching CDP, Bitquery, or wallet intelligence data.

## What Changes

- Generate service summary top endpoints from the requested service's rows instead of global market rows.
- Deduplicate service read-model rows by service and payment sink so one-to-many service candidate joins do not duplicate top endpoints or inflate service metrics.
- Preserve endpoint attribution status and confidence in generated outputs, especially when bundled payTos make endpoint-level metrics inferred rather than factual.
- Make sampling plan `generatedAt` values explicit and non-epoch by default while preserving deterministic selection from seed, budgets, and inputs.
- Add tests covering CoinGecko summary scoping, endpoint deduplication, non-inflated service aggregation, and sampling timestamp behavior.
- No external data re-fetch is required for read-model hardening; existing local analytics SQLite data can be reused.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `analytics-data-store`: Generated service analytics read models must deduplicate service/payment-sink joins and scope service summary endpoints to the target service.
- `bff-service-analytics`: Service analytics summaries must not represent unrelated global endpoints as the target service's top endpoints and must preserve attribution uncertainty.
- `analytics-sampling`: Serialized sampling plans must include an auditable generated timestamp without breaking deterministic selection semantics.

## Impact

- Affected code:
  - `apps/cli/scripts/analytics/read-models.ts`
  - `apps/cli/scripts/analytics/sampling.ts`
  - `apps/cli/scripts/analytics/capture-full.ts` if run-level timestamp propagation is needed
  - analytics read-model and sampling tests under `apps/cli/tests/`
- Affected artifacts:
  - `reports/service-read-models/analytics.json` can be regenerated from `data/analytics/analytics.sqlite` after the fix.
  - sampling plan JSON files can be regenerated locally if operators want corrected timestamps in plan artifacts.
- No new runtime dependencies or live verification paths are introduced.
