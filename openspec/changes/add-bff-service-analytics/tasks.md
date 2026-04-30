## 1. Contract and Test Setup

- [ ] 1.1 Inspect existing BFF response contract validators and identify where to add service analytics response types.
- [ ] 1.2 Add failing route or contract tests for the coingecko service summary response.
- [ ] 1.3 Add failing route or contract tests for the x402 service comparison response.
- [ ] 1.4 Add failing route or contract tests for quadrant-ready comparison data with X = `averageTransactionsPerUser` and Y = `endpointDiversity`.
- [ ] 1.5 Add tests that analytics responses preserve provenance and do not require Solana / Base tab sections.

## 2. Service Analytics Projection

- [ ] 2.1 Define strict TypeScript contracts for service summary, service comparison, and quadrant analytics responses.
- [ ] 2.2 Extend the BFF projection/read-model layer to aggregate service-level metrics from prepared transaction, attribution, and intelligence data.
- [ ] 2.3 Normalize the coingecko service identity as `coingecko` across analytics outputs.
- [ ] 2.4 Compute user count, transaction count, average transactions per user, repeat user rate, top endpoint metrics, endpoint diversity, and coingecko overlap where derivable.
- [ ] 2.5 Preserve source/provenance indicators for onchain facts, demo attribution labels, derived metrics, and prepared public intelligence.

## 3. API Routes

- [ ] 3.1 Add a read-only BFF route for the coingecko service summary API.
- [ ] 3.2 Add a read-only BFF route for service comparison analytics.
- [ ] 3.3 Add a read-only BFF route for quadrant analytics.
- [ ] 3.4 Ensure the analytics request path does not call live CoinGecko, CDP, Bitquery, RPC, or other external services.
- [ ] 3.5 Ensure unknown analytics paths and unsupported methods follow existing BFF 404 / 405 behavior.

## 4. Documentation and Verification

- [ ] 4.1 Update `apps/bff/README.md` with the new analytics endpoints and fixture/offline behavior.
- [ ] 4.2 Run formatting if needed for changed TypeScript and JSON files.
- [ ] 4.3 Run `bun run verify` from the repository root and fix any failures.
