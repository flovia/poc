import { describe, expect, test } from "bun:test";
import {
  extractLiveResultFacts,
  parsePaymentReceiptHeader,
  solanaTxExplorerUrl,
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

describe("solanaTxExplorerUrl", () => {
  const signature =
    "5JZ4uVQ8t8HVB7n3oWQyN9fEv2L4KcD8zXdF1Nq7aHpRcMv6sEbT3wLh2YjAdF8X9k1Bc4ZsGmH7vUuQrPnY6t";

  test("defaults to Solana devnet cluster when no network is provided", () => {
    expect(solanaTxExplorerUrl(signature)).toBe(
      `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  });

  test("respects an explicit network parameter", () => {
    expect(solanaTxExplorerUrl(signature, "localnet")).toBe(
      `https://explorer.solana.com/tx/${signature}?cluster=localnet`,
    );
  });

  test("omits the cluster query string for mainnet-beta so the canonical explorer URL is used", () => {
    expect(solanaTxExplorerUrl(signature, "mainnet-beta")).toBe(
      `https://explorer.solana.com/tx/${signature}`,
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
            apiUsage: {
              endpoint: "/showcase/stripe-mpp/paid",
              method: "GET",
              responseStatus: 200,
              latencyMs: 47,
            },
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
      txSignature: null,
      receiptId: null,
      requestId: "req_live_123",
      status: "paid_api_delivered",
      rail: "mpp",
      amount: "1.00",
      currency: "usd",
      network: null,
      endpoint: "/showcase/stripe-mpp/paid",
      method: "GET",
      responseStatus: "200",
      latencyMs: "42",
    });
  });

  test("uses the receipt tx signature as the Solana paymentId when no other id is supplied", () => {
    const signature =
      "5JZ4uVQ8t8HVB7n3oWQyN9fEv2L4KcD8zXdF1Nq7aHpRcMv6sEbT3wLh2YjAdF8X9k1Bc4ZsGmH7vUuQrPnY6t";

    expect(
      extractLiveResultFacts(
        {
          status: 200,
          body: {
            receipt: { reference: signature },
            floviaEvent: {
              requestId: "req_solana_123",
              provider: "solana",
              rail: "mpp",
              amount: "0.10",
              currency: "usdc",
              status: "paid_api_delivered",
              payment: { network: "solana-devnet" },
              apiUsage: {
                endpoint: "/showcase/solana-mpp/paid",
                method: "GET",
                responseStatus: 200,
                latencyMs: 53,
              },
            },
          },
        },
        "solana",
      ),
    ).toMatchObject({
      paymentId: signature,
      txSignature: signature,
      txHash: null,
      receiptId: null,
      network: "devnet",
      requestId: "req_solana_123",
      latencyMs: "53",
    });
  });

  test("respects an explicit Solana payment.paymentId over the receipt signature", () => {
    const signature =
      "5JZ4uVQ8t8HVB7n3oWQyN9fEv2L4KcD8zXdF1Nq7aHpRcMv6sEbT3wLh2YjAdF8X9k1Bc4ZsGmH7vUuQrPnY6t";
    const explicitPaymentId = "explicit_payment_id_xyz";

    expect(
      extractLiveResultFacts(
        {
          status: 200,
          body: {
            receipt: { reference: signature },
            floviaEvent: {
              provider: "solana",
              payment: {
                paymentId: explicitPaymentId,
                network: "solana-mainnet-beta",
              },
            },
          },
        },
        "solana",
      ),
    ).toMatchObject({
      paymentId: explicitPaymentId,
      txSignature: signature,
      network: "mainnet-beta",
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
