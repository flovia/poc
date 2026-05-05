import { describe, expect, test } from "bun:test";
import {
  PaymentRecipientAddressSchema,
  validateProviderCatalogResponse,
  validatePhaseBWalletUsageGraphResponse,
} from "contracts";
import { mulberry32, seedFromString } from "../scripts/lib/prng";
import {
  generateEvmAddress,
  generateSolanaAddress,
  generateDummyPayerWallets,
} from "../scripts/lib/dummy-wallets";
import { parsePayskillsAtlas } from "../scripts/lib/atlas-parser";
import { buildPaySkillsFixture } from "../scripts/lib/build-fixture";
import fs from "node:fs";
import path from "node:path";

const ATLAS_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "docs",
  "research",
  "pay-skills-payment-atlas.md",
);
const ATLAS_MD = fs.readFileSync(ATLAS_PATH, "utf8");

describe("mulberry32 prng", () => {
  test("is deterministic for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  test("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  test("seedFromString hashes deterministically", () => {
    expect(seedFromString("hello")).toBe(seedFromString("hello"));
    expect(seedFromString("hello")).not.toBe(seedFromString("world"));
  });
});

describe("dummy wallet generation", () => {
  test("generateEvmAddress produces lowercase 0x[a-f0-9]{40}", () => {
    const rng = mulberry32(7);
    const addr = generateEvmAddress(rng);
    expect(addr).toMatch(/^0x[a-f0-9]{40}$/);
    expect(PaymentRecipientAddressSchema.parse(addr)).toBe(addr);
  });

  test("generateSolanaAddress produces base58 of length 32-44", () => {
    const rng = mulberry32(7);
    const addr = generateSolanaAddress(rng);
    expect(addr).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(PaymentRecipientAddressSchema.parse(addr)).toBe(addr);
  });

  test("generateDummyPayerWallets is deterministic per (seed, count, chainKind)", () => {
    const a = generateDummyPayerWallets({ chainKind: "evm", count: 5, seed: 100 });
    const b = generateDummyPayerWallets({ chainKind: "evm", count: 5, seed: 100 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    a.forEach((addr) => expect(addr).toMatch(/^0x[a-f0-9]{40}$/));
  });

  test("generateDummyPayerWallets emits solana addresses for solana chainKind", () => {
    const wallets = generateDummyPayerWallets({ chainKind: "solana", count: 3, seed: 100 });
    expect(wallets).toHaveLength(3);
    wallets.forEach((addr) => expect(addr).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/));
  });
});

describe("parsePayskillsAtlas", () => {
  const atlas = parsePayskillsAtlas(ATLAS_MD);

  test("parses 53 usable providers (excludes 13 no-challenge providers)", () => {
    expect(atlas.providers).toHaveLength(53);
    for (const p of atlas.providers) {
      expect(p.offers.length).toBeGreaterThan(0);
    }
  });

  test("provider description fields are populated", () => {
    const agentmail = atlas.providers.find((p) => p.fqn === "agentmail/email");
    expect(agentmail).toBeDefined();
    expect(agentmail?.title).toBe("AgentMail");
    expect(agentmail?.category).toBe("messaging");
    expect(agentmail?.serviceUrl).toBe("https://x402.api.agentmail.to");
    expect(agentmail?.description).toContain("dedicated email inboxes");
    expect(agentmail?.useCase).toContain("agents their own email address");
  });

  test("payment offers expose chain/asset/payTo/protocol/probe price", () => {
    const agentmail = atlas.providers.find((p) => p.fqn === "agentmail/email")!;
    const baseOffer = agentmail.offers.find((o) => o.chain === "Base");
    expect(baseOffer).toBeDefined();
    expect(baseOffer?.protocol).toBe("x402");
    expect(baseOffer?.asset).toBe("USDC");
    expect(baseOffer?.payTo).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(baseOffer?.probePriceUsd).toBe(10);
  });

  test("solana mainnet (MPP) offers parse base58 payTo", () => {
    const agentexplorer = atlas.providers.find(
      (p) => p.fqn === "solana-foundation/alibaba/agentexplorer",
    )!;
    const usdcMpp = agentexplorer.offers.find(
      (o) => o.chain === "Solana mainnet (MPP)" && o.asset === "USDC",
    );
    expect(usdcMpp).toBeDefined();
    expect(usdcMpp?.protocol).toBe("MPP");
    expect(usdcMpp?.payTo).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  });
});

describe("buildPaySkillsFixture", () => {
  const baseAnalytics = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "fixtures", "generated", "analytics.json"), "utf8"),
  );

  test("preserves coingecko providerWallet and 43 payerWallets, adds atlas providers", () => {
    const result = buildPaySkillsFixture({
      base: baseAnalytics,
      atlas: parsePayskillsAtlas(ATLAS_MD),
      seed: 12345,
    });

    const coingecko = result.walletUsageGraph.graph.providerWallets.find((p: any) =>
      p.providerName.includes("coingecko"),
    );
    expect(coingecko).toBeDefined();
    expect(coingecko?.payerWallets.length).toBe(43);

    expect(result.walletUsageGraph.graph.providerWallets.length).toBeGreaterThan(50);
  });

  test("output passes contracts validation", () => {
    const result = buildPaySkillsFixture({
      base: baseAnalytics,
      atlas: parsePayskillsAtlas(ATLAS_MD),
      seed: 12345,
    });

    expect(() => validatePhaseBWalletUsageGraphResponse(result.walletUsageGraph)).not.toThrow();
    expect(() => validateProviderCatalogResponse(result.providers)).not.toThrow();
  });

  test("is deterministic for the same seed", () => {
    const a = buildPaySkillsFixture({
      base: baseAnalytics,
      atlas: parsePayskillsAtlas(ATLAS_MD),
      seed: 12345,
    });
    const b = buildPaySkillsFixture({
      base: baseAnalytics,
      atlas: parsePayskillsAtlas(ATLAS_MD),
      seed: 12345,
    });
    expect(a.walletUsageGraph).toEqual(b.walletUsageGraph);
  });
});
