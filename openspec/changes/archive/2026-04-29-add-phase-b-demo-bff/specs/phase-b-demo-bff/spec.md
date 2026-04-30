## ADDED Requirements

### Requirement: BFF must return Phase B customer list

The system MUST return a read-only Phase B customer list projection in response to `GET /customers`, following the Phase B canonical contract.

#### Scenario: Fetch customer list

- **WHEN** a client calls `GET /customers`
- **THEN** the system returns `200` with an envelope response containing `generatedAt`, `generatedFrom`, `customerCount`, `customers`, and `provenance`
- **THEN** the response validates against the Phase B customer list schema in `packages/contracts`

#### Scenario: Customer count matches list length

- **WHEN** a client calls `GET /customers`
- **THEN** `customerCount` equals `customers.length` in the response

### Requirement: BFF must return Phase B customer profile

The system MUST return a read-only customer profile projection for a specified wallet in response to `GET /customers/:address/profile`.

#### Scenario: Fetch profile for known wallet

- **WHEN** a client calls `GET /customers/:address/profile` with a wallet address that exists in fixtures
- **THEN** the system returns `200` with profile fields including `profile.identity`, `profile.metrics`, `profile.providers`, `profile.timeline`, and `profile.insights`
- **THEN** response validates against the Phase B customer profile schema in `packages/contracts`

#### Scenario: Fetch profile for unknown wallet

- **WHEN** a client calls `GET /customers/:address/profile` with a wallet address that does not exist in fixtures
- **THEN** the system returns `404`

### Requirement: BFF must return Phase B wallet usage graph

The system MUST return a read-only nested wallet usage graph projection representing payer/provider co-usage in response to `GET /wallet-usage-graph`.

#### Scenario: Fetch wallet usage graph

- **WHEN** a client calls `GET /wallet-usage-graph`
- **THEN** the system returns `200` and an edge/evidence relationship in `graph.providerWallets[].payerWallets[]`
- **THEN** the response validates against the Phase B wallet usage graph schema in `packages/contracts`

### Requirement: Product API responses embed demo and future SDK expectations

The system MUST NOT expose demo labels or future SDK telemetry assumptions as separate raw endpoints; they must be included in the three Phase B product API projections.

#### Scenario: future SDK field is included in profile

- **WHEN** a customer profile response contains endpoint usage, workflow, or request-path values
- **THEN** the system returns those values with provenance metadata distinguishing `future_sdk_field` or `demo_label`

#### Scenario: raw demo endpoint is not provided

- **WHEN** a client calls `/demo-data`, `/sdk-events`, or `/telemetry`
- **THEN** the system does not treat these as product APIs in the initial Phase B and returns an existing not-found response

### Requirement: BFF response preserves provenance

The system MUST preserve the distinction between `onchain_fact`, `demo_label`, `future_sdk_field`, and `derived_insight` in responses.

#### Scenario: Return derived insight

- **WHEN** a response includes `derived_insight` values or objects
- **THEN** the system includes non-empty `reasons` so consumers can trace the supporting evidence

#### Scenario: Return mixed object values

- **WHEN** an object contains mixed onchain fact and demo / future / derived values
- **THEN** the system includes `provenanceByField` as needed so field-level sources are distinguishable

### Requirement: BFF behaves as read-only endpoints

The system MUST operate Phase B BFF endpoints as read-only and must not modify product reads via non-GET methods.

#### Scenario: Call non-GET method

- **WHEN** a client calls POST, PUT, PATCH, or DELETE against a Phase B product endpoint
- **THEN** the system does not perform write operations and returns a read-only error response

### Requirement: BFF does not call live source in request path

The system MUST not call live CDP, Bitquery, RPC, or SDK collector during Phase B product endpoint request handling.

#### Scenario: Call product endpoint

- **WHEN** a client calls `GET /customers`, `GET /customers/:address/profile`, or `GET /wallet-usage-graph`
- **THEN** the system generates response from prepared demo fixture / read model
- **THEN** the system does not issue external source requests
