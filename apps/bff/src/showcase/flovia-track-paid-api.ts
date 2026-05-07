type ShowcasePaymentProvider = "stripe" | "hitpay";

type PaymentContext = Record<string, string | number | boolean | null>;

type TrackPaidApiOptions = {
  provider: ShowcasePaymentProvider;
  rail: "mpp";
  endpoint: string;
  amount: string;
  currency: string;
  handler: (context: {
    requestId: string;
    attachPaymentContext: (context: PaymentContext) => void;
  }) => Promise<Response> | Response;
};

type FloviaEventPatch = {
  status?: string;
  responseStatus?: number;
  payment?: unknown;
  apiUsage?: unknown;
  joinedInsight?: string;
};

const toRequestId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const withNoStore = (response: Response) => {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-flovia-showcase", "paid-api");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const flovia = {
  async trackPaidApi(request: Request, options: TrackPaidApiOptions): Promise<Response> {
    const startedAt = performance.now();
    const requestId = toRequestId();
    const paymentContexts: PaymentContext[] = [];

    try {
      const response = await options.handler({
        requestId,
        attachPaymentContext: (context) => paymentContexts.push(context),
      });
      const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
      const headers = new Headers(response.headers);

      headers.set("cache-control", "no-store");
      headers.set("x-flovia-request-id", requestId);
      headers.set("x-flovia-latency-ms", String(latencyMs));
      headers.set("x-flovia-provider", options.provider);
      headers.set("x-flovia-rail", options.rail);

      const contentType = headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = (await response.json()) as unknown;
        return Response.json(withTrackedEvent(body, {
          requestId,
          provider: options.provider,
          rail: options.rail,
          endpoint: options.endpoint,
          amount: options.amount,
          currency: options.currency,
          method: request.method,
          responseStatus: response.status,
          latencyMs,
          paymentContexts,
        }), {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
      return Response.json(
        {
          error: "showcase_paid_api_failed",
          message: error instanceof Error && error.message ? error.message : "Showcase paid API failed.",
          floviaEvent: {
            requestId,
            provider: options.provider,
            rail: options.rail,
            endpoint: options.endpoint,
            amount: options.amount,
            currency: options.currency,
            method: request.method,
            status: "error",
            responseStatus: 500,
            latencyMs,
            paymentContexts,
          },
        },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const withTrackedEvent = (
  body: unknown,
  common: {
    requestId: string;
    provider: ShowcasePaymentProvider;
    rail: "mpp";
    endpoint: string;
    amount: string;
    currency: string;
    method: string;
    responseStatus: number;
    latencyMs: number;
    paymentContexts: PaymentContext[];
  },
) => {
  if (!isRecord(body)) return body;

  const existing = isRecord(body.floviaEvent) ? (body.floviaEvent as FloviaEventPatch) : {};
  return {
    ...body,
    floviaEvent: {
      requestId: common.requestId,
      provider: common.provider,
      rail: common.rail,
      endpoint: common.endpoint,
      amount: common.amount,
      currency: common.currency,
      method: common.method,
      responseStatus: common.responseStatus,
      latencyMs: common.latencyMs,
      paymentContexts: common.paymentContexts,
      ...existing,
      apiUsage: {
        endpoint: common.endpoint,
        method: common.method,
        responseStatus: common.responseStatus,
        latencyMs: common.latencyMs,
        ...(isRecord(existing.apiUsage) ? existing.apiUsage : {}),
      },
    },
  };
};

export const json = (body: unknown, init: ResponseInit = {}) => withNoStore(Response.json(body, init));
