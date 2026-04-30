# Phase B: real transaction + mock endpoint attribution plan

## Purpose

In the Phase B demo, we use **real onchain transactions** tied to CoinGecko `payTo`, and fill the endpoint path / workflow gaps that cannot be inferred from onchain data alone with **mock attribution**.

This moves the implementation toward this shape instead of fully manual demo data:

```text
real onchain tx facts
  + mock endpoint attribution
  -> Phase B demo projection
  -> BFF read-only API
```

## Background

CoinGecko has multiple endpoints to cover in the demo.

```text
CoinGecko endpoint A
CoinGecko endpoint B
CoinGecko endpoint C
CoinGecko endpoint D
CoinGecko endpoint E
```

When payment for those endpoints is aggregated to the same `payTo`, public/onchain data alone cannot determine which transaction matches which endpoint request.

```text
endpoint A ┐
endpoint B ┤
endpoint C ├── same payTo
endpoint D ┤
endpoint E ┘
```

For now, we therefore need to maintain a mock mapping for `txHash -> endpointPath`.

## Guiding Policy

Phase B adopts the following policy.

1. Trace real transactions from CoinGecko `payTo`.
2. Treat values derived from real transactions as `onchain_fact`.
3. Attach endpoint path / workflow / request context as mock attribution.
4. Treat values from mock attribution as `demo_label` or `future_sdk_field`.
5. Do not treat derived insight as real data when its evidence includes mock attribution.

## Data Flow

```text
CoinGecko payTo
  │
  ▼
Bitquery / RPC / explorer source
  │
  ▼
real onchain tx list
  - txHash
  - payerWallet
  - payTo
  - amount
  - asset
  - network
  - timestamp
  │
  │ join by txHash
  ▼
mock endpoint attribution
  - txHash
  - endpointPath
  - endpointName
  - workflowLabel
  - requestMethod
  - mock reason
  │
  ▼
Phase B projection
  - customer list
  - customer profile
  - wallet usage graph
  │
  ▼
BFF read-only API
  - GET /customers
  - GET /customers/:address/profile
  - GET /wallet-usage-graph
```

## Layer Separation

### 1. Onchain fact layer

Actual data that can be obtained from onchain sources.

```text
provenance: onchain_fact
```

Examples:

- `txHash`
- `payerWallet`
- `payTo`
- `amount`
- `asset`
- `network`
- `timestamp`
- `paymentFrequency`
- `providerLevelSpend`

### 2. Mock attribution layer

Values attached for the demo when they cannot be determined from onchain data alone.

```text
provenance: demo_label | future_sdk_field
```

Examples:

- `endpointPath`
- `endpointName`
- `workflowLabel`
- `requestMethod`
- `requestSequence`
- `endpointUsageFrequency`
- `paymentIntentId`
- `correlationId`

### 3. Derived insight layer

Hypotheses created from onchain facts plus mock attribution.

```text
provenance: derived_insight
```

Examples:

- retention hypothesis
- upsell candidate
- partnership opportunity
- co-usage story
- power user label

## Mock attribution fixture

Manage initially as a JSON fixture.

Candidate path:

```text
apps/bff/fixtures/phase-b/mock-attribution.json
```

Example:

```json
{
  "providerId": "coingecko",
  "version": "phase-b-demo-v1",
  "generatedAt": "2026-04-29T00:00:00.000Z",
  "items": [
    {
      "txHash": "0xabc...",
      "endpointPath": "/api/v3/simple/price",
      "endpointName": "Simple Price",
      "workflowLabel": "price lookup",
      "requestMethod": "GET",
      "provenanceByField": {
        "txHash": "onchain_fact",
        "endpointPath": "demo_label",
        "endpointName": "demo_label",
        "workflowLabel": "demo_label",
        "requestMethod": "future_sdk_field"
      },
      "reasons": [
        {
          "provenance": "demo_label",
          "label": "manual demo attribution",
          "description": "Endpoint attribution is mocked because public onchain data cannot distinguish CoinGecko endpoints sharing the same payTo."
        }
      ]
    }
  ]
}
```

## Key Constraints

- Do not create `payerWallet`, `payTo`, `amount`, or `timestamp` in the mock attribution fixture.
- Those fields must come from real onchain tx facts.
- Use `txHash` as the join key for mock attribution fixtures by default.
- Do not treat `endpointPath` as an onchain fact.
- Preserve provenance at field level in BFF response.
- Do not call live CDP / Bitquery / RPC on request path.
- Return generated projection / fixture as read-only from BFF.

## Future SDK replacement

Eventually, replace the mock attribution layer with SDK middleware telemetry.

Expected values captured by SDK:

- `requestId`
- `providerId`
- `endpointPath`
- `method`
- `requestTimestamp`
- `wallet / customer context`
- `paymentIntentId`
- `txHash`
- `correlationId`
- `requestMetadata`

Ideal flow after replacement:

```text
SDK request event
  + onchain tx fact
  -> real endpoint attribution
  -> product analytics projection
  -> BFF/API
```

## Proposed implementation steps

### Step 1: Collect real transactions

Collect related transactions from CoinGecko `payTo`.

Candidate output:

```text
fixtures/phase-a/coingecko-transactions.json
```

Fields to retain:

- `txHash`
- `payerWallet`
- `payTo`
- `amount`
- `asset`
- `network`
- `timestamp`

### Step 2: Create mock attribution fixture

Assign demo endpoint path values for each real tx `txHash`.

Candidate output:

```text
apps/bff/fixtures/phase-b/mock-attribution.json
```

### Step 3: Create projection builder

Join onchain tx facts and mock attribution by `txHash` to produce Phase B canonical response.

Candidate outputs:

```text
apps/bff/fixtures/phase-b/customer-list.json
apps/bff/fixtures/phase-b/customer-profiles.json
apps/bff/fixtures/phase-b/wallet-usage-graph.json
```

### Step 4: Switch BFF read source

Migrate from the current in-file deterministic read model to reading generated projection fixtures.

### Step 5: Add provenance tests

At minimum, test:

- `txHash` is `onchain_fact`
- `endpointPath` is `demo_label` or `future_sdk_field`
- `derived_insight` has `reasons`
- BFF response passes contract schema

## Success Criteria

- BFF demo response includes real tx hash values.
- The response clearly indicates endpoint attribution is mocked.
- BFF runtime does not call live sources.
- Phase A facts and Phase B mock attribution boundaries are separated in fixture / projection.
- The eventual replacement path toward SDK telemetry is clearly defined.

## Out of scope

- Full implementation of SDK middleware
- Live RPC / Bitquery calls on request path
- Onchain inference of endpoint attribution
- Claiming that all CoinGecko endpoint usage is fully real data
- Authentication, billing, and production multi-tenancy
