#!/usr/bin/env bun
import { getMigrationStatus, runMigrations } from "../migrations/runner.js";
import { closeBunPostgres, createBunPostgresExecutor } from "../storage/bun-postgres.js";

function jsonStringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }
  const mode = process.argv.includes("--status") ? "status" : "migrate";
  const executor = createBunPostgresExecutor();
  if (mode === "status") {
    const status = await getMigrationStatus(executor);
    await closeBunPostgres();
    console.log(jsonStringify({ migrations: status }));
    return;
  }
  const result = await runMigrations(executor);
  await closeBunPostgres();
  console.log(jsonStringify(result));
}

if (import.meta.main) {
  main().catch(async (error) => {
    await closeBunPostgres();
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
