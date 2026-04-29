## 1. Contract / docs checkpoint

- [x] 1.1 Review existing Phase B contract schemas in `packages/contracts` and confirm they match `docs/api-contract.md`
- [x] 1.2 Ensure `docs/demo-data.md` explains fixture provenance rules for `onchain_fact`, `demo_label`, `future_sdk_field`, and `derived_insight`
- [x] 1.3 Run `cd packages/contracts && bun run typecheck && bun test`

## 2. Demo read model fixture

- [x] 2.1 Add deterministic Phase B demo fixture/read model under `apps/bff/src/data/`
- [x] 2.2 Include customer list, customer profiles, and wallet usage graph payloads in canonical envelope format
- [x] 2.3 Mark demo/future/derived fields with `provenance`, `provenanceByField`, `evidence`, or `reasons` as appropriate
- [x] 2.4 Validate all fixture payloads with `packages/contracts` Phase B validators before routes return them

## 3. BFF route tests first

- [x] 3.1 Add tests for `GET /customers` returning a schema-valid customer list response
- [x] 3.2 Add tests for `GET /customers/:address/profile` returning a schema-valid profile for a known wallet
- [x] 3.3 Add tests for `GET /customers/:address/profile` returning `404` for an unknown wallet
- [x] 3.4 Add tests for `GET /wallet-usage-graph` returning a schema-valid nested graph response
- [x] 3.5 Add tests confirming raw demo/telemetry endpoints such as `/demo-data`, `/sdk-events`, and `/telemetry` are not exposed
- [x] 3.6 Add tests confirming non-GET methods do not perform write operations

## 4. BFF endpoint implementation

- [x] 4.1 Implement `GET /customers` using the prepared demo read model
- [x] 4.2 Implement `GET /customers/:address/profile` with normalized address lookup and not-found handling
- [x] 4.3 Implement `GET /wallet-usage-graph` using the prepared nested graph read model
- [x] 4.4 Keep route handling read-only and avoid importing `apps/cli` or live source adapters
- [x] 4.5 Preserve `cache-control: no-store` on product API responses

## 5. Verification

- [x] 5.1 Run `cd apps/bff && bun run verify`
- [x] 5.2 Run root `bun run verify`
- [x] 5.3 Review diff to ensure no generated reports, `.env`, `dist`, DB files, or live-service dependencies were added

## 6. Frontend follow-up planning

- [x] 6.1 Document whether `../poc-frontend` will use a canonical response adapter or migrate components directly
- [x] 6.2 Defer `/patterns`, `/summary`, provider query/header scoping, and live SDK telemetry to later changes unless explicitly required
