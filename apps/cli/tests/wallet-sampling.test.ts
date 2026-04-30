import { describe, expect, test } from "bun:test";
import { buildWalletSamplingPlan, type WalletTransferRow } from "../scripts/analytics/sampling";

const transfer = (
  payerWallet: string,
  serviceId: string,
  amountAtomic: string,
  options: Partial<WalletTransferRow> = {},
): WalletTransferRow => ({
  payerWallet,
  payTo: options.payTo ?? `0x${serviceId.padStart(40, "1").slice(0, 40)}`,
  serviceId,
  amountAtomic,
  blockTimestamp: options.blockTimestamp ?? "2026-01-02T00:00:00.000Z",
  isCoingecko: options.isCoingecko ?? serviceId === "coingecko",
  isBundledPayTo: options.isBundledPayTo ?? false,
});

describe("wallet sampling", () => {
  test("selects deterministic wallet strata and applies portfolio caps", () => {
    const repeat = "0x1111111111111111111111111111111111111111";
    const high = "0x2222222222222222222222222222222222222222";
    const oneShot = "0x3333333333333333333333333333333333333333";
    const peer = "0x4444444444444444444444444444444444444444";
    const cross = "0x5555555555555555555555555555555555555555";
    const bundled = "0x6666666666666666666666666666666666666666";
    const transfers = [
      transfer(repeat, "coingecko", "1000"),
      transfer(repeat, "coingecko", "2000"),
      transfer(high, "coingecko", "1000000"),
      transfer(oneShot, "coingecko", "500"),
      transfer(peer, "peer", "800", { isCoingecko: false }),
      transfer(cross, "coingecko", "700"),
      transfer(cross, "peer", "900", { isCoingecko: false }),
      transfer(bundled, "bundle", "300", { isCoingecko: false, isBundledPayTo: true }),
    ];
    const input = {
      seed: "wallet-seed",
      transfers,
      budget: {
        total: 8,
        coingecko_repeat_user: 1,
        coingecko_high_spender: 1,
        one_shot_user: 1,
        peer_service_user: 1,
        cross_service_user: 1,
        bundled_payto_user: 1,
        recent_user: 1,
        random_long_tail_user: 1,
      },
      caps: { total: 8, portfolioEnrichment: 2 },
      portfolioPolicy: "capped" as const,
    };

    const first = buildWalletSamplingPlan(input);
    const second = buildWalletSamplingPlan(input);

    expect(second.selected).toEqual(first.selected);
    expect(first.selected.find((row) => row.address === repeat)?.strata).toContain(
      "coingecko_repeat_user",
    );
    expect(first.selected.find((row) => row.address === high)?.strata).toContain(
      "coingecko_high_spender",
    );
    expect(first.selected.some((row) => row.strata.includes("one_shot_user"))).toBe(true);
    expect(first.selected.some((row) => row.strata.includes("peer_service_user"))).toBe(true);
    expect(first.selected.some((row) => row.strata.includes("cross_service_user"))).toBe(true);
    expect(first.selected.some((row) => row.strata.includes("bundled_payto_user"))).toBe(true);
    expect(first.selected.filter((row) => row.portfolioEnrichment === "included")).toHaveLength(2);
    expect(first.selected.some((row) => row.portfolioEnrichment === "skipped")).toBe(true);
  });

  test("continues past already selected wallets when filling overlapping budgets", () => {
    const wallets = [
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333",
    ];
    const plan = buildWalletSamplingPlan({
      seed: "overlap-seed",
      transfers: wallets.map((address) => transfer(address, "coingecko", "1000")),
      budget: {
        total: 3,
        one_shot_user: 2,
        recent_user: 2,
        random_long_tail_user: 2,
      },
      caps: { total: 3 },
    });

    expect(plan.selected).toHaveLength(3);
  });
});
