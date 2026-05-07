import { describe, expect, test } from "bun:test";
import { findProviderByRouteId } from "./providers";

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
    expect(() =>
      findProviderByRouteId([coingeckoProvider], "%E0%A4%A"),
    ).not.toThrow();
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
});
