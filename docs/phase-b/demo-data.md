# Phase B Demo Data Policy

This document defines how to create and manage demo data and provenance labels
for Phase B responses.

## 1. Canonical contract policy

Phase B demo responses must match the canonical contract defined in
`docs/phase-b/api-contract.md`.

Frontend migration assumption:

- current frontend code may still assume array/direct DTO forms or legacy naming
- canonical payloads use envelope + scope shape, nullable labels, ISO timestamps,
  and nested wallet graphs with provenance metadata
- do not relax contract validation; migrate in the adapter layer instead

## 2. Required provenance categories

Use exactly one of the following:

- `onchain_fact`
- `demo_label`
- `future_sdk_field`
- `derived_insight`

## 3. Labeling rules

### 3.1 `onchain_fact`

Use for values explainable by onchain projections and deterministic scoring.

- pay_to / recipient and network / asset
- observed payer wallets and counts
- transaction activity and frequency
- provider overlap / co-usage numbers

### 3.2 `demo_label`

Use for values required for demo purpose that cannot be directly validated now.

- source / medium candidate
- workflow / use-case candidate labels
- endpoint candidate labels

### 3.3 `future_sdk_field`

Use for placeholder fields planned for future telemetry in Phase C.

- endpoint attribution
- workflow sequence
- orchestration metadata

### 3.4 `derived_insight`

Use for estimated hypotheses combining multiple signals.

- retention / upsell / partnership hypotheses
- co-usage pattern story

When using `derived_insight`, include `reasons` so consumers can trace inputs.

## 4. Endpoint attribution gap

Phase B demo presents customer wallet usage and co-usage patterns for API
providers like CoinGecko.

In an ideal state, endpoint-level usage analysis is done by linking each request
to its onchain settlement transaction.

However, SDK/middleware is not yet implemented; only onchain transaction data is
available today.

### 4.1 Problem

CoinGecko has multiple x402 endpoints relevant to demo.

Current demo includes the following five CoinGecko x402 endpoints:

```text
GET /api/v3/x402/onchain/simple/networks/{id}/token_price/{address}
GET /api/v3/x402/onchain/search/pools
GET /api/v3/x402/onchain/networks/{id}/trending_pools
GET /api/v3/x402/onchain/networks/{id}/tokens/{address}
GET /api/v3/x402/simple/price
```

When payments to these endpoints are aggregated by the same `payTo`, public/onchain
data alone cannot determine which specific transaction maps to which endpoint
request.

```text
endpoint A ┐
endpoint B ┤
endpoint C ├── same payTo
endpoint D ┤
endpoint E ┘
```

### 4.2 What can be known from onchain only

- payer wallet
- recipient / `payTo`
- transaction hash
- amount
- asset
- network
- timestamp
- payment activity / payment frequency
- provider-level spend

### 4.3 What cannot be known from onchain alone

- which endpoint was called
- which request maps to which transaction
- endpoint usage frequency
- workflow / use case
- request sequence
- endpoint-level attribution
- endpoint-level retention / upsell signal

### 4.4 Target state

In the final product, SDK is introduced as middleware and request and payment
transaction are correlated.

```text
user / agent
  └─ request provider endpoint
       ├─ path
       ├─ method
       ├─ request timestamp
       ├─ provider
       ├─ wallet / customer context
       └─ payment intent / correlation id
            │
            ▼
      onchain transaction
       ├─ tx hash
       ├─ payer wallet
       ├─ payTo
       ├─ amount
       ├─ asset
       ├─ network
       └─ block timestamp
```

In this state, endpoint usage per wallet, endpoint-level frequency, request
sequence, workflow, and retention / upsell / partnership insight can be analyzed
as live data.

### 4.5 Demo placeholder approach in Phase B

To complete frontend decision-making in demo, endpoint attribution is filled with
mock/demo labels.

Specifically, placeholders include:

- `txHash -> endpointPath` mock attribution
- `endpointPath -> workflowLabel` demo label
- heuristic endpoint usage frequency
- request sequence / agent behavior placeholder story
- retention / upsell / partnership hypothetical insight

These are not live data and must be explicitly flagged in BFF responses as either
`demo_label`, `future_sdk_field`, or `derived_insight`.

### 4.6 Layer separation

Phase B demo data is managed by separating these three layers.

```text
real onchain layer
  - tx hash
  - payer wallet
  - payTo
  - amount
  - asset
  - network
  - timestamp

mock attribution layer
  - endpoint path
  - endpoint name
  - workflow label
  - request sequence
  - endpoint usage count

derived demo insight layer
  - retention hypothesis
  - upsell candidate
  - partnership opportunity
  - co-usage story
```

This separation prevents the demo from implying that endpoint-level insight is
determinable from onchain-only data.

### 4.7 Future SDK replacement

When SDK/middleware is introduced, mock attribution layer will be replaced with
actual telemetry.

Expected telemetry includes:

