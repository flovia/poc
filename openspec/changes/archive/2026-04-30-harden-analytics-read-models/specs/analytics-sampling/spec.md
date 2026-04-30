## MODIFIED Requirements

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
