import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createBffDatabaseContext } from "../src/db/context";
import { createBffReadService } from "../src/services/read-service";

const temporaryPaths: string[] = [];

afterEach(() => {
  for (const filePath of temporaryPaths.splice(0)) {
    for (const suffix of ["", "-wal", "-shm"]) {
      const candidate = `${filePath}${suffix}`;
      if (fs.existsSync(candidate)) fs.rmSync(candidate);
    }
  }
});

describe("demo seed", () => {
  test("covers high, medium, and low customer upsell opportunities", () => {
    const databasePath = path.join(os.tmpdir(), `flovia-bff-demo-${crypto.randomUUID()}.db`);
    temporaryPaths.push(databasePath);

    const seed = Bun.spawnSync({
      cmd: ["bun", "./scripts/seed-demo.ts"],
      cwd: import.meta.dir.replace(/\/tests$/, ""),
      env: { ...process.env, DATABASE_URL: databasePath },
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(seed.exitCode).toBe(0);

    const context = createBffDatabaseContext({ databasePath });
    try {
      const service = createBffReadService(context.database);
      const opportunities = new Map(
        service.listCustomers().map((customer) => [customer.address, customer.upsellOpportunity]),
      );

      expect(opportunities.get("0xpayer00000000000000000000000000000000bot1")).toBe("high");
      expect(opportunities.get("0xpayer00000000000000000000000000000claude")).toBe("medium");
      expect(opportunities.get("0xpayer00000000000000000000000000000n8nflow")).toBe("medium");
      expect(opportunities.get("0xpayer00000000000000000000000000000cursor")).toBe("low");
      expect(opportunities.get("0xpayer000000000000000000000000000000curl1")).toBe("low");
    } finally {
      context.close();
    }
  });
});
