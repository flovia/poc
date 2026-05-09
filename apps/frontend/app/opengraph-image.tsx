import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Flovia — Turn x402 / MPP payments into decisions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = {
  shell: "#F7F5F2",
  card: "#FFFFFF",
  subtle: "#FAFAF8",
  muted: "#F2F4F7",
  line: "#EAECEF",
  lineStrong: "#DCE0E5",
  text1: "#0F1115",
  text2: "#475569",
  text3: "#6B7280",
  textMute: "#94A3B8",
  blue: "#2F5D9A",
  blueSoft: "rgba(47, 93, 154, 0.10)",
  teal: "#2C7A7B",
  tealSoft: "rgba(44, 122, 123, 0.10)",
  warn: "#B45309",
};

export default async function Image() {
  const logoPath = join(process.cwd(), "public", "logo.png");
  const logoBuffer = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: BRAND.shell,
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        color: BRAND.text1,
      }}
    >
      <div
        style={{
          width: 520,
          display: "flex",
          flexDirection: "column",
          padding: "56px 48px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            width={56}
            height={56}
            style={{ borderRadius: 8 }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: BRAND.text1,
              }}
            >
              Flovia
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: BRAND.text3,
                marginTop: 2,
              }}
            >
              x402 / MPP · Agent Payments
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: "-0.025em",
              color: BRAND.text1,
            }}
          >
            <span>Turn</span>
            <span>x402 / MPP</span>
            <span>payments into</span>
            <span style={{ color: BRAND.blue }}>decisions.</span>
          </div>
          <div
            style={{
              fontSize: 18,
              lineHeight: 1.5,
              color: BRAND.text2,
              maxWidth: 360,
            }}
          >
            Co-usage discovery for agent-driven API economies.
          </div>
        </div>

      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 56px 56px 0",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 30% 20%, ${BRAND.blueSoft}, transparent 55%), radial-gradient(circle at 80% 90%, ${BRAND.tealSoft}, transparent 50%)`,
          }}
        />

        <div
          style={{
            position: "relative",
            width: 600,
            height: 460,
            display: "flex",
            flexDirection: "column",
            background: BRAND.card,
            border: `1px solid ${BRAND.lineStrong}`,
            borderRadius: 8,
            boxShadow: "0 24px 64px rgba(15, 23, 42, 0.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: `1px solid ${BRAND.line}`,
              background: BRAND.subtle,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: BRAND.text2,
              }}
            >
              Co-usage Providers
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: BRAND.text3,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: BRAND.teal,
                }}
              />
              7d · live
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "16px 18px 12px",
              gap: 14,
              borderBottom: `1px solid ${BRAND.line}`,
            }}
          >
            {[
              { label: "Wallets", value: "1,284", delta: "+8.4%", positive: true },
              { label: "Spend (7d)", value: "$42.6K", delta: "+12%", positive: true },
              { label: "Co-using APIs", value: "37", delta: "+3", positive: true },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: BRAND.textMute,
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: BRAND.text1,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {m.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: m.positive ? BRAND.teal : BRAND.warn,
                  }}
                >
                  {m.delta}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flex: 1, padding: "14px 18px", gap: 14 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: BRAND.text3,
                }}
              >
                Top co-using providers
              </div>
              {[
                { name: "openrouter.ai", pct: 86, count: "412" },
                { name: "perplexity.ai", pct: 64, count: "318" },
                { name: "exa.ai", pct: 47, count: "224" },
                { name: "tavily.com", pct: 32, count: "156" },
                { name: "browserbase.com", pct: 21, count: "98" },
              ].map((p) => (
                <div
                  key={p.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: BRAND.text1, fontWeight: 500 }}>
                      {p.name}
                    </span>
                    <span style={{ color: BRAND.text3, fontFamily: "ui-monospace, monospace" }}>
                      {p.count}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      height: 5,
                      borderRadius: 5,
                      background: BRAND.muted,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${p.pct}%`,
                        background: BRAND.blue,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                width: 220,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                paddingLeft: 14,
                borderLeft: `1px solid ${BRAND.line}`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: BRAND.text3,
                }}
              >
                Spend trend
              </div>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  height: 110,
                  borderRadius: 6,
                  background: BRAND.subtle,
                  border: `1px solid ${BRAND.line}`,
                  padding: 8,
                }}
              >
                <svg width="100%" height="100%" viewBox="0 0 200 96" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={BRAND.blue} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={BRAND.blue} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,72 L20,66 L40,68 L60,54 L80,58 L100,42 L120,46 L140,30 L160,34 L180,18 L200,22 L200,96 L0,96 Z"
                    fill="url(#fill)"
                  />
                  <path
                    d="M0,72 L20,66 L40,68 L60,54 L80,58 L100,42 L120,46 L140,30 L160,34 L180,18 L200,22"
                    fill="none"
                    stroke={BRAND.blue}
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: BRAND.text2,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: BRAND.blue,
                    }}
                  />
                  On-chain spend
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: BRAND.text3,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: BRAND.teal,
                    }}
                  />
                  Agent calls
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
