import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { validateProviderCatalogResponse, type ProviderCatalogResponse } from "contracts";
import {
  buildMppCaptureRecord,
  buildProviderCatalogFromMppCapture,
  captureMppServiceProbe,
  decodePaymentRequiredHeader,
  fetchMppServices,
  mergeProviderCatalogs,
  parseWwwAuthenticatePayment,
  pickProbeEndpoint,
  toProviderCatalogRowFromMpp,
  type MppCaptureRecord,
  type MppService,
} from "../src/mpp-registry";

const fixtureRoot = path.resolve(import.meta.dir, "fixtures");
const readFixture = (name: string) =>
  fs.readFileSync(path.join(fixtureRoot, name), "utf8");

const SAMPLE_WWW_AUTH =
  'Payment id="abc123", realm="mpp.api.agentmail.to", method="tempo", intent="charge", request="eyJhbW91bnQiOiIyMDAwMDAwIiwiY3VycmVuY3kiOiIweDIwQzAwMDAwMDAwMDAwMDAwMDAwMDAwMGI5NTM3ZDExYzYwRThiNTAiLCJtZXRob2REZXRhaWxzIjp7ImNoYWluSWQiOjQyMTd9LCJyZWNpcGllbnQiOiIweDZlMzE4NEMyMDRlNTk2ZEVEODlFOEE1NjkzQjYwMjA5N0Y0QWI2ODcifQ", expires="2026-05-06T19:19:48.333Z"';

const MULTI_CHALLENGE_WWW_AUTH =
  'Payment id="A1", realm="r1", method="tempo", intent="charge", request="eyJhbW91bnQiOiIxMDAwMCIsImN1cnJlbmN5IjoiMHgyMEMwMDAwMDAwMDAwMDAwMDAwMDAwMDBiOTUzN2QxMWM2MEU4YjUwIiwibWV0aG9kRGV0YWlscyI6eyJjaGFpbklkIjo0MjE3fSwicmVjaXBpZW50IjoiMHgxZmQwN2VhMDI3NWZhMjExNjllMzMxMWRiZjc5ZmRiZGY5NWVjNjVmIn0", description="hello, world", expires="2026-05-06T19:19:52.063Z", Payment id="B2", realm="r2", method="stripe", intent="charge", request="eyJhbW91bnQiOiIxIiwiY3VycmVuY3kiOiJ1c2QiLCJtZXRob2REZXRhaWxzIjp7Im5ldHdvcmtJZCI6ImludGVybmFsIiwicGF5bWVudE1ldGhvZFR5cGVzIjpbImNhcmQiXX19", description="hello, world", expires="2026-05-06T19:19:52.063Z"';

describe("parseWwwAuthenticatePayment", () => {
  test("parses tempo challenge with base64 request payload", () => {
    const challenges = parseWwwAuthenticatePayment(SAMPLE_WWW_AUTH);
    expect(challenges).toHaveLength(1);
    const challenge = challenges[0];
    expect(challenge.scheme).toBe("Payment");
    expect(challenge.id).toBe("abc123");
    expect(challenge.realm).toBe("mpp.api.agentmail.to");
    expect(challenge.method).toBe("tempo");
    expect(challenge.intent).toBe("charge");
    expect(challenge.expires).toBe("2026-05-06T19:19:48.333Z");
    expect(challenge.request).toEqual({
      amount: "2000000",
      currency: "0x20C000000000000000000000b9537d11c60E8b50",
      methodDetails: { chainId: 4217 },
      recipient: "0x6e3184C204e596dED89E8A5693B602097F4Ab687",
    });
  });

  test("parses multiple challenges (tempo + stripe) with quoted commas in description", () => {
    const challenges = parseWwwAuthenticatePayment(MULTI_CHALLENGE_WWW_AUTH);
    expect(challenges).toHaveLength(2);
    expect(challenges[0]?.method).toBe("tempo");
    expect(challenges[0]?.description).toBe("hello, world");
    expect(challenges[0]?.request).toMatchObject({
      amount: "10000",
      methodDetails: { chainId: 4217 },
    });
    expect(challenges[1]?.method).toBe("stripe");
    expect(challenges[1]?.request).toMatchObject({
      currency: "usd",
      methodDetails: { networkId: "internal" },
    });
  });

  test("returns empty array when header is missing or malformed", () => {
    expect(parseWwwAuthenticatePayment(undefined)).toEqual([]);
    expect(parseWwwAuthenticatePayment("Basic realm=\"x\"")).toEqual([]);
  });

  test("does not absorb attributes from a following non-Payment scheme", () => {
    const header =
      'Payment id="P1", realm="payment-realm", method="tempo", intent="charge", request="eyJhIjoxfQ", Bearer realm="bearer-realm", error="invalid_token"';
    const challenges = parseWwwAuthenticatePayment(header);
    expect(challenges).toHaveLength(1);
    expect(challenges[0]?.realm).toBe("payment-realm");
    expect(challenges[0]?.raw.error).toBeUndefined();
  });
});

describe("decodeBase64Json strict validation", () => {
  test("rejects base64 input with trailing garbage", () => {
    // "eyJhIjoxfQ" decodes to {"a":1}; tack on illegal chars and ensure we reject.
    const header = 'Payment id="X", realm="r", method="tempo", request="eyJhIjoxfQ$$$"';
    const challenges = parseWwwAuthenticatePayment(header);
    expect(challenges).toHaveLength(1);
    expect(challenges[0]?.request).toBeUndefined();
  });
});

