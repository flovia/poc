import { createMpp } from "@hit-pay/mpp";
import { flovia, json } from "./flovia-track-paid-api";

const endpoint = "/showcase/hitpay-mpp/paid";
const provider = "hitpay" as const;
const rail = "mpp" as const;
const amount = "1.00";
const currency = "sgd";

type HitPayMpp = ReturnType<typeof createMpp>;

let cachedMpp: HitPayMpp | null = null;
let cachedProtectedPaid: ((request: Request, ctx: unknown) => Promise<Response> | Response) | null = null;

const resolveHitPayMpp = () => {
  if (!process.env.HITPAY_API_KEY) return null;
  if (cachedMpp && cachedProtectedPaid) {
    return { mpp: cachedMpp, protectedPaid: cachedProtectedPaid };
  }

  cachedMpp = createMpp({
    apiKey: process.env.HITPAY_API_KEY,
    endpoint: process.env.HITPAY_MPP_ENDPOINT ?? "https://sandbox.mpp.hitpay.dev",
    webhookSalt: process.env.HITPAY_WEBHOOK_SALT,
  });

  cachedProtectedPaid = cachedMpp.protect(
    {
      amount,
      currency,
      description: "Flovia showcase paid API",
    },
    async () =>
      Response.json({
        ok: true,
        foo: "bar",
        provider,
        paidApi: {
          endpoint,
          message: "HitPay MPP showcase paid response",
          generatedAt: new Date().toISOString(),
        },
        floviaEvent: {
          status: "paid_api_delivered",
          payment: { provider, rail, amount, currency },
          joinedInsight: "HitPay checkout payment converted into retained paid API demand.",
        },
      }),
  );

  return { mpp: cachedMpp, protectedPaid: cachedProtectedPaid };
};

export const handleHitPayMppPaidShowcase = (request: Request) =>
  flovia.trackPaidApi(request, {
    provider,
    rail,
    endpoint,
    amount,
    currency,
    handler: () => {
      const hitpay = resolveHitPayMpp();

      if (!hitpay) {
        return json(
          {
            error: "hitpay_mpp_not_configured",
            message: "Set HITPAY_API_KEY to enable the real HitPay MPP live showcase flow.",
            requiredEnv: ["HITPAY_API_KEY"],
            optionalEnv: ["HITPAY_MPP_ENDPOINT", "HITPAY_WEBHOOK_SALT"],
            floviaEvent: {
              status: "configuration_required",
              responseStatus: 503,
              payment: { provider, rail, amount, currency },
              joinedInsight: "Live HitPay MPP requires sandbox credentials before Flovia can join real checkout payment context.",
            },
          },
          { status: 503 },
        );
      }

      return hitpay.protectedPaid(request, undefined);
    },
  });
