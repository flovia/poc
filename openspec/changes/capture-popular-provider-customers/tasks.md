## 1. Target Selection and Planning

- [ ] 1.1 Add tests for selecting popular aggregate-only provider payTos from stored census/read-model inputs.
- [ ] 1.2 Implement deterministic target selection using transaction count, unique sender count, resolved service identity, `hasCustomerFacts=false`, optional mandatory CoinGecko verification, and explicit payTo overrides.
- [ ] 1.3 Add dry-run output that lists selected payTos, service names, activity metrics, expected capture bounds, and required credentials.

## 2. Focused Transfer Capture

- [ ] 2.1 Add tests for bounded focused payTo transfer capture using existing Bitquery capture fixtures/mocks.
- [ ] 2.2 Implement focused popular-provider capture as a CLI command or `analytics:capture-full` mode that reuses an existing analytics SQLite database without rerunning CDP census.
- [ ] 2.3 Persist captured payer-wallet transfer facts into the existing `transfer_facts` store with network, asset, payTo, payer wallet, amount, tx hash, and timestamp.
- [ ] 2.4 Record per-payTo success, miss, and failure metadata without marking providers customer-ready when no facts are captured.

## 3. Read Model and Fixture Refresh

- [ ] 3.1 Add tests showing focused capture changes selected popular providers from aggregate-only to `hasCustomerFacts=true` after read-model generation.
- [ ] 3.2 Regenerate analytics read models after focused capture and optionally write the committed BFF fixture output path.
- [ ] 3.3 Report remaining high-activity aggregate-only providers with transaction counts, unique sender counts, attribution status, and missing customer fact counts.

## 4. Verification

- [ ] 4.1 Run targeted Bun tests for analytics sampling, focused capture orchestration, analytics store persistence, and read-model generation.
- [ ] 4.2 Run `bun run verify` from the repository root.
- [ ] 4.3 If live credentials are available, run a bounded live capture for the selected popular providers and confirm `/providers` and `/customers?payTo=...` show non-empty customer drilldowns for newly captured targets.
