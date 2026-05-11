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

## Non-goals for this follow-up

- Do not migrate `poc-data` docs/worklogs.
- Do not migrate Goldsky backfill/receiver code unless explicitly needed.
- Do not rename existing Postgres tables for this PoC.
- Do not introduce Drizzle as part of this collector follow-up unless the schema
  management problem changes.
