## 1. Contract boundary

- [x] 1.1 Review existing `CustomerIntelligenceResponse`, `PortfolioSummary`, `DeFiPosition`, and `SourceCoverage` schemas and decide minimal Zerion provenance additions.
- [x] 1.2 Add failing contract tests for Zerion source provenance and normalized portfolio / DeFi source result shape.
- [x] 1.3 Add `zerion` source provenance support and normalized portfolio source schema shared by `packages/sources` / `packages/intelligence`.
- [x] 1.4 Validate that product payload fixture rejects raw Zerion response, API key, auth header, and request metadata.

## 2. Zerion Source Adapter

- [x] 2.1 Add Zerion response fixtures for portfolio summary, DeFi positions, empty portfolio, partial response, and API error.
- [x] 2.2 Implement `packages/sources/zerion.ts` with injected `FetchLike`, explicit endpoint configuration, and no process env reads inside adapter.
- [x] 2.3 Normalize Zerion wallet portfolio response into repository-owned summary / position DTOs.
- [x] 2.4 Treat successful empty Zerion result as `available` portfolio coverage with zero positions, not unavailable.
- [x] 2.5 Map timeout / 429 / 5xx responses to explicit partial or unavailable coverage without fabricating positions.

## 3. Intelligence Integration

- [x] 3.1 Add `classifyDefiActivity()` tests using available Zerion portfolio summary and positions.
- [x] 3.2 Add tests that unavailable Zerion coverage does not imply DeFi inactivity.
- [x] 3.3 Update portfolio / DeFi classification so successful positions produce derived DeFi active insights with evidence and reasons.
- [x] 3.4 Explicitly mark wallet-wide Zerion data as not the Base / USDC x402 payment scope via `reasons` or scope metadata.

## 4. CLI Capture Integration

- [x] 4.1 Add CLI argument tests for explicit Zerion enablement such as `--portfolio-source zerion`.
- [x] 4.2 Resolve `ZERION_API_KEY` in `apps/cli` only when Zerion capture is enabled.
- [x] 4.3 Confirm capture fails before writing output when credentials are missing in enabled Zerion mode.
- [x] 4.4 Connect Zerion source adapter to `customer:intelligence` capture and pass normalized portfolio results to `buildCustomerIntelligence()`.
- [x] 4.5 Add mocked end-to-end CLI flow tests for available, empty, partial, and unavailable Zerion outcomes.

## 5. BFF / Fixtures / Docs

- [ ] 5.1 Update or add prepared customer intelligence fixture indicating Zerion available coverage without exposing raw Zerion data.
- [x] 5.2 Add BFF validation test coverage for prepared read model including Zerion portfolio / DeFi context when fixtures are updated.
- [x] 5.3 Add Zerion capture usage, required environment variables, and offline verification separation to CLI docs.
- [x] 5.4 Add Zerion-derived facts, derived DeFi classification, and unavailable / partial coverage semantics to customer intelligence docs.

## 6. Verification

- [x] 6.1 Run `bun run format` when formatting changes are introduced.
- [x] 6.2 Run root `bun run verify` and confirm no live Zerion access or `ZERION_API_KEY` is required.
- [ ] 6.3 Run explicit live command loading `ZERION_API_KEY` from `.env` to confirm portfolio / DeFi information can be fetched from Zerion for target wallet.
- [x] 6.4 Validate live-captured read model JSON with customer intelligence schema in `packages/contracts`.
- [x] 6.5 When reflecting live capture result in prepared fixtures such as `apps/bff/fixtures/phase-b/customer-intelligence/0xac5a07c44a4f971667b3df4b6551fb6991b2142d.json`, confirm raw Zerion response, API key, auth header, and request metadata are not included.
- [x] 6.6 Confirm BFF route tests and schema validation pass offline after prepared fixture updates.
- [x] 6.7 Verify OpenSpec status for `add-zerion-portfolio-intelligence` and confirm artifacts and implementation tasks are complete.
