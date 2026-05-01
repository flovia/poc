## 1. Contracts and Test Fixtures

- [x] 1.1 Add provider catalog response and provider row schemas/types in `packages/contracts` with validation tests.
- [x] 1.2 Extend customer list request/fixture tests to cover optional payTo-scoped responses without changing unscoped response compatibility.
- [x] 1.3 Add representative generated analytics fixture data containing provider rows with resolved, unresolved, customer-ready, and no-customer-facts cases.

## 2. Analytics Read Model Generation

- [x] 2.1 Add analytics store query support for provider catalog rows, reusing existing payTo census joins and adding transfer-fact coverage for `hasCustomerFacts`.
- [x] 2.2 Extend read-model generation output with a `providers` section that preserves network, asset, payTo, service identity, activity metrics, attribution metadata, and drilldown availability.
- [x] 2.3 Add CLI tests for provider catalog generation, including multi-payTo services, bundled-payTo attribution, unresolved payTos, and ignored generated output behavior.

## 3. BFF Provider and Customer APIs

- [x] 3.1 Extend BFF analytics source loading to validate generated `providers` and provide deterministic fallback when the generated section is missing.
- [x] 3.2 Add read-only `GET /providers` route and non-GET handling tests.
- [x] 3.3 Add payTo-filtered `GET /customers?payTo=...` behavior that returns scoped customer projections from generated transfer facts/read models and preserves existing unscoped behavior.
- [x] 3.4 Add BFF route tests for generated providers, fallback providers, scoped customers, unknown payTo empty results, and no live external request path.

## 4. Frontend Integration

- [x] 4.1 Add frontend API client/types/adapters for provider catalog responses.
- [x] 4.2 Update provider context/loading so BFF providers are primary and current local seed providers are fallback only.
- [x] 4.3 Rank or filter generated providers for the primary UI using real activity, resolved service identity, attribution confidence, and `hasCustomerFacts`.
- [x] 4.4 Pass selected provider payTo into customer list fetches and keep existing SDK/demo behavior compatible.
- [x] 4.5 Update sidebar/setup/customer page tests to cover generated provider display, fallback display, and payTo-scoped customer requests.

## 5. Verification

- [x] 5.1 Run targeted Bun tests for contracts, CLI analytics read models, BFF routes, and frontend provider/customer flows.
- [x] 5.2 Run `bun run verify` from the repository root.
- [x] 5.3 Document any remaining generated-data regeneration step needed for local demos without committing raw/generated analytics outputs.
