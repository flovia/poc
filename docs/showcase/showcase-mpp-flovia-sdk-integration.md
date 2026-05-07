# Showcase MPP + Flovia SDK integration plan

## Summary

For the PoC, Flovia BFF should also host showcase paid API endpoints. No separate API provider server is needed.

The BFF will expose payment-protected showcase routes under `/showcase/*`, integrate Stripe MPP and HitPay MPP flows there, and wrap each paid endpoint once with a Flovia SDK-style tracking layer.

```text
Frontend
  ↓
Flovia BFF
  ├─ analytics/read routes
  │   ├─ /providers
  │   ├─ /customers
  │   └─ /analytics/routes/summary
  │
  └─ showcase paid API routes
      ├─ /showcase/stripe-mpp/paid
      └─ /showcase/hitpay-mpp/paid
          ↓
          Flovia SDK wrapper
          ↓
          Stripe MPP / HitPay MPP
          ↓
          paid API response
```

This keeps the PoC simple while preserving the product narrative:

> Stripe MPP and HitPay MPP handle payment. Flovia wraps the same paid API endpoint and connects payment context to provider-side API usage.

## Decision

Use BFF-hosted showcase routes:

```text
GET /showcase/stripe-mpp/paid
GET /showcase/hitpay-mpp/paid
```

Do not introduce a separate API server for this PoC.

Do not hide the routes behind an environment flag. The `/showcase/*` path prefix is the boundary.

## Why BFF-hosted showcase routes are acceptable

The ideal production shape would separate the analytics BFF from an API provider server:

```text
Flovia BFF
  - analytics/dashboard read API

API Provider server
  - paid endpoint
  - Stripe MPP / HitPay MPP
  - Flovia SDK
```

For the PoC, standing up another API server is not essential. The essential part is the integration shape:

```text
paid API endpoint
  ↓
Flovia wrapper
  ↓
payment SDK / MPP protector
  ↓
actual API handler
```

That shape works whether the endpoint lives in a separate API provider server or inside the BFF.

For this PoC, the BFF temporarily plays both roles:

1. Flovia analytics BFF
2. showcase API provider endpoint host

## Path naming

Use `showcase`, not `provider`, because the BFF already has provider-domain routes such as `/providers`.

Chosen names:

```text
/showcase/stripe-mpp/paid
/showcase/hitpay-mpp/paid
```

Benefits:

- avoids collision with `/providers`
- avoids generic `/paid` at BFF root
- makes clear these routes exist to showcase paid API integrations
- keeps Stripe MPP and HitPay MPP comparison explicit
- can be moved into a separate server later if needed

## Module isolation

Keep showcase code isolated from the existing analytics read routes.

Suggested structure:

```text
apps/bff/src/
  http.ts
  showcase/
    index.ts
    flovia-track-paid-api.ts
    stripe-mpp-paid.ts
    hitpay-mpp-paid.ts
```

`http.ts` should only dispatch to the showcase module:

```ts
const showcaseResponse = handleShowcaseRoute(request, path);
if (showcaseResponse) return showcaseResponse;
```

`showcase/index.ts` owns the route map:

```ts
export const handleShowcaseRoute = (request: Request, path: string) => {
  switch (path) {
    case "/showcase/stripe-mpp/paid":
      return handleStripeMppPaidShowcase(request);

    case "/showcase/hitpay-mpp/paid":
      return handleHitPayMppPaidShowcase(request);

    default:
      return null;
  }
};
```

## Flovia SDK integration shape

The Flovia integration should appear as a single route-level wrapper.

Target provider experience:

```ts
flovia.trackPaidApi(request, {
  provider: "stripe",
  rail: "mpp",
  endpoint: "/showcase/stripe-mpp/paid",
  amount: "1.00",
  currency: "usd",
  handler: () => runStripeMppPaidHandler(request),
});
```

For HitPay:

```ts
flovia.trackPaidApi(request, {
  provider: "hitpay",
  rail: "mpp",
  endpoint: "/showcase/hitpay-mpp/paid",
  amount: "1.00",
  currency: "sgd",
  handler: () => protectedPaid(request, undefined),
});
```

This demonstrates the core message:

> Wrap the existing MPP-protected endpoint once with Flovia SDK.

## Optional payment context attachment

A route wrapper can capture usage lifecycle by itself:

- endpoint
- method
- payment provider
- rail
- amount and currency
- request start
- response status
- latency
- challenge vs completed response
- error state

Some provider-specific payment metadata only exists inside payment-specific code. For example, the Stripe MPP sample creates a Stripe `PaymentIntent` while generating a crypto deposit address. That is where these fields become available:

- Stripe `paymentIntent.id`
- crypto deposit address
- Tempo recipient address
- amount and currency

To keep the integration centralized, the Flovia wrapper can pass a narrow callback into the handler:

