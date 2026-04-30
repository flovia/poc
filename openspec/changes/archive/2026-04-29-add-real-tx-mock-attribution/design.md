## Context

Phase B BFF currently provides `GET /customers`, `GET /customers/:address/profile`, and `GET /wallet-usage-graph` as read-only. Current responses come from deterministic demo read model in `apps/bff/src/data/phase-b-demo.ts`, and the request path does not call CDP / Bitquery / RPC / SDK collector.

On the demo, CoinGecko endpoint attribution has structural constraints. When multiple endpoints are paid to the same `payTo`, public/onchain data alone cannot determine `txHash -> endpointPath`. Therefore, join and generate Phase B projection by separating real transaction facts and mock endpoint attribution.

Current CoinGecko x402 data visible from `apps/cli/reports/x402-market-snapshot.json` and `apps/cli/reports/x402-market-summary.md` is as follows:

```text
providerId: coingecko
resource: https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools
network: base
asset: USDC
amountAtomic: 10000
payTo: 0x110cdbba7fe6434ec4ce3464cc523942ad6fb784
transactionCount: 628
uniqueSenderCount: 75
latestTxHash: 0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94
latestSender: 0xac5a07c44a4f971667b3df4b6551fb6991b2142d
latestBlockTimestamp: 2026-04-29T04:11:53Z
```

Initial capture policy is:

```text
requestedLimit: 1000 default (explicit limit may exceed 1000)
timeWindow: start from same window used in snapshot generation and expand when needed
goal: capture all observed transfers within the selected time window as much as possible
```

Current observed `transactionCount` is 628, so 1000-limit capture should generally cover the current window. However, if API pagination or availability returns fewer than 1000, that does not produce a generation error. Record `requestedLimit`, `capturedCount`, `timeWindow`, and `source` in fixture metadata.

Supported CoinGecko x402 endpoints confirmed from official docs are:

```text
GET /api/v3/x402/onchain/simple/networks/{id}/token_price/{address}
GET /api/v3/x402/onchain/search/pools
GET /api/v3/x402/onchain/networks/{id}/trending_pools
GET /api/v3/x402/onchain/networks/{id}/tokens/{address}
GET /api/v3/x402/simple/price
```

Official docs state price at `$0.01 USDC / request`. Because `payTo` addresses are not listed in official docs, `payTo` values are treated as observed data from CDP Discovery snapshot.

## Goals / Non-Goals

**Goals:**

- Fetch real onchain transfer lists from CoinGecko payTo in `packages/sources` and use those transaction facts as input for Phase B demo projection.
- Add `txHash` as join key and apply mock endpoint attribution as supplemental data.
- Preserve field-level `onchain_fact`, `demo_label`, and `future_sdk_field` / `derived_insight`.
- BFF runtime returns generated projections as read-only without live source calls.
- Structure for replacing mock attribution with future SDK telemetry.

**Non-Goals:**

- Implement full SDK middleware.
- Live CDP / Bitquery / RPC call in request path.
- Infer endpoint attribution from onchain data alone.
- Claim official CoinGecko endpoint usage as measured facts.
- Implement authentication, billing, or production multi-tenant.

## Decisions

### Decision 1: Separate real transaction facts and mock attribution into different fixtures

Phase A transaction facts and Phase B demo endpoint attribution are managed as separate files / layers.

Candidates:

```text
fixtures/phase-a/coingecko-transactions.json
apps/bff/fixtures/phase-b/mock-attribution.json
```

Rationale:

- `txHash`, `payerWallet`, `payTo`, `amount`, and `timestamp` are valid as real facts.
- `endpointPath`, `workflowLabel`, and `requestSequence` are not real facts today.
- Mixing them in one fixture can create the false impression that onchain data alone identifies endpoint mapping.

Alternatives:

- Put everything in BFF hand-written data: fast implementation but unclear connection to Phase A.
- Call live source in BFF request path: conflicts with stability and offline verification policy.

### Decision 2: Put real transfer-list capture in `packages/sources`

