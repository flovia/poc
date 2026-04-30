## Purpose

Customer intelligence provides read-model data keyed by customer address, including x402 service candidates, payTo activity, portfolio / DeFi context, insights, and provenance.

## Requirements

### Requirement: Provide a customer intelligence contract

The system MUST provide a customer intelligence response contract keyed by customer address that can represent customer identity, capture scope, x402 service candidates, payTo activities, portfolio summary, DeFi positions, insights, provenance, and reasons.

#### Scenario: Validate a valid customer intelligence response

- **WHEN** a customer intelligence read model contains `customerAddress`, `scope`, `x402Services`, `payToActivities`, `portfolioSummary`, `defiPositions`, `insights`, `provenanceByField`, and `reasons`
- **THEN** the response can be validated against the customer intelligence schema in `packages/contracts`

#### Scenario: Preserve capture scope

- **WHEN** the customer intelligence read model is generated from CLI capture
- **THEN** the response retains normalized lowercase customer address, network, asset, and time window as metadata

### Requirement: x402 service candidate MUST include evidence and confidence

The system MUST treat an x402 service candidate created from customer outgoing payment facts and payment option metadata as a derived insight and retain confidence, reasons, and evidence.

#### Scenario: payTo matches a CDP payment option

- **WHEN** a customer outgoing transfer recipient matches the CDP payment option `payTo`, `network`, and `asset`
- **THEN** the system includes payment option identity, observed transfer metrics, confidence, and evidence in the service candidate

#### Scenario: Service identity cannot be resolved

- **WHEN** an outgoing transfer exists but does not match CDP payment option metadata
- **THEN** the system must not fabricate a confirmed service name and must retain payTo activity evidence and an unresolved reason

### Requirement: Aggregate payTo activity by customer

The system MUST aggregate customer address outgoing transfer facts by payTo, network, asset, and time window and return transaction count, spend amount, latest activity, and transaction evidence.

#### Scenario: Multiple payments exist for the same payTo

- **WHEN** the customer pays to the same network / asset / payTo multiple times
- **THEN** the system aggregates payTo activity into one entry and preserves count, total amount, latest timestamp, and tx hash evidence

#### Scenario: Payment exists outside the time window

- **WHEN** an outgoing transfer is outside the capture time window
- **THEN** the system excludes that transfer from the corresponding read model payTo activity aggregation

### Requirement: Portfolio / DeFi context must represent source coverage

When the customer intelligence response includes portfolio summary and DeFi positions, the system MUST distinguish raw source facts from derived classification and express source coverage or an unavailable reason.

#### Scenario: Portfolio source is available

- **WHEN** portfolio source returns token balance or DeFi position facts
- **THEN** the response returns portfolio summary, DeFi positions, source provenance, and derived DeFi activity classification as distinct fields

#### Scenario: Portfolio source is not captured

- **WHEN** portfolio / DeFi source is not captured or is unavailable
- **THEN** the response must not call a live source in the BFF request path and must return an unavailable reason or source coverage for that section

### Requirement: Zerion portfolio source can enrich customer intelligence

The system MUST normalize Zerion-derived portfolio summary and DeFi positions and reflect them in the customer intelligence read model when Zerion portfolio source is explicitly enabled for customer intelligence capture.

#### Scenario: Zerion portfolio capture succeeds

- **WHEN** the operator enables Zerion capture and runs the customer intelligence capture command with a valid `ZERION_API_KEY`
- **THEN** the system normalizes the Zerion response into repository-owned portfolio summary / DeFi position DTOs
- **THEN** the customer intelligence response sets portfolio source coverage to `available` and retains Zerion provenance

#### Scenario: Zerion returns DeFi positions

- **WHEN** the Zerion source returns protocol position facts
- **THEN** the response includes protocol, position type, value, network, provenance, and evidence or reasons in `defiPositions`
- **THEN** the system treats DeFi active classification as a derived insight and distinguishes it from raw source facts

### Requirement: Express Zerion unavailable / partial source states

The system MUST not fabricate portfolio / DeFi context and must represent source coverage and unavailable / partial reason when Zerion capture is disabled, unconfigured, or partially failing.

#### Scenario: Zerion capture is disabled

- **WHEN** the operator runs customer intelligence capture command without enabling Zerion capture
- **THEN** the response still generates a valid customer intelligence read model as before
- **THEN** portfolio source coverage includes an unavailable reason and live Zerion is not called in the BFF request path

