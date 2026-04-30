# Phase B Customer Intelligence Policy

## Purpose

For each customer wallet, the target is to answer:

> Which services is this customer using besides the partner's x402 API?

In this PoC, we treat a wallet as a customer, so endpoint naming is customer-
centric. For future additions, this should be the first choice:

```text
GET /customers/:address/intelligence
```

`profile` is the baseline Wallet 360° display, while `intelligence` is an
analysis endpoint that returns external service usage, cross-product x402 activity,
portfolio / DeFi context, and insights.

In the `add-customer-intelligence` change, `GET /customers/:address/intelligence`
was added as a read-only endpoint returning prepared read model. The BFF request
path does not call live sources; it reads customer intelligence fixtures generated
by CLI/offline capture.

## Current status

| Area | Status | Notes |
| --------------------------------------------| -------------| ----------------------------------------------|
| customer list                                 | implemented   | `GET /customers` |
| customer profile                              | implemented   | `GET /customers/:address/profile` |
| co-usage / wallet usage graph                  | implemented   | `GET /wallet-usage-graph` |
| payer wallet / amount / timestamp / txHash      | onchain fact | fixture from Bitquery |
| endpoint / workflow / service label             | demo / mock  | deterministic `txHash -> endpointPath` mock attribution |
| other x402 provider / other payTo discovery      | partial      | join outgoing transfer and CDP payment option from CLI capture |
| DeFi / portfolio / asset status                 | partial      | obtained only when Zerion capture is explicitly enabled; otherwise represented with `unavailableReason` |
| browser / E2E demo flow validation               | not ready    | mostly typecheck / unit test / route test |

## `profile` and `intelligence` responsibilities

### `GET /customers/:address/profile`

Returns profile projection needed for baseline Wallet 360° display:

- identity
- usage metrics
- providers
- timeline
- insights

Current `profile` is built from CoinGecko x402 `payTo` transaction facts and
mock attribution. `wallet address`, `amount`, `tx count`, and `timestamp` / `payTo`
are onchain facts, while endpoint name, workflow, and some provider/service labels
are demo / mock.

### `GET /customers/:address/intelligence`

Returns analysis results anchored on the customer from prepared read model:

- other x402 service candidates
- payTo activity
- cross-provider affinity
- portfolio summary
- DeFi positions
- DeFi active / inactive determination
- upsell / retention / partnership insights
- evidence / provenance

`intelligence` does not pack everything into `profile`. Heavy exploration,
external API-derived, or differently refreshed data is separated into
`intelligence`.

`profile.insights` is currently limited to short usage hypotheses required by
Wallet 360° display. `intelligence.insights` handles analysis results that combine
multiple sources, including external x402 service usage, portfolio / DeFi context,
and cross-provider affinity.

### `GET /customers/:address/intelligence/research`

`research` is a derived sub-resource of `intelligence`. Base intelligence returns
deterministic analysis/scoring/evidence, while research returns a report converted
to human-readable narrative by an LLM.

```text
GET /customers/:address/intelligence
  -> deterministic source of truth

GET /customers/:address/intelligence/research
  -> LLM-generated report derived from intelligence
```

Dependency direction is `research -> intelligence`, not `intelligence -> research`.
Requiring an LLM-generated report as a mandatory field in
`GET /customers/:address/intelligence` would make the deterministic intelligence
depend on LLM provider, prompt version, and generated fixture, which we avoid.

`intelligence/research` is separated so base intelligence can be shown even when
LLM report is not generated. BFF does not call LLM on request path; CLI/offline
jobs generate a validated report returned read-only by BFF.

## What is known now

In current Phase B, the following values are primarily onchain fact:

- payer wallet
- recipient / `payTo`
- transaction hash
- amount
- asset
- network
- timestamp
- provider-level spend
- payment activity / frequency

These are stored in `apps/bff/fixtures/phase-a/coingecko-transactions.json` and
converted by BFF projection builder into customer list/profile/wallet usage graph.

## What is not known yet

Onchain transactions alone cannot confirm:

- which endpoint was called
- which request maps to which transaction
- endpoint-level usage frequency
- workflow / use case
- request sequence
- agent type
- provider-side funnel
- confirmed name of other x402 services the customer uses
- DeFi protocol activity
- asset status such as token / NFT / LP / lending positions

Current `otherServiceCandidates` and endpoint/workflow labels are treated as demo
or future telemetry placeholders, not live data.

## Ideal form

Ideally, customer address should trigger the following intelligence pipeline:

```text
customer address
  ├─ Bitquery
  │    └─ get outgoing transfer / x402 payment / payTo activity
  ├─ CDP Discovery
  │    └─ resolve payTo -> provider / service / x402 payment option
  ├─ Zerion
  │    └─ get wallet-wide portfolio / DeFi positions
  └─ SDK telemetry (future)
       └─ correlate endpoint request / tx hash / correlation id
```

This enables answers to:

