## ADDED Requirements

### Requirement: Generate provider catalog read model
The analytics data store SHALL generate a BFF-oriented provider catalog read model from existing CDP resource, payment sink, aggregate, endpoint attribution, service candidate, and transfer fact data.

#### Scenario: Generate provider rows from census data
- **WHEN** read-model generation runs against an analytics SQLite database with CDP/payment-sink census data
- **THEN** the generated read model includes provider rows with network, asset, payTo, service identity when known, aggregate transaction count, aggregate unique sender count, endpoint count, resource count, mapping pattern, endpoint attribution status, and attribution confidence

#### Scenario: Mark customer drilldown availability
- **WHEN** a payment sink has sampled transfer facts with payer wallets
- **THEN** the generated provider row for that network, asset, and payTo is marked as having customer facts
- **THEN** payment sinks without sampled transfer facts are not marked as customer-drilldown ready

#### Scenario: Keep provider catalog generated and ignored
- **WHEN** the provider catalog read model is written to disk
- **THEN** it is included only in ignored generated analytics output and is not required to be committed to git

### Requirement: Preserve payTo-level identity in provider catalog
The analytics data store SHALL preserve payTo-level identity in generated provider catalog rows even when multiple payTos map to one service or one payTo maps to multiple resources.

#### Scenario: One service has multiple payTos
- **WHEN** multiple payment sinks share a service identity
- **THEN** read-model generation emits distinct provider catalog rows for each network, asset, and payTo combination

#### Scenario: One payTo maps to multiple resources
- **WHEN** a payment sink maps to multiple CDP resources
- **THEN** the provider row preserves bundled-payTo attribution status and does not claim endpoint-level transaction facts as direct observations
