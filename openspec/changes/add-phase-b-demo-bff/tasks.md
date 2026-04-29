## 1. Contract / docs checkpoint

- [ ] 1.1 Review existing Phase B contract schemas in `packages/contracts` and confirm they match `docs/api-contract.md`
- [ ] 1.2 Ensure `docs/demo-data.md` explains fixture provenance rules for `onchain_fact`, `demo_label`, `future_sdk_field`, and `derived_insight`
- [ ] 1.3 Run `cd packages/contracts && bun run typecheck && bun test`

## 2. Demo read model fixture

- [ ] 2.1 Add deterministic Phase B demo fixture/read model under `apps/bff/src/data/`
- [ ] 2.2 Include customer list, customer profiles, and wallet usage graph payloads in canonical envelope format
- [ ] 2.3 Mark demo/future/derived fields with `provenance`, `provenanceByField`, `evidence`, or `reasons` as appropriate
- [ ] 2.4 Validate all fixture payloads with `packages/contracts` Phase B validators before routes return them

## 3. BFF route tests first

- [ ] 3.1 Add tests for `GET /customers` returning a schema-valid customer list response
- [ ] 3.2 Add tests for `GET /customers/:address/profile` returning a schema-valid profile for a known wallet
- [ ] 3.3 Add tests for `GET /customers/:address/profile` returning `404` for an unknown wallet
- [ ] 3.4 Add tests for `GET /wallet-usage-graph` returning a schema-valid nested graph response
- [ ] 3.5 Add tests confirming raw demo/telemetry endpoints such as `/demo-data`, `/sdk-events`, and `/telemetry` are not exposed
- [ ] 3.6 Add tests confirming non-GET methods do not perform write operations

## 4. BFF endpoint implementation

- [ ] 4.1 Implement `GET /customers` using the prepared demo read model
- [ ] 4.2 Implement `GET /customers/:address/profile` with normalized address lookup and not-found handling
- [ ] 4.3 Implement `GET /wallet-usage-graph` using the prepared nested graph read model
- [ ] 4.4 Keep route handling read-only and avoid importing `apps/cli` or live source adapters
- [ ] 4.5 Preserve `cache-control: no-store` on product API responses

## 5. Verification

- [ ] 5.1 Run `cd apps/bff && bun run verify`
- [ ] 5.2 Run root `bun run verify`
- [ ] 5.3 Review diff to ensure no generated reports, `.env`, `dist`, DB files, or live-service dependencies were added

## 6. Frontend follow-up planning

- [ ] 6.1 Document whether `../poc-frontend` will use a canonical response adapter or migrate components directly
- [ ] 6.2 Defer `/patterns`, `/summary`, provider query/header scoping, and live SDK telemetry to later changes unless explicitly required
