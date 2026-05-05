import { describe, expect, test } from "bun:test";
import { getGeoSpec } from "./source";

describe("geo spec source", () => {
  test("resolves live provider ids by payTo when fixture provider ids differ", () => {
    const spec = getGeoSpec(
      "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784--base--usdc--0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    );

    expect(spec?.serviceId).toBe("pro-api.coingecko.com");
    expect(spec?.observedEndpoints.length).toBeGreaterThan(0);
  });
});
