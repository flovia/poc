## 1. Contract First

- [x] 1.1 Review existing Phase B schemas / provenance types in `packages/contracts` and confirm contract placement and export strategy for customer intelligence.
- [x] 1.2 Add failing contract tests for `CustomerIntelligenceResponse`, `CustomerIntelligenceFixture`, scope, source coverage, and insight / evidence schema.
- [x] 1.3 Implement `CustomerIntelligenceResponse`, `CustomerIntelligenceFixture`, `X402ServiceCandidate`, `PayToActivity`, `PortfolioSummary`, `DeFiPosition`, and insight / evidence / provenance schemas.
- [x] 1.4 Pass validation tests for lowercase EVM address, network, asset, time window, and derived insight reasons.

## 2. Intelligence Core

- [x] 2.1 Add package structure and exports to `packages/intelligence`.
- [x] 2.2 Add failing tests for `aggregatePayToActivities()` and implement aggregation by payTo, network, asset, and time window.
- [x] 2.3 Add failing tests for `matchPayToToPaymentOptions()` and implement joining payTo activity with CDP payment option metadata.
- [x] 2.4 Add failing tests for `scoreServiceCandidates()` and implement service candidate scoring with confidence, reasons, and evidence.
- [x] 2.5 Add failing tests for `classifyDefiActivity()` and implement portfolio / DeFi source coverage and active / inactive classification.
- [x] 2.6 Add failing tests for `buildCustomerIntelligence()` and implement a projection builder that validates against contract schema.

## 3. Source Interfaces and Capture Inputs

- [x] 3.1 Add normalized input/output contracts in `packages/sources` for customer outgoing transfer, CDP payment option lookup, and portfolio source.
- [x] 3.2 Add tests for Bitquery outgoing transfer adapter or fixture-backed source and implement customer address / network / asset / time window filters.
- [x] 3.3 Add tests for CDP payment option adapter reuse or lookup wrapper and return required metadata for `payTo` / network / asset matching.
- [x] 3.4 Implement normalized result and unavailable reason when portfolio source is unavailable.

## 4. Fixtures and BFF Endpoint

- [x] 4.1 Add a valid customer intelligence read model fixture under `apps/bff/fixtures/phase-b/customer-intelligence/`.
- [x] 4.2 Add customer intelligence read model lookup to the BFF fixture loader / repository.
- [x] 4.3 Add route tests for `GET /customers/:address/intelligence` covering known address `200`, unknown address `404`, and mixed-case normalization as red tests.
- [x] 4.4 Implement the BFF route and validate prepared read model against `packages/contracts` before returning it as a read-only response.
- [x] 4.5 Add tests verifying request path does not call live CDP, Bitquery, Zerion, MCP, RPC, or SDK collector code.

## 5. CLI Capture

- [x] 5.1 Review `apps/cli` command structure and add argument parsing tests for customer intelligence capture.
- [x] 5.2 Implement capture orchestration accepting customer address, network, asset, from, to, and output path.
- [x] 5.3 Add flow tests for `sources -> intelligence builder -> contracts validation -> JSON write`.
- [x] 5.4 Verify capture fails with a clear configuration error when credentials are missing and does not emit a successful partial read model.
- [x] 5.5 Separate live source capture / validation command from default `bun run verify`.

## 6. Verification and Documentation

- [x] 6.1 Capture source fact / derived insight / demo label / future SDK field treatment in docs or inline fixture metadata.
- [x] 6.2 Run `bun run format` when needed.
- [x] 6.3 Run root `bun run verify` to confirm offline typecheck and tests (including route tests) pass.
- [x] 6.4 Verify OpenSpec status and confirm implementation artifacts match spec state.
