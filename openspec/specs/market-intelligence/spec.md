### Requirement: CDP discovery resources are normalized
The system SHALL fetch CDP x402 Discovery resources and normalize each resource
and payment option into repository-owned contract types.

#### Scenario: Resource with Base USDC payment option
- **WHEN** a CDP resource contains a Base USDC payment option with `resource`,
  `network`, `asset`, `amount`, and `payTo`
- **THEN** the system records a normalized resource with a normalized payment
  option containing those fields and source provenance

#### Scenario: Resource contains unsupported networks
- **WHEN** a CDP resource contains payment options for networks outside the
  requested snapshot scope
- **THEN** the system excludes those payment options from scoped Bitquery
  aggregation without dropping the normalized resource itself

### Requirement: Bitquery payment activity is aggregated
The system SHALL query Bitquery GraphQL for payment activity matching normalized
payment options and SHALL return aggregate transfer metrics for the requested
time windows.

#### Scenario: Payment option has observed transfers
- **WHEN** Bitquery returns transfers for a payment option's network, asset, and
  `payTo`
- **THEN** the system reports transaction count, unique sender count, payment
  volume, and latest observed transfer metadata for that payment option

#### Scenario: Payment option has no observed transfers
- **WHEN** Bitquery returns no matching transfers for a payment option
- **THEN** the system reports zero activity metrics for that payment option
  rather than failing the snapshot build

### Requirement: Market snapshot joins metadata and activity
The system SHALL build a market snapshot that joins CDP resource metadata with
Bitquery transfer aggregates by normalized payment option identity.

#### Scenario: CDP payment option matches Bitquery aggregate
- **WHEN** a normalized payment option and Bitquery aggregate share the same
  network, asset, and `payTo`
- **THEN** the snapshot includes the resource, payment option, source quality
  fields, and activity metrics in one market resource entry

#### Scenario: CDP and Bitquery metrics disagree
- **WHEN** CDP quality metrics and Bitquery activity metrics differ materially
- **THEN** the snapshot preserves both values and marks the resource with a
  discrepancy indicator instead of overwriting either source

### Requirement: CLI generates market reports
The system SHALL provide a CLI command that generates JSON and Markdown market
snapshot reports from CDP and Bitquery data.

#### Scenario: Snapshot command succeeds
- **WHEN** the operator runs the market snapshot command with valid Bitquery
  credentials
- **THEN** the system writes a JSON snapshot report and a Markdown summary report
  to the configured output paths

#### Scenario: Bitquery credentials are missing
- **WHEN** the operator runs a snapshot requiring Bitquery data without a
  `BITQUERY_TOKEN`
- **THEN** the system fails with a clear configuration error and does not write a
  misleading partial activity report

### Requirement: BFF does not call external sources per request
The initial market intelligence design SHALL NOT require BFF request handlers to
call CDP or Bitquery directly for product reads.

#### Scenario: Product read path is added later
- **WHEN** a BFF market intelligence endpoint is implemented after this change
- **THEN** it reads a generated snapshot, projection, or stored data rather than
  issuing live Bitquery GraphQL calls per user request
