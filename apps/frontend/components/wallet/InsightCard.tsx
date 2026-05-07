import type { ReactNode } from "react";

type Tone = "default" | "upsell" | "blue";

type InsightCardProps = {
  tone?: Tone;
  icon?: ReactNode;
  label?: string;
  children: ReactNode;
  footer?: ReactNode;
  delay?: number;
};

const TONES: Record<Tone, { border: string }> = {
  default: { border: "var(--line)" },
  upsell: { border: "var(--line)" },
  blue: { border: "var(--line)" },
};

const LABEL_COLOR: Record<Tone, string> = {
  default: "var(--text-mute)",
  upsell: "var(--signal-priority)",
  blue: "var(--signal-priority)",
};

export function InsightCard({
  tone = "default",
  icon,
  label,
  children,
  footer,
  delay = 0,
}: InsightCardProps) {
  const t = TONES[tone];
  return (
    <div
      className="card fade-up"
      style={{
        padding: 18,
        borderColor: t.border,
        animationDelay: delay + "ms",
        minWidth: 0,
      }}
    >
      {label && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: LABEL_COLOR[tone],
            marginBottom: 10,
          }}
        >
          {icon} {label}
        </div>
      )}
      {children}
      {footer && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>{footer}</div>
      )}
    </div>
  );
}
