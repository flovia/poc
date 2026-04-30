## ADDED Requirements

### Requirement: BFF projection separates real tx fact and mock attribution

The system MUST distinguish fields derived from real onchain transactions from fields derived from mock endpoint attribution when generating Phase B demo projection.

#### Scenario: Projection keeps mixed provenance

- **WHEN** a projection includes `txHash`, `payerWallet`, `payTo`, `endpointPath`, and `workflowLabel`
- **THEN** `txHash`, `payerWallet`, and `payTo` are distinguishable as `onchain_fact`
- **THEN** `endpointPath` and `workflowLabel` are distinguishable as `demo_label` or `future_sdk_field`

#### Scenario: Trace endpoint attribution evidence

- **WHEN** a projection includes mock endpoint attribution
- **THEN** the response includes `reasons` or equivalent evidence explaining that endpoint attribution is mocked

### Requirement: BFF returns generated Phase B projection

The system MUST return generated Phase B projection as read-only from generated real onchain transaction facts and mock endpoint attribution.

#### Scenario: Return customer list projection

- **WHEN** a client calls `GET /customers`
- **THEN** the system returns generated customer list projection
- **THEN** response validates against Phase B customer list schema in `packages/contracts`

#### Scenario: Return customer profile projection

- **WHEN** a client calls `GET /customers/:address/profile`
- **THEN** the system returns generated customer profile projection
- **THEN** response validates against Phase B customer profile schema in `packages/contracts`

#### Scenario: Return wallet usage graph projection

- **WHEN** a client calls `GET /wallet-usage-graph`
- **THEN** the system returns generated wallet usage graph projection
- **THEN** response validates against Phase B wallet usage graph schema in `packages/contracts`

### Requirement: BFF must not call live source in request path

The system MUST NOT call live CDP, Bitquery, RPC, or SDK collector while handling Phase B product endpoints.

#### Scenario: Call product endpoint

- **WHEN** a client calls Phase B product endpoint
- **THEN** the system returns response from generated projection / fixture
- **THEN** the system does not issue external source request

### Requirement: Raw attribution endpoint is not exposed

The system MUST NOT expose raw mock attribution or SDK telemetry placeholder endpoint data as public endpoints.

#### Scenario: Call raw attribution endpoint

- **WHEN** a client calls `/demo-data`, `/sdk-events`, `/telemetry`, or `/mock-attribution`
- **THEN** system returns not-found response because it is not a Phase B product API
