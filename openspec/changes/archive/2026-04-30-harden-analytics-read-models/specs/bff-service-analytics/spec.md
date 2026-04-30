## MODIFIED Requirements

### Requirement: Expose coingecko service summary

The BFF SHALL expose a read-only analytics response for the `coingecko` service that summarizes macro user behavior from prepared transaction, attribution, and service intelligence data, with top endpoint metrics scoped to `coingecko` rather than global market leaders.

#### Scenario: Return coingecko summary
- **WHEN** a client requests the coingecko service summary
- **THEN** the response includes `serviceId` equal to `coingecko`, user count, transaction count, average transactions per user, repeat user rate, top endpoint metrics for the coingecko service, and comparison metrics against the available x402 service universe

#### Scenario: Summary uses prepared data only
- **WHEN** the BFF builds or serves the coingecko service summary
- **THEN** it reads prepared fixtures, projections, or generated read models
- **THEN** it does not call CoinGecko, CDP, Bitquery, RPC providers, or other external services during the request path

#### Scenario: Do not show unrelated global top endpoints
- **WHEN** the generated analytics universe contains services with higher transaction counts than coingecko
- **THEN** the coingecko summary top endpoint list is selected from coingecko-attributed rows only
- **THEN** unrelated global market leaders are not returned as coingecko top endpoints

### Requirement: Expose endpoint attribution confidence

BFF service analytics SHALL expose endpoint attribution status and confidence where endpoint-level metrics depend on payTo-to-resource mapping, and SHALL preserve that uncertainty when generated read models contain inferred bundled-payTo metrics.

#### Scenario: Bundled payTo endpoint metrics are unknown
- **WHEN** a service uses one payTo for multiple endpoints and no explicit attribution signal exists
- **THEN** BFF analytics does not report endpoint transaction counts as factual endpoint observations and marks attribution as `bundled_payto_unknown_endpoint`

#### Scenario: Direct payTo endpoint metrics are derived
- **WHEN** a payment sink maps to exactly one endpoint
- **THEN** BFF analytics may report endpoint-derived metrics with provenance indicating onchain facts joined to CDP mapping

#### Scenario: Preserve inferred attribution in summaries
- **WHEN** a service summary includes a top endpoint or cluster derived from bundled-payTo attribution
- **THEN** the response includes the attribution status, confidence, and provenance needed to distinguish inferred mapping from onchain transaction facts