describe("decodePaymentRequiredHeader", () => {
  test("decodes x402 v2 payload from Allium-style header", () => {
    const header = readFixture("mpp-allium-payment-required.txt").trim();
    const decoded = decodePaymentRequiredHeader(header);
    expect(decoded?.x402Version).toBe(2);
    expect(decoded?.accepts).toHaveLength(2);
    expect(decoded?.accepts?.[0]).toMatchObject({
      scheme: "exact",
      network: "eip155:8453",
      asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      amount: "20000",
    });
    expect(decoded?.accepts?.[1]?.network).toBe("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
    expect(decoded?.resource?.url).toBe("https://agents.allium.so/api/v1/developer/prices");
    expect(decoded?.extensions?.bazaar).toBeTruthy();
  });

  test("returns null for empty or invalid header", () => {
    expect(decodePaymentRequiredHeader(undefined)).toBeNull();
    expect(decodePaymentRequiredHeader("not-base64-$$$")).toBeNull();
  });
});

describe("fetchMppServices", () => {
  test("returns parsed services from /api/services endpoint", async () => {
    const fixture = readFixture("mpp-services-sample.json");
    const result = await fetchMppServices({
      fetchFn: async () => new Response(fixture, { status: 200 }),
    });
    expect(result.version).toBe(1);
    expect(result.services).toHaveLength(2);
    expect(result.services[0]?.id).toBe("agentmail");
    expect(result.services[0]?.endpoints).toHaveLength(2);
  });

  test("throws on non-200", async () => {
    await expect(
      fetchMppServices({
        fetchFn: async () => new Response("nope", { status: 503 }),
      }),
    ).rejects.toThrow(/MPP services request failed/);
  });
});

describe("pickProbeEndpoint", () => {
  test("returns first endpoint with non-null payment", () => {
    const fixture = JSON.parse(readFixture("mpp-services-sample.json"));
    const agentmail = fixture.services[0] as MppService;
    const probe = pickProbeEndpoint(agentmail);
    expect(probe?.method).toBe("POST");
    expect(probe?.path).toBe("/v0/inboxes");
  });

  test("returns null when service has no paid endpoints", () => {
    const fixture = JSON.parse(readFixture("mpp-services-sample.json"));
    const free = fixture.services[1] as MppService;
    expect(pickProbeEndpoint(free)).toBeNull();
  });
});

describe("captureMppServiceProbe", () => {
  test("captures 402 challenge and decodes both headers + body", async () => {
    const fixture = JSON.parse(readFixture("mpp-services-sample.json"));
    const service = fixture.services[0] as MppService;

    const result = await captureMppServiceProbe({
      service,
      fetchFn: async (url, init) => {
        expect(String(url)).toBe("https://mpp.api.agentmail.to/v0/inboxes");
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            type: "https://paymentauth.org/problems/payment-required",
            title: "Payment Required",
            status: 402,
            challengeId: "abc123",
          }),
          {
            status: 402,
            headers: {
              "www-authenticate": SAMPLE_WWW_AUTH,
              "content-type": "application/json",
            },
          },
        );
      },
    });

    if (result.skipped) throw new Error("expected probe to run");
    if (result.status === null) throw new Error("expected non-null status");
    expect(result.status).toBe(402);
    expect(result.challenges).toHaveLength(1);
    expect(result.challenges[0]?.method).toBe("tempo");
    expect(result.challenges[0]?.request?.recipient).toBe(
      "0x6e3184C204e596dED89E8A5693B602097F4Ab687",
    );
    expect(result.body).toMatchObject({ challengeId: "abc123", status: 402 });
  });

  test("returns null challenges when no paid endpoint exists", async () => {
    const fixture = JSON.parse(readFixture("mpp-services-sample.json"));
    const free = fixture.services[1] as MppService;
    let called = false;
    const result = await captureMppServiceProbe({
      service: free,
      fetchFn: async () => {
        called = true;
        return new Response("{}", { status: 200 });
      },
    });
    expect(called).toBe(false);
    expect(result.skipped).toBe(true);
    if (!result.skipped) throw new Error("expected skipped");
    expect(result.skipReason).toBe("no_paid_endpoint");
  });

  test("captures non-402 responses without throwing", async () => {
    const fixture = JSON.parse(readFixture("mpp-services-sample.json"));
    const service = fixture.services[0] as MppService;
    const result = await captureMppServiceProbe({
      service,
      fetchFn: async () => new Response("{}", { status: 500 }),
    });
    if (result.skipped) throw new Error("expected probe to run");
    if (result.status === null) throw new Error("expected non-null status");
    expect(result.status).toBe(500);
    expect(result.challenges).toEqual([]);
  });

  test("retains 402 challenges even when body read fails after headers arrive", async () => {
    const fixture = JSON.parse(readFixture("mpp-services-sample.json"));
    const service = fixture.services[0] as MppService;

    const responseLikeBrokenBody = new Response(
      new ReadableStream({
        start(controller) {
          // Headers are already on the wire; emit a chunk then break the stream.
          controller.enqueue(new TextEncoder().encode("partial"));
          controller.error(new Error("connection reset while reading body"));
        },
      }),
      {
        status: 402,
        headers: {
          "www-authenticate": SAMPLE_WWW_AUTH,
          "content-type": "application/json",
        },
      },
    );

    const result = await captureMppServiceProbe({
      service,
      fetchFn: async () => responseLikeBrokenBody,
    });
    if (result.skipped) throw new Error("expected probe to run");
    if (result.status === null) throw new Error("expected non-null status (body race regression)");
    expect(result.status).toBe(402);
    expect(result.challenges).toHaveLength(1);
    expect(result.challenges[0]?.request?.recipient).toBe(
      "0x6e3184C204e596dED89E8A5693B602097F4Ab687",
    );
    expect(result.body).toBeNull();
  });
});

