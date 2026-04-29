type StatProps = {
  label: string;
  value: string;
  hue?: "teal" | "blue" | "default";
  small?: boolean;
};

const COLOR_MAP = {
  teal: "var(--teal)",
  blue: "var(--mesh-blue)",
  default: "var(--text-1)",
} as const;

export function Stat({ label, value, hue = "default", small }: StatProps) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: 8, background: "#F6F8FA" }}>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-3)",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: small ? 16 : 20,
          fontWeight: 600,
          color: COLOR_MAP[hue],
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}
