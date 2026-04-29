# Flovia 260427 CLI

## What this CLI does

- Generates a CDP + Bitquery market snapshot from onchain-aligned discovery metadata.
- Writes both JSON (`x402-market-snapshot.json`) and Markdown summary (`x402-market-summary.md`).
- Supports scoped reporting by `--network` and `--asset`, paginated CDP fetch (`--limit`),
  and explicit unlimited fetch (`--all`).
- Uses `BITQUERY_TOKEN` from environment for gated Bitquery enrichment.

## Required commands

- Install from repo root: `bun install`
- Copy environment defaults: `cp -n .env.example .env`
- Run snapshot: `bun run market:snapshot`
- Verify offline pipeline: `bun run verify`

## Notes

- The old self-implemented discovery/probe/onchain pipeline is preserved on the
  `v0-self-implemented-x402` branch and is intentionally absent from this branch.
