## Purpose

Phase B demo BFF returns read-only product API responses from prepared demo fixtures / read models, preserving provenance and not calling external sources in the request path.

## Requirements

### Requirement: BFF returns Phase B customer list

The system MUST return a read-only Phase B canonical customer list projection for `GET /customers`.

#### Scenario: Fetch customer list

- **WHEN** a client calls `GET /customers`
- **THEN** the system returns `200` and an envelope response containing `generatedAt`, `generatedFrom`, `customerCount`, `customers`, and `provenance`
- **THEN** the response validates against the Phase B customer list schema in `packages/contracts`

#### Scenario: Customer count matches list length

- **WHEN** a client calls `GET /customers`
- **THEN** `response.customerCount` matches `customers.length`

### Requirement: BFF returns Phase B customer profile

The system MUST return a read-only customer profile projection for the specified wallet at `GET /customers/:address/profile`.

#### Scenario: Fetch profile for known wallet

- **WHEN** a client calls `GET /customers/:address/profile` with a wallet address that exists in fixtures
- **THEN** the system returns `200` with a response containing `profile.identity`, `profile.metrics`, `profile.providers`, `profile.timeline`, and `profile.insights`
- **THEN** the response validates against the Phase B customer profile schema in `packages/contracts`

#### Scenario: Fetch profile for unknown wallet

- **WHEN** a client calls `GET /customers/:address/profile` with a wallet address not in fixtures
- **THEN** the system returns `404`

### Requirement: BFF returns Phase B customer intelligence

The system MUST return the specified customer's prepared customer intelligence read model as a read-only response for `GET /customers/:address/intelligence`.

#### Scenario: Fetch intelligence for known customer

- **WHEN** a client calls `GET /customers/:address/intelligence` with a customer address that exists in fixtures
- **THEN** the system returns `200` and a payload that validates against the customer intelligence response schema

#### Scenario: Fetch intelligence for uncaptured customer

- **WHEN** a client calls `GET /customers/:address/intelligence` with a customer address that does not exist in fixtures
- **THEN** the system returns `404`

#### Scenario: Normalize customer address

- **WHEN** a client calls `GET /customers/:address/intelligence` with a mixed-case EVM address
- **THEN** the system looks up the read model using the lowercase normalized address

### Requirement: BFF returns Phase B wallet usage graph

The system MUST return a read-only nested wallet usage graph projection representing payer/provider co-usage for `GET /wallet-usage-graph`.

#### Scenario: Fetch wallet usage graph

- **WHEN** a client calls `GET /wallet-usage-graph`
- **THEN** the system returns `200` with a response that preserves edge / evidence relationships in `graph.providerWallets[].payerWallets[]`
- **THEN** the response validates against the Phase B wallet usage graph schema in `packages/contracts`

### Requirement: Include demo and future SDK expectations inside product API response

The system MUST include demo labels and future SDK telemetry expectations within Phase B product API projections, rather than exposing them as raw endpoints.

#### Scenario: Include future SDK fields in profile

- **WHEN** customer profile response includes values equivalent to endpoint usage, workflow, use case, or request path
- **THEN** the system returns those values with provenance metadata that distinguishes them as `future_sdk_field` or `demo_label`

#### Scenario: Do not expose raw demo endpoint

- **WHEN** a client calls `/demo-data`, `/sdk-events`, or `/telemetry`
- **THEN** on the first Phase B implementation, the system does not treat it as a product API and returns existing not-found response

### Requirement: BFF response retains provenance

The system MUST preserve the distinction between `onchain_fact`, `demo_label`, `future_sdk_field`, and `derived_insight` in responses.

#### Scenario: Return derived insight

- **WHEN** a response contains `derived_insight` values or objects
- **THEN** the system includes non-empty `reasons` so consumers can trace hypothesis evidence

#### Scenario: Return mixed object

- **WHEN** onchain facts and demo / future / derived values co-exist in one object
- **THEN** the system includes `provenanceByField` when needed to distinguish source per field

#### Scenario: Return derived service candidate

- **WHEN** a customer intelligence response includes an x402 service candidate or cross-provider affinity insight
- **THEN** the system includes non-empty reasons or evidence so consumers can trace the hypothesis basis

#### Scenario: Future SDK attribution is not implemented

- **WHEN** a customer intelligence response handles values equivalent to endpoint attribution, request sequence, or correlation id
- **THEN** the system does not return them as true facts and marks them as not-yet-implemented or future SDK telemetry targets

### Requirement: BFF demo projection separates real tx facts and mock attribution

The system MUST distinguish fields derived from real onchain transactions from fields derived from mock endpoint attribution when generating Phase B demo projections.

#### Scenario: Projection retains mixed provenance

- **WHEN** a projection includes `txHash`, `payerWallet`, `payTo`, `endpointPath`, and `workflowLabel`
- **THEN** `txHash`, `payerWallet`, and `payTo` are distinguishable as `onchain_fact`
- **THEN** `endpointPath` and `workflowLabel` are distinguishable as `demo_label` or `future_sdk_field`

#### Scenario: Track endpoint attribution evidence

- **WHEN** a projection includes mock endpoint attribution
- **THEN** the response retains `reasons` or equivalent evidence explaining that endpoint attribution is mocked

### Requirement: BFF returns generated Phase B projections

The system MUST return generated projections as read-only for Phase B product endpoints, based on real onchain transaction facts and mock endpoint attribution.

#### Scenario: Return customer list projection

- **WHEN** a client calls `GET /customers`
- **THEN** the system returns the generated customer list projection
- **THEN** the response validates against the Phase B customer list schema in `packages/contracts`

#### Scenario: Return customer profile projection

- **WHEN** a client calls `GET /customers/:address/profile`
- **THEN** the system returns the generated customer profile projection
- **THEN** the response validates against the Phase B customer profile schema in `packages/contracts`

#### Scenario: Return wallet usage graph projection

- **WHEN** a client calls `GET /wallet-usage-graph`
- **THEN** the system returns the generated wallet usage graph projection
- **THEN** the response validates against the Phase B wallet usage graph schema in `packages/contracts`

### Requirement: BFF behaves as a read-only endpoint

The system MUST treat Phase B BFF endpoints as read-only and must not change product read state via non-GET methods.

#### Scenario: Call a non-GET method

- **WHEN** a client calls POST, PUT, PATCH, or DELETE on a Phase B product endpoint
- **THEN** the system performs no write operation and returns an error response aligned with read-only policy

### Requirement: BFF does not call live source in request path

The system MUST not call live CDP, Bitquery, Zerion, MCP, RPC, or SDK collector during request handling of Phase B product endpoints.

#### Scenario: Call product endpoints

- **WHEN** a client calls `GET /customers`, `GET /customers/:address/profile`, `GET /customers/:address/intelligence`, or `GET /wallet-usage-graph`
- **THEN** the system generates response from generated projection / prepared demo fixture / read model
- **THEN** no external source request is issued

#### Scenario: Call intelligence endpoint

- **WHEN** a client calls `GET /customers/:address/intelligence`
- **THEN** the system generates the response from the prepared customer intelligence read model
- **THEN** no external source request is issued

#### Scenario: Call raw attribution endpoint

- **WHEN** a client calls `/demo-data`, `/sdk-events`, `/telemetry`, or `/mock-attribution`
- **THEN** the system does not treat it as a Phase B product API and returns not found response
