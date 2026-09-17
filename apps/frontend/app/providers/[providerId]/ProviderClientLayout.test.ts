import { describe, expect, test } from "bun:test";
import { shouldShowProviderLayoutSkeleton } from "./provider-layout-state";

describe("ProviderClientLayout", () => {
  test("does not hide page content while provider catalog hydration is pending", async () => {
    expect(
      shouldShowProviderLayoutSkeleton({
        hydrated: false,
        dataMode: "onChainOnly",
        storedCount: 0,
      }),
    ).toBe(false);
  });

  test("hides page content only after hydration confirms on-chain setup is empty", async () => {
    expect(
      shouldShowProviderLayoutSkeleton({
        hydrated: true,
        dataMode: "onChainOnly",
        storedCount: 0,
      }),
    ).toBe(true);
  });
});
