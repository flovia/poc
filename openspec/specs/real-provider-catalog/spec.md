## Purpose

Real provider catalog exposes generated x402 provider and payTo identity to the product UI while retaining deterministic local fallback behavior for development and demos.

## Requirements

### Requirement: Expose generated real provider catalog to product UI
The system SHALL expose a provider catalog derived from generated analytics read models so the product UI can show real x402 providers and recipient wallets instead of relying on hand-written demo providers.

#### Scenario: Return provider catalog rows
- **WHEN** the frontend requests the provider catalog
- **THEN** the system returns provider rows with provider identity, display name, network, asset, payTo recipient wallet, transaction count, unique sender count, endpoint attribution status, attribution confidence, and customer drilldown availability

#### Scenario: Prefer meaningful providers
- **WHEN** provider catalog rows include both resolved active providers and unresolved or inactive payment sinks
- **THEN** the frontend ranks or filters rows so resolved providers with activity and customer drilldown availability are preferred for the primary provider list

### Requirement: Preserve demo provider fallback
The system SHALL keep the existing three local demo providers as fallback only when no generated provider catalog is available or usable.

#### Scenario: Generated providers are available
- **WHEN** the BFF returns a non-empty generated provider catalog
- **THEN** the frontend uses generated provider rows as the primary provider list
- **THEN** the local seeded demo providers are not presented as the primary real-provider experience

#### Scenario: Generated providers are unavailable
- **WHEN** the BFF provider catalog request fails or returns no usable rows
- **THEN** the frontend can fall back to the local seeded demo providers for deterministic development and demo continuity

### Requirement: Link provider selection to payTo customer scope
The system SHALL associate each frontend provider selection with the provider row's payTo recipient wallet for customer list retrieval.

#### Scenario: Select a real provider
- **WHEN** a user opens a generated provider's Customers view
- **THEN** the frontend requests Customers scoped to that provider row's payTo recipient wallet
- **THEN** the displayed customer list represents payer wallets that paid that recipient wallet
