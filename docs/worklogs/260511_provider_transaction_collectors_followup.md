# Provider transaction collectors follow-up

## Context

This note separates future provider transaction collection work from the
`poc-data` public migration scaffold. The current branch already imports the
Postgres migration foundation into `apps/data`, but it intentionally does not
move or implement transaction collectors yet.

## Why this is separate

- The current `poc` repository already has the latest GEO and Pay.sh source
  inputs.
- The `poc-data` repository does not contain an implemented Base Alchemy
  collector. Base Alchemy ideas appear in planning notes only.
- The existing `poc-data` Solana RPC collector is real, but it is generic Solana
  JSON-RPC and optional for the current Base/x402 capture objective.
- Importing collector code should happen after the Postgres handoff and Pay.sh
  import path are stable.

## Future work item 1: Base Alchemy collector

Goal: make provider/x402 transaction capture use Alchemy-backed Base data, not
showcase payment RPC.

Likely shape:

- Read Base pay-to targets from existing Postgres tables such as
  `x402_payment_options` and/or `pay_sh_payment_offers`.
- Fetch Base USDC transfer activity through an Alchemy endpoint, likely via
  `alchemy_getAssetTransfers` or `eth_getLogs`.
- Insert normalized rows into the BFF-compatible table
  `goldsky_webhook_transfers_x402_paytos`.
- Use a source marker such as `gs_op = 'alchemy_rpc'` or similar so the existing
  Goldsky-named table can still distinguish provenance.
- Store original response data in `raw_payload` where practical.

Open decisions:

- `alchemy_getAssetTransfers` vs `eth_getLogs`.
- Whether the implementation belongs in `apps/data/src/cli`,
  `packages/sources`, or both with a thin CLI wrapper.
- Pagination/rate-limit policy.
- Whether this should write only to the existing BFF-compatible table or also to
  a separate source observation table later.

## Future work item 2: Solana RPC collector

`poc-data` has an implemented generic Solana JSON-RPC collector that can use an
Alchemy Solana URL via `SOLANA_RPC_URL`.

Potential source files if/when this is migrated:

- `poc-data/apps/cli/src/cli/solana-rpc-token-history.ts`
- `poc-data/apps/cli/tests/solana-rpc-token-history.test.ts`

Dependencies and ordering:

1. Pay.sh provider/payment offers must exist in Postgres.
2. `payment_collection_targets` must be seeded.
3. The collector reads resolved token-account targets.
4. It writes to `goldsky_webhook_token_transfers_solana`.

This remains useful as an RPC/Alchemy-Solana trace, but it is distinct from the
Base/x402 Alchemy capture objective.

## Future work item 3: collector service evaluation

Goal: validate the data collection services before hard-coding one source shape
into production collector code. The initial product assumption is that Base and
Solana collection can be handled by Alchemy, while the other services are kept as
comparison, fallback, or enrichment candidates.

Candidates:

- Alchemy: default Base and Solana path for the next implementation phase.
- RPC Fast: low-latency Solana RPC alternative for Solana polling; not a Base
  candidate.
- Dune Sim: Dune Sim API only, not the main Dune analytics/query product.
- GoldRush: historical transfer/activity API comparison and possible enrichment
  source.

Phase 1 implementation boundary:

- Keep live validation scripts and credentials under `tmp/collector-evaluation/`.
- Store local credentials in `tmp/collector-evaluation/.env`, derived from the
  generated `tmp/collector-evaluation/.env.template`.
- Use `ALCHEMY_API_KEY` for Alchemy and construct Base/Solana RPC endpoints in
  validation code instead of storing full Alchemy endpoint URLs.
- Do not add live API calls to `bun run verify`.
- Define the shared collector interface first so service-specific prototypes can
  normalize to the same transfer shape.
- Keep Postgres writes out of phase 1; validate collection and normalization
  before adding a writer.

Shared normalized output fields:

- `source`
- `chain`
- `queryTarget`
- `transactionHash`
- `blockNumber` or `slot`
- `timestamp`
- `fromAddress`
- `toAddress`
- `assetAddress` / `assetSymbol`
- `amountBaseUnits`
- `rawPayload`

Open decisions after validation:

- Whether Alchemy remains the only production collector path for Base/Solana.
- Whether RPC Fast, Dune Sim, or GoldRush should become fallback collectors or
  only diagnostic comparison tools.
- Whether the first writer should target the existing BFF-compatible tables
  directly or write to a source observation table first.

Initial smoke validation notes:

- `tmp/collector-evaluation/smoke.ts` validates credentials and API reachability
  without printing secrets.
- Alchemy Base `alchemy_getAssetTransfers` returned recent Base USDC transfers
  for an existing MPP pay-to target.
