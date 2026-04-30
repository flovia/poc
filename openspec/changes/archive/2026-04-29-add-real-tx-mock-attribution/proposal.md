## Why

The current Phase B BFF returns deterministic demo read models but is not truly connected to Phase A real onchain transactions. Multiple CoinGecko endpoints can map to the same `payTo`, so onchain data alone cannot determine endpoint path. Therefore, real transaction and mock endpoint attribution must be separated and handled explicitly.

## What Changes

- Add CoinGecko `payTo`-based real onchain transfer-list retrieval to `packages/sources` and treat these transaction facts as input for Phase B demo projection.
- Add mock endpoint attribution fixture keyed by `txHash`.
- Separate Phase A-derived `onchain_fact` from Phase B demo `demo_label` / `future_sdk_field` / `derived_insight` at projection level.
- Keep BFF read-only and continue returning generated projections / fixtures without live source calls in request path.
- Migrate from current in-file deterministic read model to generated projection derived from real tx facts plus mock attribution.
- **BREAKING**: none. Existing endpoint shapes remain canonical contract.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `phase-b-demo-bff`: Extend requirement from returning prepared demo data to returning projection generated from real onchain tx facts plus mock endpoint attribution.
- `market-intelligence`: Clarify requirement that Phase A transaction facts can be retained and reused as input for Phase B projection generation.

## Impact

- `apps/bff` data loading source and projection-generation flow for demo data.
- `packages/contracts` usage of Phase B provenance / schema validation.
- `packages/sources` Bitquery transfer-list adapter and real transaction fixture / projection generation via `apps/cli` or script.
- `openspec/specs/phase-b-demo-bff` and `openspec/specs/market-intelligence` requirements.
- docs: `docs/phase-b/demo-data.md`, `docs/status.md`, and BFF README where necessary.
