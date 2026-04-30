## Context

The repository currently contains generated analytics JSON fixtures for coingecko transaction facts, mock endpoint attribution, customer intelligence, and market reports. These fixtures helped bootstrap demo BFF analytics, but they create bias and public-repository risk as data grows: coingecko has rich payTo transaction facts, peer services mostly have aggregate or single-wallet context, and raw payer wallets / tx hashes / portfolio-derived intelligence should not be expanded in git.

Existing source adapters already support CDP discovery, Bitquery Base USDC aggregates, payTo transfer lists, customer outgoing transfers, and optional Zerion portfolio enrichment. Existing BFF requirements also require request handlers to remain offline and deterministic. This design introduces an ignored local SQLite analytics store as the boundary between live/offline collection and read-only product APIs.

## Goals / Non-Goals

**Goals:**

- Store expanded analytics captures in a local SQLite DB that is ignored by git.
- Treat `service`, `resource / endpoint`, and `payment sink` (`network`, `asset`, `payTo`) as separate entities.
- Detect payTo mapping patterns, especially one-payTo-many-endpoints and one-payTo-per-endpoint.
- Capture CDP discovery census data and Bitquery payTo aggregate census data broadly, including full CDP discovery when requested.
- Select payTos and wallets with deterministic stratified sampling to reduce coingecko-only, discovery-order, activity, service-category, and endpoint-duplication bias.
- Generalize coingecko payTo transfer capture into payTo-level capture for sampled payment sinks.
- Capture customer intelligence for sampled wallets while tracking source coverage and caps.
- Generate BFF service analytics read models from the data store or generated ignored read models without live request-path calls.

**Non-Goals:**

- Add live external calls to BFF request handlers.
- Commit raw transfer facts, customer intelligence captures, portfolio enrichment, or large generated read models to the public repository.
- Build a production multi-user data warehouse or hosted database in this change.
- Guarantee perfect endpoint attribution for bundled payTo services without SDK/provider telemetry.
- Add Solana transfer collection parity in the first implementation; the initial storage model should allow it later.

## Decisions

1. **Use SQLite as the local analytics data store.**
   - Rationale: SQLite is suitable for local generated analytics, supports indexes and deterministic queries, and can be ignored from the public repository. Bun provides a simple SQLite runtime path without adding a server dependency.
   - Alternative considered: continue growing JSON fixtures. Rejected because JSON is poor for dedupe, sampling queries, incremental capture, large raw data, and public-repo privacy.
   - Alternative considered: hosted Postgres. Rejected for this stage because setup cost is higher than the PoC needs.

2. **Keep source collection offline and BFF request serving read-only.**
   - Rationale: existing requirements prohibit live CDP / Bitquery / RPC / SDK calls in the BFF request path. CLI jobs write data; BFF reads stored read models.
   - Alternative considered: BFF refreshes analytics on demand. Rejected because it couples product reads to external service availability, cost, and rate limits.

3. **Model payment sinks separately from endpoints.**
   - Rationale: some x402 providers use one payTo for multiple endpoints, while others use one payTo per endpoint. Onchain transfers identify payment sinks, not endpoint invocations.
   - Endpoint attribution statuses will include `direct_payto_endpoint`, `bundled_payto_unknown_endpoint`, `amount_inferred_endpoint`, `sdk_attributed_endpoint`, `demo_attributed_endpoint`, and `unresolved_payto`.
   - Alternative considered: assign each payTo transfer equally or deterministically to endpoints. Rejected because it would overstate precision for bundled payTo services.

4. **Use census first, sample detailed facts second.**
   - Rationale: CDP metadata and Bitquery aggregate census provide broad coverage; transfer facts and customer intelligence are heavier and should be sampled with budgets.
   - First census layer: all CDP resources / payment options when feasible, and Base USDC aggregate metrics for all scoped unique payTos.
   - Second detail layer: transfer facts and customer intelligence for deterministic sampled payTos / wallets.

5. **Use deterministic stratified sampling with recorded reasons.**
   - Rationale: fixed seeds and recorded stratum/reason fields make captures reproducible and explainable.
   - Initial payTo strata: activity tier, mapping pattern, sender diversity, recency, amount behavior, service category, metadata quality, service identity, and volume tier.
   - Initial wallet strata: coingecko repeat users, coingecko high spenders, one-shot users, peer-service users, cross-service users, recent active users, bundled-payTo users, and random long-tail users.

6. **Treat generated analytics data as private-by-default.**
   - Rationale: raw payer wallets, tx hashes, customer intelligence, cross-service overlap, and portfolio enrichment can be sensitive when aggregated even if source chain data is public.
   - Commit only schema, migrations, collectors, tests, synthetic fixtures, docs, and optionally aggregate-only public-safe examples.

## Risks / Trade-offs

- [Risk] SQLite schema work increases implementation complexity. → Mitigation: start with a small schema and simple migrations, then add tables as pipeline stages land.
- [Risk] Detailed capture can still overrepresent high-volume services. → Mitigation: cap per-payTo facts, use time-sliced sampling for high-volume payTos, and record sampling weights / reasons.
- [Risk] Endpoint analytics can be misinterpreted when payTo bundles many endpoints. → Mitigation: require explicit attribution status and use null/unknown endpoint transaction metrics unless attribution evidence exists.
- [Risk] Public repo history may already include generated data. → Mitigation: update ignore policy now; treat history cleanup as a separate explicit operation if needed.
- [Risk] Optional portfolio enrichment can be expensive or rate-limited. → Mitigation: make it opt-in, capped, and tracked with source coverage.
- [Risk] BFF behavior may diverge between missing local DB and generated read models. → Mitigation: define a read-model source interface and clear fallback/error behavior for local development.

## Migration Plan

1. Add ignore rules for local DB files and generated analytics output directories.
2. Add SQLite schema / migrations and a small storage module with offline tests.
3. Store CDP discovery and Bitquery aggregate census data in SQLite.
4. Build service/resource/payTo index and mapping-pattern detection.
5. Add deterministic payTo sampler and generalized payTo transfer capture.
6. Add wallet sampler and batch customer intelligence capture with caps.
7. Generate service analytics read models from SQLite.
8. Update BFF analytics data access to read generated read models or SQLite while preserving current fixture fallback during migration.

## Open Questions

- Should the first implementation use `bun:sqlite` directly or a tiny repository-owned wrapper around it?
- What default capture budgets should be used for local development versus larger offline analysis runs?
- Should generated aggregate-only summaries be allowed in git, or should all generated analytics outputs be ignored initially?
