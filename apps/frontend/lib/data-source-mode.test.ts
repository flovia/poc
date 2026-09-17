import { describe, expect, test } from "bun:test";
import {
  bffProxyDestination,
  isFixtureDataSource,
  resolveFrontendDataSource,
  shouldProxyBff,
} from "./data-source-mode";

describe("resolveFrontendDataSource", () => {
  test("defaults to fixture even when BFF_URL is set", () => {
    expect(resolveFrontendDataSource({})).toBe("fixture");
    expect(resolveFrontendDataSource({ BFF_URL: "http://localhost:3001" })).toBe("fixture");
    expect(resolveFrontendDataSource({ BFF_URL: "https://api.flovia402.com/main" })).toBe(
      "fixture",
    );
    expect(resolveFrontendDataSource({ NEXT_PUBLIC_BFF_URL: "/api" })).toBe("fixture");
  });

  test("uses BFF only when the data source is set to bff", () => {
    expect(
      resolveFrontendDataSource({
        NEXT_PUBLIC_FLOVIA_DATA_SOURCE: "bff",
        BFF_URL: "https://api.flovia402.com/main",
      }),
    ).toBe("bff");
    expect(resolveFrontendDataSource({ FLOVIA_FRONTEND_DATA_SOURCE: "bff" })).toBe("bff");
    expect(
      resolveFrontendDataSource({
        NEXT_PUBLIC_FLOVIA_DATA_SOURCE: "fixture",
        BFF_URL: "https://api.flovia402.com/main",
      }),
    ).toBe("fixture");
  });
});

describe("BFF rewrite helpers", () => {
  test("proxy is off by default and on only for explicit BFF mode", () => {
    expect(shouldProxyBff({})).toBe(false);
    expect(shouldProxyBff({ NEXT_PUBLIC_FLOVIA_DATA_SOURCE: "fixture" })).toBe(false);
    expect(shouldProxyBff({ NEXT_PUBLIC_FLOVIA_DATA_SOURCE: "bff" })).toBe(true);
    expect(isFixtureDataSource({})).toBe(true);
  });

  test("builds the rewrite destination from BFF_URL", () => {
    expect(bffProxyDestination({ BFF_URL: "https://api.example.com/main/" })).toBe(
      "https://api.example.com/main/:path*",
    );
    expect(bffProxyDestination({})).toBe("http://localhost:3001/:path*");
  });
});