- Alchemy Solana JSON-RPC `getSlot` succeeded.
- Dune Sim Base transactions endpoint succeeded for the same Base pay-to target.
- Dune Sim Solana transactions endpoint succeeded but returned no rows for the
  current sample address, so a better Solana target is needed before judging data
  quality.
- GoldRush Base ERC-20 transfers endpoint succeeded for the same Base pay-to
  target and USDC contract.
- GoldRush Solana balance endpoint succeeded for the current sample address;
  transfer-history suitability still needs a Solana-specific endpoint check.
- RPC Fast Solana JSON-RPC `getSlot` succeeded after using the endpoint URL
  without embedding the API key and passing the key separately.

Detailed collector research findings:

- Concrete Solana Pay.sh targets exist in `poc-data`, not in current `poc`
  fixtures. The canonical Solana USDC mint used there is
  `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.
- A representative Pay.sh owner / receive-token-account pair is:
  - owner: `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP`
  - USDC token account: `3m3xS513PgjPwnLbmGbgL4Nk62QEtwzuoXphVN3kfMNh`
- `poc-data` has 12 primary Pay.sh owner-to-USDC-token-account mappings in
  `apps/cli/src/cli/seed-payment-targets.ts`; if imported later, they should be
  treated as seedable collection targets, not as runtime secrets.
- A representative collected Solana signature from the prior worklog is
  `339YmDxTPSmoxYyySd7ugF1s1WRVVdDZJJV9grKY5oGF5f5Yd2TxszrmAFSY9z7QynYcp1BCAVm8iF1YkrAiKAuz`.

Base collection comparison:

- Alchemy `alchemy_getAssetTransfers` succeeded against a Base MPP pay-to target
  and Base USDC. It returned normalized transfer rows and a `pageKey`, so it is
  the fastest path for Base payment transfer collection.
- Alchemy `eth_getLogs` is viable for event-exact collection, but the current
  key/plan only allowed a 10-block range in validation. A 100k-block query failed
  with a Free-tier range error, while a 10-block query succeeded with zero logs.
- Practical Base default: use `alchemy_getAssetTransfers` for the first collector
  implementation. Keep `eth_getLogs` as the lower-level fallback or future
  high-fidelity path if paid plan/range handling is available.
- Base idempotency should use Alchemy `uniqueId` where available; raw log mode
  should use `(chainId, blockHash, transactionHash, logIndex)`.

Solana RPC collection findings:

- Alchemy Solana JSON-RPC and RPC Fast Solana both succeeded with
  `getSignaturesForAddress` on the concrete USDC token account and
  `getTransaction` on the returned signature.
- The fetched transaction contained USDC token balance data, confirming that the
  existing `getSignaturesForAddress -> getTransaction -> token balance diff`
  approach remains valid.
- Use `commitment: "finalized"`, `limit <= 1000`, and
  `maxSupportedTransactionVersion: 0` on `getTransaction`.
- Querying token accounts is preferred for known Pay.sh collection targets;
  owner-wallet queries may miss SPL token-account-only activity depending on the
  provider/indexer.
- Solana idempotency should start with signature-level keys and include
  instruction/index detail when one transaction contains multiple relevant token
  movements.

Dune Sim findings:

- Dune Sim Base transactions endpoint succeeded and provides cursor-style
  `next_offset` pagination.
- Dune Sim SVM transactions endpoint exists and is authenticated with
  `X-Sim-Api-Key`, but live validation returned zero rows for both the Pay.sh
  owner and its USDC token account. This suggests it is not immediately reliable
  for the current Pay.sh Solana targets, or a different address/coverage pattern
  is required.
- Follow-up coverage validation clarified the pattern: Dune Sim SVM balances can
  resolve the Pay.sh owner wallet and show USDC, but SVM transactions returned
  rows only for the fee-payer/signing wallet seen in the known RPC transaction.
  It returned zero rows for the Pay.sh owner wallet, the Pay.sh USDC token
  account, the source owner wallet, the source token account, and the USDC mint.
- Therefore Dune Sim SVM transactions should not be treated as a payment-target
  collector for our Solana use case. Its likely fit is wallet/balance enrichment
  and investigation of fee-payer/signing-wallet activity, not exact SPL payment
  receipt collection by token account.
- If used later, never construct `next_offset`; persist and replay only the value
  returned by the API.

GoldRush findings:

- GoldRush Base ERC-20 `transfers_v2` succeeded for Base USDC and is a plausible
  comparison/fallback source for Base transfer history.
- GoldRush Base fit is good for historical ERC-20 backfill and enrichment, but
  exact payment collection should still use safeguards: contract allowlist,
  block confirmation delay, idempotency by transaction/transfer identity, and
  optional RPC receipt confirmation for high-value payments. Documentation does
  not make finality/reorg guarantees explicit.
- GoldRush Solana `balances_v2` succeeded, but Solana `transactions_v3` and
  `transfers_v2` returned `501` with "Chain: solana-mainnet is not currently
  supported for this endpoint." Current REST support is therefore insufficient
  for Solana transfer collection.
- GoldRush Solana REST may still be useful for balance/token metadata enrichment,
  but not as a transfer-history collector. GoldRush Pipeline lists SPL Token
  Transfers and may be relevant later, but that would be a heavier push/ETL
  integration requiring vendor confirmation on backfill, replay, delivery
  guarantees, token-account coverage, and cost.

Updated service fit evaluation:

| Service | Base payment collection | Solana payment collection | Enrichment fit | Recommended role |
| --- | --- | --- | --- | --- |
| Alchemy | High | High | Medium | Primary collector |
| RPC Fast | N/A | High | Low | Solana RPC fallback |
| Dune Sim | Medium | Low for payment targets | High | Base validation and wallet/balance enrichment |
| GoldRush | Medium-high with safeguards | Low via REST | High | Base fallback/enrichment; Solana balance enrichment only |

Decision: keep Dune Sim and GoldRush out of the first production collector path.
Use them for comparison and enrichment after Alchemy/RPC Fast collection has
produced canonical payment observations.

Interface implications:

- Keep a single `TransferCollector` interface, but make the cursor source-aware:
  Alchemy Base page key/block checkpoint, Solana signature checkpoint, Dune Sim
  offset, and GoldRush page metadata differ too much for a plain string cursor.
- Normalized transfers need an explicit `idempotencyKey`, optional Solana
  `signature`, optional EVM `blockHash/logIndex`, optional Solana
  `instructionIndex`, `direction`, `success`, and `warnings` on collection
  results.
- Keep Postgres writing outside collectors. Collectors should emit normalized
  observations plus raw payloads; a separate writer should handle attribution,
  idempotent upsert, and BFF-compatible table projection.

Implementation direction chosen:

- Use a TS fixture first for the 12 public-safe Pay.sh Solana USDC collection
  targets. Do not put these mutable target rows into SQL migrations yet.
- Keep the target fixture in `apps/data/src/collectors/targets/pay-sh-solana.ts`
  with a converter to generic `CollectorTarget` rows.
- Implement collector adapters before any Postgres writer:
  - `apps/data/src/collectors/alchemy/base-transfers.ts` for Base
    `alchemy_getAssetTransfers`.
  - `apps/data/src/collectors/solana/rpc-transfers.ts` for Alchemy/RPC Fast
    Solana JSON-RPC.
- Add `apps/data/src/cli/collect-transfers.ts` as a dry-run/stdout-only CLI so
  live collector behavior can be checked without writing to Postgres or changing
  normal offline verification.
- Add Dune Sim and GoldRush adapters as non-primary data-source providers:
  Dune Sim is used for Base validation/activity context and Solana owner-wallet
  balance enrichment, while GoldRush is used for Base ERC-20 fallback/enrichment
  and Solana balance/token metadata enrichment. Exact Solana payment-transfer
  collection remains Alchemy/RPC Fast because Dune Sim and GoldRush REST do not
  cover Pay.sh token-account transfer history reliably.
- `RPC_FAST_API_KEY` is the only RPC Fast credential; the Solana endpoint is the
  fixed provider URL `https://solana-rpc.rpcfast.com/`.

