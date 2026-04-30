## Why

The current analytics data is committed JSON fixture data with strong coingecko, Base USDC, and single-wallet bias. To expand coverage safely in a public repository, generated raw captures and customer intelligence should move to an ignored local data store while the codebase keeps only schemas, collectors, samplers, tests, and small synthetic fixtures.

## What Changes

- Add a local SQLite-backed analytics data store for offline capture outputs and generated read models.
- Add a capture pipeline that stores CDP discovery census data, payTo aggregate census data, sampled payTo transfer facts, and sampled customer intelligence outputs outside git-tracked fixtures.
- Generalize coingecko-only payTo transaction capture into payTo-level capture for selected x402 payment sinks.
- Add explicit modeling for service, resource / endpoint, and payment sink relationships, including one-payTo-many-endpoint and one-payTo-per-endpoint patterns.
- Add deterministic stratified sampling for payTo and wallet selection to reduce coingecko-only, discovery-order, activity, and resource-duplication bias.
- Add generated-data ignore policy and keep public repository fixtures small, synthetic, and non-sensitive.
- Preserve BFF request-path offline behavior: BFF reads SQLite / generated read models only and never calls live CDP, Bitquery, RPC, CoinGecko, Zerion, or other external services per request.

## Capabilities

### New Capabilities

- `analytics-data-store`: Local ignored SQLite data store, schema, migrations, capture-run metadata, generated-data policy, and read-model source boundary for analytics data.
- `analytics-sampling`: Deterministic stratified payTo and wallet sampling over market census data to reduce biased service analytics.

### Modified Capabilities

- `market-intelligence`: Market intelligence must be able to write CDP discovery and Bitquery aggregate census data into the analytics data store, including service/resource/payTo mapping metadata.
- `customer-intelligence`: Customer intelligence must support batch capture for sampled wallets and store generated customer intelligence snapshots outside git-tracked fixtures.
- `bff-service-analytics`: BFF service analytics must be able to read analytics from the local data store or generated read models instead of relying only on committed coingecko JSON fixtures.

## Impact

- Affected apps/packages: `apps/cli`, `apps/bff`, `packages/contracts`, `packages/intelligence`, and `packages/sources`.
- Adds SQLite schema / migrations and a storage boundary, likely using Bun's SQLite support.
- Adds or updates CLI scripts for census capture, payTo transaction capture, sampler generation, wallet sampling, and read-model generation.
- Updates `.gitignore` / data policy to prevent generated DBs, raw transfer facts, customer intelligence captures, portfolio enrichment, and large read models from being committed.
- Existing small JSON fixtures may remain only for deterministic tests and backwards-compatible demo behavior during migration.