```ts
flovia.trackPaidApi(request, {
  provider: "stripe",
  rail: "mpp",
  endpoint: "/showcase/stripe-mpp/paid",
  amount: "1.00",
  currency: "usd",
  handler: async ({ attachPaymentContext }) => {
    const recipientAddress = await createPayToAddress(request, {
      onPaymentIntent: ({ paymentIntent, payToAddress }) =>
        attachPaymentContext({
          provider: "stripe",
          rail: "mpp",
          paymentIntentId: paymentIntent.id,
          recipient: payToAddress,
          network: "tempo",
          amount: "1.00",
          currency: "usd",
        }),
    });

    return runStripeMppCharge(request, recipientAddress);
  },
});
```

So the SDK shape remains:

- one route-level wrapper for the common case
- optional `attachPaymentContext(...)` for richer payment metadata

## Existing sample mapping

### Stripe MPP sample

Source sample:

```text
machine-payments/mpp/server/node-typescript/main.ts
```

Relevant behavior:

- `GET /paid`
- creates Stripe `PaymentIntent`
- extracts Tempo deposit address
- caches and validates the recipient address
- runs `Mppx.compose(...)`
- returns challenge on `402`
- returns paid JSON response with receipt on success

Showcase target:

```text
GET /showcase/stripe-mpp/paid
```

Flovia should capture:

- rail: `mpp`
- provider: `stripe`
- endpoint: `/showcase/stripe-mpp/paid`
- Stripe payment intent id, if available
- recipient/deposit address, if available
- challenge issued vs paid response
- request latency and response status

### HitPay MPP sample

Source sample:

```text
machine-payments/hitpaympp/server/node-typescript/main.ts
```

Relevant behavior:

- `GET /paid`
- creates `protectedPaid = mpp.protect(...)`
- delegates request to `protectedPaid(c.req.raw, undefined)`

Showcase target:

```text
GET /showcase/hitpay-mpp/paid
```

Flovia should capture:

- rail: `mpp`
- provider: `hitpay`
- endpoint: `/showcase/hitpay-mpp/paid`
- challenge issued vs paid response
- request latency and response status
- HitPay charge/session context if exposed by the HitPay MPP SDK

## Frontend payment flow

The frontend can call the BFF showcase endpoints directly.

HitPay flow:

```text
Frontend
  ↓ GET /showcase/hitpay-mpp/paid
BFF showcase route
  ↓ HitPay MPP challenge
Frontend
  ↓ checkout/payment flow
Frontend
  ↓ retry with credential
BFF showcase route
  ↓ paid response
```

Stripe MPP flow:

```text
Frontend
  ↓ GET /showcase/stripe-mpp/paid
BFF showcase route
  ↓ MPP challenge
Frontend / wallet / MPP client
  ↓ payment
Frontend
  ↓ retry with credential
BFF showcase route
  ↓ paid response
```

Secrets stay server-side in the BFF process:

- `STRIPE_SECRET_KEY`
- `HITPAY_API_KEY`
- HitPay webhook salt if used
- MPP challenge secret

## Events Flovia should model

The showcase wrapper can emit a compact lifecycle:

```text
paid_api.request_started
paid_api.payment_context_attached
paid_api.challenge_issued
paid_api.access_granted
paid_api.request_completed
paid_api.request_failed
```

Example event fields:

```ts
{
  requestId: "req_...",
  provider: "stripe",
  rail: "mpp",
  endpoint: "/showcase/stripe-mpp/paid",
  method: "GET",
  amount: "1.00",
  currency: "usd",
  statusCode: 200,
  latencyMs: 123,
  paymentIntentId: "pi_...",
  recipient: "0x...",
}
```

## Dashboard story enabled

By joining payment context and route usage, the showcase can power views such as:

- paid API requests by endpoint
- challenge issued vs paid access completed
- Stripe MPP vs HitPay MPP comparison
- retained API demand by rail
- workflow-level paid demand
- routes that receive payment attempts but do not retain usage
- paid API latency and error rate

## Recommended implementation sequence

1. Add `apps/bff/src/showcase/` module boundary.
2. Add route dispatch for `/showcase/stripe-mpp/paid` and `/showcase/hitpay-mpp/paid`.
3. Add a local `flovia-track-paid-api.ts` wrapper with the desired SDK shape.
4. Port the Stripe MPP paid handler into `stripe-mpp-paid.ts`.
5. Port the HitPay MPP paid handler into `hitpay-mpp-paid.ts`.
6. Emit or log Flovia paid API lifecycle events.
7. Connect emitted events into the existing route analytics/read model if needed for the dashboard.

## Final direction

Use this framing:

> In the PoC, Flovia BFF also hosts showcase paid API routes under `/showcase/*`. These routes integrate Stripe MPP and HitPay MPP, then wrap the paid endpoint once with a Flovia SDK-style tracker. This shows how Flovia connects payment context with API endpoint usage without introducing a separate API provider server.
