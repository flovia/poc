## Context

Phase A has completed market snapshot and intelligence foundations in `apps/cli` and `packages/*`. On the other hand, the Phase B frontend demo expects four screens (three of which depend on the BFF API), but the current `apps/bff` only returns `/` and `/health` in a minimal HTTP app.

`../poc-frontend` may already be aligned to the old BFF DTO shape, so fixing that shape as the canonical contract would be risky. Therefore, implementation uses the canonical Phase B schema in `packages/contracts` and applies adapter/migration for frontend integration as needed.

Phase B responses mix Phase A-like factual data, hand-written demo labels, future SDK telemetry assumptions, and derived hypotheses. These are distinguished with `provenance`, `provenanceByField`, and `reasons`.

## Goals / Non-Goals

**Goals:**

- Implement `GET /customers`, `GET /customers/:address/profile`, and `GET /wallet-usage-graph` as read-only BFF endpoints.
- Each endpoint returns a canonical envelope response that validates against Phase B schemas in `packages/contracts`.
- Include demo / future SDK expected values in the three product API responses rather than separate raw endpoints.
- Read only prepared demo fixture / read model and do not call live CDP / Bitquery / RPC in request path.
- Validate route behaviors for status, not found, method handling, and contract validation in BFF route tests.

**Non-Goals:**

- Implement SDK middleware / telemetry collector.
- Add live CDP / Bitquery / RPC calls in the BFF request path.
- Add `GET /demo-data`, `GET /sdk-events`, `GET /telemetry`.
- Add `GET /patterns` / `GET /summary` in initial implementation.
- Add authentication, billing, or production-ready multi-tenanting.
- Large refactor of the frontend repository.

## Decisions

### 1. Include demo / future SDK values in 3 product APIs

Instead of adding `/demo-data` or `/sdk-events`, include those projections in `GET /customers`, `GET /customers/:address/profile`, and `GET /wallet-usage-graph`, which match frontend decision workflow needs.

Alternative: add raw demo endpoints. This was not chosen because the Phase B BFF should act as a product API boundary rather than a raw data viewer.

### 2. Adopt canonical envelope response

Each endpoint returns an envelope response containing `generatedAt`, `generatedFrom`, `scope`, `provenance`, and related fields. Even if existing frontend expects arrays or old DTOs directly, BFF contract remains canonical.

Alternative: set frontend current DTO as BFF contract, which was rejected due risk of locking in temporary backward compatibility to prior BFF behavior.

### 3. Manage fixture as TypeScript read model

Initially, place deterministic fixtures in `apps/bff/src/data/phase-b-demo.ts` and validate with schema validators before returning in routes. A pure TypeScript fixture is preferred initially because JSON-only fixtures weaken type safety and shared constant reuse.

A JSON seed + loader split can be done later if needed.

### 4. BFF uses `packages/contracts` but does not import `apps/cli`

The BFF remains a product API boundary and uses contract schema / validators from `packages/contracts`, without depending on CLI orchestration or source adapters. Values equivalent to Phase A snapshot are treated as fixture / read model data.

### 5. Keep provider scoping in response `scope`

Do not introduce `providerId` query/header filtering in initial implementation. Include needed scope in response envelope as optional values. Missing scope is treated as global / unscoped demo data.

## Risks / Trade-offs

- [Risk] Response shape expected by frontend may differ from canonical response. Add response adapters on the frontend side after BFF implementation and migrate incrementally.
- [Risk] Overly detailed provenance can make fixture creation heavy; add `provenanceByField` and `reasons` around fields that appear as demo / future / derived.
- [Risk] Fixtures may look too much like real data. Explicitly mark `demo_label` / `future_sdk_field` / `derived_insight` per `docs/phase-b/demo-data.md` classification.
- [Risk] Inconsistencies such as `customerCount` vs `customers.length`; prevent via contract schema and BFF tests.
- [Risk] BFF route bloat. Keep route handlers limited to request parsing and response dispatch, with fixture/read model logic in `data` or `routes`.