- which x402 providers customer A pays besides own provider
- which `payTo` values customer A frequently interacts with
- which service / payment option in CDP corresponds to each payment destination
- whether customer A is a DeFi active user
- customer A asset scale and protocol usage patterns
- whether there is correlation between internal API usage and external service/
  DeFi behavior

## Execution mode

In Phase B / PoC, customer intelligence exploration is **CLI / offline capture
based**.

BFF request path does not call CDP, Bitquery, Zerion, MCP, or RPC directly. BFF
returns prepared read model in read-only mode.

```text
apps/cli
  customer:intelligence capture
    -> external data retrieval by packages/sources
    -> aggregation / scoring by packages/intelligence
    -> projection validation by packages/contracts
    -> fixture / read model JSON output

apps/bff
  GET /customers/:address/intelligence
    -> read saved read model
    -> validate with packages/contracts
    -> return read-only response

  GET /customers/:address/intelligence/research
    -> read saved LLM research report
    -> validate with packages/contracts
    -> return read-only response
```

This separation keeps external API rate limits, retry, auth, and live validation
outside normal `bun run verify`.

Example command:

```sh
bun --cwd apps/cli customer:intelligence -- \
  --address 0x... \
  --network base \
  --asset USDC \
  --from 2026-01-01T00:00:00Z \
  --to 2026-04-29T23:59:59Z \
  --out apps/bff/fixtures/phase-b/customer-intelligence/0x....json
```

If using Zerion, explicitly set `--portfolio-source zerion`. In this case,
`ZERION_API_KEY` is required.

```sh
bun --cwd apps/cli customer:intelligence -- \
  --address 0x... \
  --network base \
  --asset USDC \
  --from 2026-01-01T00:00:00Z \
  --to 2026-04-29T23:59:59Z \
  --portfolio-source zerion \
  --out apps/bff/fixtures/phase-b/customer-intelligence/0x....json
```

Zerion-derived portfolio / DeFi data is context for the **entire customer
wallet**, not the `Base / USDC x402 payment` scope itself. In read model, this is
expressed as `sourceCoverage.source = "portfolio"` and
`sourceCoverage.provenance.sourceKind = "zerion"`; chain-wide context is
supplemented by `reasons`.

If Zerion returns empty positions as a successful response, it is treated as a
successful fetch with no DeFi position. However, timeout, 429, 5xx, or partial
response are not treated as DeFi inactivity facts; they are represented as
`partial` / `unavailable` coverage. Product payloads/fixtures must not include
raw Zerion responses, API keys, Authorization headers, or request metadata.

## Package split policy

Customer intelligence stays outside CLI-specific logic and is split by responsibility:

```text
packages/contracts
  - CustomerIntelligenceResponse schema
  - CustomerIntelligenceFixture schema
  - X402ServiceCandidate schema
  - PayToActivity schema
  - PortfolioSummary schema
  - DeFiPosition schema
  - provenance / evidence types

packages/sources
  - Bitquery outgoing transfers by customer
  - CDP Discovery payment option lookup
  - Zerion / MCP portfolio adapter
  - external API response parse / normalization

packages/intelligence
  - x402 service candidate extraction
  - payTo activity aggregation
  - CDP payment option join
  - confidence scoring
  - DeFi activity classification
  - customer intelligence projection builder

apps/cli
  - argument parsing
  - capture orchestration
  - fixture / read model writing
  - live command and offline verify separation

apps/bff
  - read model loading
  - contracts validation
  - GET /customers/:address/intelligence read-only delivery
```

Dependency direction remains:

```text
apps/cli
  -> packages/sources        # fetch external facts
  -> packages/intelligence   # aggregate and score fetched facts
  -> packages/contracts      # validate projection / fixture

apps/bff
  -> packages/contracts
  -> read model json

packages/intelligence
  -> packages/contracts

packages/sources
  -> packages/contracts

packages/contracts
  -> external deps only
```

`packages/sources` does not depend on `packages/intelligence`; `apps/cli` calls both
to orchestrate.

Extraction plan:

- `packages/sources`
  - `fetchOutgoingTransfersByCustomer()`
  - `fetchCdpPaymentOptions()` or reuse existing CDP Discovery adapter
  - `fetchCustomerPortfolio()` (Zerion / MCP adapter)
- `packages/intelligence`
  - `buildCustomerIntelligence()`
  - `aggregatePayToActivities()`
  - `matchPayToToPaymentOptions()`
  - `scoreServiceCandidates()`
  - `classifyDefiActivity()`
- `packages/contracts`
  - response / fixture / projection schemas
  - provenance / evidence contract
  - intelligence research report schema

Not extracted:

- CLI argument handling
- fixture writing
- BFF route implementation
- frontend DTO adapter
- demo-specific mock labels

## Recommended data classification

### `onchain_fact`

Values directly explainable from onchain or external indexer data.

- customer address
- payTo address
- tx hash
- transfer amount
- asset / network
- block timestamp
- provider-level payment count / spend
- raw token balance / position facts from Zerion / MCP

