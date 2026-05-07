import Link from "next/link";
import type { CSSProperties } from "react";

const cardStyle = { padding: 24, borderRadius: 12 } satisfies CSSProperties;

const providers = [
  {
    href: "/showcase/stripe-mpp",
    title: "Stripe MPP",
    rail: "Tempo token payment",
    ux: "payment challenge → token transfer → paid retry",
    amount: "$1.00 USD",
    accent: "var(--mesh-blue)",
  },
  {
    href: "/showcase/hitpay-mpp",
    title: "HitPay MPP",
    rail: "Checkout URL / QR",
    ux: "payment challenge → checkout → paid retry",
    amount: "S$1.00 SGD",
    accent: "var(--teal)",
  },
];

export function ShowcaseOverviewScreen() {
  return (
    <div className="scroll">
      <div style={{ padding: "32px 40px 80px", maxWidth: 1440, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Paid API analytics showcase
          </div>
          <h1 className="display" style={{ margin: 0, fontSize: 34, letterSpacing: "-0.03em" }}>
            Connect MPP payment context to API provider usage.
          </h1>
          <p style={{ margin: "14px 0 0", maxWidth: 820, color: "var(--text-2)", lineHeight: 1.6, fontSize: 16 }}>
            Stripe MPP and HitPay MPP still handle payment. Flovia wraps the paid route once and joins payment
            challenges, paid responses, endpoint usage, and retained demand signals.
          </p>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
          {providers.map((provider) => (
            <Link
              key={provider.href}
              href={provider.href}
              className="card"
              style={{ ...cardStyle, textDecoration: "none", color: "inherit", position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", inset: "0 auto 0 0", width: 4, background: provider.accent }} />
              <div className="eyebrow" style={{ color: provider.accent }}>Provider route</div>
              <h2 style={{ margin: "8px 0 8px", fontSize: 24 }}>{provider.title}</h2>
              <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.55 }}>{provider.ux}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 18 }}>
                <MiniStat label="Rail" value={provider.rail} />
                <MiniStat label="Paid amount" value={provider.amount} />
              </div>
            </Link>
          ))}
        </section>

        <section className="card" style={{ marginTop: 24, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 20px 14px", background: "var(--surface-subtle)", borderBottom: "1px solid var(--line)" }}>
            <div className="eyebrow" style={{ marginBottom: 0 }}>
              Comparison
            </div>
          </div>
          <table className="dt" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>provider</th>
                <th>rail</th>
                <th>payment UX</th>
                <th>Flovia join value</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow provider="Stripe MPP" rail="Tempo" ux="Token payment credential" />
              <CompareRow provider="HitPay MPP" rail="Checkout" ux="Checkout URL and QR" />
            </tbody>
          </table>
        </section>

        <section className="card" style={{ marginTop: 24, padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Joined analytics preview
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 46px 1fr 46px 1fr", alignItems: "center", gap: 10 }}>
            <FlowBox title="Payment context" items={["provider", "rail", "amount", "challenge id"]} />
            <FlowArrow />
            <FlowBox title="API usage" items={["endpoint", "status", "latency", "request id"]} />
            <FlowArrow />
            <FlowBox title="Retained demand" items={["conversion", "repeat calls", "workflow", "join confidence"]} />
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--line-strong)", borderRadius: 8, padding: 12, background: "var(--surface-subtle)" }}>
      <div className="eyebrow" style={{ fontSize: 10 }}>{label}</div>
      <div style={{ marginTop: 5, fontWeight: 600, color: "var(--text-1)" }}>{value}</div>
    </div>
  );
}

function CompareRow({ provider, rail, ux }: { provider: string; rail: string; ux: string }) {
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{provider}</td>
      <td>{rail}</td>
      <td>{ux}</td>
      <td style={{ color: "var(--text-2)" }}>joins payment state to endpoint demand and workflow retention</td>
    </tr>
  );
}

function FlowBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ border: "1px solid var(--line-strong)", borderRadius: 12, padding: 18, background: "var(--surface-subtle)" }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
        {items.map((item) => (
          <span key={item} className="chip mute" style={{ background: "var(--surface-card)" }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function FlowArrow() {
  return <div className="mono" style={{ textAlign: "center", color: "var(--text-3)", fontSize: 22 }}>→</div>;
}
