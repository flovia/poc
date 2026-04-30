## Purpose

Market intelligence provides normalized and aggregated snapshot / projection and report data for product read APIs from CDP discovery resources and Bitquery payment activity.

## Requirements

### Requirement: Normalize CDP discovery resources

The system MUST fetch CDP x402 Discovery resources and normalize each resource and payment option into repository-owned contract types.

#### Scenario: Resource with Base USDC payment option

- **WHEN** a CDP resource contains a Base USDC payment option with `resource`, `network`, `asset`, `amount`, and `payTo`
- **THEN** the system records the resource with a normalized payment option including those fields and source provenance

#### Scenario: Resource includes unsupported network

- **WHEN** a CDP resource includes payment options for networks outside the requested snapshot scope
- **THEN** the system keeps the normalized resource but excludes those payment options from scoped Bitquery aggregation

### Requirement: Aggregate Bitquery payment activity

The system MUST query Bitquery GraphQL for payment activity matching normalized payment options and return aggregate transfer metrics for the requested time window.

#### Scenario: Transfer is observed for payment option

- **WHEN** Bitquery returns transfers for the payment option `network`, `asset`, and `payTo`
- **THEN** the system reports transaction count, unique sender count, payment volume, and latest observed transfer metadata for that payment option

#### Scenario: No observed transfer for payment option

- **WHEN** Bitquery returns no matching transfer for a payment option
- **THEN** the system does not fail snapshot build and reports zero activity metrics for that payment option

### Requirement: Market snapshot combines metadata and activity

The system MUST build a market snapshot by joining CDP resource metadata and Bitquery transfer aggregates using normalized payment option identity.

#### Scenario: CDP payment option matches Bitquery aggregate

- **WHEN** normalized payment options and Bitquery aggregates share the same `network`, `asset`, and `payTo`
- **THEN** the snapshot includes resource, payment option, source quality field, and activity metrics in one market resource entry

#### Scenario: CDP and Bitquery metrics mismatch

- **WHEN** CDP quality metrics and Bitquery activity metrics differ significantly
- **THEN** the snapshot preserves both sets of values without overwriting either source and marks the resource with a discrepancy indicator

### Requirement: CLI generates market report

The system MUST provide a CLI command that generates JSON / Markdown market snapshot reports from CDP and Bitquery data.

#### Scenario: Snapshot command succeeds

- **WHEN** the operator runs the market snapshot command with valid Bitquery credentials
- **THEN** the system writes a JSON snapshot report and a Markdown summary report to the configured output path

#### Scenario: Bitquery credential is missing

- **WHEN** the operator runs a snapshot that requires Bitquery data without `BITQUERY_TOKEN`
- **THEN** the system fails with a clear configuration error and does not write a partial or misleading activity report

### Requirement: BFF must not call external sources per request

In the initial market intelligence design, BFF request handlers MUST NOT call CDP or Bitquery directly for product read. In Phase B demo BFF, the values equivalent to Phase A snapshot/projection MUST be handled as prepared demo fixtures or read models, and fields MUST distinguish what can be explained as `onchain_fact` versus demo / future / derived fields.

#### Scenario: Product read path is added later

- **WHEN** a BFF market intelligence endpoint is implemented after this change
- **THEN** the endpoint reads generated snapshot, projection, stored data, or prepared demo read model and does not issue live Bitquery GraphQL calls per user request

#### Scenario: Phase B read model contains Phase A-equivalent values

- **WHEN** a Phase B BFF response includes Phase A-equivalent values such as wallet, pay_to, payment frequency, and co-usage
- **THEN** the system returns those values as `onchain_fact` from the prepared demo read model without re-fetching them in the request path

### Requirement: Persist CoinGecko payTo transaction facts

The system MUST persist transactions linked to CoinGecko `payTo` values as reusable transaction facts for Phase B projection generation.

As an initial target, it handles the Base USDC `payTo` `0x110cdbba7fe6434ec4ce3464cc523942ad6fb784` observed in the CDP Discovery snapshot. The capture requests 1000 transfers by default and can fetch more with an explicit limit. The captured count is stored as metadata.

#### Scenario: Persist a transaction fact

- **WHEN** the source retrieves a transaction matching a CoinGecko `payTo`
- **THEN** the system stores `txHash`, `payerWallet`, `payTo`, `amount`, `asset`, `network`, and `timestamp`
- **THEN** the stored fact can be used as an `onchain_fact`

#### Scenario: Persist capture metadata

- **WHEN** the source retrieves a transfer list matching a CoinGecko `payTo`
- **THEN** the system stores `requestedLimit`, `capturedCount`, `timeWindow`, and `source` as metadata
- **THEN** even if `capturedCount` is below `requestedLimit`, the captured facts are valid as fixtures when they satisfy the schema

#### Scenario: Do not fetch during request path

- **WHEN** a BFF product endpoint is called
- **THEN** the system must not fetch CoinGecko transaction facts from a live source

