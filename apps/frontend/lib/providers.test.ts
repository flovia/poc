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
});
