## Added Requirements

### Requirement: Normalize CDP discovery resources

The system MUST fetch CDP x402 Discovery resources and normalize each resource and payment option into repository-owned contract types.

#### Scenario: Base USDC payment option resource

- **WHEN** a CDP resource includes a Base USDC payment option with `resource`, `network`, `asset`, `amount`, and `payTo`
- **THEN** the system records a normalized payment option including those fields and source provenance

#### Scenario: Resource includes unsupported network

- **WHEN** a CDP resource includes a payment option for a network outside requested snapshot scope
- **THEN** the system keeps the normalized resource but excludes that payment option from scoped Bitquery aggregation

### Requirement: Aggregate Bitquery payment activity

The system MUST query Bitquery GraphQL for transfer activity matching normalized payment options and return aggregate transfer metrics for the requested time window.

#### Scenario: payment option has observed transfers

- **WHEN** Bitquery returns transfers for payment option `network`, `asset`, and `payTo`
- **THEN** the system reports transaction count, unique sender count, payment volume, and latest observed transfer metadata for that payment option

#### Scenario: no observed transfer

- **WHEN** Bitquery returns no matching transfer for payment option
- **THEN** snapshot build does not fail and reports zero activity metrics for that payment option

### Requirement: Merge metadata and activity into market snapshot

The system MUST build market snapshot by joining CDP resource metadata and Bitquery transfer aggregates by normalized payment option identity.

#### Scenario: CDP payment option matches Bitquery aggregate

- **WHEN** normalized payment option and Bitquery aggregate share the same `network`, `asset`, and `payTo`
- **THEN** snapshot includes resource, payment option, source quality fields, and activity metrics in one market resource entry

#### Scenario: CDP and Bitquery metrics differ

- **WHEN** CDP quality metrics and Bitquery activity metrics differ significantly
- **THEN** snapshot keeps both values and attaches discrepancy indicator rather than overriding either source

### Requirement: CLI generates market report

The system MUST provide a CLI command that generates JSON / Markdown market snapshot report from CDP and Bitquery data.

#### Scenario: snapshot command succeeds

- **WHEN** operator runs market snapshot command with valid Bitquery credentials
- **THEN** system writes JSON snapshot report and Markdown summary report to configured output path

#### Scenario: missing Bitquery credential

- **WHEN** operator runs a snapshot requiring Bitquery data without `BITQUERY_TOKEN`
- **THEN** system fails with clear configuration error and does not write misleading partial activity report

### Requirement: BFF does not call external source per request

Initial market intelligence design MUST NOT require BFF request handler to call CDP or Bitquery directly for product reads.

#### Scenario: adding product read path later

- **WHEN** a BFF market intelligence endpoint is implemented after this change
- **THEN** endpoint does not issue live Bitquery GraphQL calls per user request and reads generated snapshot, projection, or stored data
