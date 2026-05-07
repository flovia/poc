import { afterEach, describe, expect, test } from "bun:test";
import { createBffHandler } from "../src/http";

const request = (path: string, init: RequestInit = {}) => new Request(`http://localhost${path}`, init);
const originalHitPayApiKey = process.env.HITPAY_API_KEY;
const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY;
const originalMppxPrivateKey = process.env.MPPX_PRIVATE_KEY;

describe("showcase paid API routes", () => {
  afterEach(() => {
    if (originalHitPayApiKey === undefined) {
      delete process.env.HITPAY_API_KEY;
    } else {
      process.env.HITPAY_API_KEY = originalHitPayApiKey;
    }

    if (originalStripeSecretKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalStripeSecretKey;
    }

    if (originalMppxPrivateKey === undefined) {
      delete process.env.MPPX_PRIVATE_KEY;
    } else {
      process.env.MPPX_PRIVATE_KEY = originalMppxPrivateKey;
    }
  });

  test("returns clear Stripe configuration error when credentials are missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const response = await createBffHandler(new Promise<never>(() => {}))(
      request("/showcase/stripe-mpp/paid"),
    );
    const body = (await response.json()) as { error: string; requiredEnv: string[]; floviaEvent: { status: string; latencyMs: number } };

    expect(response.status).toBe(503);
    expect(body.error).toBe("stripe_mpp_not_configured");
    expect(body.requiredEnv).toContain("STRIPE_SECRET_KEY");
    expect(body.floviaEvent.status).toBe("configuration_required");
    expect(body.floviaEvent.latencyMs).toBeGreaterThan(0);
  });

  test("does not accept demo credentials for real Stripe MPP flow", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const response = await createBffHandler(new Promise<never>(() => {}))(
      request("/showcase/stripe-mpp/paid?credential=demo-paid"),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("stripe_mpp_not_configured");
  });

  test("rejects malformed Stripe MPP credentials before creating PaymentIntents", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_showcase";

    const response = await createBffHandler(new Promise<never>(() => {}))(
      request("/showcase/stripe-mpp/paid", { headers: { authorization: "Payment not-a-credential" } }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_stripe_mpp_credential");
  });

  test("returns clear Stripe pay button error when MPPX private key is missing", async () => {
    delete process.env.MPPX_PRIVATE_KEY;

    const response = await createBffHandler(new Promise<never>(() => {}))(
      request("/showcase/stripe-mpp/pay", {
        method: "POST",
        headers: { "x-flovia-showcase-pay": "stripe-mpp" },
      }),
    );
    const body = (await response.json()) as { error: string; requiredEnv: string[] };

    expect(response.status).toBe(503);
    expect(body.error).toBe("mppx_private_key_not_configured");
    expect(body.requiredEnv).toContain("MPPX_PRIVATE_KEY");
  });

  test("requires explicit Stripe pay button confirmation", async () => {
    const response = await createBffHandler(new Promise<never>(() => {}))(
      request("/showcase/stripe-mpp/pay", { method: "POST" }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("stripe_mpp_pay_confirmation_required");
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
