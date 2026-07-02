import { describe, expect, test } from "bun:test";
import { DASHBOARD_REVALIDATE_SECONDS, DISCOVERY_REVALIDATE_SECONDS } from "./cache-policy";

describe("frontend cache policy", () => {
  test("keeps dashboard BFF snapshots cached for one hour", () => {
    expect(DASHBOARD_REVALIDATE_SECONDS).toBe(60 * 60);
  });

  test("keeps x402 discovery cached to two refreshes per day", () => {
    expect(DISCOVERY_REVALIDATE_SECONDS).toBe(12 * 60 * 60);
  });
});
