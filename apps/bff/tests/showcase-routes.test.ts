import { afterEach, describe, expect, test } from "bun:test";
import { createBffHandler } from "../src/http";

const request = (path: string, init: RequestInit = {}) => new Request(`http://localhost${path}`, init);
const originalHitPayApiKey = process.env.HITPAY_API_KEY;

describe("showcase paid API routes", () => {
  afterEach(() => {
    if (originalHitPayApiKey === undefined) {
      delete process.env.HITPAY_API_KEY;
      return;
    }
    process.env.HITPAY_API_KEY = originalHitPayApiKey;
  });

  test("returns Stripe MPP challenge before a demo credential is supplied", async () => {
    const response = await createBffHandler(new Promise<never>(() => {}))(
      request("/showcase/stripe-mpp/paid"),
    );
    const body = (await response.json()) as { challenge: { provider: string; challengeId: string }; floviaEvent: { status: string; latencyMs: number } };

    expect(response.status).toBe(402);
    expect(body.challenge.provider).toBe("stripe");
    expect(body.challenge.challengeId).toStartWith("ch_stripe_mpp_");
    expect(body.floviaEvent.status).toBe("payment_challenge_issued");
    expect(body.floviaEvent.latencyMs).toBeGreaterThan(0);
  });

  test("returns Stripe MPP paid response after a demo credential is supplied", async () => {
    const handler = createBffHandler(new Promise<never>(() => {}));
    const challengeResponse = await handler(request("/showcase/stripe-mpp/paid"));
    const challenge = (await challengeResponse.json()) as { challenge: { challengeId: string } };
    const response = await handler(request(`/showcase/stripe-mpp/paid?credential=demo-paid&challengeId=${challenge.challenge.challengeId}`));
    const body = (await response.json()) as { ok: boolean; floviaEvent: { responseStatus: number } };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.floviaEvent.responseStatus).toBe(200);
  });

  test("returns clear HitPay configuration error when credentials are missing", async () => {
    delete process.env.HITPAY_API_KEY;
    const response = await createBffHandler(new Promise<never>(() => {}))(
      request("/showcase/hitpay-mpp/paid"),
    );
    const body = (await response.json()) as { error: string; requiredEnv: string[] };

    expect(response.status).toBe(503);
    expect(body.error).toBe("hitpay_mpp_not_configured");
    expect(body.requiredEnv).toContain("HITPAY_API_KEY");
  });

  test("does not accept demo credentials for real HitPay MPP flow", async () => {
    delete process.env.HITPAY_API_KEY;
    const response = await createBffHandler(new Promise<never>(() => {}))(
      request("/showcase/hitpay-mpp/paid?credential=demo-paid"),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("hitpay_mpp_not_configured");
  });

  test("rejects non-GET showcase requests", async () => {
    const response = await createBffHandler(new Promise<never>(() => {}))(
      request("/showcase/hitpay-mpp/paid", { method: "POST" }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(405);
    expect(body.error).toBe("method_not_allowed");
  });
});
