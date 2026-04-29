import { beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { encodeFunctionData, toEventSelector, toFunctionSelector } from "viem";
import { buildDailyMetrics } from "../lib/aggregates/daily";
import {
  listAttributionCandidates,
  listDailyMetrics,
  listPayerProfiles,
  listPaymentObservations,
  listRecipientSummaries,
  listRelayerSummaries,
} from "../lib/aggregates/summaries";
import { rebuildWalletProfiles } from "../lib/aggregates/wallets";
import {
  toAttributionCandidateDto,
  toDailyMetricDto,
  toPaymentObservationDto,
  toWalletProfileDto,
} from "../lib/api/dto";
import {
  seedKnownFingerprints,
  seedKnownFingerprintsFromFile,
} from "../lib/attribution/fingerprints";
import { seedProviderEndpointClaimsFromFile } from "../lib/attribution/provider-claims";
import { buildAttributionCandidates, scoreObservationCandidates } from "../lib/attribution/score";
import { seedSettlementFingerprintPacksFromFile } from "../lib/attribution/settlement-fingerprints";
import { buildWalletUsageGraph } from "../lib/attribution/wallet-graph";
import {
  BASE_CHAIN_ID,
  BASE_USDC_ADDRESS,
  EVENT_AUTHORIZATION_USED_TOPIC,
  EVENT_TRANSFER_TOPIC,
  EXECUTE_WITH_AUTHORIZATION_SELECTOR,
  MULTICALL3_ADDRESS,
  MULTICALL3_AGGREGATE3_ABI,
  MULTICALL3_AGGREGATE3_SELECTOR,
  TRANSFER_WITH_AUTHORIZATION_SELECTOR,
  USDC_TRANSFER_WITH_AUTHORIZATION_ABI,
} from "../lib/constants";
import { createDb, db, initDb, resetDb } from "../lib/db";
import { decodeTransferWithAuthorization } from "../lib/decoder/direct-usdc";
import { decodeReceiptLogsForUsdc } from "../lib/decoder/logs";
import { decodeAggregate3, extractUsdcCallsFromMulticall } from "../lib/decoder/multicall3";
import { extractTopLevelSelector } from "../lib/decoder/selectors";
import { validateEndpointManifest } from "../lib/endpoint-manifest";
import { buildPaymentObservations } from "../lib/observations/build-observation";
import { storePaymentObservations } from "../lib/observations/store-observations";
import { resolveBaseRpcUrl, resolveRpcRequestTimeoutMs } from "../lib/rpc-config";
import {
  fetchRpcFixture,
  normalizeRpcReceipt,
  normalizeRpcTransaction,
  type RpcReceiptPayload,
  type RpcTransactionPayload,
} from "../lib/rpc-fixtures";
import {
  type FixtureManifest,
  type KnownFingerprintsSeed,
  type RawReceipt,
  type RawTransaction,
  validateFixtureManifest,
} from "../lib/schema";
import { runIngest } from "../scripts/ingest/ingest-fixtures";
import { isRpcRangeCandidate, runRpcRangeIngest } from "../scripts/ingest/ingest-rpc-range";
import { runRpcTxIngest } from "../scripts/ingest/ingest-rpc-tx";

const fixtureRoot = path.resolve(import.meta.dir, "..", "fixtures");

const readJson = <T>(relativePath: string): T =>
  JSON.parse(fs.readFileSync(path.join(fixtureRoot, relativePath), "utf8")) as T;

const listFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });

const manifest = () => readJson<FixtureManifest>("manifest.json");
const knownFingerprints = () =>
  readJson<KnownFingerprintsSeed>("knowledge/known_fingerprints.json");

const fixture = (caseId: string) => {
  const fixtureCase = manifest().cases.find((item) => item.caseId === caseId);
  if (!fixtureCase) throw new Error(`Missing fixture ${caseId}`);
  return {
    fixtureCase,
    tx: readJson<RawTransaction>(fixtureCase.txFile),
    receipt: readJson<RawReceipt>(fixtureCase.receiptFile),
  };
};

