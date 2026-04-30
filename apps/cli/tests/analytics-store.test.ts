import { describe, expect, test } from "bun:test";
import type { BitqueryAggregate, CdpResource } from "contracts";
import { analyticsSchema, createAnalyticsStore } from "../scripts/analytics/store";

const provenance = { sourceKind: "cdp_discovery" as const, sourceName: "test-cdp" };

const resource = (
  resourceId: string,
  payTo: string,
  resourceUrl = `https://svc.example/${resourceId}`,
  provider = "svc",
): CdpResource => ({
  resourceId,
  resource: resourceUrl,
  provider,
  service: "test service",
  paymentOptions: [
    {
      network: "eip155:8453",
      asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      amount: "10000",
      payTo,
      provenance,
    },
  ],
  provenance,
});

const aggregate = (payTo: string): BitqueryAggregate => ({
  network: "base",
  asset: "USDC",
  payTo,
  transactionCount: 7,
  uniqueSenderCount: 3,
  totalVolumeAtomic: "70000",
  latestTransfer: {
    txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    sender: "0x1111111111111111111111111111111111111111",
    recipient: payTo,
    amountAtomic: "10000",
    blockNumber: "123",
    blockTimestamp: "2026-01-01T00:00:00.000Z",
  },
  provenance: { sourceKind: "bitquery", sourceName: "test-bitquery" },
  timeWindow: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T00:00:00.000Z" },
});

