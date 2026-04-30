## Context

The analytics pipeline now has separate scripts and modules for market census capture, analytics SQLite persistence, deterministic payTo and wallet sampling, generalized payTo transfer capture, customer intelligence batch capture, and service read-model generation. These pieces are intentionally offline from the BFF request path, but running a broad capture still requires operators to manually chain commands and translate intermediate outputs.

The full-capture CLI should provide a bounded, repeatable orchestration layer over the existing building blocks. It must keep generated data ignored, keep default verification offline, and record enough progress and source coverage to explain partial or failed runs.

## Goals / Non-Goals

**Goals:**

- Provide one command to run census capture, payTo sampling, payTo transfer capture, wallet sampling, customer intelligence batch capture, and read-model generation.
- Make sampling plans auditable by writing ignored JSON outputs and/or storing them as generated records in SQLite.
- Reuse existing capture modules and source adapters rather than duplicating CDP, Bitquery, Zerion, or read-model logic.
- Add store query helpers so orchestration can derive sampling inputs from the analytics DB.
- Support dry-run planning that does not call live services.
- Record top-level and stage-level capture run status, parameters, source coverage, and errors.

**Non-Goals:**

- Build a scheduler, hosted worker, or multi-user data warehouse.
- Add live external calls to the BFF request path.
- Guarantee perfect endpoint attribution for bundled payTo services.
- Implement full resumability or retry/backoff in the first version.
- Commit generated DBs, raw transfer facts, customer intelligence outputs, or large read models.

## Decisions

1. **Add a CLI orchestration script in `apps/cli/scripts/analytics/capture-full.ts`.**
   - Rationale: The CLI already owns live/offline collection jobs and can use `.env` credentials through existing scripts.
   - Alternative considered: Put orchestration in BFF. Rejected because BFF request handling must remain offline and read-only.

2. **Reuse existing functions rather than shelling out to subcommands.**
   - Rationale: Function calls make testing easier with mocked fetch functions, shared in-memory stores, and deterministic outputs.
   - Alternative considered: A shell pipeline invoking `market:snapshot`, `coingecko:transactions`, and `analytics:read-models`. Rejected because error handling and shared run tracking would be brittle.

3. **Keep the first version sequential and fail-fast.**
   - Rationale: Sequential execution is simpler, avoids rate-limit bursts, and makes capture run status easier to understand.
   - Alternative considered: Parallel payTo and wallet capture with configurable concurrency. Deferred until retry/rate-limit behavior is explicit.

4. **Persist sampling plans as ignored JSON and SQLite generated records.**
   - Rationale: Operators need reproducible sampling basis for auditability. JSON files are easy to inspect; SQLite records keep provenance near source data.
   - Alternative considered: Add dedicated plan tables immediately. Deferred because the existing generated-read-model table is enough for first implementation.

5. **Use one top-level run plus existing stage runs where useful.**
   - Rationale: Existing helpers already record run state per stage. The full-capture run should record orchestration parameters and final source coverage while child stages record details.
   - Alternative considered: Only child runs. Rejected because operators need one ID for the whole pipeline.

## Risks / Trade-offs

- [Risk] Long-running captures can fail midway and leave partial outputs. → Mitigation: record failed run state, write plans before captures, and keep outputs ignored/re-creatable.
- [Risk] Sequential capture can be slow for large budgets. → Mitigation: first version prioritizes correctness; add `--concurrency` later after rate-limit behavior is designed.
- [Risk] Sampling may overrepresent services with richer CDP metadata. → Mitigation: use existing activity-tier, mapping-pattern, mandatory, unresolved, and long-tail strata.
- [Risk] Optional Zerion capture can be rate-limited or expensive. → Mitigation: require explicit `--portfolio-source zerion` and enforce `--portfolio-limit`.
- [Risk] Re-running the command could overwrite ignored outputs. → Mitigation: default output paths include the capture run ID or timestamp, while `--out-dir` can be explicit for controlled reruns.

## Migration Plan

1. Add store query helpers for payTo census and wallet transfer sampling inputs.
2. Add `capture-full.ts` with argument parsing, dry-run planning, stage orchestration, and top-level run tracking.
3. Add mocked offline tests for dry-run, successful full flow, portfolio caps, and failure recording.
4. Add CLI package script and README usage docs.
5. Keep existing individual scripts working unchanged.

## Open Questions

- Should the first implementation include `--concurrency`, or defer it until retry/backoff is implemented?
- Should sampling plan persistence remain in `generated_read_models`, or should dedicated `payto_sampling_plans` and `wallet_sampling_plans` tables be added later?
- Should `--resume-run-id` be included in the first version, or should reruns start new top-level runs and reuse persisted census data only through explicit flags?
