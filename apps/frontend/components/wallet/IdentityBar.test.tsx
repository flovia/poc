import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { IdentityBar } from "./IdentityBar";

const metrics = {
  spendAtomic: "10005000",
  activityGrowth: 0,
  freeTierProgress: 0.3,
  entryPointRatio: 1,
  upsellOpportunity: "high" as const,
};

describe("IdentityBar", () => {
  test("links Solana wallets to Solscan", () => {
    const address = "581z5u78NkRjKxfGfq5pca7EMFzUeQLLkC4rg22sYNkx";
    const html = renderToStaticMarkup(
      <IdentityBar
        customer={{
          address,
          label: "Wallet 581z5u",
          network: "solana-mainnet",
          role: "payer_wallet",
          identityBasis: "wallet_address",
          caveat: "Payer wallet identity is inferred from demo data.",
        }}
        metrics={metrics}
        dataMode="onChainOnly"
        sdkExtras={null}
      />,
    );

    expect(html).toContain("Open wallet on Solscan");
    expect(html).toContain(`https://solscan.io/account/${address}`);
    expect(html).not.toContain("BaseScan");
  });

  test("shows payment activity next to total spend", () => {
    const html = renderToStaticMarkup(
      <IdentityBar
        customer={{
          address: "0x1111111111111111111111111111111111111111",
          label: "Wallet 0x1111",
          role: "payer_wallet",
          identityBasis: "wallet_address",
          caveat: "Payer wallet identity is inferred from demo data.",
        }}
        metrics={metrics}
        activity={{ paymentCount: 4285, providerCount: 1 }}
        dataMode="onChainOnly"
        sdkExtras={null}
      />,
    );

    expect(html).toContain("10.005 USDC");
    expect(html).toContain("4,285 payments");
    expect(html).toContain("1 provider · High activity");
  });
});
