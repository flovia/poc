# Flovia BFF

Read-only HTTP API for frontend consumers of Flovia onchain intelligence projections.

## Scope

This BFF exposes onchain-derived facts and attribution candidates from the existing CLI library projections. It does not ingest live RPC data, run scoring jobs, rebuild aggregates, write report files, or infer HTTP request telemetry.

## Endpoints

- `GET /health`
- `GET /summary`
- `GET /observations`
- `GET /attribution-candidates`
- `GET /metrics/daily`
- `GET /wallets/payers`
- `GET /wallets/recipients`
- `GET /wallets/relayers`
- `GET /wallet-usage-graph`

## Semantics

- Payment observations are onchain-derived facts.
- Provider, middleman, facilitator, service, and payee labels are attribution candidates with confidence, reasons, and evidence refs.
- `tx.from` is exposed as a relayer wallet candidate, not a human user.
- Endpoint path, resource URL, referrer, response semantics, agent type, and upsell fields are unavailable unless a future enrichment source provides them.

## Temporary dependencies

During the PoC phase, `apps/bff` may import approved reusable surfaces from `apps/cli/lib/*`:

- aggregate readers
- DTO mappers
- summary builder
- wallet usage graph builder
- explicit database context types/factory helpers

It must not invoke `apps/cli/scripts/*` or use report file writers as route implementations. If BFF/frontend consumers need stable shared DTO validation, extract the proven surface into a future package such as `packages/api-model`.