describe("toProviderCatalogRowFromMpp", () => {
  const baseRecord: MppCaptureRecord = {
    serviceId: "agentmail",
    serviceName: "AgentMail",
    providerName: "AgentMail",
    realm: "mpp.api.agentmail.to",
    serviceUrl: "https://mpp.api.agentmail.to",
    description: "Email inboxes for AI agents.",
    categories: ["ai", "social"],
    integration: "first-party",
    status: "active",
    endpointCount: 83,
    paidEndpointCount: 14,
    registryAssets: ["0x20c000000000000000000000b9537d11c60e8b50"],
    registryMethods: ["tempo"],
    probe: {
      method: "tempo",
      intent: "charge",
      chainId: 4217,
      payTo: "0x6e3184C204e596dED89E8A5693B602097F4Ab687",
      asset: "0x20C000000000000000000000b9537d11c60E8b50",
      amountAtomic: "2000000",
      paidEndpointPath: "/v0/inboxes",
      capturedAt: "2026-05-06T19:14:48.000Z",
      offerCount: 1,
    },
    offers: [
      {
        source: "www-authenticate",
        method: "tempo",
        intent: "charge",
        chainId: 4217,
        payTo: "0x6e3184C204e596dED89E8A5693B602097F4Ab687",
        asset: "0x20C000000000000000000000b9537d11c60E8b50",
        amountAtomic: "2000000",
      },
    ],
    source: {
      registryUrl: "https://mpp.dev/api/services",
      probeUrl: "https://mpp.api.agentmail.to/v0/inboxes",
      capturedAt: "2026-05-06T19:14:48.000Z",
    },
  };

  test("normalizes a tempo MPP capture record into ProviderCatalogRow", () => {
    const row = toProviderCatalogRowFromMpp(baseRecord, {
      registryVersion: 1,
      registrySourceUrl: "https://mpp.dev/api/services",
    });
    expect(row).not.toBeNull();
    if (!row) throw new Error("expected row");
    expect(row.providerId).toBe(
      "mpp:agentmail::tempo:4217::USDC::0x6e3184c204e596ded89e8a5693b602097f4ab687",
    );
    expect(row.serviceId).toBe("agentmail");
    expect(row.network).toBe("tempo:4217");
    expect(row.payTo).toBe("0x6e3184c204e596ded89e8a5693b602097f4ab687");
    expect(row.asset).toBe("USDC");
    expect(row.assetSymbol).toBe("USDC");
    expect(row.catalogSource).toBe("mpp_registry");
    expect(row.protocol).toBe("MPP");
    expect(row.endpointAttributionStatus).toBe("mpp_attributed_endpoint");
    expect(row.endpointCount).toBe(83);
    expect(row.resourceCount).toBe(14);
    expect(row.transactionCount).toBe(0);
    expect(row.uniqueSenderCount).toBe(0);
    expect(row.totalVolumeAtomic).toBe("0");
    expect(row.hasCustomerFacts).toBe(false);
    expect(row.customerFactCount).toBe(0);
    expect(row.attributionConfidence).toBe(1);
    expect(row.provenance).toBe("registry_fact");
    expect(row.provenanceByField?.payTo).toBe("registry_fact");
    // Mock placeholder values must be tagged as derived_insight, not registry_fact.
    expect(row.provenanceByField?.transactionCount).toBe("derived_insight");
    expect(row.provenanceByField?.uniqueSenderCount).toBe("derived_insight");
    expect(row.provenanceByField?.totalVolumeAtomic).toBe("derived_insight");
    expect(row.provenanceByField?.hasCustomerFacts).toBe("derived_insight");
    expect(row.provenanceByField?.customerFactCount).toBe("derived_insight");
    expect(row.provenanceByField?.attributionConfidence).toBe("derived_insight");
    expect(row.title).toBe("AgentMail");
    expect(row.serviceUrl).toBe("https://mpp.api.agentmail.to");
    expect(row.registryVersion).toBe("1");
    expect(row.registrySourceUrl).toBe("https://mpp.dev/api/services");
  });

  test("prefers tempo challenge network over Base accept when both are present (parallel case)", () => {
    // Real-world example: parallel returns a tempo www-authenticate challenge
    // (chainId=4217) AND a payment-required accept entry on Base (eip155:8453).
    // Since the row originates from the MPP registry, the row should reflect
    // the Tempo path, not the x402-compatible Base fallback.
    const record: MppCaptureRecord = {
      ...baseRecord,
      probe: {
        ...baseRecord.probe!,
        method: "tempo",
        chainId: 4217,
        payTo: "0xf54f1a6e0e5176e7a11b844b9bca76e4a731647a",
      },
      offers: [
        {
          source: "www-authenticate",
          method: "tempo",
          intent: "charge",
          chainId: 4217,
          payTo: "0xf54f1a6e0e5176e7a11b844b9bca76e4a731647a",
          asset: "0x20c000000000000000000000b9537d11c60e8b50",
          amountAtomic: "10000",
        },
        {
          source: "payment-required",
          network: "eip155:8453",
          payTo: "0x4a329698171757bc3f047e0a20ef86bc5bb68d46",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          assetSymbol: "USDC",
          amountAtomic: "10000",
        },
      ],
    };
    const row = toProviderCatalogRowFromMpp(record);
    if (!row) throw new Error("expected row");
    expect(row.network).toBe("tempo:4217");
    expect(row.protocol).toBe("MPP");
    expect(row.payTo).toBe("0xf54f1a6e0e5176e7a11b844b9bca76e4a731647a");
  });

  test("MPP-registry rows with only x402-style accepts are still tagged protocol=MPP (moltycash case)", () => {
    // moltycash returns 6 payment-required accepts and no www-authenticate
    // challenge. It IS an MPP registry service (catalogSource=mpp_registry),
    // so the row should be marked as MPP even though the actual payment rail
    // is x402-compatible.
    const record: MppCaptureRecord = {
      ...baseRecord,
      probe: {
        ...baseRecord.probe!,
        method: undefined,
        chainId: undefined,
        payTo: undefined,
      },
      offers: [
        {
          source: "payment-required",
          network: "eip155:8453",
          payTo: "0x8755a2faf86c9e3758450d703f8bbcada343c62e",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          assetSymbol: "USDC",
          amountAtomic: "20000",
        },
        {
          source: "payment-required",
          network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          payTo: "FWoD65bNMnYuvA4sjSokrJvTV61nUbPfAuxgjiGZtNT9",
          asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          amountAtomic: "20000",
        },
      ],
    };
    const row = toProviderCatalogRowFromMpp(record);
    if (!row) throw new Error("expected row");
    expect(row.protocol).toBe("MPP");
    // Network/payTo follow the selected accept (Base wins by selectAcceptOffer rule)
    expect(row.network).toBe("base");
  });

  test("uses Base accept entry from payment-required header when present", () => {
    const record: MppCaptureRecord = {
      ...baseRecord,
      probe: { ...baseRecord.probe!, network: "eip155:8453" },
      offers: [
        {
          source: "payment-required",
          network: "eip155:8453",
          payTo: "0xc4d7487bee18de45e53ebba432ae15b0c25695be",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          assetSymbol: "USDC",
          amountAtomic: "20000",
          scheme: "exact",
        },
      ],
    };
    const row = toProviderCatalogRowFromMpp(record);
    if (!row) throw new Error("expected row");
    expect(row.network).toBe("base");
    expect(row.asset).toBe("USDC");
    expect(row.assetSymbol).toBe("USDC");
    expect(row.payTo).toBe("0xc4d7487bee18de45e53ebba432ae15b0c25695be");
    // Rows produced by the MPP registry capture path are always tagged MPP,
    // even when the wire-level rail (here: x402-style payment-required accept)
    // is technically x402-compatible.
    expect(row.protocol).toBe("MPP");
  });

  test("normalizes 'USD Coin' display name to USDC", () => {
    const record: MppCaptureRecord = {
      ...baseRecord,
      offers: [
        {
          source: "payment-required",
          network: "eip155:8453",
          payTo: "0xc4d7487bee18de45e53ebba432ae15b0c25695be",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          assetSymbol: "USD Coin",
          amountAtomic: "20000",
        },
      ],
    };
    const row = toProviderCatalogRowFromMpp(record);
    if (!row) throw new Error("expected row");
    expect(row.asset).toBe("USDC");
    expect(row.assetSymbol).toBe("USDC");
  });

  test("returns null when payTo is the EVM zero address (placeholder, not a real recipient)", () => {
    // Some MPP demo services (e.g. martin-estate at the time of capture) return
    // recipient=0x0000…0000 which is a placeholder, not a real payment target.
    // Routing to such a row breaks downstream lookups (the customers page needs
    // a non-zero payTo), so the normalizer should drop these rows.
    const record: MppCaptureRecord = {
      ...baseRecord,
      probe: {
        ...baseRecord.probe!,
        payTo: "0x0000000000000000000000000000000000000000",
      },
      offers: [],
    };
    expect(toProviderCatalogRowFromMpp(record)).toBeNull();
  });

  test("returns null when no offer or probe carries a payTo", () => {
    const record: MppCaptureRecord = {
      ...baseRecord,
      probe: { ...baseRecord.probe!, payTo: undefined },
      offers: [],
    };
    expect(toProviderCatalogRowFromMpp(record)).toBeNull();
  });

  test("recovers payTo from payment-required offer when challenge lacks recipient", () => {
    const record: MppCaptureRecord = {
      ...baseRecord,
      probe: { ...baseRecord.probe!, payTo: undefined, asset: undefined, chainId: undefined },
      offers: [
        {
          source: "payment-required",
          network: "eip155:8453",
          payTo: "0xc4d7487bee18de45e53ebba432ae15b0c25695be",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          assetSymbol: "USDC",
          amountAtomic: "20000",
        },
      ],
    };
    const row = toProviderCatalogRowFromMpp(record);
    if (!row) throw new Error("expected row recovered from payment-required");
    expect(row.payTo).toBe("0xc4d7487bee18de45e53ebba432ae15b0c25695be");
    expect(row.network).toBe("base");
  });

  test("selects accept entry by chainId match instead of array order", () => {
    const record: MppCaptureRecord = {
      ...baseRecord,
      probe: { ...baseRecord.probe!, chainId: 8453, network: "eip155:8453", payTo: undefined },
      offers: [
        {
          source: "payment-required",
          network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          payTo: "9tY3ZNMDhfVDdt2fFnrqR4iVjLHvLnE35kYdMqrZs758",
          asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          assetSymbol: "USDC",
          amountAtomic: "20000",
        },
        {
          source: "payment-required",
          network: "eip155:8453",
          payTo: "0xc4d7487bee18de45e53ebba432ae15b0c25695be",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          assetSymbol: "USDC",
          amountAtomic: "20000",
        },
      ],
    };
    const row = toProviderCatalogRowFromMpp(record);
    if (!row) throw new Error("expected row");
    // Should pick the eip155:8453 entry, not the leading solana entry.
    expect(row.network).toBe("base");
    expect(row.payTo).toBe("0xc4d7487bee18de45e53ebba432ae15b0c25695be");
  });

  test("populates mppDescription from MPP registry description", () => {
    const row = toProviderCatalogRowFromMpp(baseRecord);
    if (!row) throw new Error("expected row");
    // MPP registry description should be available as `mppDescription` so that
    // the GEO page can render it separately from the Pay.sh atlas description.
    expect(row.mppDescription).toBe("Email inboxes for AI agents.");
  });

  test("does not duplicate description into mppDescription when MPP description is missing", () => {
    const record: MppCaptureRecord = { ...baseRecord, description: undefined };
    const row = toProviderCatalogRowFromMpp(record);
    if (!row) throw new Error("expected row");
    expect(row.mppDescription).toBeUndefined();
  });

  test("populates priceRangeUsd when amount + decimals known (USDC = 6)", () => {
    const row = toProviderCatalogRowFromMpp(baseRecord);
    if (!row) throw new Error("expected row");
    // 2000000 atomic / 1e6 = $2.00
    expect(row.priceRangeUsd?.min).toBeCloseTo(2);
    expect(row.priceRangeUsd?.max).toBeCloseTo(2);
  });
});

