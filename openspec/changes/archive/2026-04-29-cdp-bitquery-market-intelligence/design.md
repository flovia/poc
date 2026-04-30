## Background

This repository is a Bun workspace where `apps/cli` is the primary PoC implementation and `apps/bff` is the read API surface.
Existing implementation was originally built around self-managed x402 acquisition logic such as endpoint discovery, dry-run probe, paid probe, onchain scan, and attribution / fingerprint.

In this pivot, the repository remains x402-specific while changing the default data path.
CDP x402 Discovery provides resource / payment-option metadata, and Bitquery GraphQL provides observed payment activity.
The `v0-self-implemented-x402` pipeline is kept on its branch and can be reintroduced later as optional verification, but is not the main path for this change.

## Goals / Non-Goals

**Goals:**

- Put shared domain logic under `packages/`, with `apps/cli` and `apps/bff` as thin entrypoints.
- Add CDP / Bitquery source clients that normalize external responses into repository-owned contracts.
- Build market snapshot by combining CDP resources / payment options with Bitquery transfer aggregates.
- Generate deterministic JSON / Markdown reports from CLI command.
- Preserve Bun workspace, Docker, TypeScript, Biome, and verification foundations where feasible.

**Non-Goals:**

- No DB persistence in initial implementation.
- No BFF rewrite in initial implementation.
- No live CDP / Bitquery call from BFF request handler.
- Do not run dry-run / paid probe as part of default market snapshot.
- Do not retain old CLI command internals when architecture diverges if that conflicts with this new direction.

## Decisions

### Do not add `x402-` prefix to package names

This repository is x402-specific, so package names will not use `x402-` prefix. Initial packages are:

- `packages/contracts`: Zod schemas, shared TypeScript types, normalized models, DTOs.
- `packages/sources`: CDP Discovery / Bitquery GraphQL clients and response normalization.
- `packages/intelligence`: join, ranking, discrepancy detection, summary data, market snapshot construction.

`packages/store` is deferred until snapshot model stabilizes enough to justify persistence.

Alternative considered and rejected: `packages/x402-contracts`, `packages/x402-sources`, `packages/x402-intelligence`.
This was unnecessary verbosity for an x402-only repository.

### Keep apps thin

Both CLI and BFF depend on packages and do not depend on each other.

```text
apps/cli ─┐
          ├──▶ packages/*
apps/bff ─┘
```

Package code must not be imported from `apps/*`. This avoids hardcoding current CLI implementation details into BFF.

### Start from CLI snapshot output

First implementation target is a CLI command that writes:

- `reports/x402-market-snapshot.json`
- `reports/x402-market-summary.md`

This avoids over-designing persistence or BFF read model before data shape is validated.

### Treat CDP and Bitquery as primary sources

CDP Discovery is source of resource metadata, payment options, `payTo`, asset, amount, network, and quality fields.
Bitquery GraphQL is source of transfer activity such as transaction count, unique sender count, volume, and latest observed payment data.

The snapshot builder uses normalized payment options as join keys by `network`, `asset`, and `payTo`.

### Avoid live external calls in BFF request handlers

BFF will read from snapshot, projection, or stored data.
Initial design does not issue Bitquery calls per incoming product request, keeping user-facing latency and reliability decoupled from external API cost / rate limits.

## Risks / Trade-offs

- CDP / Bitquery schema may change: normalize through `packages/contracts` and keep raw fixtures for regression tests.
- Bitquery query cost may scale with `payTo` count: use batched requests, start with Base USDC, and expose limit in CLI.
- CDP quality and Bitquery transfer metrics may differ: treat discrepancy as first-class snapshot field rather than hard error.
- Skipping probes loses live endpoint verification: keep optional future mode rather than default dependency.
- Deferring DB persistence limits BFF utility early; use report files as first stable contract and add `packages/store` once snapshot shape is proven.

## Migration Plan

1. Isolate existing self-implemented pipeline in `v0-self-implemented-x402`.
2. Add shared packages for contracts, sources, and intelligence to pivot branch.
3. Add new CLI snapshot command for the new source path without changing old DB or BFF.
4. Verify with fixture and live-only commands outside default offline `verify` path.
5. Add `packages/store` and BFF read endpoint after snapshot model stabilizes.

## Open Questions

- Which default CDP page size and maximum resource limit should be used for routine local runs?
- Should initial Bitquery implementation fetch only aggregate or also store small latest-transfer samples by payment option?
- After Base path stabilizes, which additional network should first follow-up include beyond Base USDC?
