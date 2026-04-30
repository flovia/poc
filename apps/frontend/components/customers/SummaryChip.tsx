type SummaryChipProps = {
  label: string;
  value: string | number;
  hint: string;
  accent?: "blue";
};

export function SummaryChip({ label, value, hint, accent }: SummaryChipProps) {
  return (
    <div
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        background: "#FFFFFF",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-1)",
        minWidth: 96,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: "var(--text-3)",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 18,
          fontWeight: 600,
          marginTop: 2,
          color: accent === "blue" ? "var(--mesh-blue)" : "var(--text-1)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-mute)", marginTop: 1 }}>{hint}</div>
    </div>
  );
}
