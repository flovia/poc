## Context

The current repository is a Bun workspace with `apps/cli` as the main PoC
implementation and `apps/bff` as a read API surface. The existing implementation
was built around self-managed x402 acquisition: endpoint discovery, dry-run
probes, paid probes, onchain scans, and attribution/fingerprint logic.

The pivot keeps the repository x402-specific but changes the default data path:
CDP x402 Discovery provides resource and payment-option metadata, and Bitquery
GraphQL provides observed payment activity. The self-implemented pipeline remains
available on the `v0-self-implemented-x402` branch and can later be reintroduced
as optional verification, but it is not the main path for this change.

## Goals / Non-Goals

**Goals:**

- Make shared domain logic live under `packages/`, with `apps/cli` and
  `apps/bff` acting as thin entrypoints.
- Add CDP and Bitquery source clients that normalize external responses into
  repository-owned contracts.
- Build a market snapshot by joining CDP resources/payment options with
  Bitquery transfer aggregates.
- Produce deterministic JSON and Markdown reports from a CLI command.
- Keep existing Bun workspace, Docker, TypeScript, Biome, and verification
  foundations where practical.

**Non-Goals:**

- No DB persistence in the initial implementation.
- No BFF rewrite in the initial implementation.
- No live CDP or Bitquery calls from BFF request handlers.
- No dry-run or paid probe execution as part of the default market snapshot.
- No attempt to preserve old CLI command internals if they conflict with the new
  architecture.

## Decisions

### Use unprefixed package names

The repository is x402-specific, so package names will not include an `x402-`
prefix. Initial packages are:

- `packages/contracts`: Zod schemas, shared TypeScript types, normalized models,
  and DTOs.
- `packages/sources`: CDP Discovery and Bitquery GraphQL clients plus response
  normalization.
- `packages/intelligence`: joins, ranking, discrepancy detection, summary data,
  and market snapshot construction.

`packages/store` is deferred until the snapshot model is stable enough to justify
DB persistence.

Alternative considered: `packages/x402-contracts`, `packages/x402-sources`, and
`packages/x402-intelligence`. This was rejected as redundant for an x402-only
repository.

### Keep apps thin

Both CLI and BFF must depend on packages, not on each other:

```text
apps/cli ─┐
          ├──▶ packages/*
apps/bff ─┘
```

Package code must not import from `apps/*`. This prevents the current PoC shape
from hard-coding CLI implementation details into the BFF.

### Start with CLI snapshot output

The first implementation target is a CLI command that writes:

- `reports/x402-market-snapshot.json`
- `reports/x402-market-summary.md`

This avoids prematurely designing persistence and BFF read models before the CDP
and Bitquery data shapes are validated.

### Treat CDP and Bitquery as primary sources

CDP Discovery is the source of resource metadata, payment options, `payTo`,
asset, amount, network, and quality fields. Bitquery GraphQL is the source of
transfer activity, including transaction counts, unique senders, volume, and
latest observed payment data.

The snapshot builder joins on normalized payment options, primarily by network,
asset, and `payTo`.

### Avoid live external calls in BFF request handlers

The BFF will eventually read snapshots, projections, or stored data. It must not
make Bitquery calls per incoming product request in the initial design because
that couples user-facing latency and reliability to external API cost and rate
limits.

## Risks / Trade-offs

- CDP and Bitquery schemas may evolve → Normalize through `packages/contracts`
  and keep raw fixtures for regression tests.
- Bitquery query cost may increase with payTo count → Batch requests, start with
  Base USDC, and expose limits in the CLI.
- CDP quality metrics and Bitquery transfer metrics may not match exactly → Track
  discrepancies as first-class snapshot fields instead of treating them as hard
  errors.
- Skipping probes loses live endpoint verification → Keep verification as an
  optional future mode, not a default dependency.
- Deferring DB persistence limits BFF usefulness initially → Use report files as
  the first stable contract, then add `packages/store` once the snapshot shape is
  proven.

## Migration Plan

1. Keep the current self-implemented pipeline isolated on
   `v0-self-implemented-x402`.
2. Add shared packages for contracts, sources, and intelligence on the pivot
   branch.
3. Add a CLI snapshot command that exercises the new source path without
   modifying the old database or BFF.
4. Validate with fixtures and live-only commands outside the default offline
   `verify` path.
5. Add `packages/store` and BFF read endpoints only after the snapshot model is
   stable.

## Open Questions

- Which default CDP page size and maximum resource limit should the CLI use for
  routine local runs?
- Should the first Bitquery implementation fetch only aggregates, or also store
  a small latest-transfer sample per payment option?
- Which networks beyond Base USDC should be included in the first follow-up once
  the Base path is stable?