- request id
- provider id
- endpoint path
- method
- request timestamp
- wallet / customer context
- payment intent id
- tx hash
- correlation id
- request metadata

After replacement, `endpointPath` and `endpointUsageFrequency` can be treated
as SDK-derived live data, not demo labels.

### 4.8 Current design conclusion

Returning a deterministic demo read model from current BFF is a temporary setup
to support Phase B demo.

However, the current demo read model is not generated from Phase A snapshot, and
BFF runtime does not call `sources` / `intelligence`.

Next, we need to separate clearly:

1. Phase A derived onchain facts
2. Phase B mock endpoint attribution
3. future telemetry fields for eventual SDK replacement
4. derived insights that combine those layers

### 4.9 Current capture / projection flow implemented

Current observed CoinGecko Base USDC values are:

```text
payTo: 0x110cdbba7fe6434ec4ce3464cc523942ad6fb784
transactionCount: 628
uniqueSenderCount: 75
latestTxHash: 0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94
latestSender: 0xac5a07c44a4f971667b3df4b6551fb6991b2142d
latestBlockTimestamp: 2026-04-29T04:11:53Z
```

Current fixture capture targets `2026-01-01` to `2026-04-29`, saving 1,908 unique
valid transaction facts with `requestedLimit: 5000`.

Implementation file layout:

- `packages/sources/src/bitquery.ts`
  - `fetchPaymentTransfersByPayTo()` accepts `network`, `asset`, `payTo`, time
    window, and limit; it paginates Bitquery transfer list retrieval. Default limit
    is 1,000, with explicit limit allowing over 1,000.
- `apps/bff/fixtures/phase-a/coingecko-transactions.json`
  - real onchain transaction fact fixture.
  - `txHash`, `payerWallet`, `payTo`, `amount`, `asset`, `network`, `timestamp`
    are `onchain_fact`.
  - `requestedLimit`, `capturedCount`, `timeWindow`, `source` are kept as metadata.
- `apps/bff/fixtures/phase-b/mock-attribution.json`
  - mock attribution fixture of `txHash -> endpointPath / endpointName /
    workflowLabel`.
  - currently assigns deterministically across all real transaction facts for
    5 endpoints.
  - endpoint and workflow are treated as `demo_label` or `future_sdk_field`.
- `apps/bff/src/data/projection-builder.ts`
  - joins real tx fact and mock attribution by `txHash` and generates Phase B
    customer list / profile / wallet usage graph projection.
  - generated results are validated by Phase B validator in `packages/contracts`.

Official command to regenerate fixtures:

```sh
bun --cwd apps/cli coingecko:transactions -- \
  --from 2026-01-01T00:00:00Z \
  --to 2026-04-29T23:59:59Z \
  --limit 5000 \
  --page-size 100
```

This command uses live Bitquery and is therefore excluded from offline
verification in `bun run verify`.

BFF request path does not call CDP, Bitquery, RPC, or SDK collector. It returns only
projections generated from saved fixtures in read-only mode.

## 5. Field-level provenance

For composite objects that mix fact-based and inferred/demo values:

- if consumers need field-level distinction, add
  `provenanceByField: Record<string, DataProvenance>`.
- Keep aggregated source-level `provenance` as a single judgment.

Examples include customer list items, profile identity/metrics/provider entries,
and nested graph nodes.

## 6. Evidence / reason policy

- Every item in `reasons` / `evidence` must match `EvidenceLabel` shape:
  - `provenance` uses only allowed values
  - `label` is non-empty
  - `description` optional
  - `sourceFields` optional
- For demo fields and high-sensitivity derived fields, include `reasons` /
  `evidence` when practical.
- `reasons` is mandatory for `derived_insight`.

## 7. Atomic amount policy

Atomic amounts must satisfy all of:

- string
- digits only (`^[0-9]+$`)

Applies to:

- `spendAtomic`
- `totalSpendAtomic`
- `averageSpendAtomic`
- `sharedSpendAtomic`

`,` `-`, `+`, and decimal points are invalid and should be rejected.

## 8. Address policy

- Phase B `address`, `payToWallet`, and `payTo` fields use normalized lowercase
  Base/EVM addresses.
- Use `EvmAddressSchema` to reject invalid formats.

## 9. Scope policy

Response envelopes may include:

- `providerId`
- `network`
- `asset`
- `payTo`

If omitted, the payload is valid global/demo data.

Do not use omitted scope as justification for hidden provider scope.

## 10. Migration checklist

- Keep demo fixtures explicit and deterministic.
- Keep `generatedAt` deterministic for snapshot stability.
- Use `provenance` and `provenanceByField` where needed to assign provenance to
  mixed fields.
- Explicitly include nullable labels (`label: null`) when unknown.
- Use ISO timestamps in new generated demo payloads and migration adapters.
- Keep endpoint attribution separate from onchain facts as a mock attribution
  layer.
- Make it explicit that `txHash -> endpointPath` placeholder linking is expected
  to be replaced by future SDK telemetry.