describe("constants", () => {
  test("Base, USDC, Multicall3, selectors, and event topics are pinned", () => {
    expect(BASE_CHAIN_ID).toBe(8453);
    expect(BASE_USDC_ADDRESS).toBe("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
    expect(MULTICALL3_ADDRESS).toBe("0xcA11bde05977b3631167028862bE2a173976CA11");
    expect(TRANSFER_WITH_AUTHORIZATION_SELECTOR).toBe("0xe3ee160e");
    expect(EXECUTE_WITH_AUTHORIZATION_SELECTOR).toBe("0xcf092995");
    expect(MULTICALL3_AGGREGATE3_SELECTOR).toBe("0x82ad56cb");
    expect(toFunctionSelector(USDC_TRANSFER_WITH_AUTHORIZATION_ABI[0])).toBe(
      TRANSFER_WITH_AUTHORIZATION_SELECTOR,
    );
    expect(toFunctionSelector(MULTICALL3_AGGREGATE3_ABI[0])).toBe(MULTICALL3_AGGREGATE3_SELECTOR);
    expect(toEventSelector(USDC_TRANSFER_WITH_AUTHORIZATION_ABI[2])).toBe(
      EVENT_AUTHORIZATION_USED_TOPIC,
    );
    expect(toEventSelector(USDC_TRANSFER_WITH_AUTHORIZATION_ABI[3])).toBe(EVENT_TRANSFER_TOPIC);
  });
});

describe("pure decoders", () => {
  test("extracts and decodes direct USDC transferWithAuthorization calldata", () => {
    const { tx } = fixture("orthogonal-serper");
    expect(extractTopLevelSelector(tx.input)).toBe(TRANSFER_WITH_AUTHORIZATION_SELECTOR);
    const decoded = decodeTransferWithAuthorization(tx.input);
    expect(decoded.args.from).not.toBe(tx.from);
    expect(decoded.args.to).not.toBe(tx.to);
    expect(decoded.args.value).toBeGreaterThan(0n);
  });

  test("decodes Multicall3 aggregate3 and filters non-USDC inner calls", () => {
    const { tx } = fixture("non-usdc-multicall3");
    expect(extractTopLevelSelector(tx.input)).toBe(MULTICALL3_AGGREGATE3_SELECTOR);
    const aggregate = decodeAggregate3(tx.input);
    expect(aggregate.calls).toHaveLength(1);
    const inner = extractUsdcCallsFromMulticall(tx.input);
    expect(inner).toHaveLength(0);
  });

  test("ignores USDC Multicall3 inner calls that are not authorization transfers", () => {
    const calldata = encodeFunctionData({
      abi: MULTICALL3_AGGREGATE3_ABI,
      functionName: "aggregate3",
      args: [[{ target: BASE_USDC_ADDRESS, allowFailure: false, callData: "0xa9059cbb00" }]],
    });

    expect(extractUsdcCallsFromMulticall(calldata)).toHaveLength(0);
  });

  test("decodes USDC AuthorizationUsed and Transfer receipt logs", () => {
    const { receipt } = fixture("coingecko");
    const events = decodeReceiptLogsForUsdc(receipt.logs);
    expect(events.map((event) => event.kind)).toEqual(["authorization", "transfer"]);
  });
});

describe("observation builder", () => {
  test("builds direct observations from authorization fields, not transaction envelope", () => {
    const { fixtureCase, tx, receipt } = fixture("orthogonal-olostep");
    const observations = buildPaymentObservations(fixtureCase.caseId, tx, receipt);
    expect(observations).toHaveLength(1);
    const observation = observations[0]!;
    expect(observation.relayer).toBe(tx.from);
    expect(observation.payer).not.toBe(tx.from);
    expect(observation.recipient).not.toBe(tx.to);
    expect(BigInt(observation.amountAtomic)).toBeGreaterThan(0n);
  });

  test("builds Multicall3 observations and rejects incomplete or negative fixtures", () => {
    const multicall = fixture("paysponge-perplexity");
    expect(
      buildPaymentObservations(multicall.fixtureCase.caseId, multicall.tx, multicall.receipt),
    ).toHaveLength(1);

    for (const caseId of [
      "normal-erc20-transfer",
      "non-usdc-multicall3",
      "missing-required-logs",
      "unrelated-base-tx",
    ]) {
      const negative = fixture(caseId);
      expect(
        buildPaymentObservations(negative.fixtureCase.caseId, negative.tx, negative.receipt),
        caseId,
      ).toHaveLength(0);
    }
  });
});

describe("storage and attribution", () => {
  beforeEach(() => {
    resetDb();
    initDb();
  });

  test("manifest rejects embedded attribution seed fields", () => {
    const source = manifest();
    expect(() =>
      validateFixtureManifest({
        ...source,
        cases: [
          {
            ...source.cases[0],
            catalogEntries: [{ type: "recipient", value: BASE_USDC_ADDRESS, confidence: 95 }],
          },
        ],
      }),
    ).toThrow("must not include attribution seed field");
  });

  test("endpoint manifest validates current acquisition targets only", () => {
    const source = readJson<Record<string, unknown>>("acquisition/endpoint_manifest.json");
    const parsed = validateEndpointManifest(source);

    expect(parsed.cases.length).toBeGreaterThan(0);
    expect(parsed.cases.every((endpointCase) => endpointCase.expectedNetwork.length > 0)).toBe(
      true,
    );
    expect(parsed.cases.every((endpointCase) => endpointCase.expectedAsset.length > 0)).toBe(true);
    expect(parsed.cases.every((endpointCase) => endpointCase.sourceName.length > 0)).toBe(true);
    expect(parsed.cases.every((endpointCase) => endpointCase.routeKind.length > 0)).toBe(true);
    expect(parsed.cases.map((endpointCase) => endpointCase.discoveryMethod)).not.toContain(
      "prior_fixture",
    );
  });

  test("endpoint manifest rejects historical and execution policy fields", () => {
    const source = readJson<Record<string, unknown>>("acquisition/endpoint_manifest.json");
    const cases = source.cases as Array<Record<string, unknown>>;

    expect(() =>
      validateEndpointManifest({
        ...source,
        cases: [{ ...cases[0], discoveryMethod: "prior_fixture" }],
      }),
    ).toThrow();

    expect(() =>
      validateEndpointManifest({
        ...source,
        cases: [{ ...cases[0], paidProbeAllowed: true, spendLimitAtomic: "10000" }],
      }),
    ).toThrow();

    expect(() =>
      validateEndpointManifest({
        ...source,
        cases: [{ ...cases[0], expectedNetwork: undefined }],
      }),
    ).toThrow();

    expect(() =>
      validateEndpointManifest({
        ...source,
        cases: [{ ...cases[0], sourceEndpointId: undefined }],
      }),
    ).toThrow("Sponge Catalog endpoint cases must include sourceEndpointId");
  });

  test("endpoint manifest allows known POST bodies and requires them only when ready", () => {
    const source = readJson<Record<string, unknown>>("acquisition/endpoint_manifest.json");
    const cases = source.cases as Array<Record<string, unknown>>;
    const baseCase = {
      ...cases[0],
      caseId: "test-post-body-template",
      endpointUrl: "https://example.com/search",
      resourceUrl: "https://example.com/search",
      requestHost: "example.com",
      method: "POST",
      probeReadiness: "ready",
    };

    expect(() => validateEndpointManifest({ ...source, cases: [baseCase] })).toThrow(
      "Ready POST endpoint cases must include requestBodyTemplate or requestBodyTemplateHash",
    );

    const parsed = validateEndpointManifest({
      ...source,
      cases: [
        {
          ...baseCase,
          requestBodyTemplate: { query: "x402" },
        },
      ],
    });

    expect(parsed.cases[0]?.requestBodyTemplate).toEqual({ query: "x402" });
  });

  test("endpoint manifest accepts optional lastDryRun challenge summary payload", () => {
    const source = readJson<Record<string, unknown>>("acquisition/endpoint_manifest.json");
    const cases = source.cases as Array<Record<string, unknown>>;

    const parsed = validateEndpointManifest({
      ...source,
      cases: [
        {
          ...cases[0],
          caseId: "test-endpoint-manifest-last-dry-run",
          endpointUrl: "https://example.com/search",
          resourceUrl: "https://example.com/search",
          requestHost: "example.com",
          lastDryRun: {
            status: "challenge",
            attemptedAt: "2026-04-27T21:33:48.974Z",
            url: "https://example.com/search",
            httpStatus: 402,
            paymentOptions: [
              {
                amount: "42",
                network: "base",
                asset: "USDC",
                payTo: "0x0000000000000000000000000000000000000000",
              },
            ],
          },
        },
      ],
    });

    expect(parsed.cases[0]).toHaveProperty("lastDryRun.status", "challenge");
  });

  test("endpoint manifest rejects invalid lastDryRun status", () => {
    const source = readJson<Record<string, unknown>>("acquisition/endpoint_manifest.json");
    const cases = source.cases as Array<Record<string, unknown>>;

    expect(() =>
      validateEndpointManifest({
        ...source,
        cases: [
          {
            ...cases[0],
            caseId: "test-endpoint-manifest-last-dry-run-invalid",
            endpointUrl: "https://example.com/search",
            resourceUrl: "https://example.com/search",
            requestHost: "example.com",
            lastDryRun: {
              status: "invalid-status",
              attemptedAt: "2026-04-27T21:33:48.974Z",
              url: "https://example.com/search",
              httpStatus: 402,
              paymentOptions: [
                {
                  amount: "42",
                  network: "base",
                  asset: "USDC",
                  payTo: "0x0000000000000000000000000000000000000000",
                },
              ],
            },
          },
        ],
      }),
    ).toThrow();
  });

  test("ingest is idempotent and independent from fingerprint seeds", () => {
    const first = runIngest();
    const second = runIngest();
    expect(first.insertedObservations).toBe(10);
    expect(second.insertedObservations).toBe(0);
    expect(first.fixtureCases).toBe(14);
    const withoutFingerprints = listPaymentObservations();
    expect(withoutFingerprints).toHaveLength(10);

    resetDb();
    initDb();
    seedKnownFingerprints(knownFingerprints());
    runIngest();
    const withFingerprints = listPaymentObservations();
    expect(withFingerprints).toEqual(withoutFingerprints);
  });

  test("storage and readers can use an isolated explicit database", () => {
    const isolatedDb = createDb(":memory:");
    try {
      initDb(isolatedDb);
      const { fixtureCase, tx, receipt } = fixture("orthogonal-serper");
      const observations = buildPaymentObservations(fixtureCase.caseId, tx, receipt);

      const stored = storePaymentObservations(observations, isolatedDb);

      expect(stored.insertedObservations).toBe(1);
      expect(listPaymentObservations(isolatedDb)).toHaveLength(1);
      expect(listPaymentObservations()).toHaveLength(0);
    } finally {
      isolatedDb.close(false);
    }
  });

  test("known fingerprint seeds do not create observations and negative matches stay ignored", () => {
    const seed = knownFingerprints();
    const normalTransfer = fixture("normal-erc20-transfer");
    const seeded = seedKnownFingerprints({
      ...seed,
      fingerprints: [
        ...seed.fingerprints,
        {
          type: "recipient",
          value: normalTransfer.tx.to ?? BASE_USDC_ADDRESS,
          providerLabel: "negative-fixture-match",
          confidence: 95,
          sourceName: "test",
          provenance: [{ caseId: "normal-erc20-transfer", source: "test" }],
        },
      ],
    });
    expect(seeded).toBeGreaterThan(0);
    expect(listPaymentObservations()).toHaveLength(0);

    runIngest();
    expect(listPaymentObservations().map((row) => row.case_id)).not.toContain(
      "normal-erc20-transfer",
    );
  });

  test("provider endpoint claims and settlement packs do not create observations", () => {
    expect(seedProviderEndpointClaimsFromFile()).toBeGreaterThan(0);
    expect(seedSettlementFingerprintPacksFromFile()).toBeGreaterThan(0);
    expect(listPaymentObservations()).toHaveLength(0);
  });

  test("wallet usage graph uses payer wallets and excludes human identity fields", () => {
    seedProviderEndpointClaimsFromFile();
    seedSettlementFingerprintPacksFromFile();
    runIngest();
    buildAttributionCandidates();
    const graph = buildWalletUsageGraph();
    expect(graph.payerWalletLanguage).toBe(true);
    expect(graph.identityFieldsExcluded).toEqual([
      "human_user",
      "ens",
      "social",
      "kyc",
      "email",
      "ip_address",
    ]);
    expect(JSON.stringify(graph)).not.toContain("humanUser");
    expect(graph.providerWallets.length).toBeGreaterThan(0);
    expect(
      graph.providerWallets
        .flatMap((item) => item.payerWallets)
        .every((item) => item.wallet.startsWith("0x")),
    ).toBe(true);
  });

  test("catalog-only provider candidates are confidence capped", () => {
    seedProviderEndpointClaimsFromFile();
    runIngest();
    buildAttributionCandidates();
    const catalogCandidates = listAttributionCandidates().filter(
      (candidate) => candidate.matched_claim_id === "origindao-catalog-shared-payto",
    );
    expect(catalogCandidates.length).toBeGreaterThan(0);
    expect(catalogCandidates.every((candidate) => candidate.confidence <= 70)).toBe(true);
  });

  test("pattern-only Multicall3 matches do not create high-confidence named Paysponge facilitator candidates", () => {
    seedSettlementFingerprintPacksFromFile();
    runIngest();
    buildAttributionCandidates();
    const namedPaysponge = listAttributionCandidates().filter(
      (candidate) =>
        candidate.candidate_type === "facilitator_candidate" && candidate.entity_id === "paysponge",
    );
    expect(namedPaysponge).toHaveLength(0);
  });

  test("Paysponge host-joined paid transactions create multi-role Paysponge candidates", () => {
    seedProviderEndpointClaimsFromFile();
    seedSettlementFingerprintPacksFromFile();
    runIngest();
    buildAttributionCandidates();
    const paysponge = listAttributionCandidates().filter(
      (candidate) => candidate.entity_id === "paysponge",
    );
    expect(new Set(paysponge.map((candidate) => candidate.candidate_type))).toEqual(
      new Set([
        "provider_candidate",
        "service_candidate",
        "endpoint_candidate",
        "middleman_candidate",
        "market_candidate",
        "facilitator_candidate",
        "settlement_operator_candidate",
      ]),
    );
    const internalRoles = paysponge.filter((candidate) =>
      ["middleman", "market", "facilitator", "settlement_operator"].includes(candidate.role ?? ""),
    );
    expect(internalRoles.length).toBeGreaterThanOrEqual(8);
    expect(internalRoles.every((candidate) => candidate.confidence >= 80)).toBe(true);
  });

  test("observation code does not depend on attribution loaders", () => {
    const observationFiles = listFiles(
      path.resolve(import.meta.dir, "..", "lib", "observations"),
    ).filter((filePath) => filePath.endsWith(".ts"));
    for (const filePath of observationFiles) {
      expect(fs.readFileSync(filePath, "utf8"), filePath).not.toContain("../attribution");
    }
  });

  test("attribution candidates include confidence, reasons, evidence refs, and observations have no final labels", () => {
    seedKnownFingerprintsFromFile();
    seedProviderEndpointClaimsFromFile();
    seedSettlementFingerprintPacksFromFile();
    runIngest();
    const result = buildAttributionCandidates();
    expect(result.observationCount).toBe(10);
    expect(result.candidateCount).toBeGreaterThan(20);

    const candidates = listAttributionCandidates();
    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(candidate.matched_fingerprint_type).toMatch(
        /recipient|relayer|provider_endpoint_claim|settlement_fingerprint/,
      );
      expect(candidate.confidence).toBeGreaterThan(0);
      expect(JSON.parse(candidate.reasons_json).length).toBeGreaterThan(0);
      expect(JSON.parse(candidate.evidence_refs_json).length).toBeGreaterThan(0);
    }

    const columns = db.prepare("PRAGMA table_info(payment_observations)").all() as Array<{
      name: string;
    }>;
    expect(columns.map((column) => column.name)).not.toContain("provider_label");
    expect(columns.map((column) => column.name)).not.toContain("middleman_label");
  });

  test("pure attribution scoring can score in-memory observations without persistence", () => {
    const input: Parameters<typeof scoreObservationCandidates>[0] = {
      observation: {
        observation_id: 123,
        tx_hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        chain_id: BASE_CHAIN_ID,
        payer_wallet: "0x0000000000000000000000000000000000000001",
        recipient_wallet: "0x0000000000000000000000000000000000000002",
        relayer_wallet: "0x0000000000000000000000000000000000000003",
        token_address: BASE_USDC_ADDRESS,
        amount_atomic: "1000",
        top_level_selector: TRANSFER_WITH_AUTHORIZATION_SELECTOR,
        method: "direct",
        raw_method: "direct_transferWithAuthorization",
      },
      recipientFingerprints: [
        {
          fingerprintType: "recipient",
          fingerprintValue: "0x0000000000000000000000000000000000000002",
          confidence: 91,
          providerLabel: "example-provider",
          middlemanLabel: null,
          sourceName: "test",
        },
      ],
      relayerFingerprints: [],
      providerClaims: [],
      settlementPacks: [],
      evidenceByObservationId: new Map(),
    };

    const candidates = scoreObservationCandidates(input);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.candidateType).toBe("recipient_match");
    expect(candidates[0]?.confidence).toBe(91);
  });

  test("projection DTO mappers produce JSON-safe camelCase shapes", () => {
    seedKnownFingerprintsFromFile();
    seedProviderEndpointClaimsFromFile();
    seedSettlementFingerprintPacksFromFile();
    runIngest();
    buildAttributionCandidates();
    buildDailyMetrics();
    rebuildWalletProfiles();

    const observation = toPaymentObservationDto(listPaymentObservations()[0]!);
    const candidate = toAttributionCandidateDto(listAttributionCandidates()[0]!);
    const dailyMetric = toDailyMetricDto(listDailyMetrics()[0]!);
    const walletProfile = toWalletProfileDto(listPayerProfiles()[0]!);

    expect(observation.observationId).toBeGreaterThan(0);
    expect(observation.txHash).toStartWith("0x");
    expect("tx_hash" in observation).toBe(false);
    expect(candidate.reasons.length).toBeGreaterThan(0);
    expect(candidate.evidenceRefs.length).toBeGreaterThan(0);
    expect("reasons_json" in candidate).toBe(false);
    expect(dailyMetric.totalAmountAtomic).toMatch(/^\d+$/);
    expect(walletProfile.wallet).toStartWith("0x");
    expect(JSON.stringify({ observation, candidate, dailyMetric, walletProfile })).toContain(
      "observationId",
    );
  });

  test("aggregate rebuilds are idempotent and preserve projection counts", () => {
    seedKnownFingerprintsFromFile();
    seedProviderEndpointClaimsFromFile();
    seedSettlementFingerprintPacksFromFile();
    runIngest();
    buildAttributionCandidates();

    const firstDaily = buildDailyMetrics();
    const firstWallets = rebuildWalletProfiles();
    const secondDaily = buildDailyMetrics();
    const secondWallets = rebuildWalletProfiles();

    expect(secondDaily).toEqual(firstDaily);
    expect(secondWallets).toEqual(firstWallets);
    expect(listDailyMetrics()).toHaveLength(firstDaily.length);
    expect(listPayerProfiles()).toHaveLength(firstWallets.payerProfiles);
    expect(listRecipientSummaries()).toHaveLength(firstWallets.recipientProfiles);
    expect(listRelayerSummaries()).toHaveLength(firstWallets.relayerProfiles);
  });
});

