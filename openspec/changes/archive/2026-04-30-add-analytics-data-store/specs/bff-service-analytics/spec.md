## ADDED Requirements

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
