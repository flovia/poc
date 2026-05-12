import { describe, expect, test } from "bun:test";
import {
  FRONTIER_SOLANA_CUSTOMER_SEEDS,
  FRONTIER_DEMO_SEED_SOURCE,
  removeFrontierSolanaCustomerDemoSeed,
  seedFrontierSolanaCustomers,
} from "../../src/seeds/frontier-solana-customers.js";
import type { PgExecutor, PgQueryResult } from "../../src/storage/postgres.js";

describe("frontier Solana customer seed", () => {
  test("writes providers, offers, collection targets, and Solana transfers", async () => {
    const queries: Array<{ sql: string; params: readonly unknown[] }> = [];
    const executor: PgExecutor = {
      async query<Row>(sql: string, params: readonly unknown[]): Promise<PgQueryResult<Row>> {
        queries.push({ sql, params });
        return { rows: [] };
      },
    };

    const result = await seedFrontierSolanaCustomers(executor, [FRONTIER_SOLANA_CUSTOMER_SEEDS[0]]);

    expect(result).toEqual({ providers: 1, offers: 1, resources: 2, targets: 1, transfers: 11 });
    expect(queries).toHaveLength(16);
    expect(queries[0].sql).toContain("INSERT INTO pay_sh_providers");
    expect(queries[1].sql).toContain("INSERT INTO pay_sh_payment_offers");
    expect(queries[2].sql).toContain("INSERT INTO pay_sh_provider_resources");
    expect(queries[4].sql).toContain("INSERT INTO payment_collection_targets");
    expect(queries[5].sql).toContain("INSERT INTO goldsky_webhook_token_transfers_solana");
    expect(queries[1].params).toContain("api.nansen.ai");
    expect(queries[4].params).toContain("J7ZvJEspvwP1oRxQZ7mYmNmT22NTm3GWq3t7HEbvPZYx");
    expect(String(queries[5].params.at(-1))).toContain(FRONTIER_DEMO_SEED_SOURCE);
    expect(String(queries[5].params[0])).toStartWith("frontier-demo:");
  });

  test("removes demo rows by explicit demo markers", async () => {
    const queries: Array<{ sql: string; params: readonly unknown[] }> = [];
    const executor: PgExecutor = {
      async query<Row>(sql: string, params: readonly unknown[]): Promise<PgQueryResult<Row>> {
        queries.push({ sql, params });
        return { rows: [{ id: "removed" }] as Row[], rowCount: 1 };
      },
    };

    const result = await removeFrontierSolanaCustomerDemoSeed(executor);

    expect(result).toEqual({ transfers: 1, targets: 1, resources: 1, offers: 1, providers: 1 });
    expect(queries).toHaveLength(5);
    expect(queries[0].sql).toContain("raw_payload ->> 'demoSeedSource'");
    expect(queries[1].sql).toContain("payment_collection_targets");
    expect(queries[2].sql).toContain("pay_sh_provider_resources");
    expect(queries[3].sql).toContain("pay_sh_payment_offers");
    expect(queries[4].sql).toContain("pay_sh_providers");
  });
});
