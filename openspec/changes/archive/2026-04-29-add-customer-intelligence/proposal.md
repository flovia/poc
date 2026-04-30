## Why

Phase B customer profile currently provides the information needed for a Wallet 360° view around proprietary x402 API usage, but it does not represent which external x402 services / `payTo` values the customer relates to, nor portfolio / DeFi context.
To avoid overloading `profile` with heavy external discovery and differently refreshed analytics, customer-centric intelligence should be handled as an independent contract and read model.

## What Changes

- Add a customer intelligence contract for `GET /customers/:address/intelligence`.
- Add read model / fixture schema with explicit customer address, network, asset, and time window.
- Add schemas that can represent x402 service candidates, payTo activity, portfolio summary, DeFi positions, derived insights, evidence, and provenance.
- Add an intelligence builder that joins and scores customer outgoing payment facts with CDP payment option metadata.
- Add a CLI / offline capture path to generate customer intelligence read model JSON.
- Make BFF return generated read models as read-only and do not call Bitquery, CDP, Zerion, MCP, or RPC in the request path.
- Keep endpoint-level attribution and request sequence out of real data in this change; treat them as future SDK telemetry.

## Capabilities

### New Capabilities

- `customer-intelligence`: provides customer-address-based x402 service candidates, payTo activity, portfolio / DeFi context, derived insights, evidence, and provenance.

- `customer-intelligence`: provides customer-address-based x402 service candidates, payTo activity, portfolio / DeFi context, derived insights, evidence, and provenance.

### Modified Capabilities

- `phase-b-demo-bff`: Add read-only Phase B product endpoint `GET /customers/:address/intelligence` that returns prepared read models.

## Impact

- `packages/contracts`: add customer intelligence response, fixture, nested entity schemas, and provenance contract.
- `packages/intelligence`: add payTo aggregation, payment option matching, candidate scoring, DeFi activity classification, and projection builder.
- `packages/sources`: add or reuse source contracts / adapters for customer outgoing transfer, CDP payment option lookup, and portfolio adapters.
- `apps/cli`: add customer intelligence capture command and fixture / read model writing.
- `apps/bff`: add `GET /customers/:address/intelligence` route and return validated saved read models.
- `apps/bff/fixtures`: add Phase B customer intelligence read model fixture.
- Verification: keep default `bun run verify` offline; move live source verification to a separate command.
