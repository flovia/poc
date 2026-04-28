import assert from "node:assert/strict";

import { createBffHandler } from "../src/http";
import { createSeededBffService } from "../src/testing/seed";

const run = async () => {
  const { service, close } = createSeededBffService();
  const handler = createBffHandler(service);
  const server = Bun.serve({
    port: 0,
    fetch: handler,
  });

  const base = `http://localhost:${server.port}`;

  try {
    const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
      const response = await fetch(new URL(path, base), init);
      const contentType = response.headers.get("content-type") ?? "";
      assert.ok(contentType.includes("application/json"));
      return response;
    };

    const verifyJson = async <T>(
      path: string,
      init: RequestInit = {},
    ): Promise<{ response: Response; body: T }> => {
      const response = await request(path, init);
      return { response, body: (await response.json()) as T };
    };

    const checks: Array<{
      path: string;
      validate: (body: unknown) => void;
    }> = [
      {
        path: "/health",
        validate: (body) => {
          assert.deepStrictEqual(body, { status: "ok", service: "flovia-bff" });
        },
      },
      {
        path: "/summary",
        validate: (body) => {
          const summary = body as {
            counts: { observations: number; attributionCandidates: number };
            observations: Array<{ txHash: string }>;
            attributionCandidates: Array<{ candidateType: string }>;
            scopeNote: string;
          };

          assert.equal(summary.counts.observations, 2);
          assert.equal(summary.counts.attributionCandidates, 1);
          assert.ok(summary.scopeNote.includes("payer-wallet intelligence"));
          assert.equal(summary.observations.length, 2);
          assert.equal(summary.attributionCandidates.length, 1);
          assert.equal(summary.attributionCandidates[0]?.candidateType, "provider_candidate");
        },
      },
      {
        path: "/observations",
        validate: (body) => {
          const observations = body as Array<{ txHash: string; payerWallet: string }>;
          assert.equal(observations.length, 2);
          assert.equal(observations[0]?.txHash, "0xtx1");
          assert.equal(observations[1]?.payerWallet, "0xpayer");
        },
      },
      {
        path: "/attribution-candidates",
        validate: (body) => {
          const candidates = body as Array<{ candidateType: string }>;
          assert.equal(candidates.length, 1);
          assert.equal(candidates[0]?.candidateType, "provider_candidate");
        },
      },
      {
        path: "/metrics/daily",
        validate: (body) => {
          const metrics = body as Array<{ day: string; observationCount: number }>;
          assert.equal(metrics.length, 1);
          assert.equal(metrics[0]?.day, "2026-04-28");
          assert.equal(metrics[0]?.observationCount, 2);
        },
      },
      {
        path: "/wallets/payers",
        validate: (body) => {
          const wallets = body as Array<{
            wallet: string;
            observationCount: number;
            uniqueRecipients: number;
          }>;
          assert.equal(wallets.length, 1);
          assert.equal(wallets[0]?.wallet, "0xpayer");
          assert.equal(wallets[0]?.observationCount, 2);
          assert.equal(wallets[0]?.uniqueRecipients, 2);
        },
      },
      {
        path: "/wallets/recipients",
        validate: (body) => {
          const wallets = body as Array<{ wallet: string; observationCount: number }>;
          assert.equal(wallets.length, 1);
          assert.equal(wallets[0]?.wallet, "0xrecipient");
          assert.equal(wallets[0]?.observationCount, 1);
        },
      },
      {
        path: "/wallets/relayers",
        validate: (body) => {
          const wallets = body as Array<{ wallet: string; uniqueRecipients: number }>;
          assert.equal(wallets.length, 1);
          assert.equal(wallets[0]?.wallet, "0xrelayer");
          assert.equal(wallets[0]?.uniqueRecipients, 2);
        },
      },
      {
        path: "/wallet-usage-graph",
        validate: (body) => {
          const graph = body as {
            payerWalletLanguage: boolean;
            providerWallets: Array<{ payTo: string; claimIds: string[] }>;
          };

          assert.equal(graph.payerWalletLanguage, true);
          assert.equal(graph.providerWallets.length, 1);
          assert.equal(graph.providerWallets[0]?.payTo, "0xrecipient");
        },
      },
    ];

    for (const { path, validate } of checks) {
      const { response, body } = await verifyJson<unknown>(path);
      assert.equal(response.status, 200, `Expected 200 for ${path}`);
      validate(body);
    }

    const notAllowed = await verifyJson<{ error: string; message?: string }>("/ingest/rpc-tx", {
      method: "POST",
    });
    assert.equal(notAllowed.response.status, 405);
    assert.equal(notAllowed.body.error, "method_not_allowed");

    const unknown = await verifyJson<{ error: string; message: string }>("/unknown");
    assert.equal(unknown.response.status, 404);
    assert.equal(unknown.body.error, "not_found");
    assert.ok(unknown.body.message.includes("/unknown"));

    console.log("BFF offline E2E checks passed");
  } finally {
    server.stop();
    close();
  }
};

await run();
