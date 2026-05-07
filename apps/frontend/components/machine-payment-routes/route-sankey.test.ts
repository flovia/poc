import { describe, expect, test } from "bun:test";
import type { RouteAnalyticsSummaryResponse } from "contracts";
import {
  buildRouteSankeyFlows,
  getRouteSankeyViewCopy,
  type RouteSankeyView,
} from "./route-sankey";

function route(
  overrides: Partial<RouteAnalyticsSummaryResponse["sampleRoutes"][number]>,
): RouteAnalyticsSummaryResponse["sampleRoutes"][number] {
  return {
    routeId: "route:test",
    workflowId: "workflow:test",
    rail: "x402",
    protocol: "x402",
    sourceRoute: "Direct",
    sourcePlatform: "direct",
    router: "Base",
    providerId: "demo-provider",
    endpointGroup: "/v1/test",
    useCase: "demo route",
    payerIdentity: "demo:payer",
    payeeIdentity: "demo:payee",
    amountUsd: 10,
    currency: "USD",
    status: "settled",
    visibility: "public_onchain",
    provenance: "demo_label",
    provenanceByField: {
      rail: "demo_label",
      router: "demo_label",
    },
    timestamp: "2026-05-07T00:00:00.000Z",
    reasons: [{ provenance: "demo_label", label: "fixture" }],
    ...overrides,
  };
}

function buildSummary(
  sampleRoutes: RouteAnalyticsSummaryResponse["sampleRoutes"],
): RouteAnalyticsSummaryResponse {
  return {
    generatedAt: "2026-05-07T00:00:00.000Z",
    generatedFrom: "route-sankey-test",
    routeCount: sampleRoutes.length,
    workflowCount: new Set(sampleRoutes.map((row) => row.workflowId)).size,
    paidWorkflowCount: new Set(
      sampleRoutes
        .filter((row) => row.status === "paid" || row.status === "settled")
        .map((row) => row.workflowId),
    ).size,
    settledUsd: sampleRoutes.reduce((sum, row) => sum + (row.amountUsd ?? 0), 0),
    successRate: 1,
    repeatUsage: 0,
    rails: [
      {
        rail: "x402",
        routeCount: 1,
        workflowCount: 1,
        paidWorkflowCount: 1,
        settledUsd: 10,
        successRate: 1,
        repeatUsage: 0,
        visibility: "public_onchain",
      },
    ],
    sampleRoutes,
    provenance: "derived_insight",
    provenanceByField: {
      sampleRoutes: "derived_insight",
      rails: "derived_insight",
    },
    reasons: [{ provenance: "derived_insight", label: "fixture" }],
  };
}

function middleLabels(summary: RouteAnalyticsSummaryResponse, view: RouteSankeyView): string[] {
  return buildRouteSankeyFlows(summary, view)
    .filter((flow) => flow.fromStep === 0 && flow.toStep === 1)
    .map((flow) => flow.toLabel ?? flow.to);
}

describe("route-sankey", () => {
  test("groups the middle column by payment rail", () => {
    const summary = buildSummary([
      route({
        rail: "x402",
        router: "Base",
        workflowId: "workflow:scrape",
        endpointGroup: "/v1/scrape",
      }),
      route({
        routeId: "route:stripe",
        workflowId: "workflow:extract",
        endpointGroup: "/v1/extract",
        rail: "stripe_mpp",
        protocol: "mpp",
        router: "Tempo",
        visibility: "provider_attested",
      }),
      route({
        routeId: "route:hitpay",
        workflowId: "workflow:map",
        endpointGroup: "/v1/map",
        rail: "hitpay_mpp",
        protocol: "mpp",
        router: "HitPay",
        visibility: "provider_attested",
      }),
    ]);

    expect(middleLabels(summary, "rail")).toEqual(["x402", "Stripe MPP", "HitPay MPP"]);
  });

  test("groups the middle column by supported routers and drops unsupported router families", () => {
    const summary = buildSummary([
      route({
        routeId: "route:base",
        router: "Base",
        workflowId: "workflow:scrape",
        endpointGroup: "/v1/scrape",
      }),
      route({
        routeId: "route:solana",
        rail: "stripe_mpp",
        protocol: "mpp",
        router: "Solana",
        workflowId: "workflow:extract",
        endpointGroup: "/v1/extract",
        visibility: "provider_attested",
      }),
      route({
        routeId: "route:tempo",
        rail: "stripe_mpp",
        protocol: "mpp",
        router: "Tempo",
        workflowId: "workflow:map",
        endpointGroup: "/v1/map",
        visibility: "provider_attested",
      }),
      route({
        routeId: "route:stp",
        rail: "hitpay_mpp",
        protocol: "mpp",
        router: "STP",
        workflowId: "workflow:crawl",
        endpointGroup: "/v1/crawl",
        visibility: "provider_attested",
      }),
    ]);

    expect(middleLabels(summary, "router")).toEqual(["Base", "Solana", "Tempo"]);
  });

  test("provides distinct copy for each view", () => {
    expect(getRouteSankeyViewCopy("rail").label).toBe("Payment Route");
    expect(getRouteSankeyViewCopy("rail").title).toBe(
      "Source route → payment route → API workflow",
    );
    expect(getRouteSankeyViewCopy("router").label).toBe("Chain");
    expect(getRouteSankeyViewCopy("router").title).toBe("Source route → chain → API workflow");
  });
});