### Requirement: sources package must retrieve payTo transfer list

The system MUST be able, via the `packages/sources` source adapter, to fetch a transfer list matching the specified `network`, `asset`, and `payTo`.

#### Scenario: Fetch up to 1000 payTo transfers

- **WHEN** the caller requests a transfer list with `network`, `asset`, `payTo`, time window, and limit
- **THEN** the source adapter returns transfer facts including `txHash`, `sender`, `recipient`, `amountAtomic`, `blockNumber`, and `blockTimestamp`
- **THEN** initial implementation sets the default `limit` to 1000, and explicit limits can request more than 1000
- **THEN** returned transfer facts can be treated as `onchain_fact` for projection generation

#### Scenario: Handle source pagination

- **WHEN** the source API cannot return 1000 items at once
- **THEN** the source adapter paginates within source API constraints and retrieves transfer facts up to a maximum of 1000
- **THEN** the actual count after pagination is recorded as `capturedCount`

#### Scenario: Separate aggregate and transfer list responsibilities

- **WHEN** the caller requests market snapshot aggregate
- **THEN** the system preserves the existing aggregate response
- **WHEN** the caller requests transaction facts for Phase B projection
- **THEN** the system returns a transfer list response instead of an aggregate

### Requirement: Join mock attribution to transaction fact by txHash

The system MUST join mock endpoint attribution with real transaction facts by `txHash` during Phase B projection generation.

#### Scenario: Join attribution when txHash matches

- **WHEN** a transaction fact and mock attribution item share the same `txHash`
- **THEN** the projection builder merges onchain fields and endpoint attribution fields into the same projection record
- **THEN** provenance of onchain fields and attribution fields is not conflated

#### Scenario: Handle attribution with unmatched txHash

- **WHEN** a mock attribution item `txHash` does not exist in transaction facts
- **THEN** the projection builder fails via schema validation or a clear generation error

### Requirement: Separate projection generation from offline verification

The system MUST separate live-source-required transaction capture from projection validation that can be run offline.

#### Scenario: Run offline verification

- **WHEN** an operator runs `bun run verify`
- **THEN** the system validates against stored fixture / projection and contract validation
- **THEN** it does not require live CDP, Bitquery, RPC, or external service calls

### Requirement: Prepared market intelligence supports BFF service analytics

Prepared market intelligence data SHALL be reusable by BFF service analytics for public x402 service comparison without introducing live external calls in the BFF request path.

#### Scenario: Consume prepared x402 service intelligence

- **WHEN** BFF service analytics compares `coingecko` with other x402 API services
- **THEN** it may consume prepared service candidates, payTo activity, endpoint attribution, transaction facts, and source coverage from fixtures, snapshots, projections, or generated read models

#### Scenario: Preserve request-path offline behavior

- **WHEN** a BFF service analytics endpoint is called
- **THEN** market intelligence collection remains outside the BFF request path
- **THEN** the endpoint does not issue live CDP, Bitquery, RPC, CoinGecko, or external service calls

### Requirement: Persist market census to analytics data store

Market intelligence SHALL be able to persist CDP discovery and Bitquery aggregate census data to the analytics data store for later sampling and read-model generation.

#### Scenario: Persist CDP resources and payment options
- **WHEN** market census capture receives normalized CDP resources
- **THEN** it stores resource URLs, domains, provider/service metadata, raw source metadata, and payment options in the analytics data store

#### Scenario: Persist Bitquery aggregates
- **WHEN** Bitquery aggregate metrics are captured for scoped payment sinks
- **THEN** it stores transaction count, unique sender count, volume, latest transfer metadata, source run ID, and time window by network, asset, and payTo

### Requirement: Identify payment sink mapping patterns

Market intelligence SHALL classify the relationship between CDP resources and payment sinks for endpoint attribution and sampling.

#### Scenario: Detect bundled payTo
- **WHEN** multiple CDP resources share the same scoped network, asset, and payTo
- **THEN** market intelligence records a one-payTo-many-endpoints mapping pattern

#### Scenario: Detect direct endpoint payTo
- **WHEN** exactly one CDP resource uses a scoped network, asset, and payTo
- **THEN** market intelligence records a one-payTo-one-endpoint mapping pattern

### Requirement: Full capture reuses market census capture

Market intelligence SHALL allow full-capture orchestration to run the same CDP Discovery and Bitquery aggregate census persistence used by standalone market snapshot capture.

#### Scenario: Full capture runs census stage
- **WHEN** full-capture orchestration starts with `--all` or equivalent full census behavior
- **THEN** it captures CDP Discovery resources, deduplicates scoped payment sinks, persists Bitquery aggregate metrics, and records mapping pattern attribution before sampling begins

#### Scenario: Census stage failure is recorded
- **WHEN** CDP or Bitquery census capture fails during full-capture orchestration
- **THEN** the command records the failure in the analytics data store and does not continue to downstream sampling stages as a successful run
