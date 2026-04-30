## MODIFIED Requirements

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
