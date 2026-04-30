## 1. Existing Pipeline Hardening and Store Query Foundation

- [x] 1.1 Add regression tests for real-source response tolerance before full-capture orchestration: invalid / missing Bitquery latest transfer fields, CDP payment option omissions, duplicate resource/payment options, and empty / partial aggregate rows.
- [x] 1.2 Fix any existing source normalization, market census persistence, or read-model generation bugs revealed by those tolerance tests while keeping default verification offline.
- [x] 1.3 Add analytics store tests for reading payTo census rows joined with aggregate activity, mapping pattern, service identity, endpoint counts, and attribution metadata.
- [x] 1.4 Implement `listPayToCensusRows` or equivalent query helper in the analytics store.
- [x] 1.5 Add analytics store tests for reading wallet sampling transfer rows with payer wallet, payment sink, service identity, amount, timestamp, and bundled-payTo signal.
- [x] 1.6 Implement `listWalletTransferRows` or equivalent query helper in the analytics store.
- [x] 1.7 Add helper support for persisting payTo and wallet sampling plan metadata as generated analytics records.

## 2. Full Capture CLI Contract

- [x] 2.1 Add `apps/cli/scripts/analytics/capture-full.ts` with strict argument parsing for analytics DB path, network, asset, time window, budgets, limits, slice days, portfolio source, portfolio limit, output directory, read-model output, seed, and dry-run.
- [x] 2.2 Add unit tests for argument defaults, required fields, invalid values, and generated output path resolution.
- [x] 2.3 Add `analytics:capture-full` script to `apps/cli/package.json` using dotenvx env loading.
- [x] 2.4 Add dry-run plan output that lists stages, budgets, output paths, and required credentials without calling live sources or writing generated raw capture data.
- [x] 2.5 Add tests proving dry-run does not call mocked CDP, Bitquery, or Zerion fetch functions.

## 3. Pipeline Orchestration

- [x] 3.1 Add top-level full-capture run tracking with parameters, started timestamp, stage progress, source coverage, success status, and failure status.
- [x] 3.2 Wire the census stage to reuse market snapshot capture with `limit: null`, analytics DB persistence, scoped network / asset, and configured time window.
- [x] 3.3 Build a payTo sampling plan from stored census rows using configured seed, budgets, mandatory CoinGecko payTos, activity tiers, mapping patterns, and long-tail rules.
- [x] 3.4 Write the payTo sampling plan to an ignored JSON output path and persist plan metadata in the analytics data store.
- [x] 3.5 Capture transfer facts sequentially for each selected payTo using the generalized payTo capture path, per-payTo limit, optional time slicing, and ignored raw output paths.
- [x] 3.6 Build a wallet sampling plan from stored transfer facts using configured seed, budgets, wallet caps, and optional portfolio enrichment cap.
- [x] 3.7 Write the wallet sampling plan to an ignored JSON output path and persist plan metadata in the analytics data store.
- [x] 3.8 Run customer intelligence batch capture for selected wallets using the configured time window, source credentials, portfolio source, portfolio limit, ignored output directory, and analytics DB persistence.
- [x] 3.9 Generate service analytics read models from the analytics DB and write the configured read-model output file.

## 4. Failure and Boundary Behavior

- [x] 4.1 Add tests that a census-stage failure records the top-level run as failed and does not continue to sampling or downstream stages.
- [x] 4.2 Add tests that payTo transfer capture failure records failed stage details and does not mark the full-capture run successful.
- [x] 4.3 Add tests that customer intelligence batch failure records failed stage details and preserves partial outputs as generated data only.
- [x] 4.4 Add tests that portfolio enrichment respects `--portfolio-limit` and records unavailable or skipped portfolio coverage for wallets beyond the cap.
- [x] 4.5 Ensure normal `bun run verify` remains offline with mocked fetch functions and no live credentials.

## 5. Documentation and Verification

- [x] 5.1 Update CLI README with `analytics:capture-full` usage, recommended budgets, output paths, generated-data policy, and BFF read-model handoff.
- [x] 5.2 Document first-version limitations: sequential execution, fail-fast behavior, no resume, and no concurrency.
- [x] 5.3 Run formatting for changed TypeScript / JSON files.
- [x] 5.4 Run `openspec validate --all` and fix spec issues.
- [x] 5.5 Run `bun run verify` from the repository root and fix failures.
