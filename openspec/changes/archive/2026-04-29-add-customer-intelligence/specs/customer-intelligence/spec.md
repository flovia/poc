## ADDED Requirements

### Requirement: Provide a customer intelligence contract

The system MUST provide an intelligence response contract keyed by customer address that can represent customer identity, capture scope, x402 service candidates, payTo activities, portfolio summary, DeFi positions, insights, provenance, and reasons.

#### Scenario: Validate a valid customer intelligence response

- **WHEN** customer intelligence read model includes `customerAddress`, `scope`, `x402Services`, `payToActivities`, `portfolioSummary`, `defiPositions`, `insights`, `provenanceByField`, and `reasons`
- **THEN** response can be validated with the customer intelligence schema in `packages/contracts`

#### Scenario: Preserve capture scope

- **WHEN** customer intelligence read model is generated from CLI capture
- **THEN** response keeps normalized lowercase customer address, network, asset, and time window as metadata

### Requirement: x402 service candidates keep confidence and evidence

The system MUST retain confidence, reasons, and evidence when creating x402 service candidates from customer outgoing payment facts and payment option metadata. Such candidates are treated as derived insights.

#### Scenario: payTo matches a CDP payment option

- **WHEN** the customer outgoing transfer recipient matches the CDP payment option `payTo`, `network`, and `asset`
- **THEN** the system includes payment option identity, observed transfer metrics, confidence, and evidence in the service candidate

#### Scenario: Service identity cannot be resolved

- **WHEN** an outgoing transfer exists but does not match CDP payment option metadata
- **THEN** the system must not fabricate a resolved service name and must retain payTo activity evidence with unresolved reason

### Requirement: Aggregate payTo activity by customer

The system MUST aggregate customer address outgoing transfer facts by payTo, network, asset, and time window and return transaction count, spend amount, latest activity, and tx evidence.

#### Scenario: Multiple payments for the same payTo

- **WHEN** the customer pays multiple times to the same network / asset / payTo
- **THEN** the system aggregates payTo activity into one entry and preserves count, total amount, latest timestamp, and tx hash evidence

#### Scenario: Payment outside capture window

- **WHEN** an outgoing transfer is outside the capture time window
- **THEN** the system excludes that transfer from the corresponding read model payTo activity aggregation

### Requirement: Portfolio / DeFi context expresses source coverage

When including portfolio summary and DeFi positions in customer intelligence response, the system MUST distinguish raw source facts from derived classification and express source coverage or unavailable reason.

#### Scenario: Portfolio source is available

- **WHEN** portfolio source returns token balance or DeFi position fact
- **THEN** response returns portfolio summary, DeFi positions, source provenance, and derived DeFi activity classification distinctly

#### Scenario: Portfolio source is not captured

- **WHEN** portfolio / DeFi source has not been captured or is unavailable
- **THEN** response returns an unavailable reason or source coverage and does not call live source in BFF request path

### Requirement: CLI generates customer intelligence read model

The system MUST provide a CLI capture command that accepts customer address, network, asset, time window, and output path, fetches external source facts, and generates customer intelligence read model JSON.

#### Scenario: Capture command succeeds

- **WHEN** operator runs customer intelligence capture command with valid source configuration and output path
- **THEN** system outputs customer intelligence fixture / read model JSON and passes contract validation

#### Scenario: Missing required credentials

- **WHEN** operator runs command without credentials required for live source capture
- **THEN** system fails with a clear configuration error and does not emit a successful partial read model

### Requirement: Keep default verification offline

The system MUST keep customer intelligence live source capture out of normal verify flow and preserve default verification as offline-reproducible.

#### Scenario: Run root verify

- **WHEN** a developer runs `bun run verify` at repository root
- **THEN** system can be verified using fixture / unit / route tests without requiring live Bitquery, CDP, Zerion, MCP, or RPC access

#### Scenario: Validate live source capture

- **WHEN** operator validates live customer intelligence capture
- **THEN** system requests credentials and external source availability in a separate command path from default verify
