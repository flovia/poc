## ADDED Requirements

### Requirement: Prepared market intelligence supports BFF service analytics

Prepared market intelligence data SHALL be reusable by BFF service analytics for public x402 service comparison without introducing live external calls in the BFF request path.

#### Scenario: Consume prepared x402 service intelligence
- **WHEN** BFF service analytics compares `coingecko` with other x402 API services
- **THEN** it may consume prepared service candidates, payTo activity, endpoint attribution, transaction facts, and source coverage from fixtures, snapshots, projections, or generated read models

#### Scenario: Preserve request-path offline behavior
- **WHEN** a BFF service analytics endpoint is called
- **THEN** market intelligence collection remains outside the BFF request path
- **THEN** the endpoint does not issue live CDP, Bitquery, RPC, CoinGecko, or external service calls
