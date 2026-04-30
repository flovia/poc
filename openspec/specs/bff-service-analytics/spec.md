## Purpose

BFF service analytics provides read-only macro analytics for coingecko and public x402 service comparison from prepared fixtures, projections, and generated read models.

## Requirements

### Requirement: Expose coingecko service summary

The BFF SHALL expose a read-only analytics response for the `coingecko` service that summarizes macro user behavior from prepared transaction, attribution, and service intelligence data.

#### Scenario: Return coingecko summary

- **WHEN** a client requests the coingecko service summary
- **THEN** the response includes `serviceId` equal to `coingecko`, user count, transaction count, average transactions per user, repeat user rate, top endpoint metrics, and comparison metrics against the available x402 service universe

#### Scenario: Summary uses prepared data only

- **WHEN** the BFF builds or serves the coingecko service summary
- **THEN** it reads prepared fixtures, projections, or generated read models
- **THEN** it does not call CoinGecko, CDP, Bitquery, RPC providers, or other external services during the request path

### Requirement: Expose x402 service comparison

The BFF SHALL expose a read-only service comparison response that compares `coingecko` with other public x402 API services available in prepared service intelligence data.

#### Scenario: Return service comparison list

- **WHEN** a client requests service comparison analytics
- **THEN** the response includes `coingecko` and peer service entries with service identity, user count, transaction count, repeat user rate, average transactions per user, endpoint diversity, overlap with coingecko when derivable, and provenance

#### Scenario: Preserve sparse comparison context

- **WHEN** a peer service has limited prepared activity data
- **THEN** the response includes the available counts and provenance rather than fabricating unsupported metrics

### Requirement: Expose quadrant-ready comparison data

The BFF SHALL expose quadrant-ready service comparison data using average transactions per user as the X axis and endpoint diversity as the Y axis.

#### Scenario: Return quadrant axis metadata

- **WHEN** a client requests service quadrant analytics
- **THEN** the response identifies the X axis as `averageTransactionsPerUser` and the Y axis as `endpointDiversity`

#### Scenario: Return coingecko quadrant point

- **WHEN** prepared coingecko data is available
- **THEN** the quadrant response includes a point for `coingecko` with numeric X and Y values derived from prepared data

#### Scenario: Return peer service quadrant points

- **WHEN** prepared peer x402 service data is available
- **THEN** the quadrant response includes peer service points using the same axis definitions as `coingecko`

### Requirement: Preserve analytics provenance

The BFF SHALL preserve provenance in service analytics responses so clients can distinguish onchain facts, demo attribution labels, derived metrics, and prepared public intelligence.

#### Scenario: Return provenance with service metrics

- **WHEN** a service analytics response includes derived service metrics
- **THEN** the response includes provenance or source indicators sufficient to explain the metric inputs

#### Scenario: Do not conflate attribution with onchain facts

- **WHEN** endpoint attribution is joined with transaction facts
- **THEN** service analytics responses do not represent demo endpoint attribution as an onchain fact

### Requirement: Omit chain-tab analytics in initial service analytics

The BFF SHALL NOT require Solana / Base tabbed response shapes for the initial service analytics APIs.

#### Scenario: Return service analytics without chain tabs

- **WHEN** a client requests the initial service summary, comparison, or quadrant analytics
- **THEN** the response is valid without `solana` and `base` tab sections

### Requirement: Read analytics from data store or generated read model

BFF service analytics SHALL support reading service analytics from the local analytics data store or an ignored generated read model instead of relying only on committed coingecko JSON fixtures.

#### Scenario: Read generated service analytics
- **WHEN** a generated service analytics read model is available
- **THEN** BFF service analytics responses are built from that read model without live external calls

#### Scenario: Preserve fixture fallback during migration
- **WHEN** no local analytics data store or generated read model is configured during the migration period
- **THEN** BFF service analytics may continue to use small committed demo fixtures for deterministic tests

### Requirement: Expose endpoint attribution confidence

BFF service analytics SHALL expose endpoint attribution status and confidence where endpoint-level metrics depend on payTo-to-resource mapping.

#### Scenario: Bundled payTo endpoint metrics are unknown
- **WHEN** a service uses one payTo for multiple endpoints and no explicit attribution signal exists
- **THEN** BFF analytics does not report endpoint transaction counts as factual endpoint observations and marks attribution as `bundled_payto_unknown_endpoint`

#### Scenario: Direct payTo endpoint metrics are derived
- **WHEN** a payment sink maps to exactly one endpoint
- **THEN** BFF analytics may report endpoint-derived metrics with provenance indicating onchain facts joined to CDP mapping
