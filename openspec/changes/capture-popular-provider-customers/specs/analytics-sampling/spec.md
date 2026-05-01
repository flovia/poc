## ADDED Requirements

### Requirement: Support popularity-targeted payTo selection
Analytics sampling SHALL support selecting payTos by provider popularity and missing customer-fact coverage for demo-ready customer drilldown.

#### Scenario: Select popular customer-missing payTos
- **WHEN** payTo census rows include aggregate activity and customer-fact coverage flags
- **THEN** the sampler can select rows with high transaction count or unique sender count where customer facts are missing

#### Scenario: Keep selection reproducible
- **WHEN** popularity-targeted selection uses the same census input, seed, limit, and filters
- **THEN** the selected payTos and selection reasons remain deterministic

#### Scenario: Explain selection reasons
- **WHEN** a payTo is selected by popularity-targeted sampling
- **THEN** the sampling output records whether it was selected for transaction volume, unique sender volume, resolved service identity, missing customer facts, mandatory CoinGecko coverage, or explicit operator override
