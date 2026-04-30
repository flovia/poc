## Context

The full analytics capture already writes a local SQLite store and generated JSON artifacts from CDP discovery, Bitquery aggregates, sampled payTo transfers, wallet sampling, and customer intelligence. The hardening work targets the generated read-model and sampling-plan layers, not live data collection.

Current issues are concentrated in generated artifacts:

- `serviceSummary.topEndpoints` is built from the global sorted row set, so a CoinGecko summary can show unrelated market leaders.
- The read-model SQL joins `endpoint_attribution` to `service_candidates` directly, allowing multiple candidate rows for one payment sink to duplicate endpoint rows and inflate rollups.
- Sampling builders hardcode `generatedAt` to the Unix epoch even when the capture run occurred at a real time.
- Low-confidence bundled payTo attribution is already present, but outputs need to preserve it while avoiding endpoint-level overclaiming.

## Goals / Non-Goals

**Goals:**

- Regenerate demo-ready service analytics from the existing local analytics database without re-fetching external data.
- Scope service summary top endpoints to the summary service.
- Deduplicate read-model input rows by service identity and payment sink before service rollups and top endpoint selection.
- Preserve attribution status and confidence in outputs so inferred bundled-payTo metrics remain distinguishable from direct endpoint mappings.
- Make sampling plan timestamps auditable while preserving deterministic selection behavior.
- Cover fixes with Bun tests using local fixtures or in-memory/local SQLite data.

**Non-Goals:**

- Re-running CDP, Bitquery, RPC, CoinGecko, Zerion, or other live data collection.
- Solving perfect endpoint attribution for bundled payTos.
- Changing public BFF response shapes beyond corrected values and existing provenance/confidence fields.
- Adding new dependencies or moving generated analytics data into git.

## Decisions

### Decision 1: Fix read-model generation instead of recapturing data

The defects are in grouping, deduplication, and artifact timestamps. The existing SQLite store contains the source facts needed to regenerate corrected read models, so implementation SHALL operate on local stored data.

Alternative considered: rerun `capture-full` end-to-end. That would be slower, consume external API budgets, and still reproduce the same read-model defects until generation logic is fixed.

### Decision 2: Collapse service candidate joins before rollup

Read-model generation SHALL create a canonical row set keyed by service identity and payment sink. The SQL or TypeScript layer may use a CTE/helper to group `service_candidates` by `sink_key` and `service_key`, count distinct resources, and then join one canonical row per service/sink to `endpoint_attribution` and `payto_aggregates`.

Alternative considered: only dedupe `topEndpoints` after building all rows. That hides duplicates in the summary but leaves service comparison totals vulnerable to duplicated transaction and user counts.

### Decision 3: Build service summary endpoints from selected service rows

The summary for `coingecko` SHALL use rows from `servicesById.get("coingecko")` rather than `rows.slice(0, 5)`. The same helper should work for any future target service summary.

Alternative considered: keep global top endpoints but relabel the field. That would not satisfy the existing summary contract, which describes top endpoint metrics for the service being summarized.

### Decision 4: Preserve uncertainty instead of fabricating endpoint precision

For `bundled_payto_unknown_endpoint`, generated endpoint-like summary entries SHALL keep the attribution status and confidence. Names may represent a service or payTo cluster, but the provenance/confidence fields remain the source of truth.

Alternative considered: omit all low-confidence rows. That would make the market appear empty or misleadingly small because most transaction volume currently sits behind bundled payTo attribution.

### Decision 5: Make timestamps explicit without affecting deterministic selection

Sampling builders SHALL accept an optional `generatedAt`. If omitted, they use the current time. Selected entities remain determined only by seed, budget, and input data. Capture orchestration should pass a run-level timestamp when it wants all artifacts from a run to share the same generation time.

Alternative considered: keep epoch timestamps for snapshot stability. This is confusing for operator-facing artifacts and can be replaced in tests by injecting a fixed timestamp.

## Risks / Trade-offs

- **Risk:** Deduplicating by service/sink can still produce multiple rows for one sink when the sink is legitimately shared by multiple candidate services. → **Mitigation:** keep service identity in the key and preserve low confidence for bundled/shared mappings rather than forcing one service.
- **Risk:** Corrected service totals may change from prior generated reports. → **Mitigation:** treat existing reports as generated artifacts; update tests to assert non-inflation and provenance rather than exact legacy totals.
- **Risk:** Current generated plan files will still show epoch until regenerated. → **Mitigation:** document that no external re-fetch is needed; operators may regenerate sampling plans/read models locally after the code fix.
- **Risk:** Low-confidence attribution remains dominant by transaction volume. → **Mitigation:** expose status/confidence clearly and frame metrics as inferred where appropriate.
