## ADDED Requirements

### Requirement: BFF returns Phase B customer intelligence

The system MUST return a prepared customer intelligence read model as read-only for `GET /customers/:address/intelligence`.

#### Scenario: Fetch intelligence for known customer

- **WHEN** a client calls `GET /customers/:address/intelligence` with a customer address that exists in fixtures
- **THEN** system returns `200` and a payload that validates against the customer intelligence response schema

#### Scenario: Fetch intelligence for uncaptured customer

- **WHEN** a client calls `GET /customers/:address/intelligence` with a customer address not in fixtures
- **THEN** system returns `404`

#### Scenario: Normalize customer address

- **WHEN** a client calls `GET /customers/:address/intelligence` with a mixed-case EVM address
- **THEN** system looks up the read model with lowercase-normalized address

### Requirement: Customer intelligence BFF does not call live source in request path

The system MUST not call live CDP, Bitquery, Zerion, MCP, RPC, or SDK collector during `GET /customers/:address/intelligence` request handling.

### Scenario: Call intelligence endpoint

- **WHEN** a client calls `GET /customers/:address/intelligence`
- **THEN** the system generates the response from prepared customer intelligence read model
- **THEN** no external source request is issued

### Requirement: Customer intelligence response preserves provenance
The system MUST preserve the distinction between `onchain_fact`, `derived_insight`, `demo_label`, and `future_sdk_field` in customer intelligence responses.

#### Scenario: Return derived service candidate

- **WHEN** customer intelligence response includes an x402 service candidate or cross-provider affinity insight
- **THEN** the system includes non-empty reasons or evidence so consumers can trace hypothesis evidence

#### Scenario: future SDK attribution is unimplemented

- **WHEN** customer intelligence response includes values corresponding to endpoint attribution, request sequence, or correlation id
- **THEN** the system does not return them as true facts and distinguishes them as unimplemented or future SDK telemetry targets
