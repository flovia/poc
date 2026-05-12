#!/usr/bin/env bun
import {
  removeFrontierSolanaCustomerDemoSeed,
  seedFrontierSolanaCustomers,
} from "../seeds/frontier-solana-customers.js";
import { closeBunPostgres, createBunPostgresExecutor } from "../storage/bun-postgres.js";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }
  const executor = createBunPostgresExecutor();
  const remove = process.argv.includes("--remove");
  const result = remove
    ? await removeFrontierSolanaCustomerDemoSeed(executor)
    : await seedFrontierSolanaCustomers(executor);
  await closeBunPostgres();
  console.log(
    JSON.stringify(
      { seed: "frontier-solana-customers", mode: remove ? "remove-demo" : "upsert-demo", result },
      null,
      2,
    ),
  );
}

if (import.meta.main) {
  main().catch(async (error) => {
    await closeBunPostgres();
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
