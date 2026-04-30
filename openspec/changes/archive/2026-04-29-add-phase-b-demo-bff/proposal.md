## Why

The Phase A data foundation is complete, but the frontend demo still lacks a stable read-only BFF API. In Phase B, we need a product API boundary that reproduces the four demo screens for partner presentation without depending on live sources.

In addition, Phase B response values mix onchain facts, hand-written demo labels, future SDK telemetry assumptions, and derived hypotheses, so responses must preserve provenance in API contracts.

## What Changes

- Add Phase B demo read model to BFF.
- Add the following read-only endpoints to BFF:
  - `GET /customers`
  - `GET /customers/:address/profile`
  - `GET /wallet-usage-graph`
- Each endpoint returns product projections for frontend screens, not raw demo data.
- Return responses as envelope format validated by Phase B schemas in `packages/contracts`.
- Keep demo labels and future SDK expectations embedded in the three product API responses instead of separate endpoints.
- Distinguish `onchain_fact` / `demo_label` / `future_sdk_field` / `derived_insight` in responses.
- Do not call live CDP / Bitquery / RPC in BFF request path.
- Exclude `GET /patterns`, `GET /summary`, `GET /demo-data`, and `GET /sdk-events` from the initial implementation.

## Capabilities

### New Capabilities

- `phase-b-demo-bff`: Read-only BFF product APIs and demo read model supporting the Phase B frontend demo.

### Modified Capabilities

- `market-intelligence`: Clarify boundary so Phase A snapshot / projection-equivalent values are treated as `onchain_fact` in Phase B read model.

## Impact

- `apps/bff`
  - Add demo fixture / read model adapter
  - Add three GET endpoints
  - Add route tests
- `packages/contracts`
  - Use Phase B response schema and validator from contracts
  - Add and/or adjust contract tests as needed
- `docs`
  - Align implementation with API contract and demo data policy
- `../poc-frontend`
  - Canonical envelope response migration or adapter needed in later work
