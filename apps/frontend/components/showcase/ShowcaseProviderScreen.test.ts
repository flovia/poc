import { describe, expect, test } from "bun:test";
import { parsePaymentReceiptHeader, tempoReceiptExplorerUrl } from "./ShowcaseProviderScreen";

const encodeReceipt = (receipt: unknown) =>
  btoa(JSON.stringify(receipt)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("parsePaymentReceiptHeader", () => {
  test("decodes MPPX payment receipt headers", () => {
    const receipt = {
      method: "tempo",
      reference: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      status: "success",
      timestamp: "2026-05-07T00:00:00.000Z",
    };

    expect(parsePaymentReceiptHeader(encodeReceipt(receipt))).toEqual(receipt);
  });

  test("ignores missing or invalid receipt headers", () => {
    expect(parsePaymentReceiptHeader(null)).toBeNull();
    expect(parsePaymentReceiptHeader("not-json")).toBeNull();
  });
});

describe("tempoReceiptExplorerUrl", () => {
  test("links receipt tx hashes to Tempo testnet explorer", () => {
    const txHash = "0xdb82e47e27fa089ba92edd5b6f7a1c9c1fe007820e2ede449c1c1698720d6b05";

    expect(tempoReceiptExplorerUrl(txHash)).toBe(
      `https://explore.testnet.tempo.xyz/receipt/${txHash}`,
    );
  });
});
