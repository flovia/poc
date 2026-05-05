import { describe, expect, test } from "bun:test";
import {
  readServerDataSourceSetting,
  resolveServerBffBaseUrl,
  resolveServerDataSource,
} from "./data-source-env";

describe("server data source env", () => {
  test("defaults local development to bff", () => {
    expect(resolveServerDataSource({ NODE_ENV: "development" })).toBe("bff");
    expect(resolveServerBffBaseUrl({ NODE_ENV: "development" })).toBe("http://localhost:3001");
  });

  test("defaults deploy-like env without BFF_URL to fixture", () => {
    expect(resolveServerDataSource({ NODE_ENV: "production" })).toBe("fixture");
    expect(resolveServerDataSource({ VERCEL: "1" })).toBe("fixture");
  });

  test("uses bff when BFF_URL is configured", () => {
    expect(
      resolveServerDataSource({ NODE_ENV: "production", BFF_URL: "https://bff.example.com/" }),
    ).toBe("bff");
    expect(
      resolveServerBffBaseUrl({ NODE_ENV: "production", BFF_URL: "https://bff.example.com/" }),
    ).toBe("https://bff.example.com");
  });

  test("honors explicit fixture data source", () => {
    expect(
      resolveServerDataSource({
        NODE_ENV: "development",
        BFF_URL: "http://localhost:3001",
        FRONTEND_DATA_SOURCE: "fixture",
      }),
    ).toBe("fixture");
  });

  test("rejects invalid data source values", () => {
    expect(() => readServerDataSourceSetting({ FRONTEND_DATA_SOURCE: "mock" })).toThrow(
      "Invalid FRONTEND_DATA_SOURCE",
    );
  });

  test("rejects localhost BFF_URL in deploy-like env", () => {
    expect(() =>
      resolveServerBffBaseUrl({ NODE_ENV: "production", BFF_URL: "http://localhost:3001" }),
    ).toThrow("must not point to localhost");
  });

  test("rejects IPv6 localhost BFF_URL in deploy-like env", () => {
    expect(() =>
      resolveServerBffBaseUrl({ NODE_ENV: "production", BFF_URL: "http://[::1]:3001" }),
    ).toThrow("must not point to localhost");
  });

  test("requires BFF_URL when bff is forced in deploy-like env", () => {
    expect(() =>
      resolveServerBffBaseUrl({ NODE_ENV: "production", FRONTEND_DATA_SOURCE: "bff" }),
    ).toThrow("BFF_URL is required");
  });
});