describe("RPC fixture capture", () => {
  const rpcTx: RpcTransactionPayload = {
    hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    chainId: "0x2105",
    from: "0x0000000000000000000000000000000000000001",
    to: BASE_USDC_ADDRESS,
    input: `${TRANSFER_WITH_AUTHORIZATION_SELECTOR}00`,
    blockNumber: "0x2a",
    nonce: "0x7",
  };

  const rpcReceipt: RpcReceiptPayload = {
    transactionHash: rpcTx.hash,
    blockHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    blockNumber: "0x2a",
    status: "0x1",
    logs: [
      {
        address: BASE_USDC_ADDRESS,
        data: "0x",
        topics: [EVENT_AUTHORIZATION_USED_TOPIC],
        blockHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        blockNumber: "0x2a",
        transactionHash: rpcTx.hash,
        transactionIndex: "0x0",
        logIndex: "0x0",
        removed: false,
      },
    ],
  };

  test("normalizes RPC transaction and receipt payloads into frozen raw fixture shapes", () => {
    const tx = normalizeRpcTransaction(rpcTx, { timestamp: "0x65" });
    const receipt = normalizeRpcReceipt(rpcReceipt);

    expect(tx).toEqual({
      hash: rpcTx.hash as RawTransaction["hash"],
      chainId: BASE_CHAIN_ID,
      from: rpcTx.from as RawTransaction["from"],
      to: BASE_USDC_ADDRESS as RawTransaction["to"],
      input: rpcTx.input as RawTransaction["input"],
      blockNumber: "42",
      blockTimestamp: 101,
      nonce: "0x7",
    } satisfies RawTransaction);
    expect(receipt.blockNumber).toBe("42");
    expect(receipt.logs[0]?.blockNumber).toBe("42");
    expect(receipt.logs[0]?.removed).toBe(false);
  });

  test("fetches tx, receipt, and block timestamp through a mocked JSON-RPC transport", async () => {
    const calls: string[] = [];
    const fixture = await fetchRpcFixture({
      rpcUrl: "https://example.invalid",
      txHash: rpcTx.hash,
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { method: string };
        calls.push(body.method);
        const result =
          body.method === "eth_chainId"
            ? "0x2105"
            : body.method === "eth_getTransactionByHash"
              ? rpcTx
              : body.method === "eth_getTransactionReceipt"
                ? rpcReceipt
                : { timestamp: "0x65" };
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
      },
    });

    expect(calls).toEqual([
      "eth_chainId",
      "eth_getTransactionByHash",
      "eth_getTransactionReceipt",
      "eth_getBlockByNumber",
    ]);
    expect(fixture.tx.blockTimestamp).toBe(101);
    expect(String(fixture.receipt.transactionHash)).toBe(rpcTx.hash);
  });
});

