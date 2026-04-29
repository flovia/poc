## Why

The current PoC is centered on self-implemented x402 discovery, probing, and
onchain collection, but CDP x402 Discovery and Bitquery already provide broad
resource metadata and payment activity coverage. Pivoting to those sources lets
the project validate x402 market intelligence faster while preserving the prior
self-implemented pipeline on the `v0-self-implemented-x402` branch.

## What Changes

- Introduce a CDP + Bitquery based market intelligence pipeline as the default
  direction for new work.
- Add package-based core logic so CLI and BFF remain thin application entrypoints.
- Generate a market snapshot from CDP resource/payment-option metadata joined
  with Bitquery transfer activity.
- Produce JSON and Markdown reports before adding DB persistence or BFF read
  endpoints.
- Treat the old dry-run probe, paid probe, onchain scanner, and fingerprint
  decoder workflows as legacy/optional rather than the main path for this change.
- Avoid live CDP or Bitquery calls from BFF request handlers in the initial
  implementation.

## Capabilities

### New Capabilities

- `market-intelligence`: Build normalized x402 market snapshots from CDP
  Discovery resources and Bitquery payment activity.

### Modified Capabilities

None.

## Impact

- Adds new shared packages under `packages/` for contracts, source clients, and
  market intelligence logic.
- Adds or updates CLI commands in `apps/cli` to generate x402 market snapshots.
- Keeps `apps/bff` as the eventual product API boundary, but does not require a
  BFF rewrite in the first implementation step.
- Uses `BITQUERY_TOKEN` from environment configuration for Bitquery GraphQL
  requests.
- Preserves existing Docker, Bun workspace, TypeScript, Biome, and verification
  foundations where practical.
