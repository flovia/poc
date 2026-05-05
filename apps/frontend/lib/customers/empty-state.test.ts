import { describe, expect, test } from "bun:test";
import { buildNoCustomerFactsNotice } from "./empty-state";

describe("customer empty state", () => {
  test("explains catalog-only payment targets with no live customer facts", () => {
    const notice = buildNoCustomerFactsNotice(
      {
        serviceId: "merit-systems/stablecrypto/market-data",
        network: "tempo",
        asset: "USD (Tempo)",
        payTo: "0x124F620b4F3b53559Cd9148c9b1B2773ca104478",
        catalogSource: "pay_sh_curated",
        hasCustomerFacts: false,
      },
      0,
    );

    expect(notice?.title).toContain("No live customer facts");
    expect(notice?.body).toContain("Pay.sh catalog");
    expect(notice?.details).toEqual(
      expect.arrayContaining([
        "Service: merit-systems/stablecrypto/market-data",
        "Target: tempo / USD (Tempo)",
        "payTo: 0x124F620b4F3b53559Cd9148c9b1B2773ca104478",
      ]),
    );
  });

  test("does not show a no-facts notice when customers exist", () => {
    expect(
      buildNoCustomerFactsNotice(
        {
          network: "base",
          asset: "USDC",
          payTo: "0xabc",
          catalogSource: "pay_sh_curated",
          hasCustomerFacts: true,
        },
        1,
      ),
    ).toBeNull();
  });
});
