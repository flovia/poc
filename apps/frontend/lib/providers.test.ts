import { describe, expect, test } from "bun:test";
import { providerRouteId, walletProfileHref } from "./provider-routes";
import { aggregateProviderRouteId, findProviderByRouteId } from "./providers";

const coingeckoProvider = {
  providerId: "pro-api-coingecko-com--base--usdc--0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
  name: "pro-api.coingecko.com",
  serviceId: "pro-api.coingecko.com",
  serviceName: "pro-api.coingecko.com",
  payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
};

describe("provider route aliases", () => {
  test("resolves canonical and legacy CoinGecko provider ids to the same provider", () => {
    const providers = [coingeckoProvider];

    for (const routeId of [
      "pro-api-coingecko-com--base--usdc--0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      "pro-api.coingecko.com--0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      "coingecko--0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    ]) {
      expect(findProviderByRouteId(providers, routeId)?.payTo).toBe(
        "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      );
    }
  });

  test("resolves percent-encoded providerId from Next.js dynamic route params", () => {
    // MPP providerId contains `:` which Next.js URL-encodes (`%3A`) before
    // passing to params. The lookup must succeed regardless of encoding.
    const mppProvider = {
      providerId: "mpp:agentmail::tempo:4217::USDC::0x6e3184c204e596ded89e8a5693b602097f4ab687",
      name: "AgentMail",
      serviceId: "agentmail",
      payTo: "0x6e3184c204e596ded89e8a5693b602097f4ab687",
    };
    const providers = [mppProvider];

    // Raw form (Next.js fast-path or direct call)
    expect(findProviderByRouteId(providers, mppProvider.providerId)?.serviceId).toBe("agentmail");

    // Percent-encoded form (what Next.js 16 actually delivers via params)
    const encoded = encodeURIComponent(mppProvider.providerId);
    expect(findProviderByRouteId(providers, encoded)?.serviceId).toBe("agentmail");
  });

  test("invalid percent-encoded sequence does not throw", () => {
    expect(() => findProviderByRouteId([coingeckoProvider], "%E0%A4%A")).not.toThrow();
  });

  test("resolves a `static-${slug(serviceId)}` route id to the matching live row", () => {
    // The live BFF row's providerId is a long deterministic id, but older
    // links (and the static-only path) use `static-${slug(serviceId)}`. Both
    // should resolve to the same provider so the page does not 404.
    const liveRow = {
      providerId:
        "goodstech-alibaba-gateway-402-com--solana--usdc--cs2zdfunonrdrgsizuqqldtxzxvvjzmgix2mplykueqp",
      name: "Alibaba Cloud Goods Tech",
      serviceId: "solana-foundation/alibaba/goodstech",
      serviceName: "Alibaba Cloud Goods Tech",
      payTo: "Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP",
    };
    expect(
      findProviderByRouteId([liveRow], "static-solana-foundation-alibaba-goodstech")?.providerId,
    ).toBe(liveRow.providerId);
  });

  test("resolves short aggregate provider route ids", () => {
    const providers = [
      { providerId: "quicknode-row", name: "QuickNode", serviceId: "quicknode/rpc" },
      { providerId: "nansen-row", name: "Nansen", serviceId: "api.nansen.ai" },
      { providerId: "coingecko-row", name: "CoinGecko", serviceId: "pro-api.coingecko.com" },
      { providerId: "agentmail-row", name: "AgentMail", serviceId: "agentmail/email" },
      { providerId: "rentcast-row", name: "RentCast", serviceId: "paysponge/rentcast" },
    ];

    expect(findProviderByRouteId(providers, "quicknode")?.providerId).toBe("quicknode-row");
    expect(findProviderByRouteId(providers, "nansen")?.providerId).toBe("nansen-row");
    expect(findProviderByRouteId(providers, "coingecko")?.providerId).toBe("coingecko-row");
    expect(findProviderByRouteId(providers, "agentmail")?.providerId).toBe("agentmail-row");
    expect(findProviderByRouteId(providers, "paysponge-rentcast")?.providerId).toBe("rentcast-row");
    expect(findProviderByRouteId(providers, "rentcast")?.providerId).toBe("rentcast-row");
  });

  test("builds concise aggregate route ids", () => {
    expect(aggregateProviderRouteId("quicknode/rpc")).toBe("quicknode");
    expect(aggregateProviderRouteId("api.nansen.ai")).toBe("nansen");
    expect(aggregateProviderRouteId("pro-api.coingecko.com")).toBe("coingecko");
    expect(aggregateProviderRouteId("agentmail/email")).toBe("agentmail");
    expect(aggregateProviderRouteId("paysponge/rentcast")).toBe("paysponge-rentcast");
  });

  test("builds short wallet profile hrefs from provider aliases", () => {
    const routeId = providerRouteId({
      providerId: "quicknode-rpc--base--usdc--0xf46394addda95a3d5bcc1124605e3d15d204623c",
      serviceId: "quicknode/rpc",
    });

    expect(routeId).toBe("quicknode");
    expect(walletProfileHref(routeId, "581z5u78NkRjKxfGfq5pca7EMFzUeQLLkC4rg22sYNkx")).toBe(
      "/quicknode/wallet/581z5u78NkRjKxfGfq5pca7EMFzUeQLLkC4rg22sYNkx",
    );
  });
});
