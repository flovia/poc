## Why

The current PoC was built around self-implemented x402 discovery, probes, and onchain collection, but CDP x402 Discovery and Bitquery already provide broad resource metadata and payment activity coverage.
Shifting to these sources allows saving the previous self-implemented pipeline in `v0-self-implemented-x402` while advancing x402 market intelligence validation faster.

## Changes

- Make CDP + Bitquery based market intelligence pipeline the new default implementation direction.
- Keep core logic packaged so CLI and BFF remain thin application entrypoints.
- Generate market snapshot by combining CDP resource / payment-option metadata with Bitquery transfer activity.
- Generate JSON / Markdown report before adding persistence or BFF read endpoint.
- Treat old dry-run probe, paid probe, onchain scanner, and fingerprint decoder workflows as legacy / optional for this change.
- Do not issue live CDP / Bitquery calls from BFF request handlers in initial implementation.

## Capability

### New Capability

- `market-intelligence`: build normalized x402 market snapshot from CDP Discovery resource and Bitquery payment activity.

### Modified Capability

- None.

## Impact

- Add shared packages under `packages/` for contracts, source clients, and market intelligence logic.
- Add or update CLI command in `apps/cli` for generating x402 market snapshots.
- Keep `apps/bff` as future product API boundary without requiring BFF rewrite in initial step.
- Use `BITQUERY_TOKEN` environment variable for Bitquery GraphQL requests.
- Preserve Bun workspace, TypeScript, Biome, and verification foundation where possible.
