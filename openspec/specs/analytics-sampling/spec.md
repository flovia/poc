## Purpose

Analytics sampling defines deterministic payTo and wallet sampling plans that reduce source bias, preserve selection metadata, and bound downstream customer intelligence collection.

## Requirements

### Requirement: Build deterministic payTo sampling plan

The system SHALL build a deterministic payTo sampling plan from census data using recorded strata, budgets, random seed, and selection reasons.

#### Scenario: Include mandatory payTos
- **WHEN** a payTo sampling plan is generated
- **THEN** it includes all configured mandatory payment sinks, including coingecko payTos and high-priority bundled payTos, subject to explicit safety caps

#### Scenario: Sample by activity tier
- **WHEN** census payTo aggregates include transaction counts
- **THEN** the sampler assigns payment sinks to activity tiers such as `0`, `1`, `2-5`, `6-20`, `21-100`, `101-1000`, and `1000+` transactions and selects payTos according to configured per-tier budgets

#### Scenario: Sample by mapping pattern
- **WHEN** CDP resource mappings are available
- **THEN** the sampler distinguishes one-payTo-one-endpoint, one-payTo-many-endpoints, many-payTos-one-service, and unresolved payTo patterns

#### Scenario: Sampling is reproducible
- **WHEN** the same census data, seed, and budget configuration are used
- **THEN** the sampler produces the same selected payTos and selection reasons

### Requirement: Reduce service and discovery-order bias

The sampler SHALL reduce bias from CDP discovery order, high-activity services, resource duplication, and coingecko-only focus.

#### Scenario: Avoid resource duplication dominance
- **WHEN** many resources share the same payment sink or service domain
- **THEN** the sampler groups by payment sink and service identity before applying resource-level budgets

#### Scenario: Include long-tail and unresolved services
- **WHEN** active low-volume or unresolved payTos exist in census data
- **THEN** the sampler selects a configured number of those payment sinks in addition to high-activity services

### Requirement: Build deterministic wallet sampling plan

The system SHALL build a deterministic wallet sampling plan from captured transfer facts and aggregate signals using recorded strata, budgets, random seed, and selection reasons.

#### Scenario: Sample coingecko wallet segments
- **WHEN** coingecko payer facts are available
- **THEN** the sampler can select repeat users, high spenders, one-shot users, recent users, and random coingecko payers according to configured budgets

#### Scenario: Sample peer service wallet segments
- **WHEN** peer service transfer facts are available
- **THEN** the sampler can select wallets from peer service users, cross-service users, bundled-payTo users, high spenders, and random long-tail users according to configured budgets

#### Scenario: Cap customer intelligence collection
- **WHEN** a wallet sampling plan is generated
- **THEN** the plan records collection caps and optional portfolio enrichment caps so customer intelligence capture remains bounded and explainable

### Requirement: Preserve sampling metadata in outputs

The system SHALL preserve sampling metadata in capture outputs and read models.

#### Scenario: PayTo selected for multiple reasons
- **WHEN** a payment sink matches multiple strata or mandatory rules
- **THEN** the sampling plan records all applicable selection reasons or a primary reason plus supporting reasons

#### Scenario: Read model uses sampled data
- **WHEN** service analytics read models are generated from sampled facts
- **THEN** the response includes sample basis, coverage, and provenance fields sufficient to explain that detailed facts are sampled rather than complete global totals

### Requirement: Build sampling plans from analytics store inputs

Analytics sampling SHALL support CLI-driven generation of payTo and wallet sampling plans from analytics data store inputs.

#### Scenario: Build payTo plan from stored census
- **WHEN** full-capture orchestration requests payTo sampling after census persistence
- **THEN** the sampler consumes stored payTo census rows and produces deterministic selections using configured budgets, seed, mandatory sinks, activity tiers, mapping patterns, and long-tail rules

#### Scenario: Build wallet plan from stored transfer facts
- **WHEN** full-capture orchestration requests wallet sampling after transfer capture
- **THEN** the sampler consumes stored transfer facts and aggregate signals and produces deterministic wallet selections using configured budgets, caps, and seed

### Requirement: Serialize sampling plans for operators

Analytics sampling SHALL produce JSON-serializable payTo and wallet sampling plans suitable for ignored output files and analytics data store metadata, with generated timestamps that reflect the capture or plan generation time while deterministic selection remains controlled by seed and inputs.

#### Scenario: Sampling plan output is auditable
- **WHEN** a sampling plan is written by full-capture orchestration
- **THEN** the output includes seed, budgets, caps, selected entities, strata, selection reasons, supporting reasons, and generated timestamp

#### Scenario: Sampling plan accepts explicit generated timestamp
- **WHEN** the sampler receives an explicit generated timestamp
- **THEN** the serialized sampling plan uses that timestamp
- **THEN** selected payTos or wallets remain determined by the seed, budgets, caps, and input rows rather than by the timestamp

#### Scenario: Sampling plan defaults to current generated timestamp
- **WHEN** the sampler does not receive an explicit generated timestamp
- **THEN** the serialized sampling plan uses a non-epoch current timestamp suitable for operator audit trails
