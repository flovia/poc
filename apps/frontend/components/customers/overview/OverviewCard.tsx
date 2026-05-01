import type { ReactNode } from "react";

type OverviewCardProps = {
  eyebrow: string;
  title: string;
  hint?: string;
  children: ReactNode;
};

export function OverviewCard({ eyebrow, title, hint, children }: OverviewCardProps) {
  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        borderColor: "var(--line)",
        background: "var(--surface-card)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "12px 16px 10px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "var(--text-mute)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          {eyebrow}
        </div>
        <div className="display" style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>
          {title}
        </div>
        {hint && (
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{hint}</div>
        )}
      </div>
      <div style={{ padding: 16, flex: 1 }}>{children}</div>
    </div>
  );
}
