import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { parseFullCaptureArgs, runFullCapture } from "../scripts/analytics/capture-full";

const defaultPayTo = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";
const wallet = "0xac5a07c44a4f971667b3df4b6551fb6991b2142d";

const withTempDir = async (label: string, fn: (dir: string) => Promise<void> | void) => {
  const directory = path.join(process.cwd(), "tmp", `capture-full-${label}-${randomUUID()}`);
  fs.mkdirSync(directory, { recursive: true });
  try {
    await Promise.resolve(fn(directory));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

const cdpResponse = {
  data: {
    items: [
      {
        resourceId: "coingecko-x402",
        resource: "https://api.coingecko.com/api/v3/x402/simple/price",
        provider: "CoinGecko",
        service: "CoinGecko x402",
        paymentOptions: [{ network: "base", asset: "USDC", amount: "10000", payTo: defaultPayTo }],
      },
    ],
    pageInfo: { hasNextPage: false, endCursor: null },
  },
};

const aggregateResponse = {
  data: {
    EVM: {
      byRecipient: [
        {
          Transfer: { Receiver: defaultPayTo },
          txCount: "3",
          uniqueSenders: "1",
          volumeUSDC: "0.03",
        },
      ],
      latestByRecipient: [
        {
          Transfer: { Receiver: defaultPayTo, Sender: wallet, Amount: "0.01" },
          Block: { Time: "2026-04-29T04:11:53Z", Number: "299" },
          Transaction: {
            Hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          },
        },
      ],
    },
  },
};

const transferResponse = (receiver = defaultPayTo) => ({
  data: {
    EVM: {
      transfers: [
        {
          Transfer: { Sender: wallet, Receiver: receiver, Amount: "0.01" },
          Block: { Time: "2026-04-29T04:11:53Z", Number: "299" },
          Transaction: {
            Hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            From: wallet,
          },
        },
      ],
    },
  },
});

describe("full capture orchestration", () => {
  test("parses defaults, required fields, invalid values, and output paths", () =>
    withTempDir("parse", (directory) => {
      const parsed = parseFullCaptureArgs([
        "--analytics-db",
        path.join(directory, "analytics.sqlite"),
        "--from",
        "2026-01-01T00:00:00Z",
        "--to",
        "2026-04-29T23:59:59Z",
        "--payto-budget",
        "2",
        "--wallet-budget",
        "3",
        "--per-payto-limit",
        "4",
        "--slice-days",
        "7",
        "--portfolio-source",
        "zerion",
        "--portfolio-limit",
        "1",
        "--out-dir",
        directory,
        "--read-model-output",
        path.join(directory, "read-models.json"),
        "--seed",
        "unit-test",
        "--dry-run",
      ]);

      expect(parsed).toMatchObject({
        network: "base",
        asset: "USDC",
        payToBudget: 2,
        walletBudget: 3,
        perPayToLimit: 4,
        sliceDays: 7,
        portfolioSource: "zerion",
        portfolioLimit: 1,
        outDir: directory,
        seed: "unit-test",
        dryRun: true,
      });
      expect(parsed.readModelOutputPath).toBe(path.join(directory, "read-models.json"));
      expect(() => parseFullCaptureArgs(["--payto-budget", "0"])).toThrow("--payto-budget");
      expect(() => parseFullCaptureArgs(["--portfolio-source", "bad"])).toThrow(
        "--portfolio-source",
      );
    }));

  test("dry-run prints a plan without calling sources or writing raw outputs", async () =>
    withTempDir("dry-run", async (directory) => {
      let calls = 0;
      const result = await runFullCapture({
        analyticsDbPath: path.join(directory, "analytics.sqlite"),
        outDir: directory,
        readModelOutputPath: path.join(directory, "read-models.json"),
        dryRun: true,
        cdpFetch: async () => {
          calls += 1;
          return new Response(JSON.stringify(cdpResponse));
        },
        bitqueryFetch: async () => {
          calls += 1;
          return new Response(JSON.stringify(aggregateResponse));
        },
        zerionFetch: async () => {
          calls += 1;
          return new Response(JSON.stringify({ data: [] }));
        },
      });

      expect(result.dryRun).toBe(true);
      expect(result.plan.stages).toContain("market-census");
      expect(result.plan.requiredCredentials).toEqual(["BITQUERY_TOKEN"]);
      expect(result.plan.outputPaths.analyticsDb).toBe(path.join(directory, "analytics.sqlite"));
      expect(calls).toBe(0);
      expect(fs.existsSync(path.join(directory, "payto-sampling-plan.json"))).toBe(false);
    }));

  test("recomputes default read model path when called with a custom outDir", async () =>
    withTempDir("programmatic-out-dir", async (directory) => {
      const result = await runFullCapture({
        analyticsDbPath: path.join(directory, "analytics.sqlite"),
        outDir: directory,
        dryRun: true,
      });

      expect(result.plan.outputPaths.readModels).toBe(
        path.join(directory, "service-read-models.json"),
      );
    }));

  test("runs full capture, persists plans, applies portfolio caps, and generates read models", async () =>
    withTempDir("success", async (directory) => {
      const logs: string[] = [];
      const result = await runFullCapture({
        analyticsDbPath: path.join(directory, "analytics.sqlite"),
        outDir: directory,
        readModelOutputPath: path.join(directory, "read-models.json"),
        payToBudget: 1,
        walletBudget: 1,
        perPayToLimit: 1,
        portfolioSource: "zerion",
        portfolioLimit: 0,
        bitqueryToken: "test-token",
        zerionApiKey: "test-zerion-key",
        logger: (message) => logs.push(message),
        cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
        bitqueryFetch: async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as { variables: Record<string, unknown> };
          if (Array.isArray(body.variables.payTos))
            return new Response(JSON.stringify(aggregateResponse));
          if (body.variables.payTo) return new Response(JSON.stringify(transferResponse()));
          if (body.variables.customerAddress)
            return new Response(JSON.stringify(transferResponse(defaultPayTo)));
          throw new Error("unexpected Bitquery request");
        },
        zerionFetch: async () => new Response(JSON.stringify({ data: [] })),
      });

      expect(result.stageProgress).toMatchObject({
        "market-census": "success",
        "payto-sampling": "success",
        "payto-transfer-capture": "success",
        "wallet-sampling": "success",
        "customer-intelligence": "success",
        "read-model-generation": "success",
      });
      expect(fs.existsSync(path.join(directory, "payto-sampling-plan.json"))).toBe(true);
      expect(fs.existsSync(path.join(directory, "wallet-sampling-plan.json"))).toBe(true);
      expect(fs.existsSync(path.join(directory, "read-models.json"))).toBe(true);
      const payToPlan = JSON.parse(
        fs.readFileSync(path.join(directory, "payto-sampling-plan.json"), "utf8"),
      ) as { generatedAt: string };
      const walletPlan = JSON.parse(
        fs.readFileSync(path.join(directory, "wallet-sampling-plan.json"), "utf8"),
      ) as { generatedAt: string };
      const readModels = JSON.parse(
        fs.readFileSync(path.join(directory, "read-models.json"), "utf8"),
      ) as {
        serviceSummary: { generatedAt: string };
      };
      expect(payToPlan.generatedAt).not.toBe("1970-01-01T00:00:00.000Z");
      expect(walletPlan.generatedAt).toBe(payToPlan.generatedAt);
      expect(readModels.serviceSummary.generatedAt).toBe(payToPlan.generatedAt);
      expect(logs).toContain(
        "[capture-full] started base USDC 2026-01-01T00:00:00.000Z..2026-04-29T23:59:59.000Z",
      );
      expect(logs).toContain("[capture-full] market-census: fetched 1 resources, 1 payTo rows");
      expect(logs).toContain(
        "[capture-full] payto-transfer-capture: 1/1 0x110cdbba7fe6434ec4ce3464cc523942ad6fb784 transfers=1",
      );
      expect(logs).toContain("[capture-full] completed run");

      const db = await import("bun:sqlite");
      const database = new db.Database(path.join(directory, "analytics.sqlite"));
      try {
        const fullRun = database
          .prepare(
            "SELECT status, source_coverage_json FROM capture_runs WHERE kind = 'full_capture'",
          )
          .get() as { status: string; source_coverage_json: string };
        const planCount = database
          .prepare(
            "SELECT COUNT(*) AS count FROM generated_read_models WHERE model_kind LIKE 'sampling_plan_%'",
          )
          .get() as { count: number };
        const skippedPortfolio = database
          .prepare(
            "SELECT COUNT(*) AS count FROM customer_intelligence_snapshots WHERE source_coverage_json LIKE '%unavailable%'",
          )
          .get() as { count: number };
        expect(fullRun.status).toBe("success");
        expect(JSON.parse(fullRun.source_coverage_json).stages["read-model-generation"]).toBe(
          "success",
        );
        expect(planCount.count).toBe(2);
        expect(skippedPortfolio.count).toBe(1);
      } finally {
        database.close();
      }
    }));

  test("reuses successful payTo transfer runs on rerun", async () =>
    withTempDir("reuse-transfers", async (directory) => {
      const dbPath = path.join(directory, "analytics.sqlite");
      await runFullCapture({
        analyticsDbPath: dbPath,
        outDir: path.join(directory, "first"),
        readModelOutputPath: path.join(directory, "first-read-models.json"),
        payToBudget: 1,
        walletBudget: 1,
        perPayToLimit: 1,
        bitqueryToken: "test-token",
        cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
        bitqueryFetch: async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as { variables: Record<string, unknown> };
          if (Array.isArray(body.variables.payTos))
            return new Response(JSON.stringify(aggregateResponse));
          if (body.variables.payTo) return new Response(JSON.stringify(transferResponse()));
          throw new Error("unexpected Bitquery request");
        },
      });

      const logs: string[] = [];
      await runFullCapture({
        analyticsDbPath: dbPath,
        outDir: path.join(directory, "second"),
        readModelOutputPath: path.join(directory, "second-read-models.json"),
        payToBudget: 1,
        walletBudget: 1,
        perPayToLimit: 1,
        bitqueryToken: "test-token",
        logger: (message) => logs.push(message),
        cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
        bitqueryFetch: async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as { variables: Record<string, unknown> };
          if (Array.isArray(body.variables.payTos))
            return new Response(JSON.stringify(aggregateResponse));
          if (body.variables.payTo) throw new Error("should not refetch payTo transfers");
          throw new Error("unexpected Bitquery request");
        },
      });

      expect(
        logs.some((message) => message.includes("reused run=") && message.includes("transfers=1")),
      ).toBe(true);
    }));

  test("does not reuse transfer runs that do not satisfy requested coverage", async () =>
    withTempDir("reuse-coverage", async (directory) => {
      const dbPath = path.join(directory, "analytics.sqlite");
      await runFullCapture({
        analyticsDbPath: dbPath,
        outDir: path.join(directory, "first"),
        readModelOutputPath: path.join(directory, "first-read-models.json"),
        payToBudget: 1,
        walletBudget: 1,
        perPayToLimit: 1,
        pageSize: 1,
        bitqueryToken: "test-token",
        cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
        bitqueryFetch: async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as { variables: Record<string, unknown> };
          if (Array.isArray(body.variables.payTos))
            return new Response(JSON.stringify(aggregateResponse));
          if (body.variables.payTo) return new Response(JSON.stringify(transferResponse()));
          throw new Error("unexpected Bitquery request");
        },
      });

      let transferFetches = 0;
      const logs: string[] = [];
      await runFullCapture({
        analyticsDbPath: dbPath,
        outDir: path.join(directory, "second"),
        readModelOutputPath: path.join(directory, "second-read-models.json"),
        payToBudget: 1,
        walletBudget: 1,
        perPayToLimit: 2,
        pageSize: 1,
        sliceDays: 14,
        bitqueryToken: "test-token",
        logger: (message) => logs.push(message),
        cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
        bitqueryFetch: async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as { variables: Record<string, unknown> };
          if (Array.isArray(body.variables.payTos))
            return new Response(JSON.stringify(aggregateResponse));
          if (body.variables.payTo) {
            transferFetches += 1;
            return new Response(JSON.stringify(transferResponse()));
          }
          throw new Error("unexpected Bitquery request");
        },
      });

      expect(transferFetches).toBeGreaterThan(0);
      expect(logs.some((message) => message.includes("reused run="))).toBe(false);
    }));

  test("records census failure and does not continue downstream", async () =>
    withTempDir("census-failure", async (directory) => {
      await expect(
        runFullCapture({
          analyticsDbPath: path.join(directory, "analytics.sqlite"),
          outDir: directory,
          readModelOutputPath: path.join(directory, "read-models.json"),
          bitqueryToken: "test-token",
          cdpFetch: async () => new Response(JSON.stringify({ errors: [] }), { status: 500 }),
          bitqueryFetch: async () => new Response(JSON.stringify(aggregateResponse)),
        }),
      ).rejects.toThrow("CDP discovery request failed");

      const db = await import("bun:sqlite");
      const database = new db.Database(path.join(directory, "analytics.sqlite"));
      try {
        const fullRun = database
          .prepare(
            "SELECT status, source_coverage_json FROM capture_runs WHERE kind = 'full_capture'",
          )
          .get() as { status: string; source_coverage_json: string };
        expect(fullRun.status).toBe("failed");
        expect(JSON.parse(fullRun.source_coverage_json).stages["market-census"]).toBe("failed");
        expect(fs.existsSync(path.join(directory, "payto-sampling-plan.json"))).toBe(false);
      } finally {
        database.close();
      }
    }));

  test("records payTo transfer failure without marking full capture successful", async () =>
    withTempDir("transfer-failure", async (directory) => {
      await expect(
        runFullCapture({
          analyticsDbPath: path.join(directory, "analytics.sqlite"),
          outDir: directory,
          readModelOutputPath: path.join(directory, "read-models.json"),
          payToBudget: 1,
          walletBudget: 1,
          bitqueryToken: "test-token",
          cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
          bitqueryFetch: async (_url, init) => {
            const body = JSON.parse(String(init?.body)) as { variables: Record<string, unknown> };
            if (Array.isArray(body.variables.payTos))
              return new Response(JSON.stringify(aggregateResponse));
            return new Response(JSON.stringify({ errors: [{ message: "transfer boom" }] }));
          },
        }),
      ).rejects.toThrow("transfer boom");

      const db = await import("bun:sqlite");
      const database = new db.Database(path.join(directory, "analytics.sqlite"));
      try {
        const fullRun = database
          .prepare(
            "SELECT status, source_coverage_json FROM capture_runs WHERE kind = 'full_capture'",
          )
          .get() as { status: string; source_coverage_json: string };
        expect(fullRun.status).toBe("failed");
        expect(JSON.parse(fullRun.source_coverage_json).stages["payto-transfer-capture"]).toBe(
          "failed",
        );
      } finally {
        database.close();
      }
    }));
});
