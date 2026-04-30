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
