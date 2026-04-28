import { describe, expect, test } from "bun:test";
import { createTestService } from "./fixtures";

describe("BFF read service", () => {
  test("reads summary and lists from an isolated database context", () => {
    const { service, close } = createTestService();

    try {
      const summary = service.getSummary();

      expect(summary.counts.observations).toBe(2);
      expect(summary.counts.attributionCandidates).toBe(1);
      expect(summary.scopeNote).toContain("payer-wallet intelligence");
      expect(summary.observations[0]?.payerWallet).toBe("0xpayer");
      expect(summary.observations[0]).not.toHaveProperty("user");
      expect(summary.attributionCandidates[0]?.candidateType).toBe("provider_candidate");
      expect(summary.attributionCandidates[0]?.confidence).toBe(70);
      expect(summary.attributionCandidates[0]?.evidenceRefs).toEqual(["observation:2"]);
      expect(summary.walletUsageGraph.providerWallets).toHaveLength(1);

      const observations = service.listObservations();
      const candidates = service.listAttributionCandidates();
      const dailyMetrics = service.listDailyMetrics();
      const payerWallets = service.listPayerWallets();
      const recipientWallets = service.listRecipientWallets();
      const relayerWallets = service.listRelayerWallets();

      expect(observations).toHaveLength(2);
      expect(observations[0]).toEqual(
        expect.objectContaining({
          txHash: "0xtx1",
          payerWallet: "0xpayer",
          recipientWallet: "0xrecipient",
          relayerWallet: "0xrelayer",
        }),
      );
      expect(candidates).toHaveLength(1);
      expect(dailyMetrics).toHaveLength(1);
      expect(payerWallets[0]).toEqual(
        expect.objectContaining({ wallet: "0xpayer", uniqueRelayers: 1, uniqueRecipients: 2 }),
      );
      expect(recipientWallets[0]).toEqual(
        expect.objectContaining({ wallet: "0xrecipient", uniquePayers: 1, uniqueRelayers: 1 }),
      );
      expect(relayerWallets[0]).toEqual(
        expect.objectContaining({ wallet: "0xrelayer", uniquePayers: 1, uniqueRecipients: 2 }),
      );
      expect(service.getWalletUsageGraph().payerWalletLanguage).toBe(true);
    } finally {
      close();
    }
  });
});
