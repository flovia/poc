## Why

Customer intelligence already includes `portfolioSummary` and `defiPositions`, but portfolio source is currently represented as placeholder uncovered coverage. Connecting Zerion allows capture of real customer portfolio and DeFi context through CLI while keeping BFF read-only on prepared JSON.

## What Changes

- Add Zerion as an explicit optional portfolio source for customer intelligence capture.
- Add direct Zerion HTTP adapter in `packages/sources` and normalize wallet portfolio / positions into repository-owned DTOs.
- Extend customer intelligence contract minimally so Zerion can be identified via portfolio source provenance, without exposing raw Zerion responses.
- Extend `packages/intelligence` portfolio classification to handle Zerion coverage states: available, partial, and unavailable.
- Add CLI option in `customer:intelligence` for enabling Zerion portfolio capture.
- Separate live Zerion access from BFF request handling and default `bun run verify`.
- Do not introduce MCP, generic source plugin framework, background jobs, or frontend UI changes in this change.

## Capabilities

### New Capabilities

- None. This change extends existing customer intelligence capability.

### Modified Capabilities

- `customer-intelligence`: allow customer intelligence capture to optionally include Zerion-derived portfolio summary and DeFi positions with source coverage and provenance.

## Impact

- `packages/contracts`: add `zerion` provenance support and any normalized portfolio source contract needed to share between sources and intelligence.
- `packages/sources`: add Zerion portfolio adapter with injected fetch for offline tests.
- `packages/intelligence`: update portfolio / DeFi classification to distinguish available, partial, unavailable, and no-position Zerion outcomes.
- `apps/cli`: add Zerion capture option and `ZERION_API_KEY` handling for customer intelligence.
- `apps/bff`: do not add live Zerion calls; only validate and return prepared read model fixture.
- Verification: keep default `bun run verify` offline and move live Zerion verification into an explicit non-default command path.
