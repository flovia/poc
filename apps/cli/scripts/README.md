# CLI scripts

The active CLI path is CDP + Bitquery market snapshot generation:

- `analytics/market-snapshot.ts`: fetch CDP Discovery resources, query Bitquery
  payment activity, and write JSON/Markdown market reports.

The previous self-implemented acquisition/probe/onchain pipeline is preserved on
the `v0-self-implemented-x402` branch and is intentionally not present here.

Run scripts through `apps/cli/package.json` where possible so dotenv and paths stay consistent.