describe("analytics store", () => {
  test("initializes required SQLite tables and indexes in memory", () => {
    const store = createAnalyticsStore({ mode: "memory" });
    try {
      store.initialize();
      const schema = store.getSchemaObjectNames();

      expect(schema.tables).toEqual(expect.arrayContaining([...analyticsSchema.requiredTables]));
      expect(schema.indexes).toEqual(expect.arrayContaining([...analyticsSchema.requiredIndexes]));
    } finally {
      store.close();
    }
  });

  test("records capture run status, parameters, coverage, and errors", () => {
    const store = createAnalyticsStore({ mode: "memory" });
    try {
      const runId = store.beginCaptureRun({
        kind: "cdp_census",
        parameters: { limit: null },
        sourceCoverage: { cdp: "started" },
        startedAt: "2026-01-01T00:00:00.000Z",
      });

      expect(store.getCaptureRun(runId)).toMatchObject({
        id: runId,
        kind: "cdp_census",
        status: "running",
        parameters: { limit: null },
        sourceCoverage: { cdp: "started" },
      });

      store.failCaptureRun(runId, new Error("boom"), { cdp: "partial" });
      expect(store.getCaptureRun(runId)).toMatchObject({
        status: "failed",
        sourceCoverage: { cdp: "partial" },
        error: { name: "Error", message: "boom" },
      });
    } finally {
      store.close();
    }
  });

  test("persists normalized CDP resources, deduplicated payment sinks, and Bitquery aggregates", () => {
    const store = createAnalyticsStore({ mode: "memory" });
    try {
      const payTo = "0x1111111111111111111111111111111111111111";
      const runId = store.beginCaptureRun({ kind: "cdp_census" });

      expect(
        store.persistCdpResources([resource("r1", payTo), resource("r2", payTo)], runId),
      ).toEqual({
        resources: 2,
        paymentOptions: 2,
      });
      expect(store.persistPayToAggregates([aggregate(payTo)], runId)).toEqual({ aggregates: 1 });
      store.completeCaptureRun(runId, { cdp: "available", bitquery: "available" });

      const sinkCount = store.db.prepare("SELECT COUNT(*) AS count FROM payment_sinks").get() as {
        count: number;
      };
      const aggregateRow = store.db
        .prepare(
          "SELECT transaction_count, unique_sender_count, total_volume_atomic FROM payto_aggregates",
        )
        .get();

      expect(sinkCount.count).toBe(1);
      expect(aggregateRow).toEqual({
        transaction_count: 7,
        unique_sender_count: 3,
        total_volume_atomic: "70000",
      });
      expect(store.getCaptureRun(runId)).toMatchObject({ status: "success" });
    } finally {
      store.close();
    }
  });

  test("detects direct, bundled, many-payTo, and unresolved mapping patterns", () => {
    const store = createAnalyticsStore({ mode: "memory" });
    try {
      const direct = "0x1111111111111111111111111111111111111111";
      const bundled = "0x2222222222222222222222222222222222222222";
      const peer = "0x3333333333333333333333333333333333333333";
      const peerSecond = "0x5555555555555555555555555555555555555555";
      const unresolved = "0x4444444444444444444444444444444444444444";

      store.persistCdpResources([
        resource("direct", direct, "https://direct.example/pay", "direct"),
        resource("bundled-a", bundled, "https://bundle.example/a", "bundle"),
        resource("bundled-b", bundled, "https://bundle.example/b", "bundle"),
        resource("peer-a", peer, "https://svc.example/a"),
        resource("peer-b", peerSecond, "https://svc.example/b"),
      ]);
      const rows = store.detectAndPersistMappingPatterns([
        { network: "base", asset: "USDC", payTo: unresolved },
      ]);

      expect(rows.find((row) => row.payTo === direct)).toMatchObject({
        mappingPattern: "one_payto_one_endpoint",
        endpointAttributionStatus: "direct_payto_endpoint",
      });
      expect(rows.find((row) => row.payTo === bundled)).toMatchObject({
        mappingPattern: "one_payto_many_endpoints",
        endpointAttributionStatus: "bundled_payto_unknown_endpoint",
      });
      expect(rows.find((row) => row.payTo === peer)).toMatchObject({
        mappingPattern: "many_paytos_one_service",
        endpointAttributionStatus: "direct_payto_endpoint",
      });
      expect(rows.find((row) => row.payTo === unresolved)).toMatchObject({
        mappingPattern: "unresolved_payto",
        endpointAttributionStatus: "unresolved_payto",
      });
    } finally {
      store.close();
    }
  });

  test("stores transfer facts with transfer-level identity rather than tx hash alone", () => {
    const store = createAnalyticsStore({ mode: "memory" });
    try {
      const sink = {
        network: "base",
        asset: "USDC",
        payTo: "0x1111111111111111111111111111111111111111",
      };
      const txHash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      store.persistTransferFacts([
        {
          ...sink,
          txHash,
          transferIndex: 0,
          payerWallet: "0x2222222222222222222222222222222222222222",
          amountAtomic: "100",
          blockTimestamp: "2026-01-01T00:00:00.000Z",
        },
        {
          ...sink,
          txHash,
          transferIndex: 1,
          payerWallet: "0x3333333333333333333333333333333333333333",
          amountAtomic: "200",
          blockTimestamp: "2026-01-01T00:00:01.000Z",
        },
      ]);

      const count = store.db
        .prepare("SELECT COUNT(*) AS count FROM transfer_facts WHERE tx_hash = ?")
        .get(txHash) as { count: number };
      expect(count.count).toBe(2);
    } finally {
      store.close();
    }
  });

  test("reads payTo census rows with aggregate activity and attribution metadata", () => {
    const store = createAnalyticsStore({ mode: "memory" });
    try {
      const payTo = "0x1111111111111111111111111111111111111111";
      const runId = store.beginCaptureRun({ kind: "cdp_census" });
      store.persistCdpResources([resource("r1", payTo)], runId);
      store.persistPayToAggregates([aggregate(payTo)], runId);
      store.detectAndPersistMappingPatterns();

      const rows = store.listPayToCensusRows({ network: "base", asset: "USDC" });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        payTo,
        transactionCount: 7,
        uniqueSenderCount: 3,
        totalVolumeAtomic: "70000",
        mappingPattern: "one_payto_one_endpoint",
        endpointAttributionStatus: "direct_payto_endpoint",
        endpointCount: 1,
        resourceCount: 1,
        serviceId: "svc",
        serviceName: "test service",
      });
      expect(rows[0].attributionMetadata).toEqual({ source: "cdp_payment_options" });
    } finally {
      store.close();
    }
  });

  test("scopes payTo census rows to requested capture runs and time window", () => {
    const store = createAnalyticsStore({ mode: "memory" });
    try {
      const currentPayTo = "0x1111111111111111111111111111111111111111";
      const stalePayTo = "0x2222222222222222222222222222222222222222";
      const staleRunId = store.beginCaptureRun({ kind: "cdp_census" });
      store.persistCdpResources([resource("stale", stalePayTo)], staleRunId);
      store.persistPayToAggregates([aggregate(stalePayTo)], staleRunId);

      const currentRunId = store.beginCaptureRun({ kind: "cdp_census" });
      store.persistCdpResources([resource("current", currentPayTo)], currentRunId);
      store.persistPayToAggregates([aggregate(currentPayTo)], currentRunId);
      store.detectAndPersistMappingPatterns();

      const rows = store.listPayToCensusRows({
        network: "base",
        asset: "USDC",
        cdpRunIds: [currentRunId],
        aggregateRunIds: [currentRunId],
        timeWindow: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T00:00:00.000Z" },
      });

      expect(rows.map((row) => row.payTo)).toEqual([currentPayTo]);
    } finally {
      store.close();
    }
  });

  test("reads wallet transfer rows with service identity and bundled-payTo signal", () => {
    const store = createAnalyticsStore({ mode: "memory" });
    try {
      const payTo = "0x2222222222222222222222222222222222222222";
      store.persistCdpResources([
        resource("bundle-a", payTo, "https://coingecko.example/a", "CoinGecko"),
        resource("bundle-b", payTo, "https://coingecko.example/b", "CoinGecko"),
      ]);
      store.detectAndPersistMappingPatterns();
      store.persistTransferFacts([
        {
          network: "base",
          asset: "USDC",
          payTo,
          txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          payerWallet: "0x3333333333333333333333333333333333333333",
          amountAtomic: "1000",
          blockTimestamp: "2026-01-02T00:00:00.000Z",
        },
      ]);

      const rows = store.listWalletTransferRows({ network: "base", asset: "USDC" });

      expect(rows).toEqual([
        expect.objectContaining({
          payerWallet: "0x3333333333333333333333333333333333333333",
          payTo,
          serviceId: "coingecko",
          serviceName: "test service",
          amountAtomic: "1000",
          blockTimestamp: "2026-01-02T00:00:00.000Z",
          isCoingecko: true,
          isBundledPayTo: true,
        }),
      ]);
    } finally {
      store.close();
    }
  });

  test("scopes wallet transfer rows to requested transfer runs and time window", () => {
    const store = createAnalyticsStore({ mode: "memory" });
    try {
      const payTo = "0x2222222222222222222222222222222222222222";
      store.persistCdpResources([resource("direct", payTo)]);
      store.detectAndPersistMappingPatterns();
      const staleRunId = store.beginCaptureRun({ kind: "payto_transfer_capture" });
      store.persistTransferFacts([
        {
          network: "base",
          asset: "USDC",
          payTo,
          txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          payerWallet: "0x3333333333333333333333333333333333333333",
          amountAtomic: "1000",
          blockTimestamp: "2025-01-02T00:00:00.000Z",
          sourceRunId: staleRunId,
        },
      ]);
      const currentRunId = store.beginCaptureRun({ kind: "payto_transfer_capture" });
      store.persistTransferFacts([
        {
          network: "base",
          asset: "USDC",
          payTo,
          txHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          payerWallet: "0x4444444444444444444444444444444444444444",
          amountAtomic: "2000",
          blockTimestamp: "2026-01-02T00:00:00.000Z",
          sourceRunId: currentRunId,
        },
      ]);

      const rows = store.listWalletTransferRows({
        network: "base",
        asset: "USDC",
        transferRunIds: [currentRunId],
        timeWindow: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T00:00:00.000Z" },
      });

      expect(rows.map((row) => row.payerWallet)).toEqual([
        "0x4444444444444444444444444444444444444444",
      ]);
    } finally {
      store.close();
    }
  });

  test("persists sampling plan metadata as generated analytics records", () => {
    const store = createAnalyticsStore({ mode: "memory" });
    try {
      const runId = store.beginCaptureRun({ kind: "full_capture" });
      store.persistSamplingPlanMetadata({
        planKind: "payto",
        planKey: "base:usdc:test",
        payload: { selected: ["0x1"] },
        parameters: { seed: "test" },
        selectedEntities: ["0x1"],
        sourceRunId: runId,
        generatedAt: "2026-01-01T00:00:00.000Z",
      });

      expect(store.readGeneratedReadModel("sampling_plan_payto", "base:usdc:test")).toMatchObject({
        planKind: "payto",
        parameters: { seed: "test" },
        selectedEntities: ["0x1"],
        sourceRunId: runId,
      });
    } finally {
      store.close();
    }
  });
});
