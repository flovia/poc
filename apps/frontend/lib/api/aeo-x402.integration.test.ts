// BFF <-> FE integration test for the AEO x402 discovery flow.
//
// Launches the real BFF (apps/bff/src/server.ts) as a subprocess — seeded from
// the committed slim snapshots — and drives it through the real frontend data
// path: `aeoServiceHostCandidates(spec)` (host derivation) -> `getAeoX402Discovery`
// (HTTP fetch + `validateAeoDiscoveryResponse`). No cross-workspace import, so the
// frontend -> contracts-only boundary is respected.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";
import { getAeoX402Discovery } from "./client";
import { aeoServiceHostCandidates } from "../geo-spec/discovery";
import type { GeoEndpoint, GeoSpec, MppRegistryEndpoint } from "../geo-spec/source";

const obs = (resource: string): GeoEndpoint => ({
  resource,
  networks: [],
  assets: [],
  transactionCount: 0,
  totalAmountAtomic: "0",
});

const mpp = (resource: string): MppRegistryEndpoint => ({ resource });

const spec = (over: Partial<GeoSpec> = {}): GeoSpec => ({
  serviceId: "x",
  serviceUrl: null,
  title: null,
  category: null,
  description: null,
  mppDescription: null,
  useCase: null,
  endpointCount: null,
  hasMetering: null,
  hasFreeTier: null,
  providerSha: null,
  registryVersion: null,
  registryGeneratedAt: null,
  registrySourceUrl: null,
  priceRangeUsd: null,
  offers: [],
  observedEndpoints: [],
  mppEndpoints: [],
  atlasMissing: false,
  ...over,
});

const serverPath = path.resolve(import.meta.dir, "../../../bff/src/server.ts");
let proc: ReturnType<typeof Bun.spawn> | undefined;
const bffUrlBackup = process.env.BFF_URL;
const dataSourceBackup = process.env.NEXT_PUBLIC_FLOVIA_DATA_SOURCE;
const serverDataSourceBackup = process.env.FLOVIA_FRONTEND_DATA_SOURCE;

const waitForReady = async (baseUrl: string, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`BFF did not become ready at ${baseUrl} within ${timeoutMs}ms`);
};

beforeAll(async () => {
  const port = 33000 + Math.floor(Math.random() * 5000);
  const baseUrl = `http://localhost:${port}`;
  proc = Bun.spawn(["bun", serverPath], {
    env: { ...process.env, PORT: String(port), BFF_ANALYTICS_SOURCE: "fixture" },
    stdout: "ignore",
    stderr: "ignore",
  });
  process.env.BFF_URL = baseUrl;
  process.env.NEXT_PUBLIC_FLOVIA_DATA_SOURCE = "bff";
  process.env.FLOVIA_FRONTEND_DATA_SOURCE = "bff";
  await waitForReady(baseUrl, 30000);
}, 35000);

afterAll(async () => {
  proc?.kill();
  await proc?.exited;
  if (bffUrlBackup === undefined) delete process.env.BFF_URL;
  else process.env.BFF_URL = bffUrlBackup;
  if (dataSourceBackup === undefined) delete process.env.NEXT_PUBLIC_FLOVIA_DATA_SOURCE;
  else process.env.NEXT_PUBLIC_FLOVIA_DATA_SOURCE = dataSourceBackup;
  if (serverDataSourceBackup === undefined) delete process.env.FLOVIA_FRONTEND_DATA_SOURCE;
  else process.env.FLOVIA_FRONTEND_DATA_SOURCE = serverDataSourceBackup;
});

describe("AEO x402 BFF<->FE integration", () => {
  test("StableEnrich resolves via serviceUrl host (CDP + Dexter, no PayAI)", async () => {
    const candidates = aeoServiceHostCandidates(spec({ serviceUrl: "https://stableenrich.dev" }));
    expect(candidates).toEqual(["stableenrich.dev"]);

    const discovery = await getAeoX402Discovery(candidates);
    expect(discovery).not.toBeNull();
    expect(discovery?.coverage).toEqual({ registered: 2, total: 3 });
    expect(discovery?.facilitators.map((f) => f.facilitator)).toEqual([
      "Coinbase CDP",
      "Dexter",
      "PayAI",
    ]);
    expect(discovery?.facilitators[2]?.registered).toBe(false); // PayAI
    expect(discovery?.endpoints.length).toBe(discovery?.totalEndpoints);
  });

  test("CoinGecko resolves via observed-endpoint host (serviceUrl null)", async () => {
    const candidates = aeoServiceHostCandidates(
      spec({ observedEndpoints: [obs("https://pro-api.coingecko.com/api/v3/x402/price")] }),
    );
    expect(candidates).toEqual(["pro-api.coingecko.com"]);

    const discovery = await getAeoX402Discovery(candidates);
    expect(discovery?.coverage).toEqual({ registered: 2, total: 3 });
    const [cdp, dexter, payai] = discovery?.facilitators ?? [];
    expect(cdp?.registered).toBe(true);
    expect(cdp?.hasSchema).toBe(true); // CDP Bazaar schemas
    expect(dexter?.avgQualityScore ?? 0).toBeGreaterThan(0); // Dexter quality
    expect(payai?.registered).toBe(false);
    expect(discovery?.verificationPassRate).toBeGreaterThan(0);
    expect(discovery?.verificationPassRate).toBeLessThanOrEqual(1);
  });

  test("Nansen resolves via MPP-endpoint host and is on all three facilitators", async () => {
    const candidates = aeoServiceHostCandidates(
      spec({ mppEndpoints: [mpp("https://api.nansen.ai/x402/profiler")] }),
    );
    expect(candidates).toEqual(["api.nansen.ai"]);

    const discovery = await getAeoX402Discovery(candidates);
    expect(discovery?.coverage).toEqual({ registered: 3, total: 3 });
    expect(discovery?.facilitators[2]?.registered).toBe(true); // PayAI
  });

  test("multi-candidate list falls through the first miss to a real host", async () => {
    const discovery = await getAeoX402Discovery(["miss.example.com", "api.nansen.ai"]);
    expect(discovery?.coverage.registered).toBe(3);
  });

  test("a service absent from every registry yields null (BFF 404 -> client null)", async () => {
    const candidates = aeoServiceHostCandidates(spec({ serviceUrl: "https://nope.example.com" }));
    const discovery = await getAeoX402Discovery(candidates);
    expect(discovery).toBeNull();
  });

  test("validated response shape round-trips through validateAeoDiscoveryResponse", async () => {
    // getAeoX402Discovery validates with the contracts Zod schema; a returned
    // object proves the BFF aggregate satisfies the shared contract end-to-end.
    const discovery = await getAeoX402Discovery(["pro-api.coingecko.com"]);
    expect(discovery?.snapshotDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(discovery?.checklist)).toBe(true);
    expect(discovery?.checklist.length).toBeGreaterThan(0);
  });
});