describe("buildProviderCatalogFromMppCapture", () => {
  test("produces a schema-valid ProviderCatalogResponse from capture", () => {
    const capture = {
      generatedAt: "2026-05-06T19:14:48.000Z",
      source: { registryUrl: "https://mpp.dev/api/services", registryVersion: 1 },
      records: [
        {
          serviceId: "agentmail",
          serviceName: "AgentMail",
          providerName: "AgentMail",
          realm: "mpp.api.agentmail.to",
          serviceUrl: "https://mpp.api.agentmail.to",
          description: "Email inboxes for AI agents.",
          categories: ["ai"],
          integration: "first-party",
          status: "active",
          endpointCount: 83,
          paidEndpointCount: 14,
          registryAssets: ["0x20c000000000000000000000b9537d11c60e8b50"],
          registryMethods: ["tempo"],
          probe: {
            method: "tempo",
            intent: "charge",
            chainId: 4217,
            payTo: "0x6e3184C204e596dED89E8A5693B602097F4Ab687",
            asset: "0x20C000000000000000000000b9537d11c60E8b50",
            amountAtomic: "2000000",
            paidEndpointPath: "/v0/inboxes",
            capturedAt: "2026-05-06T19:14:48.000Z",
            offerCount: 1,
          },
          offers: [],
          source: {
            registryUrl: "https://mpp.dev/api/services",
            probeUrl: "https://mpp.api.agentmail.to/v0/inboxes",
            capturedAt: "2026-05-06T19:14:48.000Z",
          },
        },
        {
          serviceId: "no-paytime",
          serviceName: "Skipped",
          providerName: "Skipped",
          serviceUrl: "https://skip.example",
          categories: [],
          endpointCount: 0,
          paidEndpointCount: 0,
          registryAssets: [],
          registryMethods: [],
          probe: { skipReason: "no_paid_endpoint" },
          offers: [],
          source: { registryUrl: "https://mpp.dev/api/services" },
        },
      ] as MppCaptureRecord[],
    };

    const response = buildProviderCatalogFromMppCapture(capture);
    expect(response.providerCount).toBe(1);
    expect(response.providers).toHaveLength(1);
    expect(response.generatedFrom).toContain("mpp");

    // Round-trip through validator to ensure schema compliance.
    const validated = validateProviderCatalogResponse(response);
    expect(validated.providers[0]?.providerId).toContain("agentmail");
    expect(validated.providers[0]?.catalogSource).toBe("mpp_registry");
  });
});

