## 1. Test Coverage

- [x] 1.1 Add a read-model regression test where the CoinGecko summary is generated alongside a higher-volume unrelated service and assert `topEndpoints` are scoped to CoinGecko rows only.
- [x] 1.2 Add a read-model regression test with multiple `service_candidates` for the same service/payment sink and assert transaction/user counts are not duplicated.
- [x] 1.3 Add a read-model regression test that duplicate service candidate rows do not produce duplicate summary top endpoints.
- [x] 1.4 Add sampling tests for explicit `generatedAt`, non-epoch default `generatedAt`, and unchanged deterministic selections for the same seed and inputs.

## 2. Read Model Hardening

- [x] 2.1 Refactor `generateServiceAnalyticsReadModels` to build canonical rows keyed by service identity and payment sink before service rollups.
- [x] 2.2 Ensure canonical row generation counts distinct resources for endpoint diversity while counting each payment sink aggregate at most once per service identity.
- [x] 2.3 Build `serviceSummary.topEndpoints` from the target service rows rather than the global sorted row set.
- [x] 2.4 Dedupe summary top endpoints or clusters by stable identity before applying the top-five limit.
- [x] 2.5 Preserve `endpointAttributionStatus`, `attributionConfidence`, provenance, and onchain-fact field provenance for direct and bundled-payTo rows.

## 3. Sampling Timestamp Hardening

- [x] 3.1 Extend payTo and wallet sampling plan inputs to accept an optional `generatedAt` timestamp.
- [x] 3.2 Replace hardcoded epoch timestamps with `input.generatedAt ?? new Date().toISOString()` in sampling plan builders.
- [x] 3.3 Pass a run-level generated timestamp from full-capture orchestration so generated plan artifacts from one run share an audit timestamp.
- [x] 3.4 Keep seed-based selection independent from timestamp values.

## 4. Verification and Regeneration

- [x] 4.1 Run focused Bun tests for analytics read models and sampling.
- [x] 4.2 Run `bun run verify` from the repository root.
- [x] 4.3 Regenerate `reports/service-read-models/analytics.json` from the existing local `data/analytics/analytics.sqlite` without live external calls, if local generated data is present.
- [x] 4.4 Inspect the regenerated service analytics output to confirm CoinGecko top endpoints are not unrelated global market leaders and are not duplicated.
