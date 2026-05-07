"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { mppFetch } from "@hit-pay/mpp-client";

type ProviderKey = "stripe" | "hitpay";
type LiveState = "idle" | "calling" | "challenge" | "paid" | "error";

type ShowcaseProviderScreenProps = {
  provider: ProviderKey;
};

type LiveResult = {
  status: number;
  body: unknown;
};

const providerConfig = {
  stripe: {
    title: "Stripe MPP showcase",
    endpoint: "/showcase/stripe-mpp/paid",
    publicEndpoint: "/api/showcase/stripe-mpp/paid",
    amount: "$1.00 USD",
    rail: "Tempo token payment",
    accent: "var(--mesh-blue)",
    accentDim: "var(--mesh-blue-dim)",
    accentSoft: "var(--mesh-blue-soft)",
    simulatedId: "pi_demo_stripe_mpp_001",
    challengeArtifact: "402 challenge + Tempo recipient",
    paymentArtifact: "PaymentIntent + token transfer",
    accessArtifact: "credential retry + receipt",
    dashboardHref: "https://dashboard.stripe.com/test/payments",
    providerOnlyLabel: "Stripe MPP route",
    providerOnlySnippet: `app.get("/showcase/stripe-mpp/paid", async (c) => {
  // existing Stripe MPP code:
  // create PaymentIntent, issue MPP challenge,
  // validate credential, return paid API response
});`,
    floviaSnippet: `app.get(
  "/showcase/stripe-mpp/paid",
  flovia.paidApi({ provider: "stripe", rail: "mpp" }),
  async (c) => {
    // existing Stripe MPP code unchanged
  },
);`,
    steps: [
      "request started",
      "MPP challenge issued",
      "Tempo token payment completed",
      "paid API response",
      "Flovia joined event",
    ],
    captured: ["provider=stripe", "rail=mpp", "network=tempo", "paymentIntentId", "recipient", "endpoint status latency"],
  },
  hitpay: {
    title: "HitPay MPP showcase",
    endpoint: "/showcase/hitpay-mpp/paid",
    publicEndpoint: "/api/showcase/hitpay-mpp/paid",
    amount: "S$1.00 SGD",
    rail: "Checkout URL / QR",
    accent: "var(--teal)",
    accentDim: "var(--teal-dim)",
    accentSoft: "var(--teal-soft)",
    simulatedId: "hitpay_demo_charge_001",
    challengeArtifact: "402 challenge + checkout URL",
    paymentArtifact: "checkout session + QR payment",
    accessArtifact: "paid retry + API response",
    dashboardHref: "https://dashboard.hit-pay.com/",
    providerOnlyLabel: "HitPay MPP route",
    providerOnlySnippet: `app.get("/showcase/hitpay-mpp/paid", (c) =>
  protectedPaid(c.req.raw, undefined),
);`,
    floviaSnippet: `app.get(
  "/showcase/hitpay-mpp/paid",
  flovia.paidApi({ provider: "hitpay", rail: "mpp" }),
  (c) => protectedPaid(c.req.raw, undefined),
);`,
    steps: [
      "request started",
      "MPP challenge issued",
      "checkout URL generated",
      "payment completed",
      "paid API response",
      "Flovia joined event",
    ],
    captured: ["provider=hitpay", "rail=mpp", "checkoutUrl", "chargeId", "amount=1.00 sgd", "endpoint status latency"],
  },
} as const;

