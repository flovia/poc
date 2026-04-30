type SelectProps = {
  label: string;
  options: string[];
  value?: string;
};

export function Select({ label, options, value }: SelectProps) {
  return (
    <button
      type="button"
      aria-disabled
      title="PoC: not wired"
      className="btn ghost"
      style={{
        padding: "7px 11px",
        fontSize: 12.5,
        border: "1px solid var(--line)",
        background: "#FFFFFF",
        color: "var(--text-2)",
        gap: 6,
      }}
    >
      <span style={{ color: "var(--text-mute)", fontSize: 11 }}>{label}:</span>
      <span style={{ color: "var(--text-1)" }}>{value ?? options[0]}</span>
      <span style={{ color: "var(--text-mute)", fontSize: 10 }}>▾</span>
    </button>
  );
}