describe("paidEndpoints projection on MppCaptureRecord", () => {
  test("captures the registry's paid endpoints (path/method/description/payment)", () => {
    const fixture = JSON.parse(readFixture("mpp-services-sample.json"));
    const service = fixture.services[0] as MppService;
    const record = buildMppCaptureRecord({
      service,
      probe: { skipped: true, skipReason: "no_paid_endpoint" },
    });
    // The fixture's `agentmail` row has 1 paid endpoint, free /v0/inboxes (GET) is dropped.
    expect(record.paidEndpoints?.length).toBe(1);
    const first = record.paidEndpoints?.[0];
    expect(first?.method).toBe("POST");
    expect(first?.path).toBe("/v0/inboxes");
    expect(first?.description).toBe("Create inbox");
    expect(first?.payment?.intent).toBe("charge");
    expect(first?.payment?.amount).toBe("2000000");
    expect(first?.payment?.decimals).toBe(6);
  });
});

describe("toProviderCatalogRowFromMpp resources mapping", () => {
  const baseService: MppService = {
    id: "agentmail",
    name: "AgentMail",
    url: "https://mpp.api.agentmail.to",
    serviceUrl: "https://mpp.api.agentmail.to",
    description: "Email inboxes for AI agents.",
    categories: ["ai"],
    realm: "mpp.api.agentmail.to",
    provider: { name: "AgentMail", url: "https://agentmail.to" },
    endpoints: [
      {
        method: "POST",
        path: "/v0/inboxes",
        description: "Create inbox",
        payment: {
          intent: "charge",
          method: "tempo",
          currency: "0x20c000000000000000000000b9537d11c60e8b50",
          decimals: 6,
          description: "Create inbox",
          amount: "2000000",
        },
      },
      {
        method: "POST",
        path: "/v1/messages",
        description: "Create messages with Claude - price varies by model",
        payment: {
          intent: "session",
          method: "tempo",
          currency: "0x20c000000000000000000000b9537d11c60e8b50",
          decimals: 6,
          description: "Create messages with Claude - price varies by model",
          dynamic: true,
        },
      },
      {
        method: "GET",
        path: "/free",
        description: "free thing",
        payment: null,
      },
    ],
  };

  test("emits resources[] with intent + unit + dynamic flag for each paid endpoint", () => {
    const record = buildMppCaptureRecord({
      service: baseService,
      probe: {
        skipped: false,
        endpoint: { method: "POST", path: "/v0/inboxes", description: "Create inbox" },
        url: "https://mpp.api.agentmail.to/v0/inboxes",
        status: 402,
        headers: {},
        challenges: [
          {
            scheme: "Payment",
            method: "tempo",
            intent: "charge",
            request: {
              amount: "2000000",
              currency: "0x20c000000000000000000000b9537d11c60e8b50",
              recipient: "0x6e3184C204e596dED89E8A5693B602097F4Ab687",
              methodDetails: { chainId: 4217 },
            },
            raw: {},
          },
        ],
        paymentRequired: null,
        body: null,
        capturedAt: "2026-05-06T19:14:48.000Z",
      },
    });
    const row = toProviderCatalogRowFromMpp(record);
    if (!row) throw new Error("expected row");
    // We expect 2 resources (one per paid endpoint); the free /free is dropped.
    expect(row.resources?.length).toBe(2);
    const charge = row.resources?.find((r) => r.method === "POST" && r.resource.endsWith("/v0/inboxes"));
    expect(charge?.amountAtomic).toBe("2000000");
    expect(charge?.description).toContain("Create inbox");
    const session = row.resources?.find((r) => r.method === "POST" && r.resource.endsWith("/v1/messages"));
    expect(session?.description).toContain("Create messages with Claude");
    // Dynamic + session-intent endpoints carry no fixed amount.
    expect(session?.amountAtomic).toBeUndefined();
  });
});

