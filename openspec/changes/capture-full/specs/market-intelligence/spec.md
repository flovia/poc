## ADDED Requirements

### Requirement: Full capture reuses market census capture

Market intelligence SHALL allow full-capture orchestration to run the same CDP Discovery and Bitquery aggregate census persistence used by standalone market snapshot capture.

#### Scenario: Full capture runs census stage
- **WHEN** full-capture orchestration starts with `--all` or equivalent full census behavior
- **THEN** it captures CDP Discovery resources, deduplicates scoped payment sinks, persists Bitquery aggregate metrics, and records mapping pattern attribution before sampling begins

#### Scenario: Census stage failure is recorded
- **WHEN** CDP or Bitquery census capture fails during full-capture orchestration
- **THEN** the command records the failure in the analytics data store and does not continue to downstream sampling stages as a successful run
