"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CoUsageProviderRow } from "@/lib/customers/co-usage-providers";

type Props = {
  row: CoUsageProviderRow | null;
  providerId: string;
  onClose: () => void;
};

const opportunityChipClass = (level: "high" | "medium" | "low") => {
  if (level === "high") return "chip blue";
  if (level === "medium") return "chip teal";
  return "chip mute";
};

const opportunityLabel = (level: "high" | "medium" | "low") => {
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  return "Low";
};

const hostnameOf = (urlOrText: string): string | null => {
  try {
    return new URL(urlOrText).hostname;
  } catch {
    return null;
  }
};

export function CoUsageProviderDrawer({ row, providerId, onClose }: Props) {
  const open = row !== null;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const externalSiteUrl = useMemo(() => {
    if (!row) return null;
    const host =
      hostnameOf(row.serviceName) ??
      (row.endpoints[0] ? hostnameOf(row.endpoints[0].serviceName) : null);
    return host ? `https://${host}` : null;
  }, [row]);

  if (!row) return null;

  const handleCopy = async () => {
    if (!row.payToWallet) return;
    try {
      await navigator.clipboard.writeText(row.payToWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked; ignore silently in PoC.
    }
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.32)",
          zIndex: 90,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 160ms ease",
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Provider details for ${row.providerName}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(520px, 92vw)",
          background: "var(--surface-card)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "-12px 0 24px rgba(15,23,42,0.08)",
          zIndex: 100,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 200ms ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-mute)",
                marginBottom: 4,
              }}
            >
              Synergy candidate
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.3,
                wordBreak: "break-word",
              }}
            >
              {row.providerName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            style={{
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--text-2)",
              borderRadius: 4,
              width: 28,
              height: 28,
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </header>

        <div style={{ overflow: "auto", padding: "16px 20px 32px", flex: 1 }}>
          <Section title="Co-usage with your customers">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <Stat label="Shared wallets" value={row.sharedWallets.toLocaleString()} />
              <Stat label="Shared tx" value={row.sharedTxCount.toLocaleString()} />
              <Stat label="Endpoints used" value={row.endpoints.length.toLocaleString()} />
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>Opportunity</span>
              <span className={opportunityChipClass(row.opportunity)}>
                {opportunityLabel(row.opportunity)}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                Correlation {row.confidence.toFixed(2)}
              </span>
            </div>
          </Section>

          <Section title="On-chain identity">
            <Field label="pay_to address">
              {row.payToWallet ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code
                    style={{
                      fontSize: 12,
                      background: "var(--surface-muted)",
                      padding: "4px 8px",
                      borderRadius: 4,
                      wordBreak: "break-all",
                      flex: 1,
                    }}
                  >
                    {row.payToWallet}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn ghost"
                    style={{ fontSize: 12, padding: "4px 8px" }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : (
                <span style={{ color: "var(--text-mute)" }}>—</span>
              )}
            </Field>
            {externalSiteUrl && (
              <Field label="Hostname">
                <a
                  href={externalSiteUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{ fontSize: 13 }}
                >
                  {externalSiteUrl} ↗
                </a>
                <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                  Opens in a new tab. Hostname is inferred from the BFF projection; verify
                  ownership before reaching out.
                </div>
              </Field>
            )}
          </Section>

          <Section title={`Endpoints (${row.endpoints.length})`}>
            {row.endpoints.length === 0 ? (
              <div style={{ color: "var(--text-mute)", fontSize: 13 }}>
                No endpoint detail available.
              </div>
            ) : (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {row.endpoints.map((ep) => (
                  <li
                    key={ep.serviceName}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      padding: "8px 10px",
                      border: "1px solid var(--line)",
                      borderRadius: 4,
                      background: "var(--surface-subtle)",
                    }}
                  >
                    <code
                      style={{
                        flex: 1,
                        fontSize: 12,
                        wordBreak: "break-all",
                        color: "var(--text-1)",
                        background: "transparent",
                      }}
                      title={ep.serviceName}
                    >
                      {ep.serviceName}
                    </code>
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: "var(--text-2)", whiteSpace: "nowrap" }}
                    >
                      {ep.sharedTxCount} tx · {ep.sharedWallets} wallets
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Your customers paying this provider (${row.payerWallets.length})`}>
            {row.payerWallets.length === 0 ? (
              <div style={{ color: "var(--text-mute)", fontSize: 13 }}>—</div>
            ) : (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {row.payerWallets.map((p) => (
                  <li
                    key={p.wallet}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 4,
                      background: "var(--surface-subtle)",
                    }}
                  >
                    <Link
                      href={`/providers/${providerId}/wallet/${encodeURIComponent(p.wallet)}`}
                      onClick={onClose}
                      className="mono"
                      title={`Open wallet detail for ${p.wallet}`}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12,
                        color: "var(--mesh-blue)",
                        textDecoration: "underline",
                        textDecorationStyle: "dotted",
                        textDecorationColor: "var(--text-mute)",
                        wordBreak: "break-all",
                      }}
                    >
                      {p.wallet}
                    </Link>
                    <span
                      style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}
                    >
                      {p.sharedTxCount} tx
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Service description (coming soon)">
            <div
              style={{
                fontSize: 13,
                color: "var(--text-3)",
                padding: 12,
                border: "1px dashed var(--line)",
                borderRadius: 4,
                background: "var(--surface-subtle)",
              }}
            >
              The BFF projection currently does not include a textual description, category, or
              market-wide usage stats for external x402 providers. These will be filled in when
              integration with an x402 directory / service registry lands.
            </div>
          </Section>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 4, marginBottom: 22 }}>
      <h3
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
          margin: "0 0 10px",
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        border: "1px solid var(--line)",
        borderRadius: 4,
        background: "var(--surface-subtle)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--text-1)" }}>
        {value}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
