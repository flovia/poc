## 1. Source capture and fixture contracts

- [x] 1.1 Add a `packages/sources` Bitquery transfer list function for `network`, `asset`, `payTo`, time window, and limit, with default limit 1000 and explicit higher limits allowed.
- [x] 1.2 Add tests for the transfer list parser using deterministic Bitquery transfer fixtures.
- [x] 1.3 Add pagination support so transfer capture can collect up to 1000 transfers even if the source API pages results.
- [x] 1.4 Define TypeScript/Zod schemas for real CoinGecko transaction facts, capture metadata, and mock endpoint attribution items.
- [x] 1.5 Add deterministic real transaction fact fixture seeded from the observed CoinGecko Base USDC `payTo` data (`0x110cdbba7fe6434ec4ce3464cc523942ad6fb784`) and containing `txHash`, `payerWallet`, `payTo`, `amount`, `asset`, `network`, and `timestamp`.
- [x] 1.6 Store `requestedLimit`, `capturedCount`, `timeWindow`, and `source` metadata in the real transaction fixture.
- [x] 1.7 Add mock endpoint attribution fixture keyed by `txHash` with endpoint path, endpoint name, workflow label, request method, provenance metadata, and reasons.
- [x] 1.8 Add fixture validation tests that reject attribution entries whose `txHash` does not exist in transaction facts.

## 2. Projection generation

- [x] 2.1 Implement a projection builder that joins transaction facts and mock attribution by `txHash`.
- [x] 2.2 Generate Phase B customer list projection from joined records.
- [x] 2.3 Generate Phase B customer profile projection from joined records.
- [x] 2.4 Generate Phase B wallet usage graph projection from joined records.
- [x] 2.5 Validate all generated projections with `packages/contracts` Phase B validators.

## 3. BFF integration

- [x] 3.1 Move BFF read model loading from in-file deterministic constants to generated projection fixtures.
- [x] 3.2 Preserve existing `GET /customers`, `GET /customers/:address/profile`, and `GET /wallet-usage-graph` response contracts.
- [x] 3.3 Ensure BFF request handling does not call CDP, Bitquery, RPC, or SDK collector code.
- [x] 3.4 Keep raw attribution paths such as `/mock-attribution`, `/demo-data`, `/sdk-events`, and `/telemetry` unpublished.

## 4. Provenance and behavior tests

- [x] 4.1 Add tests proving `txHash`, `payerWallet`, and `payTo` are represented as `onchain_fact`.
- [x] 4.2 Add tests proving `endpointPath` and `workflowLabel` are represented as `demo_label` or `future_sdk_field`.
- [x] 4.3 Add tests proving derived insights keep non-empty `reasons`.
- [x] 4.4 Update route tests to validate generated projection responses against existing Phase B schemas.

## 5. Documentation and verification

- [x] 5.1 Document the observed CoinGecko `payTo`, current aggregate counts, latest observed tx, and the five supported x402 endpoint paths in the relevant demo/projection docs.
- [x] 5.2 Update `docs/phase-b/demo-data.md` with the implemented `packages/sources` capture path, fixture paths, and generation flow.
- [x] 5.3 Update `docs/status.md` to describe the new Phase A fact + mock attribution projection state.
- [x] 5.4 Run `bun run verify` from the repository root and fix any failures.
