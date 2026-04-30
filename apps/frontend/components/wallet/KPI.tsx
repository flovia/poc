import type { ReactNode } from "react";

type KPIProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  hue?: "default" | "blue" | "warn";
  big?: boolean;
};

const COLOR_MAP: Record<NonNullable<KPIProps["hue"]>, string> = {
  default: "var(--text-1)",
  blue: "var(--mesh-blue)",
  warn: "var(--warn)",
};

export function KPI({ label, value, sub, hue = "default", big }: KPIProps) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-3)",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {typeof value === "string" ? (
        <div
          className="mono"
          style={{
            fontSize: big ? 28 : 22,
            fontWeight: 600,
            marginTop: 4,
            color: COLOR_MAP[hue],
          }}
        >
          {value}
        </div>
      ) : (
        value
      )}
      {sub && <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-3)" }}>{sub}</div>}
    </div>
  );
}
