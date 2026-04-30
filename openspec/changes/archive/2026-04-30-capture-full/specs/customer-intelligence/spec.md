## ADDED Requirements

### Requirement: Full capture runs bounded customer intelligence batch capture

Customer intelligence SHALL allow full-capture orchestration to capture sampled wallet intelligence from a wallet sampling plan with explicit caps and source coverage recording.

#### Scenario: Capture sampled wallets from full-capture plan
- **WHEN** full-capture orchestration has generated a wallet sampling plan
- **THEN** it captures customer intelligence for selected wallets, writes ignored snapshot outputs, and stores validated snapshots in the analytics data store when configured

#### Scenario: Full capture applies portfolio cap
- **WHEN** full-capture orchestration enables portfolio enrichment with a configured portfolio limit
- **THEN** customer intelligence capture enriches at most that many wallets and records unavailable or skipped portfolio coverage for the remaining selected wallets

#### Scenario: Customer intelligence batch failure is recorded
- **WHEN** customer intelligence batch capture fails during full-capture orchestration
- **THEN** the command records the failed stage and error details without marking the top-level full-capture run as successful
