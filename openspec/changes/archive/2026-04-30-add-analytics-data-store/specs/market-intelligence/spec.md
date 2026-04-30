## ADDED Requirements

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
