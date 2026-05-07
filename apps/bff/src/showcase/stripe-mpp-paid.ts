import { flovia, json } from "./flovia-track-paid-api";

const endpoint = "/showcase/stripe-mpp/paid";
const provider = "stripe" as const;
const rail = "mpp" as const;
const amount = "1.00";
const currency = "usd";
const issuedChallenges = new Map<string, { paymentIntentId: string; recipient: string }>();

const hasDemoCredential = (request: Request) => {
  const url = new URL(request.url);
  return (
    url.searchParams.get("credential") === "demo-paid" ||
    request.headers.get("x-showcase-payment") === "demo-paid"
  );
};

const getChallengeId = (request: Request) => new URL(request.url).searchParams.get("challengeId");

export const handleStripeMppPaidShowcase = (request: Request) =>
  flovia.trackPaidApi(request, {
    provider,
    rail,
    endpoint,
    amount,
    currency,
    handler: ({ requestId, attachPaymentContext }) => {
      const credentialSupplied = hasDemoCredential(request);
      const challengeId = getChallengeId(request) ?? `ch_stripe_mpp_${requestId.slice(0, 8)}`;
      const existingChallenge = issuedChallenges.get(challengeId);
      const paymentIntentId = existingChallenge?.paymentIntentId ?? `pi_demo_stripe_mpp_${requestId.slice(0, 8)}`;
      const recipient = existingChallenge?.recipient ?? "tempo1showcase9vxq6t2paidapi5flovia";
      attachPaymentContext({
        provider,
        rail,
        paymentIntentId,
        recipient,
        network: "tempo",
        amount,
        currency,
      });

      if (!credentialSupplied) {
        issuedChallenges.set(challengeId, { paymentIntentId, recipient });
        return json(
          {
            error: "payment_required",
            message: "Stripe MPP demo credential required before the paid API response is returned.",
            challenge: {
              type: "mpp-payment-required",
              provider,
              rail,
              network: "tempo",
              amount,
              currency,
              challengeId,
              paymentIntentId,
              recipient,
              instructions: "Retry with ?credential=demo-paid or x-showcase-payment: demo-paid.",
            },
            floviaEvent: {
              requestId,
              provider,
              rail,
              endpoint,
              method: request.method,
              responseStatus: 402,
              status: "payment_challenge_issued",
              payment: { paymentIntentId, recipient, network: "tempo", amount, currency },
              apiUsage: { endpoint, method: request.method, responseStatus: 402 },
              joinedInsight: "Flovia saw the paid route request and the Stripe MPP challenge context.",
            },
          },
          { status: 402 },
        );
      }

      if (!existingChallenge) {
        return json(
          {
            error: "invalid_demo_credential",
            message: "Retry must include the challengeId returned by the Stripe MPP challenge.",
            floviaEvent: {
              status: "credential_rejected",
              responseStatus: 400,
              payment: { challengeId, amount, currency },
              joinedInsight: "Flovia rejected an uncorrelated paid retry attempt.",
            },
          },
          { status: 400 },
        );
      }

      issuedChallenges.delete(challengeId);

      return json({
        ok: true,
        foo: "bar",
        provider,
        paidApi: {
          endpoint,
          message: "Stripe MPP showcase paid response",
          generatedAt: new Date().toISOString(),
        },
        floviaEvent: {
          requestId,
          provider,
          rail,
          endpoint,
          method: request.method,
          responseStatus: 200,
          status: "paid_api_delivered",
          payment: { challengeId, paymentIntentId, recipient, network: "tempo", amount, currency },
          apiUsage: { endpoint, method: request.method, responseStatus: 200 },
          joinedInsight: "Stripe Tempo payment context converted into retained paid API demand.",
        },
      });
    },
  });