Checkpoint and writer direction:

- Base Alchemy Transfers: short-lived `pageKey` for active pagination and a
  durable processed block checkpoint. Do not rely on `pageKey` as a long-term
  resume token.
- Base log mode: durable checkpoint by finalized block plus reorg-buffer replay.
- Solana: historical backfill walks backwards with `before = oldestSeenSignature`;
  tail polling starts from newest signatures and stops when an already-seen
  signature appears.
- Dune Sim: durable source-specific `next_offset` only if this source is used;
  offsets are opaque.
- GoldRush Base: page-number/pagination metadata if used.

Quota and retry direction:

- Alchemy `alchemy_getAssetTransfers` is higher CU than `eth_getLogs` but much
  simpler for the current Base payment-transfer task.
- `eth_getLogs` needs block-range splitting and plan-aware limits; current local
  validation showed a 10-block Free-tier limit.
- Dune Sim uses CU-based billing and returns `402` for quota exhaustion and `429`
  for rate limiting.
- GoldRush low tiers are rate limited; treat `429` as retryable and `402` as a
  quota stop condition.
- RPC Fast should use the endpoint URL without `api_key` embedded and pass the
  API key separately.

## Non-goals for this follow-up

- Do not migrate `poc-data` docs/worklogs.
- Do not migrate Goldsky backfill/receiver code unless explicitly needed.
- Do not rename existing Postgres tables for this PoC.
- Do not introduce Drizzle as part of this collector follow-up unless the schema
  management problem changes.