export function ShowcaseProviderScreen({ provider }: ShowcaseProviderScreenProps) {
  const config = providerConfig[provider];
  const [state, setState] = useState<LiveState>("idle");
  const [result, setResult] = useState<LiveResult | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [hitPayCheckoutUrl, setHitPayCheckoutUrl] = useState<string | null>(null);
  const hitPayContinueRef = useRef<(() => void) | null>(null);

  const simulatedEvent = useMemo(
    () => ({
      requestId: "req_demo_001",
      provider,
      rail: "mpp",
      endpoint: config.endpoint,
      paymentId: config.simulatedId,
      responseStatus: 200,
      latencyMs: 47,
      insight: "payment converted into paid API demand",
    }),
    [config.endpoint, config.simulatedId, provider],
  );

  async function callPaidApi(withCredential: boolean) {
    if (provider === "hitpay") {
      if (withCredential) {
        hitPayContinueRef.current?.();
        return;
      }
      await callHitPayPaidApi();
      return;
    }

    setState("calling");
    setResult(null);

    try {
      const params = new URLSearchParams();
      if (withCredential) params.set("credential", "demo-paid");
      if (withCredential && challengeId) params.set("challengeId", challengeId);
      const response = await fetch(`${config.publicEndpoint}${params.size > 0 ? `?${params}` : ""}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const body = await response.json();
      setResult({ status: response.status, body });
      const nextChallengeId = getChallengeId(body);
      if (nextChallengeId) setChallengeId(nextChallengeId);
      if (response.ok) setChallengeId(null);
      setState(response.status === 402 ? "challenge" : response.ok ? "paid" : "error");
    } catch (error) {
      setResult({
        status: 0,
        body: { error: "network_error", message: error instanceof Error ? error.message : "Request failed" },
      });
      setState("error");
    }
  }

  async function callHitPayPaidApi() {
    setState("calling");
    setResult(null);
    setChallengeId(null);
    setHitPayCheckoutUrl(null);

    try {
      const { response, receipt, receiptJws, challenge } = await mppFetch(config.publicEndpoint, {
        autoPay: false,
        timeoutMs: 10 * 60_000,
        onChallenge: async (challenge) => {
          const checkoutUrl = extractHitPayCheckoutUrl(challenge);
          setHitPayCheckoutUrl(checkoutUrl);
          setResult({ status: 402, body: { challenge } });
          setState("challenge");

          await new Promise<void>((resolve) => {
            hitPayContinueRef.current = resolve;
          });

          setState("calling");
          return { pay: true };
        },
      });

      hitPayContinueRef.current = null;
      const body = await readResponseBody(response);
      setResult({
        status: response.status,
        body: {
          response: body,
          receipt: receipt ?? null,
          receiptJws: receiptJws ?? null,
          challenge: challenge ?? null,
        },
      });
      setState(response.ok ? "paid" : "error");
    } catch (error) {
      hitPayContinueRef.current = null;
      setResult({
        status: 0,
        body: { error: "hitpay_mpp_client_error", message: error instanceof Error ? error.message : "Request failed" },
      });
      setState("error");
    }
  }

  return (
    <div className="scroll">
      <div style={{ padding: "32px 40px 80px", maxWidth: 1440, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Integration → Live → Flovia result → Simulate</div>
            <h1 className="display" style={{ margin: 0, fontSize: 34, letterSpacing: "-0.03em" }}>{config.title}</h1>
          </div>
        </header>

        <Card eyebrow="Integration">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <CodeCompareColumn label={config.providerOnlyLabel} tone="muted" code={config.providerOnlySnippet} />
            <CodeCompareColumn label="With Flovia SDK" tone="accent" accent={config.accent} accentDim={config.accentDim} code={config.floviaSnippet} />
          </div>
        </Card>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="Live flow" title={provider === "hitpay" ? "Call the real HitPay MPP endpoint" : "Call the BFF-hosted demo endpoint"}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <button type="button" onClick={() => void callPaidApi(false)} style={buttonStyle(provider)} disabled={state === "calling"}>
                Call paid API
              </button>
              <button
                type="button"
                onClick={() => void callPaidApi(true)}
                style={secondaryButtonStyle}
                disabled={state === "calling" || (provider === "stripe" ? !challengeId : !hitPayCheckoutUrl)}
              >
                {provider === "stripe" ? "Simulate Tempo payment" : "I paid. Continue."}
              </button>
              {provider === "hitpay" && hitPayCheckoutUrl ? (
                <a href={hitPayCheckoutUrl} target="_blank" rel="noreferrer" className="ghost" style={{ alignSelf: "center", fontSize: 13 }}>
                  Open checkout ↗
                </a>
              ) : null}
              <a href={config.dashboardHref} target="_blank" rel="noreferrer" className="ghost" style={{ alignSelf: "center", fontSize: 13 }}>
                Provider dashboard ↗
              </a>
            </div>
            <LiveStatus state={state} provider={provider} hasChallenge={challengeId !== null || hitPayCheckoutUrl !== null} />
            {provider === "hitpay" && state === "challenge" ? <QrPlaceholder checkoutUrl={hitPayCheckoutUrl} /> : null}
            <LiveResultPanel result={result} state={state} provider={provider} accent={config.accent} />
            {state === "paid" && result ? (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px dashed var(--line-strong)" }}>
                <div className="eyebrow" style={{ marginBottom: 12, color: config.accent }}>
                  Flovia result
                </div>
                <ProviderVsFloviaPanel
                  provider={provider}
                  endpoint={config.endpoint}
                  amount={config.amount}
                  rail={config.rail}
                  paymentId={config.simulatedId}
                  accent={config.accent}
                  result={result}
                />
              </div>
            ) : null}
          </Card>
        </div>

        <section className="card" style={{ marginTop: 24, padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>What Flovia joins</div>
          <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 600 }}>
            Payment dashboards know who paid. API logs know what was used. Flovia connects them.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 64px minmax(220px, 0.82fr) 64px minmax(0, 1fr)",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <EvidenceCard
                label="Payment rail"
                title={provider === "stripe" ? "Stripe / MPP" : "HitPay / MPP"}
                lines={[config.simulatedId, config.amount, provider === "stripe" ? "Tempo recipient" : "checkout URL"]}
                accent={config.accent}
              />
              <EvidenceCard
                label="API provider"
                title="Paid API request"
                lines={[`GET ${config.endpoint}`, "status + latency", "request id + response"]}
                accent={config.accent}
              />
            </div>
            <Arrow />
            <JoinCard accent={config.accent} />
            <Arrow />
            <EvidenceCard
              label="Business output"
              title="Provider decisions"
              lines={["which endpoints convert", "which workflows retain", "where to price / upsell"]}
              accent={config.accent}
            />
          </div>
        </section>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="Simulated flow" title="What happens before a live wallet or checkout is involved">
            <SimulatedFlowDiagram
              accent={config.accent}
              provider={provider}
              endpoint={config.endpoint}
              amount={config.amount}
              rail={config.rail}
              paymentId={config.simulatedId}
              challengeArtifact={config.challengeArtifact}
              paymentArtifact={config.paymentArtifact}
              accessArtifact={config.accessArtifact}
              event={simulatedEvent}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function getChallengeId(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("challenge" in body)) return null;
  const challenge = (body as { challenge?: unknown }).challenge;
  if (typeof challenge !== "object" || challenge === null || !("challengeId" in challenge)) return null;
  const challengeId = (challenge as { challengeId?: unknown }).challengeId;
  return typeof challengeId === "string" ? challengeId : null;
}

function extractHitPayCheckoutUrl(challenge: unknown): string | null {
  if (typeof challenge !== "object" || challenge === null) return null;
  const methodDetails = (challenge as { methodDetails?: unknown }).methodDetails;
  if (typeof methodDetails !== "object" || methodDetails === null) return null;
  const checkoutUrl = (methodDetails as { checkout_url?: unknown; checkoutUrl?: unknown }).checkout_url
    ?? (methodDetails as { checkoutUrl?: unknown }).checkoutUrl;
  return typeof checkoutUrl === "string" ? checkoutUrl : null;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

const codeStyle = {
  margin: 0,
  borderRadius: 14,
  padding: 14,
  overflowX: "auto",
  background: "#0f172a",
  color: "#dbeafe",
  fontSize: 12,
  lineHeight: 1.55,
} satisfies CSSProperties;

function Card({ eyebrow, title, children }: { eyebrow: string; title?: string; children: ReactNode }) {
  return (
    <section className="card" style={{ padding: 24 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>
      {title ? <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>{title}</h2> : null}
      {children}
    </section>
  );
}

function CodeCompareColumn({
  label,
  code,
  tone,
  accent = "var(--text-2)",
  accentDim,
}: {
  label: string;
  code: string;
  tone: "muted" | "accent";
  accent?: string;
  accentDim?: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        className="eyebrow"
        style={{
          marginBottom: 8,
          color: tone === "accent" ? accent : "var(--text-mute)",
        }}
      >
        {label}
      </div>
      <pre style={codeStyle}>
        <code>{highlightTypeScript(code, tone, accentDim)}</code>
      </pre>
    </div>
  );
}

const syntaxColors = {
  keyword: "#93c5fd",
  string: "#86efac",
  number: "#fbbf24",
  comment: "#64748b",
  functionName: "#67e8f9",
  property: "#c4b5fd",
  punctuation: "#94a3b8",
} as const;

const tsTokenPattern =
  /(\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|from|const|async|await|return|undefined|process|provider|rail|endpoint|amount|currency|handler)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\()|\b[A-Za-z_$][\w$]*(?=\s*:)|[{}()[\].,:;=>])/g;

function highlightTypeScript(code: string, tone?: "muted" | "accent", accentDim?: string) {
  return code.split("\n").map((line, index, lines) => {
    const marked = tone === "accent" && line.includes("flovia.paidApi");
    return (
      <span
        key={`${index}-${line}`}
        style={{
          display: "block",
          margin: marked ? "0 -6px" : undefined,
          padding: marked ? "1px 6px" : undefined,
          borderLeft: marked ? `3px solid var(--mesh-blue)` : "3px solid transparent",
          borderRadius: marked ? 4 : undefined,
          background: marked ? "var(--mesh-blue-soft)" : undefined,
        }}
      >
        {line ? highlightTypeScriptLine(line) : "\u00A0"}
        {index < lines.length - 1 ? "\n" : null}
      </span>
    );
  });
}

function highlightTypeScriptLine(code: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of code.matchAll(tsTokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(code.slice(lastIndex, index));

    nodes.push(
      <span key={`${index}-${token}`} style={{ color: syntaxColorFor(token) }}>
        {token}
      </span>,
    );
    lastIndex = index + token.length;
  }

  if (lastIndex < code.length) nodes.push(code.slice(lastIndex));
  return nodes;
}

function syntaxColorFor(token: string) {
  if (token.startsWith("//") || token.startsWith("/*")) return syntaxColors.comment;
  if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) return syntaxColors.string;
  if (/^\d/.test(token)) return syntaxColors.number;
  if (/^(import|from|const|async|await|return|undefined|process|provider|rail|endpoint|amount|currency|handler)$/.test(token)) {
    return syntaxColors.keyword;
  }
  if (/^[{}()[\].,:;=>]+$/.test(token)) return syntaxColors.punctuation;
  if (/^[A-Za-z_$][\w$]*$/.test(token)) {
    return /^[a-z]/.test(token) ? syntaxColors.functionName : syntaxColors.property;
  }
  return "inherit";
}

function SimulatedFlowDiagram({
  accent,
  provider,
  endpoint,
  amount,
  rail,
  paymentId,
  challengeArtifact,
  paymentArtifact,
  accessArtifact,
  event,
}: {
  accent: string;
  provider: ProviderKey;
  endpoint: string;
  amount: string;
  rail: string;
  paymentId: string;
  challengeArtifact: string;
  paymentArtifact: string;
  accessArtifact: string;
  event: Record<string, unknown>;
}) {
  const paymentProvider = provider === "stripe" ? "Stripe MPP" : "HitPay MPP";

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 12,
          alignItems: "stretch",
        }}
      >
        <FlowStepCard
          index={1}
          accent={accent}
          title="Agent calls paid API"
          lines={[`GET ${endpoint}`, "no payment credential", "request id created"]}
        />
        <FlowStepCard
          index={2}
          accent={accent}
          title="MPP blocks access"
          lines={[paymentProvider, challengeArtifact, "status 402"]}
        />
        <FlowStepCard
          index={3}
          accent={accent}
          title="Payment completes"
          lines={[paymentArtifact, paymentId, amount]}
        />
        <FlowStepCard
          index={4}
          accent={accent}
          title="API access granted"
          lines={[accessArtifact, "status 200", "response { foo: \"bar\" }"]}
        />
        <FlowStepCard
          index={5}
          accent={accent}
          title="Flovia joins event"
          lines={["payment context", "endpoint usage", "workflow signal"]}
          emphasized
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
        }}
      >
        <LaneCard
          label="Payment lane"
          title={paymentProvider}
          lines={[rail, paymentId, amount, challengeArtifact]}
          accent={accent}
        />
        <LaneCard
          label="API lane"
          title="Provider endpoint"
          lines={[endpoint, "request → 402 → retry", "200 paid response", "latency captured"]}
          accent={accent}
        />
        <LaneCard
          label="Flovia lane"
          title="Joined analytics event"
          lines={["payment id ↔ request id", "rail ↔ endpoint", "paid response ↔ workflow", "retained demand signal"]}
          accent={accent}
          highlighted
        />
      </div>

      <div style={{ marginTop: -8 }}>
        <div className="eyebrow" style={{ marginBottom: 8, color: "var(--text-mute)" }}>Event payload preview</div>
        <pre style={codeStyle}><code>{JSON.stringify(event, null, 2)}</code></pre>
      </div>
    </div>
  );
}

function FlowStepCard({
  index,
  accent,
  title,
  lines,
  emphasized = false,
}: {
  index: number;
  accent: string;
  title: string;
  lines: readonly string[];
  emphasized?: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${emphasized ? "transparent" : "var(--line-strong)"}`,
        borderRadius: 12,
        padding: 14,
        background: emphasized ? "var(--surface-subtle)" : "var(--surface-card)",
        boxShadow: emphasized ? `inset 0 0 0 1px ${accent}` : "none",
        minHeight: 158,
      }}
    >
      <div
        className="mono"
        style={{
          display: "grid",
          placeItems: "center",
          width: 24,
          height: 24,
          borderRadius: 999,
          background: emphasized ? accent : "var(--surface-muted)",
          color: emphasized ? "#fff" : "var(--text-2)",
          fontSize: 11,
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        {index}
      </div>
      <h3 style={{ margin: 0, fontSize: 14, lineHeight: 1.25 }}>{title}</h3>
      <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
        {lines.map((line) => (
          <span key={line} style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.35 }}>
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

function LaneCard({
  label,
  title,
  lines,
  accent,
  highlighted = false,
}: {
  label: string;
  title: string;
  lines: readonly string[];
  accent: string;
  highlighted?: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${highlighted ? "transparent" : "var(--line-strong)"}`,
        borderRadius: 12,
        padding: 16,
        background: highlighted ? "var(--surface-subtle)" : "var(--surface-card)",
        boxShadow: highlighted ? `inset 0 0 0 1px ${accent}` : "none",
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 6, color: highlighted ? accent : "var(--text-mute)" }}>
        {label}
      </div>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{title}</h3>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
        {lines.map((line) => (
          <span key={line} className="chip mute" style={{ background: highlighted ? "var(--surface-card)" : "var(--surface-muted)" }}>
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

function LiveStatus({
  state,
  provider,
  hasChallenge,
}: {
  state: LiveState;
  provider: ProviderKey;
  hasChallenge: boolean;
}) {
  const copy = {
    idle: "This PoC does not take a real payment here. First call returns a 402 challenge; then simulate payment completion.",
    calling: "Calling the paid API endpoint…",
    challenge:
      provider === "stripe"
        ? "402 challenge issued. In a real Stripe MPP flow, the wallet pays the Tempo recipient; in this PoC, click Simulate Tempo payment."
        : "402 challenge issued with checkout URL. Open the HitPay sandbox checkout, pay, then click I paid. Continue.",
    paid: "Demo payment completion accepted. Paid API response delivered and joined by Flovia.",
    error: "Request failed. Check BFF availability and endpoint response.",
  }[state];

  return (
    <div
      style={{
        border: `1px solid ${hasChallenge ? (provider === "stripe" ? "var(--mesh-blue-soft)" : "var(--teal-soft)") : "var(--line-strong)"}`,
        borderRadius: 8,
        padding: "10px 14px",
        background: hasChallenge ? (provider === "stripe" ? "var(--mesh-blue-dim)" : "var(--teal-dim)") : "var(--surface-card)",
        color: "var(--text-1)",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {copy}
    </div>
  );
}

function LiveResultPanel({
  result,
  state,
  provider,
  accent,
}: {
  result: LiveResult | null;
  state: LiveState;
  provider: ProviderKey;
  accent: string;
}) {
  if (!result) {
    return (
      <div
        style={{
          marginTop: 14,
          border: "1px dashed var(--line-strong)",
          borderRadius: 8,
          padding: 16,
          color: "var(--text-3)",
          fontSize: 13,
          background: "var(--surface-subtle)",
        }}
      >
        Response summary appears here.
      </div>
    );
  }

  const summary = summarizeLiveResult(result, provider, state);
  const summaryTone = liveSummaryTone(summary.kind, accent, provider);

  return (
    <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
      <div
        style={{
          border: `1px solid ${summaryTone.border}`,
          borderRadius: 8,
          padding: 16,
          background: summaryTone.background,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 5, color: summaryTone.color }}>
              {summary.eyebrow}
            </div>
            <h3 style={{ margin: 0, fontSize: 17 }}>{summary.title}</h3>
          </div>
          <span className="badge" style={{ background: "rgba(255,255,255,0.8)" }}>
            HTTP {result.status || "—"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
          {summary.items.map((item) => (
            <SummaryItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </div>

      <details style={{ border: "1px solid var(--line-strong)", borderRadius: 8, background: "var(--surface-card)" }}>
        <summary
          style={{
            cursor: "pointer",
            padding: "10px 12px",
            color: "var(--text-2)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Raw JSON
        </summary>
        <pre style={{ ...codeStyle, borderRadius: "0 0 8px 8px", minHeight: 180, borderTop: "1px solid var(--line-strong)" }}>
          <code>{JSON.stringify(result, null, 2)}</code>
        </pre>
      </details>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--line-strong)", borderRadius: 6, padding: 10, background: "var(--surface-card)", minWidth: 0 }}>
      <div className="eyebrow" style={{ fontSize: 10, marginBottom: 5 }}>{label}</div>
      <div className="mono" style={{ fontSize: 12, color: "var(--text-1)", overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function liveSummaryTone(kind: "challenge" | "paid" | "error", accent: string, provider: ProviderKey) {
  switch (kind) {
    case "challenge":
      return {
        border: "var(--warn-soft)",
        background: "rgba(255,251,235,0.92)",
        color: "var(--warn)",
      };
    case "error":
      return {
        border: "rgba(239,68,68,0.28)",
        background: "rgba(254,242,242,0.9)",
        color: "var(--danger)",
      };
    case "paid":
      return {
        border: provider === "stripe" ? "var(--mesh-blue-soft)" : "var(--teal-soft)",
        background: "var(--surface-subtle)",
        color: provider === "stripe" ? "var(--mesh-blue)" : "var(--teal)",
      };
  }
}

function summarizeLiveResult(result: LiveResult, provider: ProviderKey, state: LiveState) {
  const body = asRecord(result.body);
  const response = asRecord(body?.response);
  const challenge = asRecord(body?.challenge) ?? asRecord(response?.challenge) ?? asRecord(body?.challenge);
  const floviaEvent = asRecord(body?.floviaEvent) ?? asRecord(response?.floviaEvent);
  const payment = asRecord(floviaEvent?.payment);
  const receipt = asRecord(body?.receipt);
  const error = stringValue(body?.error) ?? stringValue(response?.error);

  if (result.status === 402 || state === "challenge") {
    return {
      kind: "challenge" as const,
      eyebrow: "Payment challenge",
      title: provider === "hitpay" ? "Checkout URL issued" : "Payment required",
      items: [
        { label: "Provider", value: provider === "hitpay" ? "HitPay MPP" : "Stripe MPP" },
        { label: "Next action", value: provider === "hitpay" ? "Open checkout" : "Complete Tempo payment" },
        { label: "Checkout", value: extractHitPayCheckoutUrl(challenge) ?? stringValue(payment?.checkoutUrl) ?? "—" },
      ],
    };
  }

  if (result.status >= 400 || state === "error" || error) {
    return {
      kind: "error" as const,
      eyebrow: "Request failed",
      title: error ?? "Live flow error",
      items: [
        { label: "Provider", value: provider === "hitpay" ? "HitPay MPP" : "Stripe MPP" },
        { label: "Status", value: String(result.status || "network") },
        { label: "Message", value: stringValue(body?.message) ?? stringValue(response?.message) ?? "Check raw JSON" },
      ],
    };
  }

  return {
    kind: "paid" as const,
    eyebrow: "Paid API response",
    title: "Payment verified and API access granted",
    items: [
      { label: "Provider", value: provider === "hitpay" ? "HitPay MPP" : "Stripe MPP" },
      { label: "API response", value: stringValue(response?.foo) ?? stringValue(body?.foo) ?? "ok" },
      { label: "Receipt", value: receipt ? "verified" : stringValue(body?.receiptJws) ? "JWS received" : "—" },
    ],
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function QrPlaceholder({ checkoutUrl }: { checkoutUrl: string | null }) {
  if (!checkoutUrl) return null;

  return (
    <a
      href={checkoutUrl}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "block",
        marginTop: 12,
        border: "1px solid var(--teal-soft)",
        borderRadius: 8,
        padding: "12px 14px",
        background: "var(--teal-dim)",
        color: "var(--teal)",
        fontSize: 12,
        fontWeight: 600,
        overflowWrap: "anywhere",
        textDecoration: "underline",
        textUnderlineOffset: 3,
        textDecorationThickness: 1.5,
      }}
    >
      <span className="mono" style={{ color: "var(--text-1)", fontWeight: 600 }}>
        {checkoutUrl}
      </span>
      <span aria-hidden style={{ marginLeft: 6, color: "var(--teal)", fontWeight: 900 }}>
        ↗
      </span>
    </a>
  );
}

function ProviderVsFloviaPanel({
  provider,
  endpoint,
  amount,
  rail,
  paymentId,
  accent,
  result,
}: {
  provider: ProviderKey;
  endpoint: string;
  amount: string;
  rail: string;
  paymentId: string;
  accent: string;
  result: LiveResult | null;
}) {
  const providerName = provider === "stripe" ? "Stripe dashboard" : "HitPay dashboard";
  const providerEyebrow = provider === "stripe" ? "What you see in Stripe Dashboard" : "What you see in HitPay Dashboard";
  const paymentLabel = provider === "stripe" ? "PaymentIntent" : "Charge / checkout";
  const paymentStatus = result?.status === 200 ? "paid" : result?.status === 402 ? "pending payment" : "demo-ready";
  const apiStatus = result?.status ? `HTTP ${result.status}` : "not called yet";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
        <ComparisonColumn
          eyebrow={providerEyebrow}
          title={providerName}
          items={[
            { label: paymentLabel, value: paymentId },
            { label: "Amount", value: amount },
            { label: "Payment status", value: paymentStatus },
            { label: "Payment rail", value: rail },
          ]}
        />
        <ComparisonColumn
          eyebrow="Flovia knows"
          title="Paid API usage"
          accent={accent}
          highlighted
          items={[
            { label: "Endpoint", value: `GET ${endpoint}` },
            { label: "API status", value: apiStatus },
            { label: "Latency", value: result ? "captured from response" : "captured on call" },
            { label: "Workflow", value: "agent paid API request" },
          ]}
        />
      </div>

      <div
        style={{
          border: `1px solid ${provider === "stripe" ? "var(--mesh-blue-soft)" : "var(--teal-soft)"}`,
          borderRadius: 14,
          padding: 16,
          background: provider === "stripe" ? "var(--mesh-blue-dim)" : "var(--teal-dim)",
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 6, color: accent }}>Joined by Flovia</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)", gap: 10, alignItems: "center" }}>
          <JoinPill label="payment" value={paymentId} />
          <span className="mono" style={{ color: "var(--text-3)", fontSize: 18 }}>×</span>
          <JoinPill label="endpoint" value={endpoint} />
          <span className="mono" style={{ color: "var(--text-3)", fontSize: 18 }}>→</span>
          <JoinPill label="decision signal" value="conversion + retained demand" />
        </div>
      </div>
    </div>
  );
}

function ComparisonColumn({
  eyebrow,
  title,
  items,
  accent = "var(--text-mute)",
  highlighted = false,
}: {
  eyebrow: string;
  title: string;
  items: Array<{ label: string; value: string }>;
  accent?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${highlighted ? "transparent" : "var(--line)"}`,
        borderRadius: 14,
        padding: 16,
        background: highlighted ? "var(--surface-subtle)" : "var(--surface-card)",
        boxShadow: highlighted ? `inset 0 0 0 1px ${accent}` : "none",
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 6, color: highlighted ? accent : "var(--text-mute)" }}>{eyebrow}</div>
      <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{title}</h3>
      <div style={{ display: "grid", gap: 9 }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", gap: 10, alignItems: "baseline" }}>
            <span style={{ color: "var(--text-3)", fontSize: 12 }}>{item.label}</span>
            <span className="mono" style={{ color: "var(--text-1)", fontSize: 12, overflowWrap: "anywhere" }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function JoinPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="eyebrow" style={{ fontSize: 10, marginBottom: 5 }}>{label}</div>
      <div className="mono" style={{ border: "1px solid var(--line-strong)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-card)", fontSize: 12, overflowWrap: "anywhere", color: "var(--text-1)" }}>
        {value}
      </div>
    </div>
  );
}

function EvidenceCard({
  label,
  title,
  lines,
  accent,
}: {
  label: string;
  title: string;
  lines: readonly string[];
  accent: string;
}) {
  return (
    <div style={{ border: "1px solid var(--line-strong)", borderRadius: 12, padding: 18, background: "var(--surface-subtle)" }}>
      <div className="eyebrow" style={{ marginBottom: 6, color: accent }}>{label}</div>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{title}</h3>
      <div style={{ display: "grid", gap: 7, marginTop: 12 }}>
        {lines.map((line) => <span key={line} className="chip mute" style={{ width: "fit-content", background: "var(--surface-card)" }}>{line}</span>)}
      </div>
    </div>
  );
}

function JoinCard({ accent }: { accent: string }) {
  return (
    <div
      style={{
        border: "1px solid transparent",
        borderRadius: 16,
        padding: 20,
        background: "var(--surface-card)",
        boxShadow: `inset 0 0 0 1px ${accent}, var(--shadow-2)`,
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 8, color: accent }}>Flovia join layer</div>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Joined paid API event</h3>
      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        <JoinLine left="payment id" right="request id" />
        <JoinLine left="payer / recipient" right="endpoint" />
        <JoinLine left="amount / status" right="workflow" />
      </div>
    </div>
  );
}

function JoinLine({ left, right }: { left: string; right: string }) {
  return (
    <div
      className="mono"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: 8,
        alignItems: "center",
        fontSize: 11,
        color: "var(--text-2)",
      }}
    >
      <span>{left}</span>
      <span style={{ color: "var(--text-3)" }}>×</span>
      <span>{right}</span>
    </div>
  );
}

function Arrow() {
  return <div className="mono" style={{ display: "grid", placeItems: "center", color: "var(--text-3)", fontSize: 22 }}>→</div>;
}

const secondaryButtonStyle = {
  border: "1px solid var(--line-strong)",
  borderRadius: 4,
  padding: "7px 13px",
  background: "var(--surface-card)",
  color: "var(--text-1)",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
} satisfies CSSProperties;

const buttonStyle = (provider: ProviderKey) => ({
  border: "1px solid transparent",
  borderRadius: 4,
  padding: "7px 13px",
  background: provider === "stripe" ? "var(--mesh-blue)" : "var(--teal)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
});
