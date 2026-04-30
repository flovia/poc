# Flovia POC

This is a Bun workspace PoC for Flovia 260427 focused on x402 market intelligence / customer intelligence experiments.

The primary architecture currently uses the `contract / source / intelligence` layers in `packages/*` from `apps/cli`, `apps/bff`, and `apps/frontend`. The CLI generates market snapshot / customer intelligence by combining CDP x402 Discovery and Bitquery, the BFF returns saved read models as a read-only product API, and the frontend renders those projections as a Next.js UI.

## Workspace

- `apps/cli/`: CLI entrypoint, market snapshot / customer intelligence generation, fixture capture, reporting
- `apps/bff/`: read-only product API for frontend demos; returns prepared fixtures / projections in a canonical envelope
- `apps/frontend/`: x402 Co-usage Discovery prototype UI built with Next.js 15 and React 19
- `packages/contracts/`: shared contracts using Zod schemas. Defines market intelligence and Phase B product API schemas
- `packages/sources/`: source clients and normalization for CDP Discovery and Bitquery
- `packages/intelligence/`: join logic for market snapshot / customer intelligence, ranking, and projection helpers

## Requirements

- Bun `>=1.3.13`
- Node.js `>=20` to run the frontend

## Setup

```sh
bun install
cp -n .env.example .env
```

Environment variables are stored in the repository-root `.env` file. Use the root `.env.example` as a template. The CLI loads `../../.env` and `apps/cli/.env` through dotenvx. Live capture / snapshot / customer intelligence with Bitquery requires `BITQUERY_TOKEN`.

## Common commands

Unless otherwise noted, run commands from the repository root.

```sh
bun run verify        # import boundary, typecheck, tests, offline verification
bun run test          # test suite
bun run typecheck     # TypeScript strict typecheck
bun run format        # format TypeScript / JSON with Biome
bun run format:check  # check formatting
```

Per-app main commands can be run via Bun workspace filtering.

```sh
bun --filter bff start       # start read-only product API (default: localhost:3001)
bun --filter frontend dev    # start frontend dev server (default: localhost:3000)
docker compose up --build    # start BFF and frontend together
```

CLI pipeline commands are available from the `apps/cli` workspace.

```sh
bun --cwd apps/cli market:snapshot -- --limit 100 --network base --asset USDC
bun --cwd apps/cli market:snapshot -- --all
bun --cwd apps/cli customer:intelligence -- --address 0x... --network base --asset USDC
bun --cwd apps/cli coingecko:transactions -- --from 2026-01-01T00:00:00Z --to 2026-04-29T23:59:59Z
```

`market:snapshot` requires `BITQUERY_TOKEN` when scoped payment options need Bitquery activity. By default, it writes:

- `apps/cli/reports/x402-market-snapshot.json`
- `apps/cli/reports/x402-market-summary.md`

Without `--all`, the result is capped by `X402_MARKET_FETCH_LIMIT` (default: 100). This cap is intentionally conservative, so pass `--all` explicitly if needed.

`customer:intelligence` and `coingecko:transactions` are commands that regenerate fixtures / read models using live Bitquery and CDP Discovery. They are not included in normal `verify` runs. See `apps/cli/scripts/README.md` for details.

## BFF / frontend

The BFF does not call live CDP / Bitquery / RPC / SDK collector methods on the request path and instead returns deterministic fixture / read models from `apps/bff/src/data/phase-b-demo.ts`. Main endpoints are:

- `GET /` / `GET /health`
- `GET /customers`
- `GET /customers/:address/profile`
- `GET /customers/:address/intelligence`
- `GET /wallet-usage-graph`

The frontend fetches the BFF from Server Components. You can override the target with `BFF_URL` (default: `http://localhost:3001`) and `NEXT_PUBLIC_BFF_URL` (default: `/api`).

```sh
bun --filter bff start
BFF_URL=http://localhost:3001 NEXT_PUBLIC_BFF_URL=/api bun --filter frontend dev
```

API contracts are based on `docs/phase-b/api-contract.md` and the Phase B schema in `packages/contracts`.

The self-implemented discovery / probe / onchain attribution baseline is stored on the `v0-self-implemented-x402` branch. It is intentionally excluded from this branch.

## Verification policy

`bun run verify` is intentionally offline-only. It must pass without wallet access, paid APIs, or live RPC calls. If live verification is required, run an explicit command such as `market:snapshot`.

## Artifacts and local files

Local environment files, databases, build outputs, dependencies, and generated reports are excluded from git. Do not commit artifacts; keep them reproducible from fixtures and scripts.
