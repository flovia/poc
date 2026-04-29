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

      expect(service.getD14Retention()).toEqual({
        metric: "d14_retention",
        retentionDays: 14,
        cohortBasis: "first_paid_at",
        retainedBasis: "last_paid_at_at_or_after_d14",
        cohortSize: 1,
        retainedCount: 0,
        retentionRate: 0,
        cohorts: [
          {
            cohortDate: "2026-04-27",
            cohortSize: 1,
            retainedCount: 0,
            retentionRate: 0,
          },
        ],
        caveat: expect.stringContaining("wallet-address"),
      });
    } finally {
      close();
    }
  });

  test("lists customer projections from seeded wallet activity", () => {
    const { service, close } = createTestService();

    try {
      const customers = service.listCustomers();

      expect(customers).toHaveLength(1);
      expect(customers[0]).toMatchObject({
        address: "0xpayer",
        label: null,
        observationCount: 2,
        spendAtomic: "3000000",
        providerCount: 2,
        lastSeenAt: 1_777_333_060,
        activityGrowth: 0,
        upsellOpportunity: "medium",
      });
      expect(customers[0]).not.toHaveProperty("user");
      expect(customers[0]).not.toHaveProperty("humanIdentity");
    } finally {
      close();
    }
  });

  test("returns customer profile sections and not found for unknown addresses", () => {
    const { service, close } = createTestService();

    try {
      const profile = service.getCustomerProfile("0xpayer");

      expect(profile?.customer).toEqual(
        expect.objectContaining({
          address: "0xpayer",
          role: "payer_wallet",
          identityBasis: "wallet_address",
          caveat: expect.stringContaining("wallet-address"),
        }),
      );
      expect(profile?.metrics).toMatchObject({
        spendAtomic: "3000000",
        activityGrowth: 0,
        freeTierProgress: 1,
        entryPointRatio: 0.5,
        upsellOpportunity: "medium",
      });
      expect(profile?.providers).toHaveLength(2);
      expect(profile?.providers[0]).toMatchObject({
        providerId: "pay-to:0xrecipient",
        payToWallet: "0xrecipient",
        spendAtomic: "1000000",
        transactionCount: 1,
      });
      expect(profile?.providers[1]).toMatchObject({
        providerId: "provider-other",
        name: "Provider Other",
        payToWallet: "0xotherrecipient",
        spendAtomic: "2000000",
        transactionCount: 1,
      });
      expect(profile?.timeline.map((event) => event.timestamp)).toEqual([
        1_777_333_000, 1_777_333_060, 1_777_333_060,
      ]);
      expect(profile?.timeline[0]).toEqual(
        expect.objectContaining({
          date: "2026-04-27T23:36:40.000Z",
          type: "payment",
          title: expect.stringContaining("Payment"),
          description: expect.any(String),
        }),
      );
      expect(profile?.insights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: "Wallet-address customer projection" }),
          expect.objectContaining({ title: "Multi-provider usage" }),
          expect.objectContaining({ title: "Free-tier threshold nearby" }),
        ]),
      );

      expect(service.getCustomerProfile("0xmissing")).toBeNull();
    } finally {
      close();
    }
  });
});
