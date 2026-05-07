import { describe, expect, test } from "bun:test";
import {
  extractLiveResultFacts,
  parsePaymentReceiptHeader,
  tempoReceiptExplorerUrl,
} from "./ShowcaseProviderScreen";

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

describe("demo fallback facts", () => {
  test("extracts Stripe cheat-code facts", () => {
    const txHash = "0xdb82e47e27fa089ba92edd5b6f7a1c9c1fe007820e2ede449c1c1698720d6b05";

    expect(
      extractLiveResultFacts({
        status: 200,
        body: {
          receipt: { reference: txHash },
          floviaEvent: {
            requestId: "req_demo_stripe_mpp",
            rail: "mpp",
            amount: "1.00",
            currency: "usd",
            status: "paid_api_delivered",
            payment: { paymentIntentId: "pi_demo_stripe_mpp_001" },
            apiUsage: { endpoint: "/showcase/stripe-mpp/paid", method: "GET", responseStatus: 200, latencyMs: 47 },
          },
        },
      }),
    ).toMatchObject({
      paymentId: "pi_demo_stripe_mpp_001",
      txHash,
      requestId: "req_demo_stripe_mpp",
      latencyMs: "47",
    });
  });
});

describe("extractLiveResultFacts", () => {
  test("extracts joined PaymentIntent and receipt tx hash", () => {
    const txHash = "0xdb82e47e27fa089ba92edd5b6f7a1c9c1fe007820e2ede449c1c1698720d6b05";

    expect(
      extractLiveResultFacts({
        status: 200,
        body: {
          floviaEvent: {
            requestId: "req_live_123",
            rail: "mpp",
            amount: "1.00",
            currency: "usd",
            status: "paid_api_delivered",
            payment: { paymentIntentId: "pi_live_123" },
            apiUsage: {
              endpoint: "/showcase/stripe-mpp/paid",
              method: "GET",
              responseStatus: 200,
              latencyMs: 42,
            },
          },
          receipt: { reference: txHash },
        },
      }),
    ).toEqual({
      paymentId: "pi_live_123",
      txHash,
      receiptId: null,
      requestId: "req_live_123",
      status: "paid_api_delivered",
      rail: "mpp",
      amount: "1.00",
      currency: "usd",
      endpoint: "/showcase/stripe-mpp/paid",
      method: "GET",
      responseStatus: "200",
      latencyMs: "42",
    });
  });

  test("treats HitPay receipt references as receipt ids, not Tempo tx hashes", () => {
    expect(
      extractLiveResultFacts(
        {
          status: 200,
          body: {
            response: { foo: "bar" },
            receipt: {
              reference: "hp_receipt_123",
              chargeId: "hp_charge_123",
            },
            floviaEvent: {
              requestId: "req_hitpay_123",
              provider: "hitpay",
              rail: "mpp",
              amount: "1.00",
              currency: "sgd",
              status: "paid_api_delivered",
              apiUsage: {
                endpoint: "/showcase/hitpay-mpp/paid",
                method: "GET",
                responseStatus: 200,
                latencyMs: 65,
              },
            },
          },
        },
        "hitpay",
      ),
    ).toMatchObject({
      paymentId: "hp_charge_123",
      receiptId: "hp_receipt_123",
      txHash: null,
      requestId: "req_hitpay_123",
      latencyMs: "65",
    });
  });
});
