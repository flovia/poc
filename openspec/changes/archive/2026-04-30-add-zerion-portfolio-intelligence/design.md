## Context

Customer intelligence can currently generate prepared read models with `portfolioSummary`, `defiPositions`, and portfolio `sourceCoverage`; however, portfolio source is still represented as not captured. Because BFF only reads prepared JSON, live source access must be limited to CLI capture and source adapter.

Zerion can provide wallet portfolio and DeFi position context but adds risks around credential, rate limit, availability, and scope ambiguity. Therefore, this change does not add MCP or a generic portfolio-source framework; instead, it narrowly extends the existing customer intelligence capture path.

## Goals / Non-Goals

**Goals:**

- Add direct Zerion HTTP source adapter in `packages/sources` and support injected fetch for deterministic offline tests.
- Normalize Zerion portfolio data into repository-owned summary / position DTOs before passing to `packages/intelligence`.
- Allow `customer:intelligence` to optionally include Zerion portfolio / DeFi data in generated read model JSON.
- Explicitly track `sourceCoverage` outcomes: available, partial, unavailable, and no-position.
- Require `ZERION_API_KEY` only when Zerion capture is explicitly enabled.
- Keep default `bun run verify` offline.

**Non-Goals:**

- Add MCP abstraction in this change.
- Perform live Zerion calls from BFF.
- Expose raw Zerion API response in product payload.
- Change frontend UI.
- Add generic plugin framework, scheduler, cache, or retry system.
- Treat Zerion capture failure as "no DeFi activity" except when Zerion succeeds with empty result.

## Decisions

### 1. Use direct Zerion adapter instead of MCP

`packages/sources/zerion.ts` follows existing CDP / Bitquery source patterns using direct HTTP, normalized output, and injected `FetchLike` for tests.

- Rationale: consistent with current repository, simple, and easy to test. Introducing MCP is premature when there is not yet a multi-provider portfolio backend.
- Alternative: MCP-backed adapter. Deferred until tool discovery or multiple portfolio providers become necessary.

### 2. Preserve existing customer intelligence response shape

Public BFF response continues to use `portfolioSummary`, `defiPositions`, `sourceCoverage`, `provenance`, `evidence`, and `reasons`. Zerion is identified through provenance such as `sourceKind: "zerion"` and source name, not raw payload fields.

- Rationale: keeps BFF and client shape stable while retaining source traceability.
- Alternative: add a `zerion` section to product payload. Rejected because provider-specific shapes leak and make future replacement difficult.

### 3. Make Zerion opt-in in CLI capture

`customer:intelligence` continues to generate valid output without Zerion. Zerion capture is enabled explicitly with `--portfolio-source zerion`.

- Rationale: avoids forcing `ZERION_API_KEY` requirements on existing Bitquery / CDP capture flow.
- If key is missing when Zerion is enabled, fail with configuration error before output write.
- Map network timeout / 429 / 5xx to explicit unavailable or partial source coverage unless mandatory mode is introduced.

### 4. Distinguish empty-result vs unavailable for Zerion

When Zerion returns successful empty result, treat as DeFi inactive with available `zero positions` portfolio coverage. When Zerion is unavailable, do not force DeFi inactive; represent as unavailable or partial coverage.

- Rationale: prevents misleading customer intelligence.
- Alternative: treat error as empty positions. Rejected because it hides source failure.

### 5. Clarify scope for wallet-wide data

Zerion may return all-chain / wallet-wide data, while current customer intelligence scope includes x402 payment network / asset. Normalize chain exposure in portfolio coverage or explain wallet-wide context in `reasons`.

- Rationale: avoids mixing Base / USDC payment scope with broader portfolio scope.

## Risks / Trade-offs

- [Risk] Zerion response shape may change: normalize at source boundary and validate with stable repository-owned contracts and fixtures.
- [Risk] Credential leakage: ensure `ZERION_API_KEY`, auth headers, and raw request metadata are never written to fixtures.
- [Risk] Rate limits and partial API failures: represent as partial / unavailable source coverage and keep default verify offline.
- [Risk] Over-classification of DeFi activity: classify DeFi active only from successful position facts; do not classify inactivity from source failure.
- [Risk] Scope creep toward MCP/provider frameworks: this change is limited to direct Zerion adapter and customer intelligence integration.

## Migration Plan

1. Extend provenance contract and add `zerion` source kind plus required normalized portfolio source DTO.
2. Add Zerion fixture parse tests and implement `packages/sources/zerion.ts`.
3. Update `classifyDefiActivity()` tests and implementation for available / partial / unavailable Zerion normalized results.
4. Add CLI option parsing and orchestration for optional Zerion capture.
5. Add mocked Zerion response offline CLI flow tests.
6. Update prepared fixtures and docs when adding Zerion demo fixtures.
7. Run root `bun run verify` to confirm default verification remains offline.
8. Run explicit live command using `.env` `ZERION_API_KEY` to confirm portfolio / DeFi for target wallet can be fetched.
9. If reflecting live capture results in prepared fixture, omit raw Zerion response, API key, auth header, and request metadata; validate contract and pass offline BFF route tests.

Rollback is to remove CLI option and source adapter wiring. BFF remains read-only and can continue returning existing fixture with portfolio unavailable coverage.

## Open Questions

- Which Zerion endpoint version and fields should be used for initial summary / position normalization?
- Should Zerion positions be filtered by network in initial implementation, or recorded as wallet-wide coverage with reasons?
- Should Zerion failure default to unavailable coverage, with strict mode added later?