#### Scenario: Zerion credential is missing

- **WHEN** the operator enables Zerion capture but `ZERION_API_KEY` is missing
- **THEN** the command fails with a clear configuration error
- **THEN** the system must not write a partial read model as successful

#### Scenario: Zerion source temporarily fails

- **WHEN** the Zerion API returns timeout, rate limit, or server error
- **THEN** the system does not conclude DeFi is inactive and must retain a reason as partial or unavailable source coverage

### Requirement: CLI generates customer intelligence read model

The system MUST provide a CLI capture command that accepts customer address, network, asset, time window, and output path, fetches external source facts, and generates customer intelligence read model JSON.

#### Scenario: Capture command succeeds

- **WHEN** the operator runs the customer intelligence capture command with a valid source configuration and output path
- **THEN** the system writes customer intelligence fixture / read model JSON and passes contract validation

#### Scenario: Required credential is missing

- **WHEN** the operator runs the command without required credentials for live source capture
- **THEN** the system fails with a clear configuration error and does not write a confusing partial read model as successful

### Requirement: Default verification stays offline

The system MUST keep customer intelligence live source capture out of the normal verify path and preserve reproducible offline default verification.

#### Scenario: Run root verify

- **WHEN** a developer runs `bun run verify` at repo root
- **THEN** the system verifies using fixture / unit / route tests and does not require live Bitquery, CDP, Zerion, MCP, or RPC access

#### Scenario: Verify live source capture

- **WHEN** the operator validates live customer intelligence capture
- **THEN** the system requires credentials and external source availability through a command path separate from default verify

### Requirement: Zerion data must not make default verification live

The system MUST validate Zerion integration through unit / CLI tests using fixtures or mocked fetch and must not require live Zerion access or credentials in default `bun run verify`.

#### Scenario: Run root verify

- **WHEN** a developer runs `bun run verify` at repo root
- **THEN** the system verifies from offline fixtures / mocked responses and does not require `ZERION_API_KEY`

#### Scenario: Verify live Zerion capture

- **WHEN** the operator runs live Zerion portfolio capture
- **THEN** the system requires credentials and external source availability through an explicit command path separate from default verify

#### Scenario: Populate prepared fixture from live Zerion capture result

- **WHEN** the operator uses the `.env` `ZERION_API_KEY` to retrieve target wallet portfolio / DeFi information and generate customer intelligence read model JSON
- **THEN** the generated read model validates against the customer intelligence schema
- **THEN** even when copied into a prepared fixture, raw Zerion response, API key, auth header, and request metadata are excluded
- **THEN** the BFF can verify the updated prepared fixture in an offline route test

### Requirement: Zerion raw response is not exposed in product payload

The system MUST not expose Zerion-provider-specific raw responses as BFF product API output, and must convert them into normalized portfolio summary, DeFi positions, source coverage, provenance, and evidence fields.

#### Scenario: BFF returns customer intelligence

- **WHEN** a client calls `GET /customers/:address/intelligence`
- **THEN** the response returns normalized portfolio / DeFi fields from the prepared read model
- **THEN** the response does not include Zerion raw JSON, API key, auth header, or request metadata

### Requirement: Batch customer intelligence capture for sampled wallets

Customer intelligence SHALL support batch capture for sampled wallets and store generated snapshots outside git-tracked fixtures.

#### Scenario: Capture sampled wallet intelligence
- **WHEN** a wallet sampling plan selects customer addresses
- **THEN** the customer intelligence capture job fetches outgoing transfers for each selected wallet within the configured scope and stores validated snapshots in the analytics data store or ignored generated output path

#### Scenario: Preserve source coverage per wallet
- **WHEN** customer intelligence capture succeeds or partially succeeds for a wallet
- **THEN** the stored snapshot records Bitquery, CDP discovery, and optional portfolio source coverage

#### Scenario: Portfolio enrichment is capped
- **WHEN** portfolio enrichment is enabled for sampled wallets
- **THEN** the capture job applies configured caps and records when portfolio data is unavailable or skipped

### Requirement: Do not commit generated customer intelligence

Customer intelligence SHALL treat raw wallet intelligence, payer overlap, and portfolio enrichment as generated data excluded from git.

#### Scenario: Generated customer intelligence output is ignored
- **WHEN** customer intelligence batch capture writes snapshots or local database records
- **THEN** the generated artifacts are stored in ignored paths and are not required for repository operation or verification
