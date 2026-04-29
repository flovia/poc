import crypto from "node:crypto";
import fs from "node:fs";
import { describe, expect, test } from "bun:test";
import {
  validateEndpointManifest,
  validatePaidProbeResults,
  type DryRunProbeResults,
  type EndpointManifest,
  type LastDryRun,
  type PaidProbeResults,
} from "../lib/endpoint-manifest";
import {
  analyzeX402ProbeArtifacts,
  buildRetryChainReport,
} from "../scripts/acquisition/analyze-x402-probe-artifacts";
import {
  paidProbeStatusFromPayment,
  resolveOutputPath,
  retryCaseIds,
  requestBody,
  targetUrl,
  txHashFromSettlement,
  x402Command,
} from "../scripts/acquisition/run-x402-paid-probes";
import {
  buildKnownFingerprintSeedFromPaidProbeObservations,
  buildPaidProbeFingerprintArtifact,
  buildSettlementFingerprintPacksFromPaidProbeObservations,
  matchingChallengeObservations,
  paidProbeFingerprintCandidates,
} from "../scripts/acquisition/run-x402-paid-probe-fingerprints";
import { buildProviderEndpointClaimsFromPaidProbeFingerprints } from "../scripts/acquisition/generate-provider-endpoint-claims-from-paid-probe-fingerprints";
import type { PaymentObservationInput, RawReceipt, RawTransaction } from "../lib/schema";

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

describe("endpoint manifest acquisition validation", () => {
  const baseEndpointCase = () => ({
    caseId: "test-endpoint",
    entityId: "entity-a",
    providerName: "Provider A",
    serviceName: "Search",
    endpointUrl: "https://example.com/search",
    resourceUrl: "https://example.com/search?q=x402",
    requestHost: "example.com",
    method: "POST",
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
    requestBodyTemplate: { query: "x402" },
  });

  test("rejects inconsistent lastDryRun payment metadata", () => {
    expect(() =>
      validateEndpointManifest({
        schemaVersion: "1",
        cases: [
          {
            ...baseEndpointCase(),
            lastDryRun: {
              status: "challenge",
              attemptedAt: "2026-04-28T00:00:00.000Z",
              url: "https://example.com/search?q=x402",
              httpStatus: 200,
            },
          },
        ],
      }),
    ).toThrow("Challenge dry-runs must record httpStatus=402");

    expect(() =>
      validateEndpointManifest({
        schemaVersion: "1",
        cases: [
          {
            ...baseEndpointCase(),
            lastDryRun: {
              status: "no_challenge",
              attemptedAt: "2026-04-28T00:00:00.000Z",
              url: "https://example.com/search?q=x402",
              httpStatus: 200,
              paymentOptions: [
                {
                  amount: "10000",
                  network: "base",
                  asset: "USDC",
                  payTo: "0x0000000000000000000000000000000000000000",
                },
              ],
            },
          },
        ],
      }),
    ).toThrow("No-challenge dry-runs must include noChallengeReason");
  });

  test("rejects requestBodyTemplateHash mismatches", () => {
    expect(() =>
      validateEndpointManifest({
        schemaVersion: "1",
        cases: [
          {
            ...baseEndpointCase(),
            requestBodyTemplateHash: "not-the-template-hash",
          },
        ],
      }),
    ).toThrow("requestBodyTemplateHash must match requestBodyTemplate JSON sha256");

    const body = { query: "x402" };
    const parsed = validateEndpointManifest({
      schemaVersion: "1",
      cases: [
        {
          ...baseEndpointCase(),
          requestBodyTemplate: body,
          requestBodyTemplateHash: crypto
            .createHash("sha256")
            .update(JSON.stringify(body))
            .digest("hex"),
        },
      ],
    });
    expect(parsed.cases[0]?.requestBodyTemplate).toEqual(body);
  });
});