describe("buildMppCaptureRecord", () => {
  test("preserves all offers from www-authenticate + payment-required headers", () => {
    const fixture = JSON.parse(readFixture("mpp-services-sample.json"));
    const service = fixture.services[0] as MppService;
    const paymentRequiredHeader = readFixture("mpp-allium-payment-required.txt").trim();

    const record = buildMppCaptureRecord({
      service,
      probe: {
        skipped: false,
        endpoint: { method: "POST", path: "/v0/inboxes", description: "Create inbox" },
        url: "https://mpp.api.agentmail.to/v0/inboxes",
        status: 402,
        headers: {},
        challenges: parseWwwAuthenticatePayment(SAMPLE_WWW_AUTH),
        paymentRequired: decodePaymentRequiredHeader(paymentRequiredHeader),
        body: null,
        capturedAt: "2026-05-06T19:14:48.000Z",
      },
    });

    // 1 challenge (tempo) + 2 accepts (eip155, solana) = 3 offers
    expect(record.offers).toHaveLength(3);
    expect(record.offers[0]?.source).toBe("www-authenticate");
    expect(record.offers[0]?.method).toBe("tempo");
    expect(record.offers[1]?.source).toBe("payment-required");
    expect(record.offers[1]?.network).toBe("eip155:8453");
    expect(record.offers[2]?.network).toBe("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
    expect(record.offers[2]?.assetSymbol).toBe("USDC");
    expect(record.probe?.offerCount).toBe(3);
  });

  test("merges registry entry + probe into a normalized record", () => {
    const fixture = JSON.parse(readFixture("mpp-services-sample.json"));
    const service = fixture.services[0] as MppService;

    const record = buildMppCaptureRecord({
      service,
      probe: {
        skipped: false,
        endpoint: { method: "POST", path: "/v0/inboxes", description: "Create inbox" },
        url: "https://mpp.api.agentmail.to/v0/inboxes",
        status: 402,
        headers: {
          "www-authenticate": SAMPLE_WWW_AUTH,
          "content-type": "application/json",
        },
        challenges: parseWwwAuthenticatePayment(SAMPLE_WWW_AUTH),
        paymentRequired: null,
        body: { status: 402, challengeId: "abc123" },
        capturedAt: "2026-05-06T19:14:48.000Z",
      },
    });

    expect(record.serviceId).toBe("agentmail");
    expect(record.providerName).toBe("AgentMail");
    expect(record.probe?.payTo).toBe("0x6e3184C204e596dED89E8A5693B602097F4Ab687");
    expect(record.probe?.asset).toBe("0x20C000000000000000000000b9537d11c60E8b50");
    expect(record.probe?.chainId).toBe(4217);
    expect(record.probe?.method).toBe("tempo");
    expect(record.probe?.amountAtomic).toBe("2000000");
    expect(record.endpointCount).toBe(2);
    expect(record.paidEndpointCount).toBe(1);
  });
});

describe("mergeProviderCatalogs", () => {
  const makeRow = (providerId: string, extras: Record<string, unknown> = {}): Record<string, unknown> => ({
    providerId,
    name: providerId,
    serviceId: providerId.split("--")[0] ?? providerId,
    serviceName: providerId,
    network: "base",
    asset: "USDC",
    payTo: `0x${providerId.replace(/[^a-f0-9]/gi, "").padEnd(40, "1").slice(0, 40)}`,
    transactionCount: 1,
    uniqueSenderCount: 1,
    totalVolumeAtomic: "1",
    endpointCount: 1,
    resourceCount: 1,
    mappingPattern: "one_payto_one_endpoint",
    endpointAttributionStatus: "direct_payto_endpoint",
    attributionConfidence: 1,
    hasCustomerFacts: true,
    customerFactCount: 1,
    provenance: "derived_insight",
    provenanceByField: { providerId: "derived_insight" },
    reasons: [{ provenance: "derived_insight", label: "test row" }],
    ...extras,
  });

  const makePrimary = (rows: Array<Record<string, unknown>>): ProviderCatalogResponse =>
    validateProviderCatalogResponse({
      generatedAt: "2026-05-07T00:00:00.000Z",
      generatedFrom: "test-primary",
      providers: rows,
      providerCount: rows.length,
      provenance: "derived_insight",
      provenanceByField: { providers: "derived_insight" },
      reasons: [{ provenance: "derived_insight", label: "test catalog" }],
    });

  test("appends MPP rows that don't exist in primary catalog", () => {
    const primary = makePrimary([makeRow("primary-a")]);
    const mpp = makePrimary([
      makeRow("mpp-1", { catalogSource: "mpp_registry", provenance: "registry_fact" }),
      makeRow("mpp-2", { catalogSource: "mpp_registry", provenance: "registry_fact" }),
    ]);

    const merged = mergeProviderCatalogs(primary, mpp);
    expect(merged.providerCount).toBe(3);
    expect(merged.providers.map((p) => p.providerId)).toEqual([
      "primary-a",
      "mpp-1",
      "mpp-2",
    ]);
    expect(merged.generatedFrom).toContain("merged");
  });

  test("primary wins on providerId collision (preserves on-chain measurement)", () => {
    const primary = makePrimary([
      makeRow("collision-id", { transactionCount: 999, name: "primary-name" }),
    ]);
    const mpp = makePrimary([
      makeRow("collision-id", {
        catalogSource: "mpp_registry",
        provenance: "registry_fact",
        transactionCount: 0,
        name: "mpp-name",
      }),
    ]);
    const merged = mergeProviderCatalogs(primary, mpp);
    expect(merged.providerCount).toBe(1);
    expect(merged.providers[0]?.transactionCount).toBe(999);
    expect(merged.providers[0]?.name).toBe("primary-name");
  });

  test("does not collapse Solana base58 payTo by case-insensitive comparison", () => {
    // Solana base58 is case-sensitive. Two addresses that differ only in case
    // must NOT be treated as duplicates.
    const primary = makePrimary([
      {
        ...makeRow("a"),
        providerId: "primary-solana-row",
        serviceId: "shared-service",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        asset: "USDC",
        payTo: "9tY3ZNMDhfVDdt2fFnrqR4iVjLHvLnE35kYdMqrZs758",
      },
    ]);
    const mpp = makePrimary([
      {
        ...makeRow("b"),
        providerId: "mpp-solana-row",
        serviceId: "shared-service",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        asset: "USDC",
        // Same string with different case — different address on Solana.
        payTo: "9TY3ZNMDhFVDDT2FFNRQR4IVJLHVLNE35KYDMQRZS758",
        catalogSource: "mpp_registry",
      },
    ]);
    const merged = mergeProviderCatalogs(primary, mpp);
    expect(merged.providerCount).toBe(2);
  });

  test("preserves MPP rows that share a single gateway payTo across distinct services", () => {
    // Tempo's Anthropic gateway payTo is reused across 20+ MPP service ids.
    // The merger must NOT collapse them to a single row.
    const primary = makePrimary([makeRow("primary-a")]);
    const sharedPayTo = "0xca4e835f803cb0b7c428222b3a3b98518d4779fe";
    const mpp = makePrimary([
      {
        ...makeRow("mpp:anthropic"),
        providerId: "mpp:anthropic::tempo:4217::USDC::" + sharedPayTo,
        serviceId: "anthropic",
        network: "tempo:4217",
        asset: "USDC",
        payTo: sharedPayTo,
        catalogSource: "mpp_registry",
      },
      {
        ...makeRow("mpp:openai"),
        providerId: "mpp:openai::tempo:4217::USDC::" + sharedPayTo,
        serviceId: "openai",
        network: "tempo:4217",
        asset: "USDC",
        payTo: sharedPayTo,
        catalogSource: "mpp_registry",
      },
      {
        ...makeRow("mpp:gemini"),
        providerId: "mpp:gemini::tempo:4217::USDC::" + sharedPayTo,
        serviceId: "gemini",
        network: "tempo:4217",
        asset: "USDC",
        payTo: sharedPayTo,
        catalogSource: "mpp_registry",
      },
    ]);
    const merged = mergeProviderCatalogs(primary, mpp);
    expect(merged.providerCount).toBe(4); // 1 primary + 3 distinct services on shared payTo
    const mppRows = merged.providers.filter((p) => p.catalogSource === "mpp_registry");
    expect(mppRows.map((p) => p.serviceId)).toEqual(["anthropic", "openai", "gemini"]);
  });

  test("primary wins by service identity even when providerId schemes differ", () => {
    // CDP-style providerId
    const primary = makePrimary([
      {
        ...makeRow("cdp-row"),
        providerId: "agentmail--tempo:4217--usdc--0x6e3184c204e596ded89e8a5693b602097f4ab687",
        serviceId: "agentmail",
        name: "AgentMail (onchain)",
        network: "tempo:4217",
        asset: "USDC",
        payTo: "0x6e3184c204e596ded89e8a5693b602097f4ab687",
        transactionCount: 1234,
      },
    ]);
    // MPP-style providerId for the same payment identity
    const mpp = makePrimary([
      {
        ...makeRow("mpp-row"),
        providerId: "mpp:agentmail::tempo:4217::USDC::0x6e3184c204e596ded89e8a5693b602097f4ab687",
        serviceId: "agentmail",
        name: "AgentMail (registry)",
        network: "tempo:4217",
        asset: "USDC",
        payTo: "0x6e3184c204e596ded89e8a5693b602097f4ab687",
        catalogSource: "mpp_registry",
        provenance: "registry_fact",
        transactionCount: 0,
      },
    ]);
    const merged = mergeProviderCatalogs(primary, mpp);
    // Despite different providerId formats, payment identity matches, so primary wins
    expect(merged.providerCount).toBe(1);
    expect(merged.providers[0]?.transactionCount).toBe(1234);
    expect(merged.providers[0]?.name).toBe("AgentMail (onchain)");
  });

  test("returns primary unchanged when MPP catalog is null/undefined", () => {
    const primary = makePrimary([makeRow("a"), makeRow("b")]);
    const merged = mergeProviderCatalogs(primary, null);
    expect(merged.providers).toEqual(primary.providers);
    expect(merged.providerCount).toBe(2);
  });

  test("emits a schema-valid response (round-trips through validator)", () => {
    const primary = makePrimary([makeRow("a")]);
    const mpp = makePrimary([
      makeRow("b", { catalogSource: "mpp_registry", provenance: "registry_fact" }),
    ]);
    const merged = mergeProviderCatalogs(primary, mpp);
    expect(() => validateProviderCatalogResponse(merged)).not.toThrow();
  });

  describe("enrichment mode", () => {
    const SHARED_PAY_TO = "0xcfa26f13c6c18307033ece13bbb8f470da5b4dbe";

    test("enriches Pay.sh row with MPP-only fields when payment identity matches (StableSocial)", () => {
      // Pay.sh atlas representation
      const primary = makePrimary([
        {
          ...makeRow("paysh-stablesocial"),
          providerId: "stablesocial-dev--tempo--usd-tempo--" + SHARED_PAY_TO,
          serviceId: "merit-systems/stablesocial/social-data",
          name: "StableSocial",
          serviceName: "StableSocial",
          network: "tempo",
          asset: "USD (Tempo)",
          payTo: SHARED_PAY_TO,
          catalogSource: "pay_sh_curated",
          transactionCount: 5,
          uniqueSenderCount: 2,
          totalVolumeAtomic: "12345",
          hasCustomerFacts: true,
          customerFactCount: 2,
          endpointCount: 1,
          resourceCount: 1,
          attributionConfidence: 0.35,
        },
      ]);

      // MPP registry capture for the same on-chain payment target
      const mpp = makePrimary([
        {
          ...makeRow("mpp-stablesocial"),
          providerId: "mpp:stablesocial::tempo:4217::USDC::" + SHARED_PAY_TO,
          serviceId: "stablesocial",
          name: "Merit Systems",
          serviceName: "StableSocial",
          network: "tempo:4217",
          asset: "USDC",
          payTo: SHARED_PAY_TO,
          catalogSource: "mpp_registry",
          transactionCount: 0,
          uniqueSenderCount: 0,
          totalVolumeAtomic: "0",
          hasCustomerFacts: false,
          customerFactCount: 0,
          endpointCount: 12,
          resourceCount: 8,
          attributionConfidence: 1,
          description: "Authentic social signals via Tempo MPP gateway.",
          serviceUrl: "https://stablesocial.dev",
          category: "ai",
          protocol: "MPP",
          assetSymbol: "USDC",
        },
      ]);

      const merged = mergeProviderCatalogs(primary, mpp);
      // No new providers — the MPP row is folded into the existing Pay.sh row.
      expect(merged.providerCount).toBe(1);
      const row = merged.providers[0]!;

      // Pay.sh identity (display name + serviceId + ID) is preserved.
      expect(row.providerId).toBe(primary.providers[0]!.providerId);
      expect(row.name).toBe("StableSocial");
      expect(row.serviceId).toBe("merit-systems/stablesocial/social-data");
      expect(row.network).toBe("tempo");
      expect(row.catalogSource).toBe("pay_sh_curated");

      // On-chain measurements from Pay.sh are preserved (more authoritative).
      expect(row.transactionCount).toBe(5);
      expect(row.totalVolumeAtomic).toBe("12345");
      expect(row.hasCustomerFacts).toBe(true);
      expect(row.attributionConfidence).toBe(0.35);

      // MPP-only metadata is merged in.
      expect(row.description).toBe("Authentic social signals via Tempo MPP gateway.");
      expect(row.serviceUrl).toBe("https://stablesocial.dev");
      expect(row.category).toBe("ai");
      expect(row.protocol).toBe("MPP");
      expect(row.assetSymbol).toBe("USDC");

      // MPP gives a richer endpoint/resource count, override.
      expect(row.endpointCount).toBe(12);
      expect(row.resourceCount).toBe(8);
    });

    test("treats `tempo` ≡ `tempo:4217` and `USD (Tempo)` ≡ `USDC` as the same payment identity", () => {
      const primary = makePrimary([
        {
          ...makeRow("p"),
          providerId: "p--tempo",
          network: "tempo",
          asset: "USD (Tempo)",
          payTo: "0xaaaa11111111111111111111111111111111aaaa",
          catalogSource: "pay_sh_curated",
        },
      ]);
      const mpp = makePrimary([
        {
          ...makeRow("m"),
          providerId: "m--tempo-4217",
          network: "tempo:4217",
          asset: "USDC",
          payTo: "0xaaaa11111111111111111111111111111111aaaa",
          catalogSource: "mpp_registry",
          description: "from MPP",
        },
      ]);
      const merged = mergeProviderCatalogs(primary, mpp);
      expect(merged.providerCount).toBe(1);
      expect(merged.providers[0]!.description).toBe("from MPP");
      expect(merged.providers[0]!.providerId).toBe("p--tempo");
    });

    test("MPP enrich: mppDescription is merged into the primary row (separate from Pay.sh description)", () => {
      const primary = makePrimary([
        {
          ...makeRow("p"),
          providerId: "p",
          network: "tempo",
          asset: "USD (Tempo)",
          payTo: "0xddee33333333333333333333333333333333ddee",
          // Pay.sh side has its own description, which must NOT be overwritten.
          description: "Pay.sh atlas description",
        },
      ]);
      const mpp = makePrimary([
        {
          ...makeRow("m"),
          providerId: "m",
          network: "tempo:4217",
          asset: "USDC",
          payTo: "0xddee33333333333333333333333333333333ddee",
          catalogSource: "mpp_registry",
          // MPP side has both description (= same as mppDescription in MPP rows)
          description: "MPP registry blurb",
          mppDescription: "MPP registry blurb",
        },
      ]);
      const merged = mergeProviderCatalogs(primary, mpp);
      expect(merged.providerCount).toBe(1);
      const row = merged.providers[0]!;
      // Pay.sh description preserved.
      expect(row.description).toBe("Pay.sh atlas description");
      // MPP description carried through to the dedicated field.
      expect(row.mppDescription).toBe("MPP registry blurb");
    });

    test("does not touch MPP fields the Pay.sh row already provides (Pay.sh wins for shared keys)", () => {
      const primary = makePrimary([
        {
          ...makeRow("p"),
          providerId: "p",
          network: "tempo",
          asset: "USD (Tempo)",
          payTo: "0xbbbb22222222222222222222222222222222bbbb",
          description: "Pay.sh description",
          category: "data",
        },
      ]);
      const mpp = makePrimary([
        {
          ...makeRow("m"),
          providerId: "m",
          network: "tempo:4217",
          asset: "USDC",
          payTo: "0xbbbb22222222222222222222222222222222bbbb",
          catalogSource: "mpp_registry",
          description: "MPP description",
          category: "ai",
          serviceUrl: "https://example.test",
        },
      ]);
      const merged = mergeProviderCatalogs(primary, mpp);
      expect(merged.providerCount).toBe(1);
      const row = merged.providers[0]!;
      expect(row.description).toBe("Pay.sh description");
      expect(row.category).toBe("data");
      // serviceUrl was missing on Pay.sh side, gets enriched
      expect(row.serviceUrl).toBe("https://example.test");
    });
  });
});
