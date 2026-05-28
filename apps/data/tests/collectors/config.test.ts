import { describe, expect, test } from "bun:test";
import {
  collectorCredentialTemplate,
  collectorServiceDefinitions,
  loadCollectorCredentials,
  RPC_FAST_SOLANA_RPC_URL,
  supportedCollectorServiceIds,
} from "../../src/collectors/config.js";

describe("collector config", () => {
  test("lists phase1 collector services in a stable order", () => {
    expect(supportedCollectorServiceIds).toEqual([
      "alchemy",
      "tempo-rpc",
      "rpc-fast",
      "dune-sim",
      "goldrush",
      "coingecko",
      "nansen",
    ]);
  });

  test("declares credential requirements for each service", () => {
    expect(collectorServiceDefinitions.alchemy.requiredEnv).toEqual(["ALCHEMY_API_KEY"]);
    expect(collectorServiceDefinitions["tempo-rpc"].requiredEnv).toEqual([]);
    expect(collectorServiceDefinitions["tempo-rpc"].supportedChains).toEqual(["tempo"]);
    expect(RPC_FAST_SOLANA_RPC_URL).toBe("https://solana-rpc.rpcfast.com/");
    expect(collectorServiceDefinitions["rpc-fast"].requiredEnv).toEqual(["RPC_FAST_API_KEY"]);
    expect(collectorServiceDefinitions["rpc-fast"].supportedChains).toEqual(["solana"]);
    expect(collectorServiceDefinitions["dune-sim"].requiredEnv).toEqual(["DUNE_SIM_API_KEY"]);
    expect(collectorServiceDefinitions.goldrush.requiredEnv).toEqual(["GOLDRUSH_API_KEY"]);
    expect(collectorServiceDefinitions.coingecko.requiredEnv).toEqual(["COINGECKO_API_KEY"]);
    expect(collectorServiceDefinitions.nansen.requiredEnv).toEqual(["NANSEN_API_KEY"]);
  });

  test("loads present credentials without reading process.env directly", () => {
    const credentials = loadCollectorCredentials({
      ALCHEMY_API_KEY: "alchemy-key",
      DUNE_SIM_API_KEY: "dune-key",
    });

    expect(credentials.alchemy.available).toBe(true);
    expect(credentials.alchemy.values.ALCHEMY_API_KEY).toBe("alchemy-key");
    expect(credentials["dune-sim"].available).toBe(true);
    expect(credentials.goldrush.available).toBe(false);
    expect(credentials.goldrush.missing).toEqual(["GOLDRUSH_API_KEY"]);
  });

  test("renders a tmp-safe env template", () => {
    expect(collectorCredentialTemplate()).toContain("# tmp/collector-evaluation/.env");
    expect(collectorCredentialTemplate()).toContain("ALCHEMY_API_KEY=");
    expect(collectorCredentialTemplate()).toContain("DUNE_SIM_API_KEY=");
    expect(collectorCredentialTemplate()).toContain("GOLDRUSH_API_KEY=");
    expect(collectorCredentialTemplate()).toContain("COINGECKO_API_KEY=");
    expect(collectorCredentialTemplate()).toContain("NANSEN_API_KEY=");
  });
});