Responsibility for fetching real transaction facts from CoinGecko `payTo` is placed in `packages/sources`. Existing Bitquery adapter already handles aggregate and latest transfer by `network + asset + payTo`, so transfer-list retrieval is added at the same boundary.

Planned API:

```text
fetchPaymentTransfersByPayTo({ network, asset, payTo, from, limit })
```

Returned fields:

```text
txHash
sender / payerWallet
recipient / payTo
amountAtomic
asset
network
blockNumber
blockTimestamp
```

Initial implementation uses default `limit` of 1000 and allows explicit limits beyond 1000. If Bitquery page size limits apply, apply pagination. If results are below requested limit, treat this as valid capture and record actual count in fixture metadata `capturedCount`.

Rationale:

- Source integration stays consolidated in `packages/sources`.
- `apps/cli` / scripts can focus on orchestration to call source adapter and generate fixture / projection.
- `apps/bff` reads only generated projection and does not depend on `packages/sources`.

Alternatives:

- Write Bitquery GraphQL directly in `apps/cli`: faster but scattered source boundaries.
- Fetch in `apps/bff`: conflicts with read-only/offline policy.

### Decision 3: Use `txHash` as join key

Projection builder joins real transaction facts and mock attribution by `txHash`.

Rationale:

- Avoids ambiguous joins like `payerWallet + timestamp`.
- Supports explicit traceability of attribution evidence at transaction granularity.
- Naturally supports migration to SDK telemetry via `txHash` / `paymentIntentId` / `correlationId` later.

Alternatives:

- Join by `payerWallet + amount + near timestamp`: usable as fallback for missing facts, but too ambiguous as primary key for Phase B demo.

### Decision 4: BFF reads generated projection

BFF does not process real tx fixture and mock attribution fixture on each request; it reads pre-generated projection.

Candidates:

```text
apps/bff/fixtures/phase-b/customer-list.json
apps/bff/fixtures/phase-b/customer-profiles.json
apps/bff/fixtures/phase-b/wallet-usage-graph.json
```

Rationale:

- BFF can stay focused on read-only product API boundary.
- Maintains stable offline verification.
- Separates projection generation and HTTP serving concerns.

Alternatives:

- Build projection at BFF startup: possible for small scope, but adds too much responsibility to BFF for fixture validation and projection build.

### Decision 5: Keep provenance in contract validation

Projection output follows existing Phase B canonical contract and keeps `provenance`, `provenanceByField`, and `reasons`.

Rationale:

- The API boundary does not lose real-fact vs mock-attribution boundary.
- Frontend can distinguish demo label / future SDK field / derived insight.
- Enables clear replacement points for future SDK telemetry.

## Risks / Trade-offs

- Real transfers are low or skewed: initial capture requests up to 1000, with explicit transaction selection criteria and mock attribution coverage visible for wallet / workflow coverage.
- Mock attribution looks like measured data: enforce non-empty `provenanceByField` and `reasons` in contract and tests.
- Fixture staleness: store generation metadata and version and provide re-generation script/command.
- Projection builder divergence from BFF schema: validate builder output with `packages/contracts` validators.
- Live source capture leaks into normal verify path: run `packages/sources` live capture through explicit separate command and keep `bun run verify` offline.

## Migration Plan

1. Add a CoinGecko `payTo` transfer-list API in `packages/sources`.
2. Define schemas for real transaction fact fixture and mock attribution fixture.
3. Prepare transaction fact fixture derived from CoinGecko `payTo`.
4. Prepare mock endpoint attribution fixture keyed by `txHash`.
5. Generate customer list / profile / wallet usage graph in projection builder and validate via contract.
6. Switch BFF read source to generated projection fixtures.
7. Keep existing route tests and add provenance-separation tests.

Rollback is to revert BFF read source to current deterministic in-file read model.

## Open Questions

- How strictly should CoinGecko `payTo` network / asset / time window be fixed initially?
- Should real transaction fixture live under `fixtures/phase-a` or under `apps/bff/fixtures`?
- Should the transfer-list capture command belong to `apps/cli` or root script?
- Should projection builder be placed as `apps/cli` command or root script?
- Final set of demo workflow labels for the five CoinGecko endpoints.
