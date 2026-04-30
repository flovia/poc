type FreeTierBarProps = {
  pct: number;
  height?: number;
};

export function FreeTierBar({ pct, height = 6 }: FreeTierBarProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  const isHot = clamped >= 80;
  return (
    <div
      style={{
        height,
        borderRadius: 999,
        background: "rgba(148,163,184,0.10)",
        position: "relative",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: clamped + "%",
          background: isHot ? "var(--warn)" : "var(--mesh-blue)",
          borderRadius: 2,
          boxShadow: "none",
          transition: "width 600ms cubic-bezier(.4,0,.2,1)",
        }}
      />
    </div>
  );
}
