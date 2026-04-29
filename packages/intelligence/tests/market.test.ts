import { describe, expect, test } from "bun:test";
import { validateCdpResource } from "contracts";
import { buildMarketSnapshot, filterPaymentOptionsByScope } from "../src/market";

const cdpResource = (resource: Parameters<typeof validateCdpResource>[0]) =>
  validateCdpResource(resource);

describe("market intelligence snapshot builder", () => {
  test("joins CDP resources with matching bitquery aggregates", () => {
    const resource = cdpResource({
      resourceId: "resource-1",
      resource: "https://orthogonal.example/search",
      provider: "Orthogonal",
      service: "Search",
      paymentOptions: [
        {
          scheme: "eip155",
          network: "base",
          asset: "USDC",
          amount: "100",
          payTo: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          provenance: {
            sourceKind: "cdp_discovery",
            sourceName: "cdp-discovery",
            fetchedAt: new Date().toISOString(),
          },
          quality: {
            expectedTransactionCount: 4,
            expectedUniqueSenderCount: 2,
            expectedVolumeAtomic: "1000",
          },
        },
        {
          network: "base",
          asset: "USDT",
          amount: "50",
          payTo: "0xcccccccccccccccccccccccccccccccccccccccc",
          provenance: {
            sourceKind: "cdp_discovery",
            sourceName: "cdp-discovery",
            fetchedAt: new Date().toISOString(),
          },
        },
      ],
      provenance: {
        sourceKind: "cdp_discovery",
        sourceName: "cdp-discovery",
        fetchedAt: new Date().toISOString(),
      },
    });

    const snapshot = buildMarketSnapshot({
      resources: [resource],
      scope: {
        network: "base",
        asset: "USDC",
      },
      aggregates: [
        {
          network: "base",
          asset: "USDC",
          payTo: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          transactionCount: 7,
          uniqueSenderCount: 3,
          totalVolumeAtomic: "2100",
          provenance: {
            sourceKind: "bitquery",
            sourceName: "bitquery-graphql",
          },
        },
      ],
      cdp: {
        sourceName: "cdp-discovery",
        fetchLimit: 10,
        fetchedCount: 1,
      },
      bitquery: {
        sourceName: "bitquery-graphql",
        queriedPairs: 1,
      },
    });

    expect(snapshot.resources).toHaveLength(1);
    expect(snapshot.resources[0]?.paymentOptions).toHaveLength(2);

    const first = snapshot.resources[0]?.paymentOptions.at(0);
    const second = snapshot.resources[0]?.paymentOptions.at(1);

    expect(first?.inScope).toBe(true);
    expect(first?.isActive).toBe(true);
    expect(first?.bitqueryAggregate.transactionCount).toBe(7);
    expect(first?.discrepancies.length).toBe(3);

    expect(second?.inScope).toBe(false);
    expect(second?.isActive).toBe(false);
    expect(second?.bitqueryAggregate.transactionCount).toBe(0);

    expect(snapshot.summary.scopedResources).toBe(1);
    expect(snapshot.summary.scopedPaymentOptions).toBe(1);
    expect(snapshot.summary.activePaymentOptions).toBe(1);
    expect(snapshot.summary.totalTransactions).toBe(7);
    expect(snapshot.summary.totalUniqueSenders).toBe(3);
  });

  test("counts zero-activity scoped options and keeps them non-active when no aggregate is found", () => {
    const resource = cdpResource({
      resourceId: "resource-2",
      resource: "https://paysponge.example/search",
      paymentOptions: [
        {
          network: "base",
          asset: "USDC",
          amount: "250",
          payTo: "0x1111111111111111111111111111111111111111",
          provenance: {
            sourceKind: "cdp_discovery",
            sourceName: "cdp-discovery",
            fetchedAt: new Date().toISOString(),
          },
        },
      ],
      provenance: {
        sourceKind: "cdp_discovery",
        sourceName: "cdp-discovery",
      },
    });

    const snapshot = buildMarketSnapshot({
      resources: [resource],
      scope: {
        network: "base",
        asset: "USDC",
      },
      aggregates: [],
      cdp: {
        sourceName: "cdp-discovery",
        fetchLimit: 1,
        fetchedCount: 1,
      },
      bitquery: {
        queriedPairs: 0,
      },
    });

    const option = snapshot.resources[0]?.paymentOptions[0];
    expect(option?.isActive).toBe(false);
    expect(option?.bitqueryAggregate).toMatchObject({
      transactionCount: 0,
      uniqueSenderCount: 0,
      totalVolumeAtomic: "0",
    });
    expect(snapshot.summary.activeResources).toBe(0);
    expect(snapshot.summary.activePaymentOptions).toBe(0);
    expect(snapshot.summary.totalTransactions).toBe(0);
  });

  test("builds scoped rank across payment options and resources", () => {
    const resources = [
      cdpResource({
        resourceId: "resource-a",
        resource: "https://a.example",
        paymentOptions: [
          {
            network: "base",
            asset: "USDC",
            amount: "100",
            payTo: "0x0000000000000000000000000000000000000001",
            provenance: {
              sourceKind: "cdp_discovery",
              sourceName: "cdp-discovery",
              fetchedAt: new Date().toISOString(),
            },
          },
          {
            network: "base",
            asset: "USDC",
            amount: "200",
            payTo: "0x0000000000000000000000000000000000000002",
            provenance: {
              sourceKind: "cdp_discovery",
              sourceName: "cdp-discovery",
              fetchedAt: new Date().toISOString(),
            },
          },
        ],
        provenance: {
          sourceKind: "cdp_discovery",
          sourceName: "cdp-discovery",
        },
      }),
      cdpResource({
        resourceId: "resource-b",
        resource: "https://b.example",
        paymentOptions: [
          {
            network: "base",
            asset: "USDC",
            amount: "300",
            payTo: "0x0000000000000000000000000000000000000003",
            provenance: {
              sourceKind: "cdp_discovery",
              sourceName: "cdp-discovery",
            },
          },
        ],
        provenance: {
          sourceKind: "cdp_discovery",
          sourceName: "cdp-discovery",
        },
      }),
    ];

    const snapshot = buildMarketSnapshot({
      resources,
      scope: {
        network: "base",
        asset: "USDC",
      },
      aggregates: [
        {
          network: "base",
          asset: "USDC",
          payTo: "0x0000000000000000000000000000000000000001",
          transactionCount: 9,
          uniqueSenderCount: 1,
          totalVolumeAtomic: "100",
          provenance: { sourceKind: "bitquery", sourceName: "bitquery-graphql" },
        },
        {
          network: "base",
          asset: "USDC",
          payTo: "0x0000000000000000000000000000000000000002",
          transactionCount: 5,
          uniqueSenderCount: 1,
          totalVolumeAtomic: "200",
          provenance: { sourceKind: "bitquery", sourceName: "bitquery-graphql" },
        },
        {
          network: "base",
          asset: "USDC",
          payTo: "0x0000000000000000000000000000000000000003",
          transactionCount: 11,
          uniqueSenderCount: 1,
          totalVolumeAtomic: "300",
          provenance: { sourceKind: "bitquery", sourceName: "bitquery-graphql" },
        },
      ],
      cdp: {
        sourceName: "cdp-discovery",
        fetchLimit: 3,
        fetchedCount: 3,
      },
      bitquery: {
        queriedPairs: 3,
      },
    });

    expect(snapshot.resources[0]?.activityRank).toBe(1);
    expect(snapshot.resources[1]?.activityRank).toBe(2);
    expect(snapshot.summary.topResources.at(0)?.resourceId).toBe("resource-a");
    expect(snapshot.summary.topResources.at(1)?.resourceId).toBe("resource-b");

    const [first, second, third] = filterPaymentOptionsByScope(resources, {
      network: "base",
      asset: "USDC",
    });
    expect(first).toMatchObject({ resource: { resourceId: "resource-a" }, inScope: true });
    expect(second).toMatchObject({ resource: { resourceId: "resource-a" }, inScope: true });
    expect(third).toMatchObject({ resource: { resourceId: "resource-b" }, inScope: true });
  });
});
