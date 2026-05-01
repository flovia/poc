## ADDED Requirements

### Requirement: Run focused popular-provider customer capture
Analytics full capture SHALL support a focused mode or companion CLI flow that captures payer-wallet facts for selected popular provider payTos without rerunning the entire market census.

#### Scenario: Focused capture reuses existing census
- **WHEN** an operator runs focused popular-provider customer capture against an existing analytics SQLite database
- **THEN** the command selects target payTos from stored census data, captures bounded transfer facts for those targets, and persists results without requiring a fresh CDP census

#### Scenario: Focused capture regenerates read models
- **WHEN** focused transfer capture completes successfully
- **THEN** the command can regenerate analytics read models and the BFF generated fixture so captured providers appear with `hasCustomerFacts=true`

#### Scenario: Dry run avoids live calls
- **WHEN** an operator runs focused popular-provider customer capture in dry-run mode
- **THEN** the command reports selected target payTos, expected capture bounds, and missing credentials without calling Bitquery or writing transfer facts
