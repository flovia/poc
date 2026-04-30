## Context

`apps/bff` currently serves read-only Phase B demo endpoints from prepared fixtures and generated projections. The existing data already includes coingecko transaction facts, endpoint attribution fixtures, and customer intelligence data with x402 service candidates and provenance. The current public BFF routes are wallet-centered (`/customers`, `/customers/:address/profile`, `/customers/:address/intelligence`, `/wallet-usage-graph`) and do not expose macro service analytics.

The change adds service-level analytics over the same prepared read-model inputs. It must keep the BFF request path offline and deterministic: request handlers read fixtures, projections, or generated read models only, and must not call CoinGecko, CDP, Bitquery, RPC providers, or other external services.

## Goals / Non-Goals

**Goals:**

- Expose a coingecko service summary API with aggregate user, transaction, repeat usage, endpoint, and x402 comparison metrics.
- Expose a service comparison API that compares coingecko against other public x402 API services using prepared service intelligence data.
- Expose quadrant-ready comparison data using average transactions per user as X and endpoint diversity as Y.
- Preserve provenance for onchain facts, demo attribution labels, derived metrics, and prepared public intelligence.
- Keep response contracts strict and covered by offline tests.

**Non-Goals:**

- Add Solana / Base tabbed responses or chain-tab UI support.
- Add live collection, live RPC, or external-service calls to BFF request handlers.
- Replace the existing fixture-based demo pipeline with a persistent database.
- Implement advanced correlation analysis beyond the summary/comparison/quadrant API surface in this change.

## Decisions

1. **Build service analytics in the projection/read-model layer rather than route handlers.**
   - Rationale: existing BFF architecture keeps `http.ts` thin and centralizes aggregation in `projection-builder.ts`.
   - Alternative considered: compute metrics directly in each route handler. Rejected because it would duplicate aggregation logic and make contract testing harder.

2. **Use service IDs consistently and standardize the target service as `coingecko`.**
   - Rationale: fixtures already use `providerId: "coingecko"`; keeping the identifier lowercase avoids alias handling and avoids localized names in contracts.
   - Alternative considered: expose display names such as "コイン月光" in API contracts. Rejected because API identifiers should be stable and language-neutral.

3. **Add two primary analytics API concepts plus a quadrant view.**
   - Service summary reports macro metrics for a target service, initially including coingecko.
   - Service comparison reports metrics for coingecko and peer x402 services.
   - Quadrant data is a comparison-oriented representation with X = `averageTransactionsPerUser` and Y = `endpointDiversity`.
   - Rationale: this matches the approved API proposal and keeps the first implementation understandable.

4. **Derive all metrics from prepared fixtures and preserve provenance.**
   - Rationale: existing specs require the BFF not to fetch external sources per request, and existing projection logic already separates `onchain_fact` from demo / derived fields.
   - Alternative considered: invoke collectors from BFF to refresh comparison data. Rejected because it would make baseline verification dependent on external services and violate request-path constraints.

5. **Omit chain-tab response shape for now.**
   - Rationale: Solana / Base tabbing is lower priority and should not complicate initial contracts.
   - Alternative considered: add a `chain` query parameter to every analytics API. Rejected for this change to keep the first contract focused.

## Risks / Trade-offs

- [Risk] Prepared fixtures may not contain enough peer-service activity to make every comparison metric meaningful. → Mitigation: include sample sizes/counts and provenance so clients can explain sparse data.
- [Risk] Endpoint diversity can be inflated by demo attribution quality. → Mitigation: preserve attribution provenance and keep endpoint diversity definition explicit in tests and contracts.
- [Risk] Service identity can be ambiguous between provider IDs, candidate IDs, payTo values, and endpoint resources. → Mitigation: normalize service analytics around a stable `serviceId` and map coingecko to `providerId: "coingecko"` / known service candidates.
- [Risk] Quadrant axes may change later. → Mitigation: include axis metadata in the quadrant response so future views can add axes without breaking existing clients.
