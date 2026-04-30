## Why

The BFF currently exposes wallet-centered demo read APIs, but product users also need a macro view of how coingecko users behave as a whole and how that behavior compares with other public x402 API services. Existing coingecko transaction fixtures and x402 service intelligence data provide enough prepared data to add offline, read-only service analytics without live request-time collection.

## What Changes

- Add BFF analytics APIs for service-level macro summaries and service comparison.
- Add a coingecko service summary that reports aggregate user, transaction, repeat usage, endpoint, and x402 comparison metrics.
- Add a service comparison response that compares coingecko with other public x402 API services using prepared service intelligence data.
- Add quadrant-ready comparison data using the approved initial axes:
  - X axis: average transactions per user.
  - Y axis: endpoint diversity.
- Preserve provenance so responses distinguish onchain facts from demo labels, derived fields, and prepared public intelligence.
- Do not add Solana / Base tabbed responses in this change.
- Do not add live external collection in the BFF request path.

## Capabilities

### New Capabilities

- `bff-service-analytics`: Service-level BFF analytics for coingecko summary, public x402 service comparison, and quadrant-ready comparison data.

### Modified Capabilities

- `market-intelligence`: Clarify that prepared market and x402 intelligence data can be consumed by BFF service analytics while preserving the existing no-live-fetch request-path requirement.

## Impact

- Affected app: `apps/bff`.
- Affected areas: route handling, response contracts, projection/read-model generation, fixtures, and route tests.
- Adds read-only API surface for service analytics.
- Reuses existing prepared fixtures and projections; no new external dependency and no live RPC / CDP / Bitquery / CoinGecko calls during BFF requests.