describe("paid probe runner helpers", () => {
  test("normalizes tx hash from settlement.transaction and settlement.txHash", () => {
    expect(txHashFromSettlement({ transaction: "0xtransaction" })).toBe("0xtransaction");
    expect(txHashFromSettlement({ txHash: "0xtxhash" })).toBe("0xtxhash");
    expect(txHashFromSettlement({})).toBeNull();
  });

  test("separates default plan and execute output paths", () => {
    expect(resolveOutputPath({ execute: false, outputPath: null })).toEndWith(
      "paid_probe_plan_results.json",
    );
    expect(resolveOutputPath({ execute: true, outputPath: null })).toEndWith(
      "paid_probe_results.json",
    );
    expect(resolveOutputPath({ execute: false, outputPath: "custom.json" })).toBe("custom.json");
  });

  test("extracts unique retry targets from validated error artifacts", () => {
    const artifact = baseArtifact({
      results: [
        {
          ...baseArtifact().results[0]!,
          caseId: "case-error",
          status: "error",
          txHash: null,
          response: { bodySha256: null, contentType: null },
          exitCode: 2,
          error: "HTTP 500",
        },
        {
          ...baseArtifact().results[0]!,
          caseId: "case-paid",
          status: "paid",
          txHash: null,
        },
      ],
    });
    const filePath = `/tmp/flovia-paid-retry-${crypto.randomUUID()}.json`;
    Bun.write(filePath, JSON.stringify(artifact));

    try {
      expect([...(retryCaseIds(filePath) ?? [])]).toEqual(["case-error"]);
    } finally {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Best-effort cleanup for temp artifact.
      }
    }
  });

  test("prefers GET resourceUrl over dry-run URL and serializes POST body templates", () => {
    const endpointCase = validateEndpointManifest({
      schemaVersion: "1",
      cases: [
        {
          caseId: "case-post",
          entityId: "entity-a",
          providerName: "Provider A",
          serviceName: "Search",
          endpointUrl: "https://example.com/search",
          resourceUrl: "https://example.com/search?q=resource",
          requestHost: "example.com",
          method: "POST",
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
          requestBodyTemplate: { query: "x402" },
        },
      ],
    }).cases[0]!;
    const dryRun = {
      status: "challenge",
      attemptedAt: "2026-04-28T00:00:00.000Z",
      url: "https://example.com/search?q=dry-run",
      httpStatus: 402,
      paymentOptions: [
        {
          amount: "10000",
          network: "base",
          asset: "USDC",
          payTo: "0x0000000000000000000000000000000000000000",
        },
      ],
    } satisfies LastDryRun;
    const option = { ...dryRun.paymentOptions[0], index: 0 };

    expect(targetUrl(endpointCase, dryRun)).toBe("https://example.com/search?q=resource");
    expect(requestBody(endpointCase)).toBe('{"query":"x402"}');
    expect(
      x402Command(endpointCase, dryRun, option, {
        execute: false,
        outputPath: null,
        caseIds: null,
        retryErrorsFrom: null,
        limit: null,
        minSpendAtomic: 0n,
        maxSpendAtomic: 100000n,
        totalSpendCapAtomic: 1000000n,
        network: "base",
        mode: "mainnet",
        includePost: true,
        includeNotReady: true,
      }).slice(-2),
    ).toEqual(["https://example.com/search?q=resource", '{"query":"x402"}']);
  });

  test("rejects executable POST bodies that only have a template hash", () => {
    const endpointCase = validateEndpointManifest({
      schemaVersion: "1",
      cases: [
        {
          caseId: "case-post-hash-only",
          entityId: "entity-a",
          providerName: "Provider A",
          serviceName: "Search",
          endpointUrl: "https://example.com/search",
          resourceUrl: "https://example.com/search?q=resource",
          requestHost: "example.com",
          method: "POST",
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
          requestBodyTemplateHash: crypto
            .createHash("sha256")
            .update('{"query":"x402"}')
            .digest("hex"),
        },
      ],
    }).cases[0]!;

    expect(() => requestBody(endpointCase)).toThrow(
      "requires requestBodyTemplate; requestBodyTemplateHash is not executable",
    );
  });

  test("classifies paid evidence independently from process exit code", () => {
    expect(
      paidProbeStatusFromPayment(
        2,
        { settlement: { transaction: "0xtx" } },
        { transaction: "0xtx" },
      ),
    ).toBe("paid_with_tx");
    expect(paidProbeStatusFromPayment(2, { status: "settled" }, null)).toBe("paid");
    expect(paidProbeStatusFromPayment(2, { status: "failed" }, null)).toBe("error");
  });
});