describe("RPC env config", () => {
  test("prefers explicit Base RPC URL over Alchemy API key", () => {
    expect(
      resolveBaseRpcUrl({ BASE_RPC_URL: "https://rpc.example", ALCHEMY_API_KEY: "secret" }),
    ).toBe("https://rpc.example");
  });

  test("builds Base Alchemy endpoint when only Alchemy API key is present", () => {
    expect(resolveBaseRpcUrl({ ALCHEMY_API_KEY: "secret" })).toBe(
      "https://base-mainnet.g.alchemy.com/v2/secret",
    );
  });

  test("validates RPC timeout", () => {
    expect(resolveRpcRequestTimeoutMs({ RPC_REQUEST_TIMEOUT_MS: "1234" })).toBe(1234);
    expect(() => resolveRpcRequestTimeoutMs({ RPC_REQUEST_TIMEOUT_MS: "0" })).toThrow(
      "positive integer",
    );
  });
});

describe("RPC transaction ingest", () => {
  beforeEach(() => {
    resetDb();
    initDb();
  });

  test("ingests a user supplied tx hash idempotently through mocked RPC", async () => {
    const { tx, receipt } = fixture("orthogonal-serper");
    const calls: string[] = [];

    const fetchFn = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { method: string };
      calls.push(body.method);
      const result =
        body.method === "eth_chainId"
          ? "0x2105"
          : body.method === "eth_getTransactionByHash"
            ? { ...tx, blockNumber: `0x${Number(tx.blockNumber).toString(16)}` }
            : body.method === "eth_getTransactionReceipt"
              ? { ...receipt, blockNumber: `0x${Number(receipt.blockNumber).toString(16)}` }
              : { timestamp: `0x${tx.blockTimestamp.toString(16)}` };
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
    };

    const first = await runRpcTxIngest({
      rpcUrl: "https://example.invalid",
      txHash: tx.hash,
      fetchFn,
    });
    const second = await runRpcTxIngest({
      rpcUrl: "https://example.invalid",
      txHash: tx.hash,
      fetchFn,
    });

    expect(first.insertedObservations).toBe(1);
    expect(second.insertedObservations).toBe(0);
    expect(second.evidenceRowsUpdated).toBe(0);
    expect(first.observationCount).toBe(1);
    expect(second.observationCount).toBe(1);
    expect(listPaymentObservations()).toHaveLength(1);
    const evidenceRefs = db
      .prepare("SELECT source_ref FROM settlement_evidence ORDER BY evidence_id")
      .all() as Array<{ source_ref: string }>;
    expect(evidenceRefs.length).toBeGreaterThan(0);
    expect(evidenceRefs.every((row) => row.source_ref.startsWith(`tx:${tx.hash}:stable:`))).toBe(
      true,
    );
    expect(evidenceRefs.some((row) => row.source_ref.includes("rpc-"))).toBe(false);
    expect(calls.filter((method) => method === "eth_getTransactionReceipt")).toHaveLength(2);
  });

  test("does not duplicate a transaction already inserted from fixtures", async () => {
    runIngest();
    const { tx, receipt } = fixture("orthogonal-serper");
    const result = await runRpcTxIngest({
      rpcUrl: "https://example.invalid",
      txHash: tx.hash,
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { method: string };
        const result =
          body.method === "eth_chainId"
            ? "0x2105"
            : body.method === "eth_getTransactionByHash"
              ? tx
              : body.method === "eth_getTransactionReceipt"
                ? receipt
                : { timestamp: `0x${tx.blockTimestamp.toString(16)}` };
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
      },
    });

    expect(result.observationCount).toBe(1);
    expect(result.insertedObservations).toBe(0);
    expect(listPaymentObservations()).toHaveLength(10);
  });

  test("does not create observations when RPC receipt failed", async () => {
    const { tx, receipt } = fixture("orthogonal-serper");
    const result = await runRpcTxIngest({
      rpcUrl: "https://example.invalid",
      txHash: tx.hash,
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { method: string };
        const result =
          body.method === "eth_chainId"
            ? "0x2105"
            : body.method === "eth_getTransactionByHash"
              ? tx
              : body.method === "eth_getTransactionReceipt"
                ? { ...receipt, status: "0x0" }
                : { timestamp: `0x${tx.blockTimestamp.toString(16)}` };
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
      },
    });

    expect(result.insertedObservations).toBe(0);
    expect(result.observationCount).toBe(0);
    expect(result.skippedReason).toBe("failed_receipt");
    expect(listPaymentObservations()).toHaveLength(0);
  });

  test("does not create observations when RPC receipt is missing", async () => {
    const { tx } = fixture("orthogonal-serper");
    const result = await runRpcTxIngest({
      rpcUrl: "https://example.invalid",
      txHash: tx.hash,
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { method: string };
        const payload =
          body.method === "eth_getTransactionReceipt"
            ? { jsonrpc: "2.0", id: 1, result: null }
            : { jsonrpc: "2.0", id: 1, result: body.method === "eth_chainId" ? "0x2105" : tx };
        return new Response(JSON.stringify(payload), { status: 200 });
      },
    });

    expect(result.insertedObservations).toBe(0);
    expect(result.observationCount).toBe(0);
    expect(result.skippedReason).toBe("missing_rpc_data");
    expect(listPaymentObservations()).toHaveLength(0);
  });
});

