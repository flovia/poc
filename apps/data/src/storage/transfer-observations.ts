import type { NormalizedCollectorTransfer } from "../collectors/types.js";
import type { PgExecutor } from "./postgres.js";

export type TransferObservationUpsertResult = {
  base: number;
  solana: number;
  skipped: number;
};

export async function upsertTransferObservations(
  executor: PgExecutor,
  transfers: readonly NormalizedCollectorTransfer[],
): Promise<TransferObservationUpsertResult> {
  const result: TransferObservationUpsertResult = { base: 0, solana: 0, skipped: 0 };
  for (const transfer of transfers) {
    if (transfer.chain === "base") {
      await upsertBaseTransfer(executor, transfer);
      result.base += 1;
    } else if (
      transfer.chain === "solana" &&
      transfer.direction === "incoming" &&
      transfer.toAddress
    ) {
      await upsertSolanaTransfer(executor, transfer);
      result.solana += 1;
    } else {
      result.skipped += 1;
    }
  }
  return result;
}

async function upsertBaseTransfer(executor: PgExecutor, transfer: NormalizedCollectorTransfer) {
  const tokenAddress = required(
    transfer.assetAddress ?? transfer.queryTarget.assetAddress,
    "assetAddress",
  );
  const blockNumber = required(transfer.blockNumber, "blockNumber");
  const blockTimestamp = required(transfer.timestamp, "timestamp");
  const fromAddress = required(transfer.fromAddress, "fromAddress");
  const toAddress = required(transfer.toAddress, "toAddress");
  await executor.query(
    `
      INSERT INTO token_transfers (
        chain,
        token_address,
        tx_id,
        log_index,
        block_number,
        block_timestamp,
        from_owner_address,
        to_owner_address,
        amount_atomic,
        decimals,
        source,
        transaction_from,
        transaction_to,
        fetched_at,
        metadata
      ) VALUES (
        'base',
        lower($1),
        lower($2),
        $3,
        $4,
        $5::timestamptz,
        lower($6),
        lower($7),
        $8,
        6,
        $9,
        lower($6),
        lower($7),
        now(),
        $10::jsonb
      )
      ON CONFLICT (chain, token_address, tx_id, log_index) DO UPDATE SET
        block_number = EXCLUDED.block_number,
        block_timestamp = EXCLUDED.block_timestamp,
        from_owner_address = EXCLUDED.from_owner_address,
        to_owner_address = EXCLUDED.to_owner_address,
        amount_atomic = EXCLUDED.amount_atomic,
        source = EXCLUDED.source,
        transaction_from = EXCLUDED.transaction_from,
        transaction_to = EXCLUDED.transaction_to,
        fetched_at = EXCLUDED.fetched_at,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    `,
    [
      tokenAddress,
      transfer.transactionHash,
      transfer.logIndex ?? 0,
      blockNumber.toString(),
      blockTimestamp,
      fromAddress,
      toAddress,
      transfer.amountBaseUnits,
      transfer.source,
      JSON.stringify({
        collectorIdempotencyKey: transfer.idempotencyKey,
        queryTarget: transfer.queryTarget,
        rawPayload: transfer.rawPayload,
      }),
    ],
  );
  await executor.query(
    `
      INSERT INTO goldsky_webhook_transfers_x402_paytos (
        id,
        token_address,
        from_owner_address,
        to_owner_address,
        amount,
        block_number,
        block_timestamp,
        transaction_hash,
        gs_op,
        received_at,
        raw_payload
      ) VALUES (
        $1,
        lower($2),
        lower($3),
        lower($4),
        $5,
        $6,
        EXTRACT(EPOCH FROM $7::timestamptz)::bigint,
        lower($8),
        $9,
        now(),
        $10::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        token_address = EXCLUDED.token_address,
        from_owner_address = EXCLUDED.from_owner_address,
        to_owner_address = EXCLUDED.to_owner_address,
        amount = EXCLUDED.amount,
        block_number = EXCLUDED.block_number,
        block_timestamp = EXCLUDED.block_timestamp,
        transaction_hash = EXCLUDED.transaction_hash,
        gs_op = EXCLUDED.gs_op,
        received_at = EXCLUDED.received_at,
        raw_payload = EXCLUDED.raw_payload
    `,
    [
      transfer.idempotencyKey,
      tokenAddress,
      fromAddress,
      toAddress,
      transfer.amountBaseUnits,
      blockNumber.toString(),
      blockTimestamp,
      transfer.transactionHash,
      transfer.source,
      JSON.stringify({
        collectorIdempotencyKey: transfer.idempotencyKey,
        queryTarget: transfer.queryTarget,
        rawPayload: transfer.rawPayload,
      }),
    ],
  );
}

async function upsertSolanaTransfer(executor: PgExecutor, transfer: NormalizedCollectorTransfer) {
  await executor.query(
    `
      INSERT INTO goldsky_webhook_token_transfers_solana (
        id,
        signature,
        block_slot,
        block_timestamp,
        token_mint_address,
        from_token_account,
        to_token_account,
        amount,
        decimals,
        gs_op,
        raw_payload
      ) VALUES (
        $1,
        $2,
        $3,
        $4::timestamptz,
        $5,
        $6,
        $7,
        $8,
        6,
        $9,
        $10::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        signature = EXCLUDED.signature,
        block_slot = EXCLUDED.block_slot,
        block_timestamp = EXCLUDED.block_timestamp,
        token_mint_address = EXCLUDED.token_mint_address,
        from_token_account = EXCLUDED.from_token_account,
        to_token_account = EXCLUDED.to_token_account,
        amount = EXCLUDED.amount,
        decimals = EXCLUDED.decimals,
        gs_op = EXCLUDED.gs_op,
        raw_payload = EXCLUDED.raw_payload
    `,
    [
      transfer.idempotencyKey,
      required(transfer.signature ?? transfer.transactionHash, "signature"),
      required(transfer.slot, "slot").toString(),
      transfer.timestamp ?? null,
      required(transfer.assetAddress ?? transfer.queryTarget.assetAddress, "assetAddress"),
      transfer.fromAddress ?? null,
      required(transfer.toAddress, "toAddress"),
      transfer.amountBaseUnits,
      transfer.source,
      JSON.stringify({
        collectorIdempotencyKey: transfer.idempotencyKey,
        queryTarget: transfer.queryTarget,
        rawPayload: transfer.rawPayload,
      }),
    ],
  );
}

function required<T>(value: T | null | undefined, label: string): T {
  if (value === undefined || value === null || (typeof value === "string" && value === "")) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}
