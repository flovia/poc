## 1. Data Policy and Storage Foundation

- [x] 1.1 Update ignore rules for local SQLite databases, WAL / SHM files, generated analytics output directories, raw transfer facts, customer intelligence captures, and large read models.
- [x] 1.2 Add an analytics storage module with a configurable local DB path and test-safe in-memory or temporary DB support.
- [x] 1.3 Add SQLite schema / migration support for capture runs, CDP resources, payment options, payTo aggregates, transfer facts, service candidates, endpoint attribution, customer wallets, customer intelligence snapshots, and service analytics read models.
- [x] 1.4 Add unit tests that initialize an empty analytics database and verify all required tables / indexes are present.
- [x] 1.5 Add capture-run helpers that record parameters, source coverage, status, timestamps, and errors.

## 2. Market Census Persistence

- [x] 2.1 Add tests for persisting normalized CDP resources and payment options into the analytics data store.
- [x] 2.2 Extend market snapshot / census capture to support full CDP discovery capture into SQLite.
- [x] 2.3 Add tests for deduplicating scoped payment sinks by `network`, `asset`, and `payTo`.
- [x] 2.4 Persist Bitquery aggregate census metrics for each scoped payment sink, including transaction count, unique sender count, volume, latest transfer metadata, run ID, and time window.
- [x] 2.5 Add mapping-pattern detection for one-payTo-one-endpoint, one-payTo-many-endpoints, many-payTos-one-service, and unresolved payment sinks.

## 3. PayTo Sampling and Transfer Capture

- [x] 3.1 Define strict TypeScript contracts for payTo sampling plans, strata, selection reasons, budgets, and random seed.
- [x] 3.2 Add deterministic payTo sampler tests covering activity tiers, mapping patterns, long-tail selection, mandatory coingecko payTos, and reproducibility with the same seed.
- [x] 3.3 Implement the payTo sampler over census data with configurable budgets and recorded selection reasons.
- [x] 3.4 Generalize `capture-coingecko-transactions` into payTo transaction capture that accepts arbitrary provider/service identity, payTo, network, asset, time window, limits, and output destination.
- [x] 3.5 Persist sampled payTo transfer facts using transfer-level identity rather than tx hash alone.
- [x] 3.6 Add support or task boundaries for time-sliced transfer sampling so high-volume payTos are not represented only by latest transfers.

## 4. Wallet Sampling and Customer Intelligence Batch Capture

- [x] 4.1 Define strict TypeScript contracts for wallet sampling plans, wallet strata, selection reasons, caps, and optional portfolio enrichment policy.
- [x] 4.2 Add deterministic wallet sampler tests for coingecko repeat users, high spenders, one-shot users, peer users, cross-service users, bundled-payTo users, recent users, and random long-tail users.
- [x] 4.3 Implement wallet sampling from stored transfer facts and aggregate signals.
- [x] 4.4 Add batch customer intelligence capture for sampled wallets using existing outgoing-transfer and CDP matching logic.
- [x] 4.5 Store customer intelligence snapshots in the analytics data store or ignored generated output path with source coverage per wallet.
- [x] 4.6 Apply configured caps for portfolio enrichment and record unavailable / skipped portfolio coverage.

## 5. Read Models and BFF Integration

- [x] 5.1 Add a read-model generation step that builds service summary, service comparison, and quadrant-ready analytics from the analytics data store.
- [x] 5.2 Include sample basis, coverage, endpoint attribution status, attribution confidence, and provenance in generated analytics read models.
- [x] 5.3 Add a BFF analytics data-source abstraction that can read generated read models or SQLite-backed read models while preserving small fixture fallback during migration.
- [x] 5.4 Ensure BFF analytics endpoints never call live CDP, Bitquery, RPC, CoinGecko, Zerion, or other external services during request handling.
- [x] 5.5 Update BFF tests to cover direct-payTo endpoint attribution and bundled-payTo unknown endpoint attribution behavior.

## 6. Documentation and Verification

- [x] 6.1 Document the offline analytics pipeline: CDP census, aggregate census, payTo sampling, transfer capture, wallet sampling, customer intelligence capture, and read-model generation.
- [x] 6.2 Document public repository data policy and which generated artifacts must remain ignored.
- [x] 6.3 Add or update CLI usage docs for full CDP capture, sampler generation, payTo transfer capture, and customer intelligence batch capture.
- [x] 6.4 Run formatting for changed TypeScript / JSON files.
- [x] 6.5 Run `bun run verify` from the repository root and fix any failures.
