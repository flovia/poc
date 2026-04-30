## ADDED Requirements

### Requirement: Batch customer intelligence capture for sampled wallets

Customer intelligence SHALL support batch capture for sampled wallets and store generated snapshots outside git-tracked fixtures.

#### Scenario: Capture sampled wallet intelligence
- **WHEN** a wallet sampling plan selects customer addresses
- **THEN** the customer intelligence capture job fetches outgoing transfers for each selected wallet within the configured scope and stores validated snapshots in the analytics data store or ignored generated output path

#### Scenario: Preserve source coverage per wallet
- **WHEN** customer intelligence capture succeeds or partially succeeds for a wallet
- **THEN** the stored snapshot records Bitquery, CDP discovery, and optional portfolio source coverage

#### Scenario: Portfolio enrichment is capped
- **WHEN** portfolio enrichment is enabled for sampled wallets
- **THEN** the capture job applies configured caps and records when portfolio data is unavailable or skipped

### Requirement: Do not commit generated customer intelligence

Customer intelligence SHALL treat raw wallet intelligence, payer overlap, and portfolio enrichment as generated data excluded from git.

#### Scenario: Generated customer intelligence output is ignored
- **WHEN** customer intelligence batch capture writes snapshots or local database records
- **THEN** the generated artifacts are stored in ignored paths and are not required for repository operation or verification
