## Purpose

Analytics data store provides local generated storage for expanded analytics captures, source coverage, attribution data, transfer facts, customer intelligence snapshots, and BFF-oriented read models without committing raw capture data to git.

## Requirements

### Requirement: Store analytics captures in local ignored SQLite database

The system SHALL store expanded analytics capture outputs in a local SQLite database that is not committed to the public repository.

#### Scenario: Initialize analytics database
- **WHEN** an operator runs the analytics data store initialization
- **THEN** the system creates or migrates the local SQLite database with tables for capture runs, CDP resources, payment options, payTo aggregates, transfer facts, service candidates, endpoint attribution, customer wallets, customer intelligence snapshots, and generated read models

#### Scenario: Generated database is ignored
- **WHEN** the analytics database is created in the configured local data path
- **THEN** git ignore rules prevent the database, WAL / SHM files, and generated analytics output directories from being committed

### Requirement: Track capture runs and source coverage

The system SHALL record every offline analytics collection job as a capture run with parameters, source coverage, status, timestamps, and errors when present.

#### Scenario: Capture run succeeds
- **WHEN** a CDP, Bitquery, payTo transfer, customer intelligence, or read-model generation job completes successfully
- **THEN** the data store records the run kind, started and finished timestamps, input parameters, source coverage, and success status

#### Scenario: Capture run fails
- **WHEN** an offline analytics collection job fails
- **THEN** the data store records the failure status and error details without marking partial outputs as a complete successful run

### Requirement: Separate service, resource, and payment sink entities

The system SHALL model x402 service identity, endpoint / resource identity, and payment sink identity as separate entities.

#### Scenario: One payTo maps to one endpoint
- **WHEN** a payment sink maps to exactly one discovered CDP resource in the scoped census
- **THEN** the system can mark endpoint attribution for that payment sink as `direct_payto_endpoint` with provenance from onchain facts and CDP mapping

#### Scenario: One payTo maps to multiple endpoints
- **WHEN** a payment sink maps to multiple discovered CDP resources in the scoped census
- **THEN** the system marks endpoint attribution as `bundled_payto_unknown_endpoint` unless amount, SDK, provider, or other explicit attribution evidence is available

#### Scenario: PayTo has no matching resource
- **WHEN** a transaction or customer outgoing transfer references a payTo that is absent from the CDP census
- **THEN** the system records the payment sink as unresolved and does not fabricate service or endpoint identity

### Requirement: Store broad CDP and payTo aggregate census data

The system SHALL support broad census capture for CDP discovery resources and Bitquery aggregate metrics for scoped payment sinks.

#### Scenario: Capture all CDP discovery resources
- **WHEN** an operator requests full CDP discovery capture
- **THEN** the system pages through available CDP discovery resources and stores normalized resources and payment options in the analytics database

#### Scenario: Capture payTo aggregate census
- **WHEN** CDP payment options are available for a scoped network and asset
- **THEN** the system deduplicates payment sinks and stores aggregate transaction count, unique sender count, total volume, latest transfer metadata, and time window for each scoped payTo

### Requirement: Store payTo transfer facts with transfer-level identity

The system SHALL store sampled payTo transfer facts with an identity that is not limited to tx hash alone.

#### Scenario: Store transfer fact
- **WHEN** a sampled payTo transfer is captured
- **THEN** the system stores network, asset, payTo, tx hash, transfer index or ordinal when available, payer wallet, amount, block number, timestamp, and source run ID

#### Scenario: Transaction contains multiple transfers
- **WHEN** multiple transfer facts share a transaction hash
- **THEN** the system can store distinct transfer facts using network, payment sink, transaction hash, and transfer index or ordinal identity

### Requirement: Keep raw generated analytics data out of git

The system SHALL treat raw transfer facts, payer wallets, tx hashes, customer intelligence captures, portfolio enrichment, cross-service overlap data, local SQLite databases, and large generated read models as generated data that is ignored by git.

#### Scenario: Commit safe artifacts only
- **WHEN** developers add analytics code or tests
- **THEN** the repository contains schemas, migrations, collectors, samplers, synthetic fixtures, docs, and tests, but not raw generated capture data

### Requirement: Generate read models from stored analytics data

The system SHALL generate BFF-oriented service analytics read models from the analytics data store or ignored generated read-model files with service/payment-sink rows deduplicated before service rollups and endpoint summaries are produced.

#### Scenario: Generate service analytics read model
- **WHEN** the operator runs read-model generation after census and sampled captures
- **THEN** the system writes or updates service summary, service comparison, and quadrant-ready analytics payloads with provenance, sample basis, and endpoint attribution status

#### Scenario: Deduplicate service payment sink rows
- **WHEN** a payment sink has multiple discovered resources or service candidate rows for the same service identity
- **THEN** read-model generation counts the payment sink's aggregate transaction count and unique sender count at most once for that service identity
- **THEN** endpoint diversity is derived from distinct resources rather than duplicated join rows

#### Scenario: Regenerate read model from local store only
- **WHEN** read-model generation is run against an existing analytics SQLite database
- **THEN** the system produces corrected generated read-model artifacts without calling CDP, Bitquery, RPC providers, CoinGecko, Zerion, or other external services

### Requirement: Expose analytics store query inputs for full capture

The analytics data store SHALL expose query helpers that provide normalized payTo census rows, endpoint attribution rows, transfer facts, and wallet sampling input rows for full-capture orchestration.

#### Scenario: Read payTo census rows
- **WHEN** full-capture orchestration needs to build a payTo sampling plan
- **THEN** the data store returns scoped payment sinks joined with aggregate activity, mapping pattern, service identity, endpoint count, and attribution metadata

#### Scenario: Read wallet transfer rows
- **WHEN** full-capture orchestration needs to build a wallet sampling plan
- **THEN** the data store returns stored transfer facts with payer wallet, payment sink, service identity when known, amount, timestamp, and bundled-payTo signal when known

### Requirement: Persist full-capture plan metadata

The analytics data store SHALL persist full-capture sampling plan and read-model metadata so operators can audit which data basis produced generated outputs.

#### Scenario: Store sampling plan metadata
- **WHEN** full-capture orchestration generates payTo or wallet sampling plans
- **THEN** the data store records plan kind, plan key, generated timestamp, input parameters, selected entities, and source run ID as generated analytics metadata

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