describe("x402 artifact analyzer", () => {
  test("checks retry chain consistency against previous error cases", () => {
    const first = baseArtifact({
      results: [
        { ...baseArtifact().results[0]!, caseId: "case-error", status: "error", txHash: null },
        { ...baseArtifact().results[0]!, caseId: "case-paid", status: "paid", txHash: null },
      ],
    });
    const retry = baseArtifact({
      collectedAt: "2026-04-28T01:00:00.000Z",
      selection: { ...first.selection, retryErrorsFrom: "paid_probe_results.json" },
      results: [{ ...first.results[0]!, caseId: "case-error" }],
    });

    expect(buildRetryChainReport([first, retry]).issueCount).toBe(0);

    const badRetry = baseArtifact({
      collectedAt: "2026-04-28T01:00:00.000Z",
      selection: { ...first.selection, retryErrorsFrom: "paid_probe_results.json" },
      results: [{ ...first.results[1]!, caseId: "case-paid" }],
    });

    expect(buildRetryChainReport([first, badRetry]).issues.map((issue) => issue.kind)).toEqual([
      "retry_included_non_error",
      "retry_omitted_previous_error",
    ]);
  });

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

describe("paid probe fingerprint enrichment", () => {
  const paidInput = (artifact = baseArtifact()) => [{ path: "paid_probe_results.json", artifact }];

  const observation = (
    overrides: Partial<PaymentObservationInput> = {},
  ): PaymentObservationInput => ({
    chainId: 8453,
    txHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    blockNumber: 100,
    blockTimestamp: 1_776_000_000,
    relayer: "0x2222222222222222222222222222222222222222",
    payer: "0x3333333333333333333333333333333333333333",
    recipient: "0x4444444444444444444444444444444444444444",
    amountAtomic: "10000",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    method: "direct_transferWithAuthorization",
    topLevelSelector: "0xe3ee160e",
    caseId: "case-a",
    stableHash: "stable-a",
    evidence: [],
    ...overrides,
  });

  test("selects the latest paid_with_tx result per case", () => {
    const first = baseArtifact({
      collectedAt: "2026-04-28T00:00:00.000Z",
      results: [{ ...baseArtifact().results[0]!, txHash: "0xfirst" }],
    });
    const retry = baseArtifact({
      collectedAt: "2026-04-28T01:00:00.000Z",
      results: [{ ...baseArtifact().results[0]!, txHash: "0xretry" }],
    });

    expect(paidProbeFingerprintCandidates(paidInput(first).concat(paidInput(retry)))).toMatchObject(
      [{ result: { caseId: "case-a", txHash: "0xretry" } }],
    );
    expect(paidProbeFingerprintCandidates(paidInput(retry).concat(paidInput(first)))).toMatchObject(
      [{ result: { caseId: "case-a", txHash: "0xretry" } }],
    );
  });

  test("builds known and settlement fingerprint seeds from enriched observations", () => {
    const result = {
      caseId: "case-a",
      providerName: "Provider A",
      serviceName: "Search",
      routeKind: "provider_direct_x402" as const,
      sourcePath: "paid_probe_results.json",
      txHash: observation().txHash,
      status: "fingerprinted" as const,
      observationCount: 1,
      insertedObservations: 0,
      evidenceRowsUpdated: 0,
      observations: [
        {
          ...observation(),
          topLevelTo: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
          innerSelector: null,
        },
      ],
    };

    const known = buildKnownFingerprintSeedFromPaidProbeObservations(
      [result],
      "2026-04-29T00:00:00.000Z",
    );
    const settlement = buildSettlementFingerprintPacksFromPaidProbeObservations(
      [result],
      "2026-04-29T00:00:00.000Z",
    );

    expect(known.fingerprints.map((entry) => entry.type)).toEqual(["recipient"]);
    expect(known.fingerprints.find((entry) => entry.type === "recipient")?.providerLabel).toBe(
      "Provider A recipient",
    );
    expect(settlement.fingerprints).toHaveLength(1);
    expect(settlement.fingerprints[0]).toMatchObject({
      method: "direct_transferWithAuthorization",
      topLevelSelector: "0xe3ee160e",
      topLevelTo: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      evidenceClass: "host_joined",
    });
  });

  test("filters decoded observations to the paid challenge recipient asset and amount", () => {
    const paid = baseArtifact().results[0]!;
    const matching = observation({
      recipient: paid.challenge!.payTo as `0x${string}`,
      tokenAddress: paid.challenge!.asset as `0x${string}`,
      amountAtomic: paid.challenge!.amountAtomic,
    });
    const wrongRecipient = observation({
      recipient: "0x9999999999999999999999999999999999999999",
      tokenAddress: paid.challenge!.asset as `0x${string}`,
      amountAtomic: paid.challenge!.amountAtomic,
    });

    expect(matchingChallengeObservations(paid, [wrongRecipient, matching])).toEqual([matching]);
  });

  test("builds provider endpoint claims from paid probe fingerprints and endpoint manifest", () => {
    const directory = `/tmp/flovia-paid-claims-${crypto.randomUUID()}`;
    fs.mkdirSync(directory, { recursive: true });
    const manifestPath = `${directory}/endpoint_manifest.json`;
    const fingerprintPath = `${directory}/paid_probe_fingerprints.json`;
    const txHash = "0x1111111111111111111111111111111111111111111111111111111111111111";

    try {
      fs.writeFileSync(
        manifestPath,
        JSON.stringify(
          validateEndpointManifest({
            schemaVersion: "1",
            cases: [
              {
                caseId: "case-a",
                entityId: "provider-a",
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
          }),
        ),
      );
      fs.writeFileSync(
        fingerprintPath,
        JSON.stringify({
          schemaVersion: "1",
          generatedAt: "2026-04-29T00:00:00.000Z",
          results: [
            {
              caseId: "case-a",
              providerName: "Provider A",
              serviceName: "Search",
              routeKind: "provider_direct_x402",
              sourcePath: "fixtures/acquisition/paid_probe_results.json",
              txHash,
              status: "fingerprinted",
              observations: [
                {
                  txHash,
                  recipient: "0x4444444444444444444444444444444444444444",
                  amountAtomic: "10000",
                  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                  method: "direct_transferWithAuthorization",
                  topLevelSelector: "0xe3ee160e",
                },
              ],
            },
          ],
        }),
      );

      const seed = buildProviderEndpointClaimsFromPaidProbeFingerprints({
        fingerprintPath,
        manifestPath,
      });

      expect(seed.claims).toHaveLength(1);
      expect(seed.claims[0]).toMatchObject({
        entityId: "provider-a",
        providerName: "Provider A",
        serviceName: "Search",
        endpointUrl: "https://example.com/search",
        resourceUrl: "https://example.com/search?q=x402",
        payTo: "0x4444444444444444444444444444444444444444",
        amountAtomic: "10000",
        txHash,
        evidenceClass: "paid_probe",
        confidence: 85,
        roles: ["provider", "service", "endpoint"],
      });
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test("skips paid tx hashes that fetch but do not decode into observations", async () => {
    const tx: RawTransaction = {
      hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      chainId: 8453,
      from: "0x2222222222222222222222222222222222222222",
      to: "0x5555555555555555555555555555555555555555",
      input: "0x12345678",
      blockNumber: "100",
      blockTimestamp: 1_776_000_000,
    };
    const receipt: RawReceipt = {
      transactionHash: tx.hash,
      blockHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      blockNumber: "100",
      logs: [],
      status: "0x1",
    };

    const artifact = await buildPaidProbeFingerprintArtifact({
      inputs: paidInput(
        baseArtifact({ results: [{ ...baseArtifact().results[0]!, txHash: tx.hash }] }),
      ),
      rpcUrl: "https://rpc.example",
      fetchFixtureFn: async () => ({ tx, receipt }),
    });

    expect(artifact.totals).toMatchObject({ candidates: 1, fingerprinted: 0, skipped: 1 });
    expect(artifact.results[0]).toMatchObject({
      caseId: "case-a",
      status: "skipped",
      skippedReason: "no_observations",
    });
  });
});
