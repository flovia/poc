import { beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  validateBitqueryAggregate,
  validateCdpResource,
  validateMarketSnapshot,
} from "../src/index";

const readFixture = <T>(name: string): T => {
  const fixtureRoot = path.resolve(import.meta.dir, "fixtures");
  const raw = fs.readFileSync(path.join(fixtureRoot, name), "utf8");
  return JSON.parse(raw) as T;
};

describe("contracts schema validation", () => {
  test("accepts a valid normalized CDP resource", () => {
    const fixture = readFixture<unknown>("cdp-resource-valid.json");
    const parsed = validateCdpResource(fixture);
    expect(parsed.resourceId).toBe("resource-1");
    expect(parsed.paymentOptions).toHaveLength(2);
    expect(parsed.paymentOptions[0]?.quality?.expectedTransactionCount).toBe(12);
  });

  test("accepts a valid bitquery aggregate and rejects malformed data", () => {
    expect(
      validateBitqueryAggregate({
        network: "base",
        asset: "USDC",
        payTo: "0x1111111111111111111111111111111111111111",
        transactionCount: 2,
        uniqueSenderCount: 1,
        totalVolumeAtomic: "9001",
        provenance: {
          sourceKind: "bitquery",
          sourceName: "bitquery-graphql",
        },
      }),
    ).toMatchObject({
      transactionCount: 2,
      totalVolumeAtomic: "9001",
    });

    expect(() =>
      validateBitqueryAggregate({
        network: "base",
        asset: "USDC",
        payTo: "0x1111111111111111111111111111111111111111",
        transactionCount: -1,
        uniqueSenderCount: 1,
        totalVolumeAtomic: "9001",
        provenance: {
          sourceKind: "bitquery",
          sourceName: "bitquery-graphql",
        },
      }),
    ).toThrow();
  });

  test("rejects invalid CDP resource fixture", () => {
    const fixture = readFixture<unknown>("cdp-resource-invalid.json");
    expect(() => validateCdpResource(fixture)).toThrow();
  });

  test("validates a market snapshot fixture and rejects invalid snapshot", () => {
    const valid = readFixture<unknown>("market-snapshot-valid.json");
    const invalid = readFixture<unknown>("market-snapshot-invalid.json");

    expect(() => validateMarketSnapshot(valid)).not.toThrow();
    expect(() => validateMarketSnapshot(invalid)).toThrow();
  });
});
