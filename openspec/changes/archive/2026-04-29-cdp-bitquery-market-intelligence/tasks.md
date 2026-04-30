## 1. Workspace and contracts

- [x] 1.1 Create Bun / TypeScript workspace packages: `packages/contracts`, `packages/sources`, `packages/intelligence`.
- [x] 1.2 Define normalized CDP resource / payment option schema in `packages/contracts`.
- [x] 1.3 Define Bitquery aggregate, latest-transfer, market resource, discrepancy, and market snapshot schema in `packages/contracts`.
- [x] 1.4 Add fixture-based tests for contract parsing and invalid input failure.

## 2. Source clients

- [x] 2.1 Implement CDP Discovery client in `packages/sources` with pagination and configurable limit handling.
- [x] 2.2 Implement CDP Discovery response normalization while preserving source provenance and relevant quality fields into contract types.
- [x] 2.3 Implement Bitquery GraphQL client in `packages/sources` reading `BITQUERY_TOKEN` from config or explicit option.
- [x] 2.4 Implement Base USDC aggregate query for payment options grouped by `payTo`.
- [x] 2.5 Add source client tests using recorded fixture and mocked fetch responses.

## 3. Market intelligence

- [x] 3.1 Implement payment option filtering by requested network / asset.
- [x] 3.2 Join normalized CDP payment options and Bitquery aggregates by network, asset, and `payTo`.
- [x] 3.3 Calculate active resource indicator, ranking fields, and discrepancy indicators without discarding source values.
- [x] 3.4 Build market snapshot object with resource, payment option, aggregate, summary metrics, generated timestamp, and source metadata.
- [x] 3.5 Add intelligence tests for join, zero-activity payment options, and metric discrepancy.

## 4. CLI report generation

- [x] 4.1 Add CLI entrypoint to generate x402 market snapshot through package function.
- [x] 4.2 Add CLI options for resource limit, network, asset, JSON output path, and Markdown output path.
- [x] 4.3 Write validated snapshot shape to `reports/x402-market-snapshot.json`.
- [x] 4.4 Write `reports/x402-market-summary.md` with high-level count, top resources, and discrepancy notes.
- [x] 4.5 Return clear error when Bitquery credential is missing so misleading partial activity report is not produced.

## 5. Integration and verification

- [x] 5.1 Add package exports and update workspace scripts for new CLI snapshot command.
- [x] 5.2 Separate live CDP / Bitquery verification from default offline `bun run verify` path.
- [x] 5.3 Run targeted tests for new packages and CLI report generation.
- [x] 5.4 Run root `bun run verify` and fix regressions.
- [x] 5.5 Document legacy status of self-implemented probe workflow and new CDP + Bitquery primary path.
