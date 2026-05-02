## Context

The analytics full-capture pipeline already stores real provider/payment-sink relationships from CDP discovery and Bitquery aggregate census data. The normalized store includes `payment_sinks`, `payment_options`, `service_candidates`, `endpoint_attribution`, `payto_aggregates`, and sampled `transfer_facts`, and `listPayToCensusRows()` already returns most fields needed for a provider catalog.

The BFF currently serves generated analytics read models for customers, wallet usage graph, and service analytics, but it does not expose a provider catalog. The frontend therefore seeds three local demo providers (`northwind-price`, `lumen-vec`, `halonet`) whose `payTo` values are display-only and not connected to BFF customer scoping. As a result, provider switching does not change the customer list.

## Goals / Non-Goals

**Goals:**
- Promote existing analytics-store provider/payTo census data into a generated provider catalog read model.
- Serve the provider catalog through a read-only BFF endpoint with fixture fallback.
- Scope BFF customer lists by `payTo` so selected providers show payer wallets for that recipient wallet.
- Prefer generated real providers in the frontend while retaining the three local demo providers as fallback only.
- Keep BFF request handling offline and deterministic.

**Non-Goals:**
- Capturing all transfer-level customer facts for every CDP provider in this change.
- Adding live CDP, Bitquery, RPC, or SDK calls to BFF/frontend request paths.
- Replacing the broader service analytics comparison model.
- Building account ownership, authentication, or wallet-signature flows.

## Decisions

1. **Use a generated provider catalog read model instead of querying SQLite from BFF.**
   - Rationale: BFF already supports generated JSON read models and must stay simple/read-only in the request path.
   - Alternative considered: have BFF open `analytics.sqlite` directly. Rejected because it couples runtime serving to local DB availability and query shape.

2. **Build provider catalog rows from existing payTo census data.**
   - Rationale: `listPayToCensusRows()` already joins payment sinks, aggregates, service candidates, and attribution metadata, so provider/payTo mapping does not need to be rediscovered.
   - Alternative considered: derive providers from `serviceComparison`. Rejected because service comparison is aggregated by service identity and does not preserve the payTo row needed for customer scoping.

3. **Expose customer scoping by `payTo`.**
   - Rationale: customer lists represent payer wallets that paid a recipient wallet. `payTo` is the stable join key between provider catalog rows and `transfer_facts`.
   - Alternative considered: scope only by `providerId`. Rejected because one service can have multiple payTos and some payTos are unresolved or bundled; `providerId` alone is ambiguous.

4. **Rank real providers but keep fallback providers.**
   - Rationale: generated catalogs may be unavailable on a fresh local checkout, and not every real provider has sampled transfer facts. The UI should prefer meaningful real rows but remain usable without generated analytics data.
   - Alternative considered: remove demo providers entirely. Rejected because fallback is needed for deterministic development and tests.

5. **Represent drilldown availability explicitly.**
   - Rationale: aggregate census can contain hundreds of provider rows, while transfer-level payer facts are available only for sampled payTos. `hasCustomerFacts` lets the frontend prioritize rows where Customers can be meaningfully drilled into.
   - Alternative considered: hide all providers without customer facts in the BFF. Rejected because the catalog should still represent the real market while the UI can choose how much to show.

## Risks / Trade-offs

- **Generated catalog may contain noisy or unresolved providers** → Include attribution status/confidence, service identity, and activity metrics; frontend ranks resolved/high-confidence/customer-ready rows first.
- **Only sampled payTos have transfer-level customer lists** → Expose `hasCustomerFacts` and return empty scoped customer lists for payTos without sampled facts rather than fabricating customers.
- **A single service may map to multiple payTos** → Use stable provider row IDs that include service identity plus payTo/network/asset, and scope customers by payTo.
- **Contract changes touch CLI, BFF, contracts, and frontend** → Implement with TDD per layer: contract validators, read-model generation tests, BFF route tests, then frontend integration tests.
- **Fallback could mask broken generated data** → Tests should cover both generated provider catalog mode and fallback mode.

## Migration Plan

1. Extend contracts with provider catalog DTO validation.
2. Extend read-model generation to include `providers` built from existing analytics store census rows and transfer-fact coverage.
3. Extend BFF analytics source to load generated `providers` with fixture fallback.
4. Add `GET /providers` and payTo-filtered customer list behavior.
5. Update frontend API/data-source/provider context to prefer BFF providers and fall back to seed providers if unavailable or empty.
6. Run `bun run verify`; regenerate ignored local analytics read models as needed outside git.

Rollback is straightforward: frontend can continue using fallback seed providers, and BFF can ignore missing generated `providers` because fixture fallback remains supported.

## Open Questions

- Should the customer endpoint be `GET /customers?payTo=...` only, or should BFF also expose `GET /providers/:providerId/customers` as a convenience route?
- What default frontend limit should be used for real providers: top 3, top 10, or searchable full list?
- Should providers without `hasCustomerFacts` be visible but disabled, or hidden behind an expanded catalog view?
