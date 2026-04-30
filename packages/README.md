# packages

This directory holds the core logic for x402 market intelligence.

`apps/cli` and `apps/bff` are entrypoints. Domain logic, external API integration, and snapshot generation decisions are delegated to `packages/*`.

## Dependency direction

```text
apps/cli ─┐
          ├──▶ packages/*
apps/bff ─┘
```

Rules:

- imports from `apps/*` to `packages/*` are allowed
- imports from `packages/*` to `apps/*` are forbidden
- imports from `apps/bff` to `apps/cli` are also forbidden

## Packages

### `contracts`

Defines shared contracts.

- Zod schemas
- TypeScript types
- normalized CDP resource / payment option
- Bitquery aggregate
- market snapshot DTO
- network / asset / payTo normalization helpers

### `sources`

Handles external source connections.

- CDP x402 Discovery client
- Bitquery GraphQL client
- pagination
- response parsing
- normalization into contracts

No ranking or scoring is done here.

### `intelligence`

Handles analysis logic.

- CDP resource and Bitquery activity join
- scope filtering
- active resource determination
- ranking
- discrepancy detection
- market snapshot generation

## Policy

This branch uses CDP + Bitquery as the primary source.

The legacy self-implemented discovery / probe / onchain attribution baseline is stored on the `v0-self-implemented-x402` branch and is not included in this `packages` structure.

## Verification

Each package can be verified individually.

```bash
cd packages/contracts && bun run typecheck && bun test
cd packages/sources && bun run typecheck && bun test
cd packages/intelligence && bun run typecheck && bun test
```

Usually run together from the repository root.

```bash
bun run verify
```
