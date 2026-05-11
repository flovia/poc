import { describe, expect, test } from "bun:test";
import { convertPostPay402ToFailure } from "../src/showcase/solana-mpp-paid";

describe("convertPostPay402ToFailure", () => {
  const payer = "D7h99aCY5U8LVy6uVxf5JUkuVK1YWdQumMKxyNMKk5sH";

  test("wraps an upstream 402 with a verification-failed body into a 502 payment failure", async () => {
    const upstreamBody = JSON.stringify({
      type: "https://paymentauth.org/problems/verification-failed",
      title: "Verification Failed",
      status: 402,
      detail: "Payment verification failed.",
      challengeId: "test-challenge",
    });
    const upstream = new Response(upstreamBody, {
      status: 402,
      headers: { "content-type": "application/problem+json" },
    });

    const wrapped = await convertPostPay402ToFailure(upstream, payer);
    expect(wrapped.status).toBe(502);

    const body = (await wrapped.json()) as {
      error: string;
      message: string;
      payer: string;
      hint: string;
      paidApi: { endpoint: string; payEndpoint: string };
      upstream: { status: number; body: unknown };
    };

    expect(body.error).toBe("solana_mpp_payment_failed");
    expect(body.payer).toBe(payer);
    expect(body.message).toContain("devnet");
    expect(body.message).toContain("verified");
    expect(body.hint).toContain("faucet.solana.com");
    expect(body.hint).toContain("faucet.circle.com");
    expect(body.paidApi.endpoint).toBe("/showcase/solana-mpp/paid");
    expect(body.paidApi.payEndpoint).toBe("/showcase/solana-mpp/pay");
    expect(body.upstream.status).toBe(402);
    expect(body.upstream.body).toEqual({
      type: "https://paymentauth.org/problems/verification-failed",
      title: "Verification Failed",
      status: 402,
      detail: "Payment verification failed.",
      challengeId: "test-challenge",
    });
  });

  test("preserves the upstream body as raw text when it is not JSON", async () => {
    const upstream = new Response("not-json-payload", { status: 402 });

    const wrapped = await convertPostPay402ToFailure(upstream, payer);
    expect(wrapped.status).toBe(502);

    const body = (await wrapped.json()) as { upstream: { status: number; body: unknown } };
    expect(body.upstream.status).toBe(402);
    expect(body.upstream.body).toBe("not-json-payload");
  });
});
