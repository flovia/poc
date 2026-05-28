import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityTimeline } from "./ActivityTimeline";

describe("ActivityTimeline", () => {
  test("labels live provider paths as endpoint candidates", () => {
    const html = renderToStaticMarkup(
      <ActivityTimeline
        timeline={[
          {
            date: "2026-03-17T20:11:56.000Z",
            timestamp: Date.parse("2026-03-17T20:11:56.000Z"),
            type: "payment",
            title: "payment",
            description: "Payment to quicknode/rpc",
            amountAtomic: "10000000",
            providerId: "quicknode-rpc--solana-mainnet--usdc--payto",
          },
        ]}
        providers={[
          {
            providerId: "quicknode-rpc--solana-mainnet--usdc--payto",
            name: "quicknode/rpc",
            payToWallet: "2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57",
            spendAtomic: "10000000",
            transactionCount: 1,
            firstSeenAt: Date.parse("2026-03-17T20:11:56.000Z"),
            lastSeenAt: Date.parse("2026-03-17T20:11:56.000Z"),
            apiPaths: ["/solana-mainnet"],
          },
        ]}
        payToByProviderId={new Map([["quicknode-rpc--solana-mainnet--usdc--payto", "2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57"]])}
        apiPathsByProviderId={new Map([["quicknode-rpc--solana-mainnet--usdc--payto", ["/solana-mainnet"]]])}
        storedProviders={[]}
        dataMode="onChainOnly"
        sdkExtras={null}
      />,
    );

    expect(html).toContain("endpoint candidates");
    expect(html).not.toContain("endpoint: /solana-mainnet");
  });
});
