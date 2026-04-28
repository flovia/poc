import { describe, expect, test } from "bun:test";
import {
  validateEndpointManifest,
  validatePaidProbeResults,
  type DryRunProbeResults,
  type EndpointManifest,
  type PaidProbeResults,
} from "../lib/endpoint-manifest";
import { analyzeX402ProbeArtifacts } from "../scripts/acquisition/analyze-x402-probe-artifacts";

const baseArtifact = (overrides: Partial<PaidProbeResults> = {}): PaidProbeResults =>
  validatePaidProbeResults({
    schemaVersion: "1",
    sourceManifestPath: "fixtures/acquisition/endpoint_manifest.json",
    sourceManifestSha256: "abc123",
    collectedAt: "2026-04-28T00:00:00.000Z",
    mode: "paid_probe",
    selection: {
      execute: true,
      candidateCount: 1,
      limit: null,
      minSpendAtomic: "0",
      maxSpendAtomic: "100000",
      totalSpendCapAtomic: "1000000",
      network: "base",
      includePost: true,
      includeNotReady: true,
      caseIds: null,
      retryErrorsFrom: null,
    },
    spend: { paidAtomic: "10000", currency: "USDC" },
    results: [
      {
        caseId: "case-a",
        providerName: "Provider A",
        serviceName: "Search",
        routeKind: "provider_direct_x402",
        status: "paid_with_tx",
        executedAt: "2026-04-28T00:00:01.000Z",
        txHash: "0xtx",
        network: "eip155:8453",
        payer: null,
        payTo: "0x0000000000000000000000000000000000000000",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amountAtomic: "10000",
        request: {
          method: "GET",
          url: "https://example.com/search?q=x402",
          bodySha256: null,
          bodySource: null,
        },
        challenge: {
          network: "eip155:8453",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          amountAtomic: "10000",
          payTo: "0x0000000000000000000000000000000000000000",
        },
        response: { status: 200, bodySha256: null, contentType: "application/json" },
        payment: { settlement: { transaction: "0xtx" } },
        stdoutSha256: "stdout",
        stderrSha256: null,
        exitCode: 0,
        error: null,
      },
    ],
    ...overrides,
  });

describe("paid probe artifact validation", () => {
  test("accepts valid paid artifacts and rejects malformed paid_with_tx results", () => {
    const valid = baseArtifact();
    expect(valid.results[0]?.status).toBe("paid_with_tx");

    expect(() =>
      validatePaidProbeResults({
        ...valid,
        results: [{ ...valid.results[0], txHash: null }],
      }),
    ).toThrow("paid_with_tx results must include txHash");
  });

  test("rejects duplicate paid result case IDs", () => {
    const valid = baseArtifact();
    expect(() =>
      validatePaidProbeResults({
        ...valid,
        results: [valid.results[0], valid.results[0]],
      }),
    ).toThrow("Duplicate paid probe result caseId");
  });

  test("keeps plan and execute artifacts safely separated", () => {
    const valid = baseArtifact();
    expect(() => validatePaidProbeResults({ ...valid, mode: "paid_probe_plan" })).toThrow(
      "paid_probe_plan artifacts must have selection.execute=false",
    );

    const plan = validatePaidProbeResults({
      ...valid,
      mode: "paid_probe_plan",
      selection: { ...valid.selection, execute: false },
      spend: { paidAtomic: "0", currency: "USDC" },
      results: [
        {
          caseId: "case-a",
          providerName: "Provider A",
          serviceName: "Search",
          status: "planned",
          command: ["x402", "get", "https://example.com/search"],
          amountAtomic: "10000",
          payTo: "0x0000000000000000000000000000000000000000",
        },
      ],
    });

    expect(plan.results[0]?.status).toBe("planned");
  });
});

describe("x402 artifact analyzer", () => {
  test("aggregates paid and retry artifacts by provider, endpoint, status, http status, tx hash, and body source", () => {
    const manifest = validateEndpointManifest({
      schemaVersion: "1",
      cases: [
        {
          caseId: "case-a",
          entityId: "entity-a",
          providerName: "Provider A",
          serviceName: "Search",
          endpointUrl: "https://example.com/search",
          resourceUrl: "https://example.com/search?q=x402",
          requestHost: "example.com",
          method: "GET",
          sourceName: "sponge_catalog",
          sourceUrl: "https://catalog.example.com",
          sourceObservedDate: "2026-04-28",
          sourceServiceId: "svc-a",
          sourceEndpointId: "endp-a",
          sourceEndpointUpdatedAt: "2026-04-28T00:00:00.000Z",
          sourceBaseUrl: "https://example.com",
          sourcePath: "/search",
          sourceProtocol: "x402",
          sourceNetworks: ["base"],
          routeKind: "provider_direct_x402",
          probeReadiness: "ready",
          discoveryMethod: "catalog",
          expectedNetwork: "base",
          expectedAsset: "USDC",
        },
      ],
    }) satisfies EndpointManifest;
    const dryRun = {
      schemaVersion: "1",
      sourceManifestPath: "fixtures/acquisition/endpoint_manifest.json",
      sourceManifestSha256: "dry",
      collectedAt: "2026-04-28T00:00:00.000Z",
      mode: "dry_run_no_payment",
      selection: {
        includeNonX402: false,
        limit: null,
        candidateCount: 1,
        unsupportedMethodSkipped: 0,
        timeoutMs: 1000,
        concurrency: 1,
      },
      counts: { challenge: 1 },
      results: [
        {
          caseId: "case-a",
          providerName: "Provider A",
          serviceName: "Search",
          routeKind: "provider_direct_x402",
          method: "GET",
          url: "https://example.com/search?q=x402",
          attemptedAt: "2026-04-28T00:00:00.000Z",
          status: "challenge",
          httpStatus: 402,
        },
      ],
    } satisfies DryRunProbeResults;
    const first = baseArtifact();
    const retry = baseArtifact({
      collectedAt: "2026-04-28T01:00:00.000Z",
      spend: { paidAtomic: "0", currency: "USDC" },
      results: [
        {
          ...first.results[0]!,
          status: "error",
          txHash: null,
          request: {
            method: "POST",
            url: "https://example.com/search",
            bodySha256: "body",
            bodySource: "manifest_request_body_template",
          },
          response: { bodySha256: null, contentType: null },
          stdoutPreview: '{"error":{"message":"HTTP 401","details":{"status":401}}}',
          exitCode: 2,
          error: "",
        },
      ],
    });

    const report = analyzeX402ProbeArtifacts(manifest, dryRun, [first, retry]);

    expect(report.totals.paidAttempts).toBe(2);
    expect(report.totals.uniquePaidCases).toBe(1);
    expect(report.totals.remainingFailures).toBe(1);
    expect(report.byProvider["Provider A"]?.status.error).toBe(1);
    expect(report.byEndpoint["case-a"]?.attempts).toBe(2);
    expect(report.byStatus.paid_with_tx).toBe(1);
    expect(report.byHttpStatus["401"]).toBe(1);
    expect(report.byTxHash.present).toBe(1);
    expect(report.byBodySource.manifest_request_body_template).toBe(1);
    expect(report.remainingFailures.byClassification.http_401_auth_or_business_rejected).toBe(1);
  });
});
