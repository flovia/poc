## ADDED Requirements

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
