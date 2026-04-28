# Flovia POC

Bun workspace for Flovia 260427 on-chain intelligence experiments.

The current implementation is an offline-first CLI that ingests Base USDC
fixtures, decodes payment activity, builds attribution candidates, computes
aggregates, and generates report outputs without requiring live RPC access.

## Workspace

- `apps/cli/`: main CLI implementation, scripts, fixtures, tests, and reports
- `docs/`: product direction, implementation notes, and documentation assets
- `packages/*`: reserved for shared packages as the workspace grows

## Prerequisites

- Bun `>=1.3.13`

## Setup

```sh
bun install
cp -n apps/cli/.env.example apps/cli/.env
```

The default `.env.example` values run against local fixtures and `demo.db`.
Live RPC settings are optional and are not required for the default verification
pipeline.

## Common commands

Run from the repository root unless noted otherwise.

```sh
bun run verify        # typecheck, tests, and offline verification
bun run test          # CLI test suite
bun run typecheck     # TypeScript strict typecheck
bun run format        # format TypeScript and JSON with Biome
bun run format:check  # check formatting
```

CLI pipeline commands are available from `apps/cli`:

```sh
bun run db:reset
bun run ingest:fixtures
bun run score
bun run aggregate
bun run report
```

## Verification policy

`bun run verify` is intentionally offline-only. It should pass without wallet
access, paid APIs, or live RPC calls. Live checks, when needed, are kept behind
separate commands such as `verify:live`.

## Generated and local files

Local environment files, databases, build outputs, dependencies, and generated
reports are ignored by git. Keep generated outputs reproducible from fixtures
and scripts rather than committing them.
