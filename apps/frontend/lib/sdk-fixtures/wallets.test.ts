import { describe, expect, test } from "bun:test";
import {
  chainKindFromNetwork,
  isSyntheticEvmAddress,
  isSyntheticSolanaAddress,
  syntheticAddress,
} from "./wallets";

const KNOWN_PUBLIC_WALLETS = [
  "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
  "0x93053f1e7a5efeda532fe69cbbe43cbec3a0f13f",
  "0x6e3184c204e596ded89e8a5693b602097f4ab687",
  "Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP",
  "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
];

describe("syntheticAddress", () => {
  test("is deterministic for the same seed", () => {
    expect(syntheticAddress("catalog:agentmail/email", "evm")).toBe(
      syntheticAddress("catalog:agentmail/email", "evm"),
    );
  });

  test("emits valid-looking EVM and Solana addresses", () => {
    expect(isSyntheticEvmAddress(syntheticAddress("payer:protagonist", "evm"))).toBe(true);
    expect(isSyntheticSolanaAddress(syntheticAddress("catalog:quicknode/rpc", "solana"))).toBe(
      true,
    );
  });

  test("does not reproduce known public payTo wallets", () => {
    const generated = [
      syntheticAddress("catalog:pro-api.coingecko.com", "evm"),
      syntheticAddress("catalog:api.nansen.ai", "evm"),
      syntheticAddress("catalog:agentmail/email", "evm"),
      syntheticAddress("catalog:solana-foundation/alibaba/ocr", "solana"),
      syntheticAddress("catalog:paysponge/perplexity", "solana"),
    ].map((value) => value.toLowerCase());

    for (const known of KNOWN_PUBLIC_WALLETS) {
      expect(generated).not.toContain(known.toLowerCase());
    }
  });

  test("maps solana networks to the solana address alphabet", () => {
    expect(chainKindFromNetwork("solana-devnet")).toBe("solana");
    expect(chainKindFromNetwork("base")).toBe("evm");
    expect(chainKindFromNetwork("tempo")).toBe("evm");
  });
});
