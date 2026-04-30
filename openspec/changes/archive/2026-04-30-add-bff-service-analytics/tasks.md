## 1. Contract and Test Setup

- [x] 1.1 Inspect existing BFF response contract validators and identify where to add service analytics response types.
- [x] 1.2 Add failing route or contract tests for the coingecko service summary response.
- [x] 1.3 Add failing route or contract tests for the x402 service comparison response.
- [x] 1.4 Add failing route or contract tests for quadrant-ready comparison data with X = `averageTransactionsPerUser` and Y = `endpointDiversity`.
- [x] 1.5 Add tests that analytics responses preserve provenance and do not require Solana / Base tab sections.

## 2. Service Analytics Projection

- [x] 2.1 Define strict TypeScript contracts for service summary, service comparison, and quadrant analytics responses.
- [x] 2.2 Extend the BFF projection/read-model layer to aggregate service-level metrics from prepared transaction, attribution, and intelligence data.
- [x] 2.3 Normalize the coingecko service identity as `coingecko` across analytics outputs.
- [x] 2.4 Compute user count, transaction count, average transactions per user, repeat user rate, top endpoint metrics, endpoint diversity, and coingecko overlap where derivable.
- [x] 2.5 Preserve source/provenance indicators for onchain facts, demo attribution labels, derived metrics, and prepared public intelligence.

## 3. API Routes

- [x] 3.1 Add a read-only BFF route for the coingecko service summary API.
- [x] 3.2 Add a read-only BFF route for service comparison analytics.
- [x] 3.3 Add a read-only BFF route for quadrant analytics.
- [x] 3.4 Ensure the analytics request path does not call live CoinGecko, CDP, Bitquery, RPC, or other external services.
- [x] 3.5 Ensure unknown analytics paths and unsupported methods follow existing BFF 404 / 405 behavior.

## 4. Documentation and Verification

- [x] 4.1 Update `apps/bff/README.md` with the new analytics endpoints and fixture/offline behavior.
- [x] 4.2 Run formatting if needed for changed TypeScript and JSON files.
- [x] 4.3 Run `bun run verify` from the repository root and fix any failures.
