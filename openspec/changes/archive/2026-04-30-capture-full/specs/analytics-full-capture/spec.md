## ADDED Requirements

### Requirement: Run full offline analytics capture from one CLI command

The system SHALL provide an `analytics:capture-full` CLI command that orchestrates market census capture, payTo sampling, transfer capture, wallet sampling, customer intelligence batch capture, and read-model generation.

#### Scenario: Full capture succeeds
- **WHEN** an operator runs `analytics:capture-full` with analytics DB path, network, asset, time window, budgets, and valid source credentials
- **THEN** the command captures census data, generates sampling plans, captures selected transfer facts, captures selected customer intelligence, generates service analytics read models, and exits successfully

#### Scenario: Full capture records top-level run metadata
- **WHEN** the full capture command starts
- **THEN** the analytics data store records a top-level capture run with input parameters, started timestamp, source coverage, stage progress, final status, and errors when present

### Requirement: Support dry-run planning without live source calls

The system SHALL support a dry-run mode that validates arguments and shows the planned capture stages without calling CDP, Bitquery, Zerion, or other live services.

#### Scenario: Dry run prints plan
- **WHEN** an operator runs `analytics:capture-full --dry-run`
- **THEN** the command reports the stages, configured budgets, output paths, and required credentials without writing generated raw capture data or calling live sources

### Requirement: Generate auditable sampling plan outputs

The system SHALL write payTo and wallet sampling plans to ignored generated output paths and persist their metadata in the analytics data store.

#### Scenario: PayTo sampling plan is generated
- **WHEN** the full capture command completes census capture
- **THEN** it builds a deterministic payTo sampling plan from stored census rows and records selected payTos, strata, budgets, seed, and selection reasons

#### Scenario: Wallet sampling plan is generated
- **WHEN** sampled payTo transfer facts are captured
- **THEN** it builds a deterministic wallet sampling plan from stored transfer facts and records selected wallets, strata, caps, seed, and selection reasons

### Requirement: Bound expensive capture stages

The system SHALL bound transfer and customer intelligence capture through explicit budgets, per-payTo limits, time slicing, and portfolio enrichment caps.

#### Scenario: PayTo transfer capture is bounded
- **WHEN** sampled payTos are captured
- **THEN** the command applies the configured per-payTo transfer limit and optional slice size to each selected payment sink

#### Scenario: Portfolio enrichment is bounded
- **WHEN** customer intelligence capture uses portfolio enrichment
- **THEN** the command applies the configured portfolio limit and records skipped portfolio coverage for wallets beyond the cap

### Requirement: Keep full-capture generated artifacts ignored

The system SHALL write full-capture generated DBs, raw transfer facts, sampling plans, customer intelligence snapshots, progress outputs, and read models only to ignored paths.

#### Scenario: Generated outputs are private by default
- **WHEN** the full capture command writes outputs
- **THEN** those outputs are stored under ignored generated analytics paths and are not required for repository verification
