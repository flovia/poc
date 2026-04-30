## Context

Phase B demo BFF currently returns `GET /customers`, `GET /customers/:address/profile`, and `GET /wallet-usage-graph` from prepared fixture / read model as read-only responses. The current profile is a Wallet 360° view that combines CoinGecko x402 `payTo`-adjacent onchain facts with demo attribution, and it does not cover customer-address-centric external x402 service discovery, portfolio / DeFi context, or cross-provider affinity.

Customer intelligence is sensitive to external API rate limits, retries, authentication, and live source availability, so BFF must not call live sources in the request path. In Phase B, customer intelligence read model JSON is generated through CLI / offline capture, and BFF returns saved read models after contract validation.

## Goals / Non-Goals

**Goals:**

1. Define a contract-first response and fixture schema for `GET /customers/:address/intelligence`.
2. Keep customer address, network, asset, and time window as read model metadata.
3. Represent x402 service candidates, payTo activity, portfolio summary, DeFi positions, insights, evidence, and provenance distinctly.
4. Retrieve external source facts with CLI / offline capture and aggregate / join / score in `packages/intelligence`.
5. Return prepared read models as read-only from BFF and keep default verification offline.

**Non-Goals:**

- Do not call Bitquery, CDP, Zerion, MCP, or RPC directly from BFF request path.
- Do not treat endpoint-level attribution, request sequence, correlation id, or agent behavior as real telemetry in this change.
- Do not merge customer intelligence payload into the `profile` response.
- Do not generalize multi-chain / multi-asset live query orchestration in the initial implementation. Keep scope explicit in metadata and assume Base / USDC as initial default.

## Decisions

### 1. Add an `intelligence` endpoint instead of extending `profile`

`profile` is limited to a core Wallet 360° display. Heavier discovery, external API-derived, and differently refreshed information is separated into `GET /customers/:address/intelligence`.

- Rationale: UI / BFF can treat lightweight profile read and analytical read separately. This also avoids leaking customer intelligence partial sources or unavailable reasons into the profile contract.
- Alternative: Extend `profile.insights`. This is easier short-term, but would bloat provenance, portfolio, DeFi, and external service candidate handling and blur profile responsibilities.

### 2. Separate live capture and BFF read path

Constrain external source access to customer intelligence capture in `apps/cli`; BFF reads generated read model JSON.

- Rationale: keeps normal `bun run verify` offline and separates rate limit, credential, retry, and partial source failure risks from request path.
- Alternative: Call live source in BFF route, which would hurt demo response stability and reproducibility of verification.

### 3. Separate package responsibilities for contracts / sources / intelligence / apps

`packages/contracts` owns schemas and provenance contracts, `packages/sources` fetches / normalizes external sources, `packages/intelligence` performs aggregation / join / scoring, `apps/cli` handles orchestration and file write, and `apps/bff` serves read-only endpoints.

- Rationale: keeps source adapters and projection logic out of CLI-only paths and preserves contract-first testing. Because `packages/sources` does not depend on `packages/intelligence`, source fact collection and analysis logic remain separate and reusable.
- Alternative: Implement all logic in CLI. This may move quickly in PoC but is hard to reuse in BFF, tests, or future jobs.

### 4. Make provenance and evidence first-class design elements

Responses must preserve the distinction between `onchain_fact`, `derived_insight`, `demo_label`, and `future_sdk_field`. Derived insights must include non-empty `reasons` or `evidence`.

- Rationale: endpoint / workflow / service labels mix demo and future telemetry placeholders, so consumers must distinguish facts from hypotheses.
- Alternative: Return only flat business DTOs. This is easier to read in demo but removes fact/hypothesis boundaries.

### 5. Return 404 for uncaptured customers in initial implementation

`GET /customers/:address/intelligence` returns `404` when no matching read model exists.

- Rationale: aligns with unknown-wallet behavior in `GET /customers/:address/profile`, making captured vs uncaptured state explicit.
- Alternative: Return an empty valid response, which blurs the distinction between partial source and uncaptured and is not accepted in initial implementation.

## Risks / Trade-offs

- [Risk] Even when portions of CDP / Bitquery / portfolio source are missing, payloads are still needed. Represent section-level state with `sourceCoverage`, `unavailableReason`, and `reasons`.
- [Risk] Service candidate confidence may appear overly deterministic. Make `confidence` and `evidence` mandatory and treat candidates as derived insights.
- [Risk] Over-reliance on demo-only labels in fixtures. Distinguish labels with provenance and keep contracts centered on source facts / derived insights.
- [Risk] Overbuilding initial schema for portfolio / DeFi. Start with minimal summary / positions contract and do not expose raw source responses directly.
- [Risk] Live CLI command enters default verify path. Keep live capture and verification commands separate from normal `bun run verify`.

## Migration Plan

1. Add customer intelligence schema and fixture validation to `packages/contracts`.
2. Add pure-function aggregation / matching / scoring / projection builder to `packages/intelligence`.
3. Add prepared read model fixture under `apps/bff/fixtures/phase-b/customer-intelligence/`.
4. Add a read-only route in `apps/bff` that returns `200` for known addresses and `404` for unknown.
5. Add offline capture command in `apps/cli`; do not include live external source command in default verify.
6. Add tests and route validation, then run `bun run verify` at repo root.

Rollback is possible by removing route registration and fixture references. Contract / intelligence package additions are separated from existing endpoints, so impact on existing Phase B responses is limited.

## Open Questions

- Which initial portfolio source to use, Zerion or MCP, depends on available credentials / MCP at implementation time. The initial contract should support valid responses even when source is unavailable.
- For CDP Discovery metadata where a service identity cannot be resolved for a `payTo`, decide whether to return it as an unknown candidate or keep only activity when scoring implementation is finalized with fixtures.
