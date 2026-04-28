# Flovia 260427 CLI

Offline-first Base USDC collector and attribution MVP.

## What this CLI does

- Loads synthetic Base transaction and receipt fixtures from `fixtures/manifest.json`.
- Decodes direct USDC `transferWithAuthorization` calls.
- Decodes Multicall3 `aggregate3` calls that contain direct USDC calls.
- Builds canonical payment observations without any live RPC calls.
- Generates attribution candidates from known wallet fingerprints.
- Builds daily and wallet level aggregates.
- Produces JSON and Markdown report outputs.

## Required commands

- Install from repo root: `bun install`
- Copy environment defaults: `cp -n .env.example .env`
- Verify offline pipeline: `bun run verify`
- Regenerate only database: `bun run db:reset`
- Replay fixtures: `bun run ingest:fixtures`
- Recompute attribution candidates: `bun run score`
- Recompute aggregates: `bun run aggregate`
- Generate reports: `bun run report`

## Notes

- No live RPC calls, no wallet use, and no paid API calls are required.
- `verify:live` exists as a guidance placeholder and intentionally skips live work.
