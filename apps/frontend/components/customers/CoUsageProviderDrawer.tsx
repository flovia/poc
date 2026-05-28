"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import type { CoUsageProviderRow } from "@/lib/customers/co-usage-providers";
import { opportunityChipClass, opportunityLabel } from "@/lib/customers/co-usage-ui";
import { walletProfileHref } from "@/lib/provider-routes";
import { useClipboardCopy } from "@/lib/use-clipboard-copy";

type Props = {
  row: CoUsageProviderRow | null;
  providerId: string;
  onClose: () => void;
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
  const { copied, copy, reset } = useClipboardCopy(1500);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const externalSiteUrl = useMemo(() => {
    if (!row) return null;
    if (row.serviceUrl) return row.serviceUrl;
    const host =
      hostnameOf(row.serviceName) ??
      (row.endpoints[0] ? hostnameOf(row.endpoints[0].serviceName) : null);
    return host ? `https://${host}` : null;
  }, [row]);

  if (!row) return null;

  const handleCopy = () => void copy(row.payToWallet);

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
                fontSize: 12,
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
                fontSize: 20,
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
          {(row.description ||
            row.useCase ||
            row.category ||
            row.chain ||
            row.protocol ||
            row.assetSymbol ||
            row.priceRangeUsd) && (
            <Section title="Service">
              {row.description && (
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "var(--text-1)",
                    margin: "0 0 12px",
                  }}
                >
                  {row.description}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: row.useCase ? 12 : 0,
                }}
              >
                {row.category && <span className="chip mute">{row.category}</span>}
                {row.chain && <span className="chip teal">{row.chain}</span>}
                {row.protocol && <span className="chip blue">{row.protocol}</span>}
                {row.assetSymbol && (
                  <span className="chip mute">{row.assetSymbol}</span>
                )}
                {row.priceRangeUsd && (
                  <span className="chip mute" title="Listed price range">
                    Listed price range: {""}
                    ${row.priceRangeUsd.min}
                    {row.priceRangeUsd.max !== row.priceRangeUsd.min
                      ? ` – $${row.priceRangeUsd.max}`
                      : ""}
                  </span>
                )}
              </div>
              {row.useCase && (
                <Field label="Use case">
                  <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                    {row.useCase}
                  </span>
                </Field>
              )}
            </Section>
          )}
          <Section title="Co-usage with your customers">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <Stat label="Overlapping wallets" value={row.sharedWallets.toLocaleString()} />
              <Stat label="Co-usage tx" value={row.sharedTxCount.toLocaleString()} />
              <Stat label="Endpoints used" value={row.endpoints.length.toLocaleString()} />
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>Opportunity</span>
              <span className={opportunityChipClass(row.opportunity)}>
                {opportunityLabel(row.opportunity)}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>
                Signal {row.confidence.toFixed(2)}
              </span>
            </div>
          </Section>

          <Section title="On-chain identity">
            <Field label="pay_to address">
              {row.payToWallet ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code
                    style={{
                      fontSize: 13,
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
                    style={{ fontSize: 13, padding: "4px 8px" }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : (
                <span style={{ color: "var(--text-mute)" }}>—</span>
              )}
            </Field>
            {externalSiteUrl && (
              <Field label="Provider site">
                <a
                  href={externalSiteUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{ fontSize: 14 }}
                >
                  {externalSiteUrl} ↗
                </a>
              </Field>
            )}
          </Section>

          <Section title={`Endpoints (${row.endpoints.length})`}>
            {row.endpoints.length === 0 ? (
              <div style={{ color: "var(--text-mute)", fontSize: 14 }}>
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
                        fontSize: 13,
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
                      style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap" }}
                    >
                      {ep.sharedTxCount} tx · {ep.sharedWallets} wallets
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Your customer wallet profiles (${row.payerWallets.length})`}>
            {row.payerWallets.length === 0 ? (
              <div style={{ color: "var(--text-mute)", fontSize: 14 }}>—</div>
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
                      href={walletProfileHref(providerId, p.wallet)}
                      onClick={onClose}
                      className="mono"
                      title={`Open wallet profile for ${p.wallet}`}
                      aria-label={`Open wallet profile for ${p.wallet}`}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        fontSize: 13,
                        color: "var(--mesh-blue)",
                        textDecoration: "none",
                        wordBreak: "break-all",
                      }}
                    >
                      <span style={{ textDecoration: "underline", textDecorationStyle: "dotted" }}>
                        {p.wallet}
                      </span>
                      <span
                        aria-hidden="true"
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--text-3)",
                          wordBreak: "normal",
                        }}
                      >
                        View wallet profile →
                      </span>
                    </Link>
                    <span
                      style={{ fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}
                    >
                      {p.sharedTxCount} tx
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
          fontSize: 12,
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
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--text-1)" }}>
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
          fontSize: 12,
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