If future Zerion / MCP / SDK telemetry facts make a single `onchain_fact` lineage
insufficient, consider adding provenance values such as `external_source_fact` or
`sdk_telemetry_fact`. At Phase B, keep existing provenance set and supplement
source detail with `reasons` / `evidence` / `provenanceByField`.

### `derived_insight`

Hypotheses produced by joining/scoring multiple sources.

- other service candidate
- co-usage score
- customer segment
- DeFi active / inactive judgment
- partnership / upsell opportunity
- cross-provider affinity

### `demo_label`

Values supplemented for Phase B demo decision experience.

- endpoint name
- workflow label
- service label
- campaign / source / medium label

### `future_sdk_field`

Values requiring SDK telemetry or provider-side instrumentation.

- endpoint attribution
- request sequence
- request path
- correlation id
- agent behavior
- endpoint-level retention

## API design candidates

In current Phase B, `GET /customers/:address/intelligence` has been added contract-
first. Live source capture remains in CLI, while BFF returns saved read model.

### First candidate: customer intelligence

```text
GET /customers/:address/intelligence
```

Use cases:

- external service usage candidates
- cross x402 provider / payTo activity
- portfolio / DeFi summary
- derived insight and evidence

Expected response elements:

- `customerAddress`
- `x402Services[]`
- `payToActivities[]`
- `portfolioSummary`
- `defiPositions[]`
- `insights[]`
- `provenanceByField`
- `reasons`

Read model selection criteria must be explicit at least for:

- `address`: normalize to lowercase EVM address.
- `network`: default is `base`; when multi-chain is needed use scope or query.
- `asset`: default is `USDC`; when multi-asset is needed use scope or query.
- `timeWindow`: store capture `from`/`to` as metadata.
- missing address: decide contract-first whether to return `404` or an empty
  valid response.
- partial source: consider storing per-section `sourceCoverage` or `unavailableReason`
  when any of Bitquery / CDP / Zerion / MCP are partially unavailable.

### Alternative: split services / portfolio endpoints

Split into smaller endpoints only if needed:

```text
GET /customers/:address/services
GET /customers/:address/portfolio
```

- `services`: returns results from Bitquery + CDP Discovery join, focused on
  “what other services are used”
- `portfolio`: returns asset status, token balances, DeFi positions, and protocol
  exposure from Zerion / MCP

Start with `intelligence` unified; split only when payload size grows or update
cadence diverges.

### Derivative: intelligence research

```text
GET /customers/:address/intelligence/research
```

Use cases:

- summarize deterministic `intelligence` evidence for humans as LLM report
- expose finding / risk note / opportunity as an LLM-generated report
- pass evidence id, confidence, provenance, prompt version, and input digest to UI

Constraints:

- deterministic base intelligence implementation and validation must not depend on
  research
- do not run LLM during BFF request path
- generate research report with CLI / offline job
- LLM claims require evidence id and confidence
- do not mix onchain fact and demo label

## Implementation plan

### Step 1: customer-first x402 service candidates

Implement as CLI/offline capture.

1. In `apps/cli`, accept customer address, network, asset, time window, and output target.
2. Fetch outgoing transfer from Bitquery via `packages/sources`.
3. Extract transfer entries that can be considered x402 payment in
   `packages/intelligence`.
4. Aggregate recipient / `payTo` in `packages/intelligence`.
5. Fetch payment option / service metadata with CDP Discovery adapter in
   `packages/sources`.
6. Join payTo activity and CDP payment option in `packages/intelligence`.
7. Compute service candidates and confidence in `packages/intelligence`.
8. Validate projection using `packages/contracts`.
9. `apps/cli` outputs fixture / read model JSON.

Endpoint-level attribution is not performed in this phase.

### Step 2: BFF read model

1. Avoid live queries on BFF request path.
2. Generate fixture or projection via CLI capture/job.
3. BFF returns saved read model.
4. Make `provenance` and `reasons` mandatory.

### Step 3: portfolio / DeFi intelligence

1. Add Zerion or MCP source adapter.
2. Fetch portfolio / positions by customer address.
3. Separate raw fact from derived segments.
4. Connect to `GET /customers/:address/intelligence`.

### Step 4: replace with SDK telemetry

1. Correlate provider endpoint request and payment transaction via correlation id.
2. Replace mock endpoint attribution with real telemetry.
3. Promote endpoint-level usage / workflow / retention insight from
   `future_sdk_field` to live data.

## Current conclusion

Current Phase B currently supports **demo projections based on real onchain facts
around CoinGecko x402 payTo**.

To truly know “what other services this customer uses,” we still need:

1. customer-first outgoing payment exploration
2. `payTo -> provider/service` resolution via CDP Discovery
3. Bitquery capture support for multiple providers and payTo values
4. portfolio / DeFi intelligence from MCP or Zerion
5. future SDK telemetry-based endpoint attribution

In the near term, rather than immediately extending
`otherServiceCandidates` in `GET /wallet-usage-graph`, it is safer to first add an
independent contract for `GET /customers/:address/intelligence` and separate
x402 service candidates from portfolio / DeFi data.
