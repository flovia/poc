# Flovia 260427 Next Actions

## Current baseline

`demo/260427` now has an offline deterministic MVP:

- frozen fixtures
- Base USDC direct authorization parser
- Multicall3 helper parser
- payment observations as source of truth
- attribution candidates from known fingerprints
- daily, payer, recipient, and relayer aggregates
- static report generation
- `bun run verify` without live RPC, wallet, paid request, or API server

The next work should keep the same invariant:

```text
Onchain observations are facts.
Catalog and fingerprint data only enrich observed facts.
Provider and middleman labels stay candidates with confidence and evidence.
```

## Phase 1: Real fixture capture

Goal: replace synthetic raw fixtures with frozen real Base transaction and receipt fixtures while preserving offline verification.

Deliverables:

- Add a raw tx / receipt fetcher that accepts explicit transaction hashes.
- Fetch transaction and receipt JSON from a configured Base RPC endpoint.
- Normalize fetched JSON into the existing `fixtures/raw/*.json` shape.
- Freeze known real transactions for the 10 positive cases.
- Keep the 4 negative fixtures, preferably with real unrelated Base transactions where possible.
- Update `fixtures/expected/observations.json` from verified parser output.
- Keep `bun run verify` fully offline after fixtures are captured.

Acceptance:

- `bun run verify` passes without RPC.
- Positive real fixtures produce exactly 10 observations.
- Negative fixtures produce 0 observations.
- Expected observations match parser output exactly.

## Phase 2: RPC transaction ingest

Goal: ingest a user supplied transaction hash from Base RPC into the existing observation pipeline.

Deliverables:

- Add `scripts/ingest-rpc-tx.ts`.
- Add env config for `BASE_RPC_URL` and optional request timeout.
- Fetch `eth_getTransactionByHash` and `eth_getTransactionReceipt`.
- Convert RPC response into the existing `RawTransaction` and `RawReceipt` types.
- Reuse the current decoder and observation builder.
- Store observations and settlement evidence idempotently.
- Add tests using a mocked RPC transport or saved RPC payloads.

Acceptance:

- A known tx hash can be ingested from RPC.
- Existing fixture ingest remains unchanged.
- Duplicate RPC ingest does not duplicate observations.
- Failed or missing receipts do not create observations.

## Phase 3: Bounded block range backfill

Goal: scan a small block range and discover candidate transactions automatically.

Deliverables:

- Add `scripts/ingest-rpc-range.ts`.
- Fetch blocks with transactions for a bounded range.
- Candidate filter:
  - `tx.to == Base USDC` and selector is authorization transfer
  - `tx.to == Multicall3` and selector is `aggregate3`
- Fetch receipts only for candidate transactions.
- Persist raw run metadata and observation results.
- Add checkpoint-free bounded mode first.

Acceptance:

- Bounded range backfill is deterministic for a fixed block range.
- Non-candidate transactions are skipped before receipt fetch.
- Candidate transactions reuse the same observation builder.
- Re-running the same range is idempotent.

## Phase 4: Chain indexer foundation

Goal: turn bounded backfill into a reliable indexer foundation without jumping to a UI too early.

Deliverables:

- Add ingestion runs and sync cursor tables.
- Store raw transaction and raw log references for auditability.
- Add finality delay config.
- Add retry and rate limit handling.
- Add reorg detection using block hash checks.
- Add parser version and rule version fields.

Acceptance:

- Indexer can resume from a saved cursor.
- Re-running a finalized range is idempotent.
- Reorged blocks can be detected and invalidated.
- Observation rows remain traceable to raw evidence.

## Phase 5: Attribution quality

Goal: improve candidate scoring without weakening the source-of-truth boundary.

Deliverables:

- Add score versioning.
- Add conflict handling for multiple matching catalog claims.
- Add separate roles for provider, middleman, facilitator, payee, and relayer.
- Add evidence refs that point to settlement evidence and fingerprint rows.
- Add confidence buckets and reason taxonomy.
- Seed known fingerprints from `docs/x402-analysis/` where evidence is strong enough.

Acceptance:

- Multiple candidates can exist for one observation.
- No candidate is collapsed into a final label in `payment_observations`.
- Every candidate has confidence, reasons, evidence refs, and score version.

## Phase 6: Product analytics projections

Goal: create dashboard-ready data without building the dashboard first.

Deliverables:

- Add product overlap edges by payer wallet.
- Add settlement pattern split metrics.
- Add recipient cluster summaries.
- Add relayer cluster summaries.
- Add payer repeat usage and first seen / last seen metrics.
- Extend `summary.json` as a stable API-like projection.

Acceptance:

- Static report can answer settlement overview, recipient intelligence, payer intelligence, and relayer intelligence questions.
- Projections are rebuildable from observations and candidates.
- No live UI is required.

## Phase 7: Read API and dashboard

Goal: expose the projections after the data model and ingest path are stable.

Deliverables:

- Add read-only API over report projections or SQLite queries.
- Add dashboard pages for settlement overview, recipient intelligence, payer wallet intelligence, product overlap, and relayer intelligence.
- Show weak labels as candidates, not facts.
- Add evidence drill-down views.

Acceptance:

- Dashboard can be rebuilt from offline data.
- Candidate confidence and evidence are visible.
- API does not mutate collector state.

## Recommended immediate next task

Start with Phase 1.

The highest leverage next step is the raw tx / receipt fetcher because it bridges the current offline parser to real Base data while keeping verification deterministic.
