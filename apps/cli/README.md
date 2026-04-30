# Flovia 260427 CLI

## What this CLI can do

- Generates market snapshots using CDP x402 Discovery metadata and Bitquery onchain activity.
- Writes both JSON (`x402-market-snapshot.json`) and Markdown summary (`x402-market-summary.md`).
- Supports scope with `--network` / `--asset`, CDP fetch limit with `--limit`, and explicit full fetch with `--all`.
- Uses the `BITQUERY_TOKEN` environment variable for Bitquery enrichment.

## Main commands

- Install dependencies from the repository root: `bun install`
- Create environment variable template: `cp -n .env.example .env`
- Generate snapshot: `bun run market:snapshot`
- Verify offline pipeline: `bun run verify`

## Notes

- The legacy self-implemented discovery / probe / onchain pipeline is stored on the `v0-self-implemented-x402` branch.
- This branch uses CDP + Bitquery as the primary path and intentionally excludes the legacy pipeline.
