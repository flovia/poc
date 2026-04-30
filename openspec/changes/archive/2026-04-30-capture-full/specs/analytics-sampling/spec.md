## ADDED Requirements

### Requirement: Build sampling plans from analytics store inputs

Analytics sampling SHALL support CLI-driven generation of payTo and wallet sampling plans from analytics data store inputs.

#### Scenario: Build payTo plan from stored census
- **WHEN** full-capture orchestration requests payTo sampling after census persistence
- **THEN** the sampler consumes stored payTo census rows and produces deterministic selections using configured budgets, seed, mandatory sinks, activity tiers, mapping patterns, and long-tail rules

#### Scenario: Build wallet plan from stored transfer facts
- **WHEN** full-capture orchestration requests wallet sampling after transfer capture
- **THEN** the sampler consumes stored transfer facts and aggregate signals and produces deterministic wallet selections using configured budgets, caps, and seed

### Requirement: Serialize sampling plans for operators

Analytics sampling SHALL produce JSON-serializable payTo and wallet sampling plans suitable for ignored output files and analytics data store metadata.

#### Scenario: Sampling plan output is auditable
- **WHEN** a sampling plan is written by full-capture orchestration
- **THEN** the output includes seed, budgets, caps, selected entities, strata, selection reasons, supporting reasons, and generated timestamp
