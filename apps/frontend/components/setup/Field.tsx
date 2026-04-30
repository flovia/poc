type FieldHeaderProps = {
  label: string;
  hint?: string;
};

export function FieldHeader({ label, hint }: FieldHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-2)",
        }}
      >
        {label}
      </div>
      {hint && <div style={{ fontSize: 12, color: "var(--text-3)" }}>{hint}</div>}
    </div>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
};

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      <FieldHeader label={label} hint={hint} />
      {children}
    </div>
  );
}

export const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  background: "#FFFFFF",
  border: "1px solid var(--line)",
  color: "var(--text-1)",
  fontSize: 14,
  transition: "border-color 140ms ease, box-shadow 140ms ease",
};
