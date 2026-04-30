## Why

The analytics pipeline now has the storage, sampling, capture, and read-model building blocks, but operators still need to run several scripts manually and bridge sampling outputs themselves. A full-capture orchestration CLI will make broad offline analytics collection repeatable, bounded, and easier to resume or diagnose.

## What Changes

- Add a single `analytics:capture-full` CLI entry point that orchestrates census capture, payTo sampling, transfer capture, wallet sampling, customer intelligence batch capture, and read-model generation.
- Add persisted or generated sampling plan outputs for payTo and wallet selection so the capture basis is auditable.
- Add store query helpers needed by orchestration to read payTo census rows, mapping patterns, transfer facts, and wallet sampling inputs from SQLite.
- Add progress, dry-run, and failure recording behavior so long-running captures remain explainable without requiring live services during normal verification.
- Keep generated raw outputs, sampling plans, customer intelligence snapshots, and read models in ignored paths.

## Capabilities

### New Capabilities

- `analytics-full-capture`: End-to-end offline analytics capture orchestration from census through generated BFF read models.

### Modified Capabilities

- `analytics-data-store`: Expose query helpers and persisted plan/read-model records needed by full-capture orchestration.
- `analytics-sampling`: Support CLI-driven payTo and wallet sampling plan generation from analytics store inputs.
- `market-intelligence`: Allow the full-capture command to reuse market census capture as the first pipeline stage.
- `customer-intelligence`: Allow full-capture orchestration to run bounded batch customer intelligence capture from a wallet sampling plan.

## Impact

- Affected code: `apps/cli/scripts/analytics`, `apps/cli/package.json`, CLI tests, and docs.
- Uses existing `bun:sqlite`, CDP, Bitquery, and optional Zerion source adapters; no new live dependencies are required.
- Default `bun run verify` remains offline with mocked source tests.
- Generated artifacts remain ignored and are not required for repository operation.
