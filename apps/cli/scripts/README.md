# CLI scripts

Scripts are grouped by workflow stage:

- `ingest/`: fixture/RPC ingestion and RPC fixture capture
- `analytics/`: scoring, aggregation, and report generation
- `maintenance/`: reset, validation, and verification commands
- `acquisition/`: x402 catalog/probe/enrichment pipeline
- `dev/`: manual developer utilities for regenerating local fixtures

Run scripts through `apps/cli/package.json` where possible so dotenv and paths stay consistent.