describe("RPC range ingest", () => {
  beforeEach(() => {
    resetDb();
    initDb();
  });

  test("identifies only USDC authorization and Multicall3 aggregate3 candidates", () => {
    expect(
      isRpcRangeCandidate({
        to: BASE_USDC_ADDRESS,
        input: `${TRANSFER_WITH_AUTHORIZATION_SELECTOR}00`,
      }),
    ).toBe(true);
    expect(
      isRpcRangeCandidate({
        to: BASE_USDC_ADDRESS,
        input: `${EXECUTE_WITH_AUTHORIZATION_SELECTOR}00`,
      }),
    ).toBe(true);
    expect(
      isRpcRangeCandidate({ to: MULTICALL3_ADDRESS, input: `${MULTICALL3_AGGREGATE3_SELECTOR}00` }),
    ).toBe(true);
    expect(isRpcRangeCandidate({ to: BASE_USDC_ADDRESS, input: "0xa9059cbb00" })).toBe(false);
    expect(
      isRpcRangeCandidate({
        to: "0x0000000000000000000000000000000000000002",
        input: `${TRANSFER_WITH_AUTHORIZATION_SELECTOR}00`,
      }),
    ).toBe(false);
  });

  test("scans a bounded range, fetches receipts only for candidates, and remains idempotent", async () => {
    const { tx, receipt } = fixture("orthogonal-serper");
    const blockNumber = Number(tx.blockNumber);
    const blockNumberHex = `0x${blockNumber.toString(16)}`;
    const nonCandidate = {
      ...tx,
      hash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      to: "0x0000000000000000000000000000000000000002" as RawTransaction["to"],
      input: `${TRANSFER_WITH_AUTHORIZATION_SELECTOR}00` as RawTransaction["input"],
    };
    const irrelevantMulticall = {
      ...tx,
      hash: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" as RawTransaction["hash"],
      to: MULTICALL3_ADDRESS as RawTransaction["to"],
      input: encodeFunctionData({
        abi: MULTICALL3_AGGREGATE3_ABI,
        functionName: "aggregate3",
        args: [
          [
            {
              target: BASE_USDC_ADDRESS,
              allowFailure: false,
              callData: "0xa9059cbb00" as `0x${string}`,
            },
          ],
        ],
      }) as RawTransaction["input"],
    };
    const irrelevantMulticallReceipt: RawReceipt = {
      ...receipt,
      transactionHash: irrelevantMulticall.hash,
      logs: [],
    };
    const calls: Array<{ method: string; params: unknown[] }> = [];

    const fetchFn = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      calls.push({ method: body.method, params: body.params });

      if (body.method === "eth_chainId") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x2105" }), {
          status: 200,
        });
      }

      if (body.method === "eth_getBlockByNumber") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: {
              number: blockNumberHex,
              timestamp: `0x${tx.blockTimestamp.toString(16)}`,
              transactions: [
                { ...tx, blockNumber: blockNumberHex },
                { ...irrelevantMulticall, blockNumber: blockNumberHex },
                { ...nonCandidate, blockNumber: blockNumberHex },
              ],
            },
          }),
          { status: 200 },
        );
      }

      const result = body.params[0] === tx.hash ? receipt : irrelevantMulticallReceipt;
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
    };

    const first = await runRpcRangeIngest({
      rpcUrl: "https://example.invalid",
      fromBlock: blockNumber,
      toBlock: blockNumber,
      fetchFn,
    });
    const second = await runRpcRangeIngest({
      rpcUrl: "https://example.invalid",
      fromBlock: blockNumber,
      toBlock: blockNumber,
      fetchFn,
    });

    expect(first.scannedBlocks).toBe(1);
    expect(first.runId).toBeGreaterThan(0);
    expect(first.scannedTransactions).toBe(3);
    expect(first.candidateTransactions).toBe(2);
    expect(first.receiptFetches).toBe(2);
    expect(first.observationCount).toBe(1);
    expect(first.insertedObservations).toBe(1);
    expect(second.insertedObservations).toBe(0);
    expect(second.evidenceRowsUpdated).toBe(0);
    expect(listPaymentObservations()).toHaveLength(1);
    expect(calls.filter((call) => call.method === "eth_getTransactionReceipt")).toHaveLength(4);
    expect(
      calls
        .filter((call) => call.method === "eth_getTransactionReceipt")
        .map((call) => call.params[0]),
    ).toEqual([tx.hash, irrelevantMulticall.hash, tx.hash, irrelevantMulticall.hash]);
    expect(calls.filter((call) => call.method === "eth_getBlockByNumber")[0]?.params).toEqual([
      blockNumberHex,
      true,
    ]);

    const runs = db
      .prepare(
        "SELECT source, from_block, to_block, observation_count, inserted_observations FROM ingestion_runs ORDER BY run_id",
      )
      .all() as Array<{
      source: string;
      from_block: number;
      to_block: number;
      observation_count: number;
      inserted_observations: number;
    }>;
    expect(runs).toEqual([
      {
        source: "rpc_range",
        from_block: blockNumber,
        to_block: blockNumber,
        observation_count: 1,
        inserted_observations: 1,
      },
      {
        source: "rpc_range",
        from_block: blockNumber,
        to_block: blockNumber,
        observation_count: 1,
        inserted_observations: 0,
      },
    ]);
  });

  test("rejects ranges above the configured max block guard before RPC calls", async () => {
    const calls: string[] = [];
    await expect(
      runRpcRangeIngest({
        rpcUrl: "https://example.invalid",
        fromBlock: 42,
        toBlock: 44,
        maxBlocks: 2,
        fetchFn: async (_url, init) => {
          calls.push(JSON.parse(String(init?.body)).method);
          return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x2105" }), {
            status: 200,
          });
        },
      }),
    ).rejects.toThrow("RPC range too large");
    expect(calls).toHaveLength(0);
  });
});
