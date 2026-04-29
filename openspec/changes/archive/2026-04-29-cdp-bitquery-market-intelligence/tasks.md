## 1. Workspace and contracts

- [x] 1.1 Create `packages/contracts`, `packages/sources`, and `packages/intelligence` workspace packages with Bun/TypeScript package metadata.
- [x] 1.2 Define normalized CDP resource and payment option schemas in `packages/contracts`.
- [x] 1.3 Define Bitquery aggregate, latest-transfer, market resource, discrepancy, and market snapshot schemas in `packages/contracts`.
- [x] 1.4 Add fixture-based tests for contract parsing and invalid input failures.

## 2. Source clients

- [x] 2.1 Implement a CDP Discovery client in `packages/sources` with pagination and configurable limit handling.
- [x] 2.2 Normalize CDP Discovery responses into contract types while preserving source provenance and relevant quality fields.
- [x] 2.3 Implement a Bitquery GraphQL client in `packages/sources` that reads `BITQUERY_TOKEN` from configuration or explicit options.
- [x] 2.4 Implement Base USDC aggregate queries for payment options grouped by `payTo`.
- [x] 2.5 Add source client tests using recorded fixtures and mocked fetch responses.

## 3. Market intelligence

- [x] 3.1 Implement payment option filtering for requested network and asset scope.
- [x] 3.2 Join normalized CDP payment options with Bitquery aggregates by network, asset, and `payTo`.
- [x] 3.3 Compute active resource indicators, ranking fields, and discrepancy indicators without discarding source values.
- [x] 3.4 Build a market snapshot object containing resources, payment options, aggregates, summary metrics, generated timestamp, and source metadata.
- [x] 3.5 Add intelligence tests for joins, zero-activity payment options, and metric discrepancies.

## 4. CLI report generation

- [x] 4.1 Add a CLI entrypoint for generating the x402 market snapshot through package functions.
- [x] 4.2 Add CLI options for resource limit, network, asset, JSON output path, and Markdown output path.
- [x] 4.3 Write `reports/x402-market-snapshot.json` with the validated snapshot shape.
- [x] 4.4 Write `reports/x402-market-summary.md` with high-level counts, top resources, and discrepancy notes.
- [x] 4.5 Ensure missing Bitquery credentials produce a clear error and no misleading partial activity report.

## 5. Integration and verification

- [x] 5.1 Add package exports and update workspace scripts for the new CLI snapshot command.
- [x] 5.2 Keep live CDP/Bitquery verification separate from the default offline `bun run verify` path.
- [x] 5.3 Run targeted tests for the new packages and CLI report generation.
- [x] 5.4 Run root `bun run verify` and fix regressions.
- [x] 5.5 Document the legacy status of self-implemented probe workflows and the new CDP + Bitquery primary path.
