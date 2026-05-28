import { describe, expect, test } from "bun:test";
import type { PgExecutor } from "../../src/storage/postgres.js";
import { upsertTransferObservations } from "../../src/storage/transfer-observations.js";

describe("upsertTransferObservations", () => {
  test("upserts Base transfers into token_transfers", async () => {
    const queries = captureQueries();

    const result = await upsertTransferObservations(queries.executor, [
      {
        source: "alchemy",
        chain: "base",
        queryTarget: {
          chain: "base",
          address: "0xF46394adDdA95A3d5bCC1124605E3d15D204623C",
          assetAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
          providerId: "quicknode/rpc",
        },
        idempotencyKey: "alchemy:base:1",
        transactionHash: "0xTX",
        blockNumber: 42n,
        timestamp: "2026-05-11T00:00:00Z",
        fromAddress: "0xFrom",
        toAddress: "0xF46394adDdA95A3d5bCC1124605E3d15D204623C",
        direction: "incoming",
        assetAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
        amountBaseUnits: "1000000",
        rawPayload: { ok: true },
      },
    ]);

    expect(result).toEqual({ base: 1, solana: 0, skipped: 0 });
    expect(queries.items[0]?.sql).toContain("INSERT INTO token_transfers");
    expect(queries.items[0]?.params.slice(0, 4)).toEqual([
      "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
      "0xTX",
      0,
      "42",
    ]);
  });

  test("upserts incoming Solana transfers into the live read source table", async () => {
    const queries = captureQueries();

    const result = await upsertTransferObservations(queries.executor, [
      {
        source: "alchemy",
        chain: "solana",
        queryTarget: {
          chain: "solana",
          address: "6bMZDGaWLoJEVCwS6RCNaqfS3UipqG2d6mUNEqp6KQZ5",
          assetAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          providerId: "quicknode/rpc",
        },
        idempotencyKey: "alchemy:solana:sig-1:2:mint",
        transactionHash: "sig-1",
        signature: "sig-1",
        slot: 123n,
        timestamp: "2026-05-11T00:00:00Z",
        toAddress: "6bMZDGaWLoJEVCwS6RCNaqfS3UipqG2d6mUNEqp6KQZ5",
        direction: "incoming",
        assetAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amountBaseUnits: "2500000",
        rawPayload: { ok: true },
      },
    ]);

    expect(result).toEqual({ base: 0, solana: 1, skipped: 0 });
    expect(queries.items[0]?.sql).toContain("INSERT INTO goldsky_webhook_token_transfers_solana");
    expect(queries.items[0]?.params.slice(0, 5)).toEqual([
      "alchemy:solana:sig-1:2:mint",
      "sig-1",
      "123",
      "2026-05-11T00:00:00Z",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    ]);
  });

  test("skips outgoing Solana balance deltas", async () => {
    const queries = captureQueries();

    const result = await upsertTransferObservations(queries.executor, [
      {
        source: "alchemy",
        chain: "solana",
        queryTarget: { chain: "solana", address: "token", assetAddress: "mint" },
        idempotencyKey: "alchemy:solana:sig-1:3:mint",
        transactionHash: "sig-1",
        slot: 123n,
        fromAddress: "token",
        direction: "outgoing",
        assetAddress: "mint",
        amountBaseUnits: "1",
        rawPayload: {},
      },
    ]);

    expect(result).toEqual({ base: 0, solana: 0, skipped: 1 });
    expect(queries.items).toHaveLength(0);
  });
});

function captureQueries() {
  const items: { sql: string; params: readonly unknown[] }[] = [];
  const executor: PgExecutor = {
    async query(sql, params) {
      items.push({ sql, params });
      return { rows: [], rowCount: 0 };
    },
  };
  return { executor, items };
}
