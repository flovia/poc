## ADDED Requirements

### Requirement: BFF returns generated provider catalog
The system MUST return a read-only generated provider catalog for `GET /providers`, using prepared/generated analytics read models with fixture fallback.

#### Scenario: Fetch generated providers
- **WHEN** a client calls `GET /providers` and generated provider catalog data is available
- **THEN** the system returns `200` with a provider catalog response that validates against the provider catalog schema
- **THEN** the response includes real provider/payTo rows from the generated read model

#### Scenario: Provider catalog fallback
- **WHEN** generated provider catalog data is missing during local development or tests
- **THEN** the system returns a deterministic fallback provider catalog or an empty valid provider catalog without calling live external sources

#### Scenario: Provider endpoint is read-only
- **WHEN** a client calls POST, PUT, PATCH, or DELETE on `/providers`
- **THEN** the system performs no write operation and returns an error response aligned with read-only policy

### Requirement: BFF filters customer list by payTo
The system MUST support a payTo-scoped customer list read so clients can retrieve payer wallets that paid a selected recipient wallet.

#### Scenario: Fetch payTo-scoped customers
- **WHEN** a client calls `GET /customers` with a valid payTo filter
- **THEN** the system returns a valid customer list projection containing only customers derived from transfer facts for that payTo recipient wallet

#### Scenario: Fetch unscoped customers remains supported
- **WHEN** a client calls `GET /customers` without a payTo filter
- **THEN** the system returns the existing unscoped generated customer list projection

#### Scenario: Unknown payTo has no fabricated customers
- **WHEN** a client calls `GET /customers` with a payTo filter that has no sampled transfer facts
- **THEN** the system returns a valid empty customer list projection or a valid scoped response without fabricating payer wallets

#### Scenario: Customer filtering does not call live sources
- **WHEN** a client requests a payTo-scoped customer list
- **THEN** the system generates the response from generated projections, prepared fixtures, or read models
- **THEN** no CDP, Bitquery, RPC, SDK collector, or other external source request is issued
