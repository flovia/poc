## ADDED Requirements

### Requirement: Select popular aggregate-only providers for customer capture
The system SHALL select demo-relevant provider payTos that have high aggregate activity but do not yet have sampled payer-wallet transfer facts.

#### Scenario: Select high-activity aggregate-only payTos
- **WHEN** the analytics store contains provider catalog or payTo census rows with transaction counts, unique sender counts, service identity, and customer-fact coverage
- **THEN** the system produces a target list prioritizing high transaction count, high unique sender count, resolved service identity, and missing customer facts

#### Scenario: Preserve CoinGecko coverage
- **WHEN** CoinGecko payTos are present in the census
- **THEN** the target selection includes or verifies at least one CoinGecko payTo with customer facts before reporting the target set as demo-ready

### Requirement: Capture payer-wallet facts for selected popular providers
The system SHALL run bounded transfer capture for selected popular provider payTos and persist payer-wallet transfer facts in the analytics store.

#### Scenario: Capture selected payTo transfers
- **WHEN** an operator runs the focused popular-provider capture with valid Bitquery credentials
- **THEN** the system captures transfer facts for selected payTos using configured per-payTo limits, page size, and optional time window
- **THEN** the system persists payer wallet, payTo, amount, tx hash, block timestamp, network, and asset into `transfer_facts`

#### Scenario: Do not fabricate customer facts
- **WHEN** a selected payTo returns no transfer facts or capture fails for that payTo
- **THEN** the system records the miss or failure and does not mark that provider as customer-ready

### Requirement: Report customer coverage for popular providers
The system SHALL report which high-activity provider payTos are customer-ready and which remain aggregate-only after focused capture.

#### Scenario: Report post-capture coverage
- **WHEN** focused capture and read-model regeneration complete
- **THEN** the system reports selected provider names, payTos, transaction counts, unique sender counts, captured customer fact counts, and remaining aggregate-only high-activity providers
